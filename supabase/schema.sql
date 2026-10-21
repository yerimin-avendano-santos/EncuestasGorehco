-- ============================================================
-- Encuestas GOREHCO · Transformación digital y procesos administrativos
-- Esquema de base de datos para Supabase (PostgreSQL 17)
-- Aplicar una sola vez sobre el proyecto limpio.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Secuencia de numeración de encuestas
-- Los 107 registros históricos ocupan 1..107.
-- La siguiente encuesta completa recibe 108.
-- ------------------------------------------------------------
create sequence if not exists public.encuestas_numero_seq
  start with 108
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

-- ------------------------------------------------------------
-- Catálogo de áreas / unidades orgánicas
-- ------------------------------------------------------------
create table if not exists public.areas (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

insert into public.areas (nombre, orden) values
  ('Administración, logística y recursos humanos', 1),
  ('Planeamiento y presupuesto', 2),
  ('Obras', 3),
  ('Liquidación', 4),
  ('Control y asesoría', 5),
  ('Trámite documentario y atención', 6),
  ('Estudios', 7),
  ('Gerencia de desarrollo social', 8),
  ('Patrimonio', 9),
  ('Infraestructura', 10),
  ('PROCOMPITE', 11),
  ('Otros / No especificado', 12)
on conflict (nombre) do nothing;

-- ------------------------------------------------------------
-- Perfiles de usuario
-- Se crean automáticamente al registrar un usuario en auth.users.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null unique,
  rol text not null default 'encuestador' check (rol in ('admin', 'encuestador')),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Encuestas
-- 0 en los ítems = N/A (se excluye de promedios y se exporta vacío).
-- 1..5 = respuesta Likert.
-- ------------------------------------------------------------
create table if not exists public.encuestas (
  id uuid primary key default gen_random_uuid(),
  numero bigint unique,
  client_id uuid not null default gen_random_uuid() unique,
  usuario_id uuid references auth.users(id) on delete set null,
  consentimiento boolean not null default false,
  consentimiento_en timestamptz,
  fecha_encuesta date,
  edad smallint check (edad is null or edad between 18 and 99),
  sexo text check (sexo is null or sexo in ('M', 'F')),
  estado_civil text,
  instruccion text,
  area_id bigint references public.areas(id),
  nivel_responsabilidad text,
  antiguedad text,
  frecuencia_uso text,
  participacion text check (participacion is null or participacion in ('Sí', 'No', 'No estoy seguro/a')),
  td_01 smallint not null default 0 check (td_01 between 0 and 5),
  td_02 smallint not null default 0 check (td_02 between 0 and 5),
  td_03 smallint not null default 0 check (td_03 between 0 and 5),
  td_04 smallint not null default 0 check (td_04 between 0 and 5),
  td_05 smallint not null default 0 check (td_05 between 0 and 5),
  td_06 smallint not null default 0 check (td_06 between 0 and 5),
  td_07 smallint not null default 0 check (td_07 between 0 and 5),
  td_08 smallint not null default 0 check (td_08 between 0 and 5),
  td_09 smallint not null default 0 check (td_09 between 0 and 5),
  td_10 smallint not null default 0 check (td_10 between 0 and 5),
  td_11 smallint not null default 0 check (td_11 between 0 and 5),
  td_12 smallint not null default 0 check (td_12 between 0 and 5),
  td_13 smallint not null default 0 check (td_13 between 0 and 5),
  td_14 smallint not null default 0 check (td_14 between 0 and 5),
  td_15 smallint not null default 0 check (td_15 between 0 and 5),
  td_16 smallint not null default 0 check (td_16 between 0 and 5),
  td_17 smallint not null default 0 check (td_17 between 0 and 5),
  td_18 smallint not null default 0 check (td_18 between 0 and 5),
  td_19 smallint not null default 0 check (td_19 between 0 and 5),
  td_20 smallint not null default 0 check (td_20 between 0 and 5),
  td_21 smallint not null default 0 check (td_21 between 0 and 5),
  td_22 smallint not null default 0 check (td_22 between 0 and 5),
  td_23 smallint not null default 0 check (td_23 between 0 and 5),
  td_24 smallint not null default 0 check (td_24 between 0 and 5),
  td_25 smallint not null default 0 check (td_25 between 0 and 5),
  pa_01 smallint not null default 0 check (pa_01 between 0 and 5),
  pa_02 smallint not null default 0 check (pa_02 between 0 and 5),
  pa_03 smallint not null default 0 check (pa_03 between 0 and 5),
  pa_04 smallint not null default 0 check (pa_04 between 0 and 5),
  pa_05 smallint not null default 0 check (pa_05 between 0 and 5),
  pa_06 smallint not null default 0 check (pa_06 between 0 and 5),
  pa_07 smallint not null default 0 check (pa_07 between 0 and 5),
  pa_08 smallint not null default 0 check (pa_08 between 0 and 5),
  pa_09 smallint not null default 0 check (pa_09 between 0 and 5),
  pa_10 smallint not null default 0 check (pa_10 between 0 and 5),
  pa_11 smallint not null default 0 check (pa_11 between 0 and 5),
  pa_12 smallint not null default 0 check (pa_12 between 0 and 5),
  pa_13 smallint not null default 0 check (pa_13 between 0 and 5),
  pa_14 smallint not null default 0 check (pa_14 between 0 and 5),
  pa_15 smallint not null default 0 check (pa_15 between 0 and 5),
  pa_16 smallint not null default 0 check (pa_16 between 0 and 5),
  pa_17 smallint not null default 0 check (pa_17 between 0 and 5),
  pa_18 smallint not null default 0 check (pa_18 between 0 and 5),
  pa_19 smallint not null default 0 check (pa_19 between 0 and 5),
  pa_20 smallint not null default 0 check (pa_20 between 0 and 5),
  pa_21 smallint not null default 0 check (pa_21 between 0 and 5),
  pa_22 smallint not null default 0 check (pa_22 between 0 and 5),
  pa_23 smallint not null default 0 check (pa_23 between 0 and 5),
  pa_24 smallint not null default 0 check (pa_24 between 0 and 5),
  pa_25 smallint not null default 0 check (pa_25 between 0 and 5),
  estado text not null default 'borrador' check (estado in ('borrador', 'completa', 'validada')),
  origen text not null default 'app' check (origen in ('app', 'importado')),
  observaciones text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  eliminado_en timestamptz,
  constraint encuesta_completa_consentimiento
    check (estado <> 'completa' or consentimiento = true),
  constraint encuesta_completa_datos
    check (
      estado <> 'completa' or (
        edad is not null and sexo is not null and estado_civil is not null
        and instruccion is not null and area_id is not null
        and nivel_responsabilidad is not null and antiguedad is not null
        and frecuencia_uso is not null and participacion is not null
      )
    ),
  constraint encuesta_completa_fecha
    check (estado <> 'completa' or fecha_encuesta is not null or origen = 'importado'),
  constraint encuesta_completa_consentimiento_fecha
    check (estado <> 'completa' or consentimiento_en is not null or origen = 'importado'),
  constraint encuesta_completa_usuario
    check (estado <> 'completa' or usuario_id is not null or origen = 'importado')
);

create index if not exists encuestas_usuario_idx
  on public.encuestas (usuario_id, creado_en desc);
create index if not exists encuestas_estado_fecha_idx
  on public.encuestas (estado, fecha_encuesta);
create index if not exists encuestas_area_idx
  on public.encuestas (area_id);
create index if not exists encuestas_sexo_idx
  on public.encuestas (sexo);
create index if not exists encuestas_creado_idx
  on public.encuestas (creado_en desc);

-- ------------------------------------------------------------
-- Auditoría
-- ------------------------------------------------------------
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users(id) on delete set null,
  accion text not null,
  encuesta_id uuid,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists auditoria_creado_idx
  on public.auditoria (creado_en desc);
create index if not exists auditoria_encuesta_idx
  on public.auditoria (encuesta_id);

-- ------------------------------------------------------------
-- Funciones de apoyo
-- ------------------------------------------------------------
create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and activo = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and rol = 'admin'
      and activo = true
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- Crea el perfil cuando nace un usuario en auth.users.
-- El correo institucional del administrador recibe el rol admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nombre, email, rol, activo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)),
    new.email,
    case when lower(new.email) = 'pieroaven@encuesta.com' then 'admin' else 'encuestador' end,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Asigna el número correlativo al completar una encuesta.
