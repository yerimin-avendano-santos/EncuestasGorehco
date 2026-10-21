import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Client } = pg;

const SOURCE_URL =
  process.env.CSV_URL ||
  'https://docs.google.com/spreadsheets/d/1zMGJZP-K23X2ukcW--MZpjcqY2kUJLcFns1-VwwMHdk/export?format=csv';
const CSV_PATH = resolve(
  process.env.CSV_PATH || 'data/source/encuestas_2026.csv',
);
const FORCE = process.argv.includes('--force');

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const AREA_MAP = new Map(
  Object.entries({
    'administracion/logistica/recursos humanos':
      'Administración, logística y recursos humanos',
    'planeamiento/presupuesto': 'Planeamiento y presupuesto',
    tramite: 'Trámite documentario y atención',
    obras: 'Obras',
    estudios: 'Estudios',
    patrimonio: 'Patrimonio',
    'control/asesoria': 'Control y asesoría',
    'gerencia de desarrollo social': 'Gerencia de desarrollo social',
    infraestructura: 'Infraestructura',
    procompite: 'PROCOMPITE',
    liquidacion: 'Liquidación',
    'sub gerencia de liquidacion': 'Liquidación',
  }).map(([k, v]) => [normalize(k), v]),
);

const NIVEL_MAP = new Map(
  Object.entries({
    'profesional o especialista': 'Profesional o especialista',
    'tecnico u operativo': 'Técnico u operativo',
    'prefiero no responder': 'Prefiero no responder',
    'coordinacion o jefatura': 'Coordinación o jefatura',
  }).map(([k, v]) => [normalize(k), v]),
);

const ANTIGUEDAD_MAP = new Map(
  Object.entries({
    '1-3a': '1–3 años',
    '>10a': 'Más de 10 años',
    '4-6a': '4–6 años',
    '1-2a': '1–2 años',
    '7-10a': '7–10 años',
    '6-11m': '6–11 meses',
  }).map(([k, v]) => [normalize(k), v]),
);

const FRECUENCIA_MAP = new Map(
  Object.entries({
    diario: 'Todos los días laborables',
    '3-4d': '3–4 días',
    '1-2d': '1–2 días',
    '1d': '1–2 días',
    'menos de 1 dia por semana': 'Menos de 1 día por semana',
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual',
    ocasional: 'Ocasional',
  }).map(([k, v]) => [normalize(k), v]),
);

const ESTADO_CIVIL_MAP = new Map(
  Object.entries({
    soltero: 'Soltero/a',
    casado: 'Casado/a',
    conviviente: 'Conviviente',
    viudo: 'Viudo/a',
    divorciado: 'Divorciado/a',
  }).map(([k, v]) => [normalize(k), v]),
);

function mapValue(map, value, fallback) {
  const key = normalize(value);
  if (!key) return fallback;
  return map.get(key) || String(value).trim() || fallback;
}

