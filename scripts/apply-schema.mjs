import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const sql = readFileSync(resolve('supabase/schema.sql'), 'utf8');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.on('notice', (notice) => {
  if (notice.message) console.log('NOTICE:', notice.message);
});

try {
  await client.connect();
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  console.log('Esquema aplicado correctamente.');

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `);
  console.log('Tablas:', tables.rows.map((r) => r.table_name).join(', '));

  const seq = await client.query(`select last_value, is_called from public.encuestas_numero_seq`);
  console.log('Secuencia:', seq.rows[0]);
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error('ERROR:', error.message);
  if (error.position) console.error('Posición:', error.position);
  if (error.detail) console.error('Detalle:', error.detail);
  process.exitCode = 1;
} finally {
  await client.end();
}