-- No consume número en borradores. Protege el número ya asignado.
create or replace function public.before_encuesta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if old.numero is not null
       and new.numero is distinct from old.numero
       and not public.is_admin() then
      raise exception 'El número de encuesta no puede modificarse';
    end if;
  end if;

  if new.estado = 'completa' and new.numero is null then
    if exists (
      select 1 from public.encuestas
      where client_id = new.client_id
        and id <> new.id
    ) then
      raise exception 'La encuesta ya fue registrada' using errcode = '23505';
    end if;
    new.numero := nextval('public.encuestas_numero_seq');
  end if;

  new.actualizado_en := now();
  return new;
end;
$$;

-- Auditoría de cambios sobre encuestas.
create or replace function public.auditar_encuesta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_numero bigint;
  v_estado text;
  v_origen text;
  v_usuario uuid;
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
    v_numero := old.numero;
    v_estado := old.estado;
    v_origen := old.origen;
    v_usuario := old.usuario_id;
  else
    v_id := new.id;
    v_numero := new.numero;
    v_estado := new.estado;
    v_origen := new.origen;
    v_usuario := new.usuario_id;
  end if;

  insert into public.auditoria (usuario_id, accion, encuesta_id, detalle)
  values (
    coalesce(auth.uid(), v_usuario),
    tg_op,
    v_id,
    jsonb_build_object(
      'numero', v_numero,
      'estado', v_estado,
      'origen', v_origen
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Disparadores
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists encuestas_before on public.encuestas;
create trigger encuestas_before
  before insert or update on public.encuestas
  for each row execute function public.before_encuesta();

drop trigger if exists encuestas_audit on public.encuestas;
create trigger encuestas_audit
  after insert or update or delete on public.encuestas
  for each row execute function public.auditar_encuesta();

-- ------------------------------------------------------------
-- Vista interna de ítems (una fila por respuesta 1..5).
-- Es propiedad del rol postgres y NO se concede a los usuarios:
-- solo la usa la función de dashboard (security definer).
-- ------------------------------------------------------------
create or replace view public.v_encuestas_items as
select
  e.id,
  'TD'::text as tipo,
  u.idx::int as item,
  u.val::int as valor,
  (((u.idx - 1) / 5) + 1)::int as dimension
from public.encuestas e
cross join lateral unnest(array[e.td_01, e.td_02, e.td_03, e.td_04, e.td_05, e.td_06, e.td_07, e.td_08, e.td_09, e.td_10, e.td_11, e.td_12, e.td_13, e.td_14, e.td_15, e.td_16, e.td_17, e.td_18, e.td_19, e.td_20, e.td_21, e.td_22, e.td_23, e.td_24, e.td_25]) with ordinality as u(val, idx)
where u.val between 1 and 5
union all
select
  e.id,
  'PA'::text as tipo,
  u.idx::int as item,
  u.val::int as valor,
  (((u.idx - 1) / 5) + 1)::int as dimension
from public.encuestas e
cross join lateral unnest(array[e.pa_01, e.pa_02, e.pa_03, e.pa_04, e.pa_05, e.pa_06, e.pa_07, e.pa_08, e.pa_09, e.pa_10, e.pa_11, e.pa_12, e.pa_13, e.pa_14, e.pa_15, e.pa_16, e.pa_17, e.pa_18, e.pa_19, e.pa_20, e.pa_21, e.pa_22, e.pa_23, e.pa_24, e.pa_25]) with ordinality as u(val, idx)
where u.val between 1 and 5;

revoke all on public.v_encuestas_items from anon, authenticated;

-- ------------------------------------------------------------
-- Dashboard agregado
-- Devuelve solo agregados; nunca filas individuales.
-- Los usuarios no administradores ven grupos con n >= 3.
-- ------------------------------------------------------------
create or replace function public.dashboard_resumen(
  p_desde date default null,
  p_hasta date default null,
  p_area bigint default null,
  p_sexo text default null,
  p_usuario uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_result jsonb;
begin
  if not public.is_active() then
    return jsonb_build_object('insuficiente', true, 'total', 0, 'inactivo', true);
  end if;

  if not v_is_admin then
    p_usuario := null;
  end if;

  with base as (
      select e.*
      from public.encuestas e
      where e.estado in ('completa', 'validada')
        and e.eliminado_en is null
        and (p_desde is null or e.fecha_encuesta >= p_desde)
        and (p_hasta is null or e.fecha_encuesta <= p_hasta)
        and (p_area is null or e.area_id = p_area)
        and (p_sexo is null or e.sexo = p_sexo)
        and (p_usuario is null or e.usuario_id = p_usuario)
    ),
    td_items as (
      select i.id, i.item, i.valor, i.dimension
      from public.v_encuestas_items i
      join base b on b.id = i.id
      where i.tipo = 'TD'
    ),
    pa_items as (
      select i.id, i.item, i.valor, i.dimension
      from public.v_encuestas_items i
      join base b on b.id = i.id
      where i.tipo = 'PA'
    ),
    kpis as (
      select
        (select count(*) from base)::int as total,
        (select round(avg(valor), 2) from td_items) as td,
        (select round(avg(valor), 2) from pa_items) as pa,
        (select count(*) from base where fecha_encuesta is null)::int as sin_fecha,
        (
          select count(*) from base
          where fecha_encuesta >= date_trunc('month', current_date)::date
        )::int as este_mes
    ),
    distribucion as (
      select valor, count(*)::int as n
      from (
        select valor from td_items
        union all
        select valor from pa_items
      ) x
      group by valor
      order by valor
    ),
    td_dims as (
      select dimension, round(avg(valor), 2) as promedio, count(*)::int as n
      from td_items
      group by dimension
    ),
    pa_dims as (
      select dimension, round(avg(valor), 2) as promedio, count(*)::int as n
      from pa_items
      group by dimension
    ),
    td_cat as (
      select * from (values
        (1, 'Estrategia, liderazgo y gobernanza digital'),
        (2, 'Infraestructura tecnológica y plataformas digitales'),
        (3, 'Interoperabilidad y gestión de datos públicos'),
        (4, 'Digitalización y rediseño de procesos y servicios'),
        (5, 'Competencias digitales, cultura organizacional y orientación ciudadana')
      ) as t(id, nombre)
    ),
    pa_cat as (
      select * from (values
        (1, 'Simplificación y racionalización de trámites y procedimientos'),
        (2, 'Gestión documental, trazabilidad y seguimiento'),
        (3, 'Eficiencia operativa y uso de recursos'),
        (4, 'Coordinación interáreas e integración procedimental'),
        (5, 'Control, transparencia y rendición de cuentas')
      ) as t(id, nombre)
    ),
    area_agg as (
      select
        coalesce(a.nombre, 'No especificado') as nombre,
        count(distinct b.id)::int as n,
        round(avg(case when i.tipo = 'TD' then i.valor end), 2) as td,
        round(avg(case when i.tipo = 'PA' then i.valor end), 2) as pa
      from base b
      left join public.areas a on a.id = b.area_id
      left join public.v_encuestas_items i on i.id = b.id
      group by 1
      having count(distinct b.id) >= (case when v_is_admin then 0 else 3 end)
      order by n desc, nombre
    ),
    sexo_agg as (
      select
        b.sexo,
        count(distinct b.id)::int as n,
        round(avg(case when i.tipo = 'TD' then i.valor end), 2) as td,
        round(avg(case when i.tipo = 'PA' then i.valor end), 2) as pa
      from base b
      left join public.v_encuestas_items i on i.id = b.id
      where b.sexo is not null
      group by b.sexo
      having count(distinct b.id) >= (case when v_is_admin then 0 else 3 end)
      order by b.sexo
    ),
    evolucion as (
      select
        to_char(date_trunc('month', b.fecha_encuesta), 'YYYY-MM') as mes,
        count(distinct b.id)::int as n,
        round(avg(case when i.tipo = 'TD' then i.valor end), 2) as td,
        round(avg(case when i.tipo = 'PA' then i.valor end), 2) as pa
      from base b
      left join public.v_encuestas_items i on i.id = b.id
      where b.fecha_encuesta is not null
      group by 1
      having count(distinct b.id) >= (case when v_is_admin then 0 else 3 end)
      order by 1
    ),
    items_td as (
      select item, round(avg(valor), 2) as promedio, count(*)::int as n
      from td_items
      group by item
      order by item
    ),
    items_pa as (
      select item, round(avg(valor), 2) as promedio, count(*)::int as n
      from pa_items
      group by item
      order by item
    )
    select case
      when not v_is_admin and (select total from kpis) < 3
        then jsonb_build_object(
          'insuficiente', true,
          'total', (select total from kpis)
        )
      else jsonb_build_object(
        'insuficiente', false,
        'kpis', (select to_jsonb(k) from kpis k),
        'meta', 336,
        'dimensiones_td', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'nombre', c.nombre,
              'promedio', d.promedio,
              'n', d.n
            ) order by c.id
          )
          from td_cat c
          left join td_dims d on d.dimension = c.id
        ), '[]'::jsonb),
        'dimensiones_pa', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'nombre', c.nombre,
              'promedio', d.promedio,
              'n', d.n
            ) order by c.id
          )
          from pa_cat c
          left join pa_dims d on d.dimension = c.id
        ), '[]'::jsonb),
        'distribucion', coalesce((
          select jsonb_agg(jsonb_build_object('valor', valor, 'n', n) order by valor)
          from distribucion
        ), '[]'::jsonb),
        'por_area', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'nombre', nombre,
              'n', n,
              'td', td,
              'pa', pa
            ) order by n desc, nombre
          )
          from area_agg
        ), '[]'::jsonb),
        'por_sexo', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'sexo', sexo,
              'n', n,
              'td', td,
              'pa', pa
            ) order by sexo
          )
          from sexo_agg
        ), '[]'::jsonb),
        'evolucion', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'mes', mes,
              'n', n,
              'td', td,
              'pa', pa
            ) order by mes
          )
          from evolucion
        ), '[]'::jsonb),
        'items_td', coalesce((
          select jsonb_agg(
            jsonb_build_object('item', item, 'promedio', promedio, 'n', n)
            order by item
          )
          from items_td
        ), '[]'::jsonb),
        'items_pa', coalesce((
          select jsonb_agg(
            jsonb_build_object('item', item, 'promedio', promedio, 'n', n)
            order by item
          )
          from items_pa
        ), '[]'::jsonb)
      )
    end
  into v_result;

  return v_result;