function number(value) {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseItems(row, start) {
  const items = [];
  for (let i = 0; i < 50; i += 1) {
    const value = number(row[start + i]);
    if (value < 0 || value > 5) {
      throw new Error(`Valor Likert inválido (${value}) en columna ${start + i + 1}`);
    }
    items.push(value);
  }
  return items;
}

async function loadCsv() {
  if (existsSync(CSV_PATH)) {
    console.log('Usando snapshot:', CSV_PATH);
    return readFileSync(CSV_PATH, 'utf8');
  }

  console.log('Descargando CSV de Google Sheets...');
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el CSV: HTTP ${response.status}`);
  }
  const text = await response.text();
  mkdirSync(resolve('data/source'), { recursive: true });
  writeFileSync(CSV_PATH, text, 'utf8');
  console.log('Snapshot guardado en:', CSV_PATH);
  return text;
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const csv = await loadCsv();
  const rows = parse(csv, {
    relax_column_count: true,
    skip_empty_lines: false,
  });

  const records = rows.slice(5, 112);
  if (records.length !== 107) {
    throw new Error(`Se esperaban 107 registros y se leyeron ${records.length}`);
  }

  await client.connect();
  await client.query('begin');

  if (FORCE) {
    const deleted = await client.query(
      `delete from public.encuestas
       where origen = 'importado' and numero between 1 and 107`,
    );
    console.log(`Registros importados previos eliminados: ${deleted.rowCount}`);
  } else {
    const existing = await client.query(
      `select count(*)::int as n from public.encuestas where origen = 'importado'`,
    );
    if (existing.rows[0].n > 0) {
      throw new Error(
        'Ya existen registros importados. Usa --force solo si deseas reemplazarlos.',
      );
    }
  }

  const areasResult = await client.query(`select id, nombre from public.areas`);
  const areas = new Map(areasResult.rows.map((a) => [a.nombre, a.id]));

  const tdCols = Array.from({ length: 25 }, (_, i) => `td_${String(i + 1).padStart(2, '0')}`);
  const paCols = Array.from({ length: 25 }, (_, i) => `pa_${String(i + 1).padStart(2, '0')}`);

  const columns = [
    'numero',
    'usuario_id',
    'consentimiento',
    'consentimiento_en',
    'fecha_encuesta',
    'edad',
    'sexo',
    'estado_civil',
    'instruccion',
    'area_id',
    'nivel_responsabilidad',
    'antiguedad',
    'frecuencia_uso',
    'participacion',
    ...tdCols,
    ...paCols,
    'estado',
    'origen',
    'observaciones',
  ];

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const insertSql = `insert into public.encuestas (${columns.join(', ')}) values (${placeholders})`;

  let imported = 0;
  const areaCounts = new Map();
  const seenNumbers = new Set();

  for (let index = 0; index < records.length; index += 1) {
    const row = records[index];
    if (row.length < 60) {
      throw new Error(`La fila ${index + 1} tiene ${row.length} columnas; se esperaban 60`);
    }

    const numero = number(row[0]);
    if (numero < 1 || numero > 107) {
      throw new Error(`Número inválido en la fila ${index + 1}: ${row[0]}`);
    }
    if (seenNumbers.has(numero)) {
      throw new Error(`Número duplicado en el CSV: ${numero}`);
    }
    seenNumbers.add(numero);

    const areaNombre = mapValue(AREA_MAP, row[5], 'Otros / No especificado');
    const areaId = areas.get(areaNombre);
    if (!areaId) {
      throw new Error(`Área no encontrada en el catálogo: ${areaNombre}`);
    }

    const edad = number(row[1]);
    if (edad < 18 || edad > 99) {
      throw new Error(`Edad inválida en el registro ${numero}: ${row[1]}`);
    }

    const sexo = String(row[2] ?? '').trim().toUpperCase();
    if (!['M', 'F'].includes(sexo)) {
      throw new Error(`Sexo inválido en el registro ${numero}: ${row[2]}`);
    }

    const items = parseItems(row, 10);
    const td = items.slice(0, 25);
    const pa = items.slice(25, 50);

    const participacionRaw = String(row[9] ?? '').trim();
    const participacion = participacionRaw === '1' ? 'Sí' : 'No';

    const values = [
      numero,
      null,
      true,
      null,
      null,
      edad,
      sexo,
      mapValue(ESTADO_CIVIL_MAP, row[3], 'No especificado'),
      String(row[4] ?? '').trim() || 'No especificado',
      areaId,
      mapValue(NIVEL_MAP, row[6], 'No especificado'),
      mapValue(ANTIGUEDAD_MAP, row[7], 'No especificado'),
      mapValue(FRECUENCIA_MAP, row[8], 'No especificado'),
      participacion,
      ...td,
      ...pa,
      'completa',
      'importado',
      'Importado del archivo original (107 registros)',
    ];

    await client.query(insertSql, values);
    imported += 1;
    areaCounts.set(areaNombre, (areaCounts.get(areaNombre) || 0) + 1);
  }

  await client.query(
    `select setval(
       'public.encuestas_numero_seq',
       greatest(
         107,
         coalesce((select max(numero) from public.encuestas), 107)
       ),
       true
     )`,
  );

  const check = await client.query(`
    select
      count(*)::int as total,
      min(numero)::int as min_numero,
      max(numero)::int as max_numero,
      count(distinct numero)::int as numeros_distintos
    from public.encuestas
    where origen = 'importado'
  `);

  const averages = await client.query(`
    select
      round(avg(case when i.tipo = 'TD' then i.valor end), 2) as td,
      round(avg(case when i.tipo = 'PA' then i.valor end), 2) as pa
    from public.encuestas e
    join public.v_encuestas_items i on i.id = e.id
    where e.origen = 'importado'
      and i.valor between 1 and 5
  `);

  const seq = await client.query(
    `select last_value, is_called from public.encuestas_numero_seq`,
  );

  await client.query('commit');

  console.log('\nImportación completada.');
  console.log('Registros:', imported);
  console.log('Verificación:', check.rows[0]);
  console.log('Promedios:', averages.rows[0]);
  console.log('Secuencia:', seq.rows[0]);
  console.log('Áreas:', Object.fromEntries([...areaCounts.entries()].sort()));
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error('ERROR:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
