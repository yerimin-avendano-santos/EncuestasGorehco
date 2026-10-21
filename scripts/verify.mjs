import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const counts = await client.query(`
    select
      (select count(*)::int from public.encuestas where origen = 'importado') as importadas,
      (select count(*)::int from public.encuestas where origen = 'app' and eliminado_en is null) as app_activas,
      (select count(*)::int from public.encuestas where eliminado_en is not null) as eliminadas,
      (select count(*)::int from public.encuestas) as total,
      (select min(numero)::int from public.encuestas where origen = 'importado') as min_importado,
      (select max(numero)::int from public.encuestas where origen = 'importado') as max_importado,
      (select count(distinct numero)::int from public.encuestas where origen = 'importado') as numeros_importados,
      (select max(numero)::int from public.encuestas) as max_numero,
      (select last_value::int from public.encuestas_numero_seq) as secuencia,
      (select count(*)::int from public.auditoria) as auditoria,
      (select count(*)::int from public.profiles) as perfiles,
      (select count(*)::int from public.areas) as areas
  `);

  const averages = await client.query(`
    select
      round(avg(case when i.tipo = 'TD' then i.valor end), 2)::float8 as td,
      round(avg(case when i.tipo = 'PA' then i.valor end), 2)::float8 as pa,
      count(*)::int as respuestas
    from public.encuestas e
    join public.v_encuestas_items i on i.id = e.id
    where e.origen = 'importado'
      and i.valor between 1 and 5
  `);

  const duplicates = await client.query(`
    select numero, count(*)::int as repeticiones
    from public.encuestas
    where numero is not null
    group by numero
    having count(*) > 1
    order by numero
  `);

  const stats = counts.rows[0];
  const avg = averages.rows[0];
  const errors = [];

  if (stats.importadas !== 107) {
    errors.push(`Se esperaban 107 registros importados y hay ${stats.importadas}.`);
  }
  if (
    stats.min_importado !== 1 ||
    stats.max_importado !== 107 ||
    stats.numeros_importados !== 107
  ) {
    errors.push('La numeración histórica no cubre exactamente 1–107.');
  }
  if (Math.abs(avg.td - 3.52) > 0.01 || Math.abs(avg.pa - 3.71) > 0.01) {
    errors.push(
      `Los promedios históricos esperados son TD 3.52 / PA 3.71; se obtuvo ${avg.td} / ${avg.pa}.`,
    );
  }
  if (stats.secuencia < (stats.max_numero ?? 0)) {
    errors.push('La secuencia está por detrás del último número de encuesta.');
  }
  if (duplicates.rows.length) {
    errors.push(`Hay números de encuesta duplicados: ${JSON.stringify(duplicates.rows)}.`);
  }

  console.log('Registros:', stats);
  console.log('Promedios históricos:', avg);
  console.log('Duplicados:', duplicates.rows);

  if (errors.length) {
    console.error('\nVERIFICACIÓN CON ERRORES:');
    for (const error of errors) console.error(' -', error);
    process.exitCode = 1;
  } else {
    console.log('\nVerificación correcta: 107 históricos, promedios TD 3.52 / PA 3.71.');
  }
} catch (error) {
  console.error('ERROR:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