end;
$$;

-- ------------------------------------------------------------
-- Administración de usuarios (RPC segura)
-- Se ejecuta como owner de la base y verifica is_admin().
-- No requiere Edge Function ni service_role en el navegador.
-- ------------------------------------------------------------
create or replace function public.admin_crear_usuario(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_rol text := trim(coalesce(p_rol, ''));
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador activo puede crear usuarios.'
      using errcode = '42501';
  end if;

  if length(v_nombre) < 2 then
    raise exception 'Ingresa el nombre completo del usuario.'
      using errcode = '22023';
  end if;

  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Ingresa un correo válido.'
      using errcode = '22023';
  end if;

  if p_password is null
     or length(p_password) < 8
     or length(p_password) > 128 then
    raise exception 'La contraseña temporal debe tener entre 8 y 128 caracteres.'
      using errcode = '22023';
  end if;

  if v_rol not in ('admin', 'encuestador') then
    raise exception 'El rol indicado no es válido.'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from auth.users where lower(email) = v_email
  ) then
    raise exception 'Ya existe una cuenta con ese correo.'
      using errcode = '23505';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'sub', v_id::text,
      'email', v_email,
      'nombre', v_nombre,
      'email_verified', true
    ),
    false,
    false,
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  )
  values (
    v_id,
    v_id::text,
    'email',
    jsonb_build_object(
      'sub', v_id::text,
      'email', v_email,
      'nombre', v_nombre,
      'email_verified', true
    ),
    now(),
    now(),
    now()
  );

  update public.profiles
     set nombre = v_nombre,
         email = v_email,
         rol = v_rol,
         activo = true
   where id = v_id;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', v_id,
      'email', v_email,
      'nombre', v_nombre,
      'rol', v_rol
    )
  );
