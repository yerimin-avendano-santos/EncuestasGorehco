import pg from 'pg';

const { Client } = pg;
const email = process.argv[2] || process.env.ADMIN_EMAIL;

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}
if (!email) {
  console.error('Uso: node scripts/setup-admin.mjs correo@encuesta.com [nombre]');
  process.exit(1);
}
const nombre = process.argv[3] || 'Piero Avendano Bernardo';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query('begin');

  const user = await client.query(
    `update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
     where lower(email) = lower($1)
     returning id, email`,
    [email],
  );

  if (!user.rows.length) {
    throw new Error(`No existe un usuario Auth con el correo ${email}. Créalo primero.`);
  }

  const id = user.rows[0].id;

  await client.query(
    `update auth.identities
     set identity_data = jsonb_set(identity_data, '{email_verified}', 'true'::jsonb),
         updated_at = now()
     where user_id = $1 and provider = 'email'`,
    [id],
  );

  await client.query(
    `insert into public.profiles (id, nombre, email, rol, activo)
     values ($1, $2, $3, 'admin', true)
     on conflict (id) do update
       set nombre = excluded.nombre,
           email = excluded.email,
           rol = 'admin',
           activo = true`,
    [id, nombre, email],
  );

  await client.query('commit');

  const profile = await client.query(
    `select id, nombre, email, rol, activo from public.profiles where id = $1`,
    [id],
  );
  console.log(JSON.stringify(profile.rows[0], null, 2));
} catch (error) {
  await client.query('rollback').catch(() => {});
  console.error('ERROR:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