exception
  when unique_violation then
    raise exception 'Ya existe una cuenta con ese correo.'
      using errcode = '23505';
end;
$$;

create or replace function public.admin_restablecer_password(
  p_id uuid,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador activo puede restablecer contraseñas.'
      using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'Falta el identificador del usuario.'
      using errcode = '22023';
  end if;

  if p_password is null
     or length(p_password) < 8
     or length(p_password) > 128 then
    raise exception 'La nueva contraseña debe tener entre 8 y 128 caracteres.'
      using errcode = '22023';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_id;

  if not found then
    raise exception 'Usuario no encontrado.'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object('id', p_id)
  );
end;
$$;

-- ------------------------------------------------------------
-- Seguridad a nivel de fila (RLS)
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.encuestas enable row level security;
alter table public.auditoria enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists areas_select on public.areas;
create policy areas_select on public.areas
  for select to authenticated
  using (public.is_active() or public.is_admin());

drop policy if exists areas_admin_all on public.areas;
create policy areas_admin_all on public.areas
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists encuestas_select on public.encuestas;
create policy encuestas_select on public.encuestas
  for select to authenticated
  using ((public.is_active() and usuario_id = auth.uid()) or public.is_admin());

drop policy if exists encuestas_insert on public.encuestas;
create policy encuestas_insert on public.encuestas
  for insert to authenticated
  with check ((public.is_active() and usuario_id = auth.uid()) or public.is_admin());

drop policy if exists encuestas_update on public.encuestas;
create policy encuestas_update on public.encuestas
  for update to authenticated
  using ((public.is_active() and usuario_id = auth.uid()) or public.is_admin())
  with check ((public.is_active() and usuario_id = auth.uid()) or public.is_admin());

drop policy if exists encuestas_delete on public.encuestas;
create policy encuestas_delete on public.encuestas
  for delete to authenticated
  using (public.is_admin());

drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria
  for select to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------
-- Permisos
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.areas to authenticated;
grant select, insert, update, delete on public.encuestas to authenticated;
grant select on public.auditoria to authenticated;
grant usage, select on sequence public.areas_id_seq to authenticated;

revoke all on function public.is_active() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.before_encuesta() from public;
revoke all on function public.auditar_encuesta() from public;
revoke all on function public.touch_updated_at() from public;
revoke all on function public.dashboard_resumen(date, date, bigint, text, uuid) from public;
revoke all on function public.admin_crear_usuario(text, text, text, text) from public;
revoke all on function public.admin_restablecer_password(uuid, text) from public;
grant execute on function public.is_active() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.dashboard_resumen(date, date, bigint, text, uuid) to authenticated;
grant execute on function public.admin_crear_usuario(text, text, text, text) to authenticated;
grant execute on function public.admin_restablecer_password(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Notas de datos
-- ------------------------------------------------------------
comment on table public.encuestas is
  'Encuestas TD/PA. numero 1..107 = históricos importados; 108+ = nuevas. Los ítems usan 0 = N/A.';
comment on column public.encuestas.client_id is
  'Identificador idempotente del formulario para evitar doble envío.';
comment on column public.encuestas.fecha_encuesta is
  'Fecha de aplicación. Los registros históricos importados no tienen fecha y quedan fuera de la evolución mensual.';
