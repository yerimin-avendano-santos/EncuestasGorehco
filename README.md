# Encuestas GOREHCO 2026

Aplicación web multiusuario para registrar las encuestas del estudio **Transformación digital y procesos administrativos en el Gobierno Regional de Huánuco, 2026**.

Incluye acceso con Supabase Auth, formulario de 50 enunciados, borradores locales, panel agregado, registros por usuario, exportación Excel con el formato original y administración de usuarios y áreas.

## Funcionalidad

- **Acceso seguro** con correo y contraseña. Las cuentas inactivas quedan bloqueadas.
- **Formulario en cinco pasos**: consentimiento, datos generales, dimensión TD (X1–X5), dimensión PA (Y1–Y5) y revisión.
- **Borradores locales** por usuario en `localStorage`; no consumen número correlativo.
- **Numeración automática** desde 108. El número se asigna al enviar, no al guardar.
- **Prevención de doble envío** mediante bloqueo de la acción y `client_id` único en la base de datos.
- **Panel agregado** con promedios por dimensión, área, sexo, evolución mensual, distribución y avance hacia la meta de 336 encuestas.
- **Registros** propios para encuestadores y todos los registros para administradores.
- **Exportación Excel** con las cuatro hojas del formato original: `Base 2026`, `Resumen`, `Diccionario` y `Control`.
- **Administración** de usuarios: crear, restablecer contraseña, activar/desactivar y cambiar rol. También permite gestionar áreas.
- **Mi cuenta**: nombre visible y cambio de contraseña con validación de la contraseña actual.
- **Diseño responsive** según `DESIGN.md`, sin barra lateral.

## Privacidad y seguridad

- Las respuestas no solicitan nombre, DNI ni otros datos identificatorios de la persona encuestada.
- RLS está activo en todas las tablas. Un encuestador solo puede leer y editar sus propios registros; un administrador ve todos.
- La vista interna de ítems y la función agregada del panel no están expuestas a usuarios anónimos.
- La creación de usuarios y el restablecimiento de contraseñas usan funciones `SECURITY DEFINER` que verifican el rol de administrador. **No se usa `service_role` en el navegador ni se requiere desplegar una Edge Function.**
- Los borradores se guardan únicamente en el dispositivo del encuestador.
- `robots.txt` y la etiqueta `noindex` evitan la indexación en buscadores.

## Requisitos

- Node.js 20 o superior.
- Un proyecto de Supabase.
- Opcional: `DATABASE_URL` (cadena de conexión Postgres) solo para aplicar el esquema, importar datos o ejecutar verificaciones desde scripts.

## Configuración local

```bash
npm install
cp .env.example .env.local
```

Edita `.env.local`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_publishable_key
```

La publishable/anon key es pública por diseño. **Nunca coloques la `service_role` key en el frontend.**

Ejecuta:

```bash
npm run dev
```

La app queda en `http://localhost:5173`.

## Base de datos

El esquema se genera desde `scripts/generate-schema.mjs`:

```bash
node scripts/generate-schema.mjs
```

Aplícalo con la cadena de conexión de Postgres (usa la conexión del pooler y SSL):

```powershell
$env:DATABASE_URL="postgresql://..."
npm run db:apply
```

Esto crea o actualiza tablas, secuencia, funciones, triggers, RLS y políticas. No borra encuestas existentes.

### Importación histórica

El archivo fuente está en `data/source/encuestas_2026.csv` y corresponde a los 107 registros históricos.

```powershell
$env:DATABASE_URL="postgresql://..."
npm run db:import
npm run db:verify
```

`db:verify` comprueba:

- 107 registros importados, numerados exactamente del 1 al 107.
- Promedios históricos TD **3.52** y PA **3.71**.
- Secuencia y ausencia de números duplicados.

### Primer administrador

1. Crea la cuenta en Supabase Dashboard → Authentication → Users (o mediante el flujo de alta).
2. Con `DATABASE_URL` definida en la terminal, ejecuta:

```bash
node scripts/setup-admin.mjs correo@encuesta.com "Nombre completo"
```

El script confirma el correo, crea/actualiza el perfil y asigna el rol `admin`.

> La cuenta administradora inicial ya fue creada. Cambia la contraseña temporal desde **Mi cuenta** después del primer ingreso.

## Administración de usuarios

Desde **Administración → Usuarios** el administrador puede:

- Crear una cuenta con correo, nombre, rol y contraseña temporal.
- Restablecer la contraseña de cualquier cuenta.
- Activar o desactivar el acceso.
- Cambiar entre rol `admin` y `encuestador`.

Las acciones se ejecutan mediante las RPC `admin_crear_usuario` y `admin_restablecer_password`, protegidas por `is_admin()`.

## Exportación Excel

La exportación se genera en el navegador con ExcelJS y mantiene el orden de las 60 columnas originales:

- `Base 2026`: una fila por encuesta; los ítems N/A quedan en blanco.
- `Resumen`: promedios por dimensión e ítem.
- `Diccionario`: correspondencia entre códigos y enunciados.
- `Control`: totales y trazabilidad.

Los encuestadores solo exportan sus registros. Los administradores exportan todo el estudio. Las filas históricas sin fecha de aplicación se incluyen con la fecha vacía.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | TypeScript + build de producción |
| `npm run preview` | Vista previa del build |
| `npm run db:apply` | Aplica el esquema generado |
| `npm run db:import` | Importa el CSV histórico |
| `npm run db:verify` | Verifica numeración, promedios y secuencia |

## Publicación

El proyecto incluye configuraciones para:

- **Netlify**: `netlify.toml` y `public/_redirects`.
- **Vercel**: `vercel.json`.
- **Cloudflare Pages**: usa `npm run build`, directorio `dist`; el SPA fallback ya está en `_redirects`.

Configura en el proveedor las variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

No se necesita ninguna clave secreta en el hosting.

## Operación y respaldo

- Supabase Free puede pausar el proyecto por inactividad. Revisa el panel periódicamente.
- El Free plan no ofrece copias descargables completas. **Descarga un Excel de respaldo con frecuencia.**
- Rota la contraseña de la base de datos después de la configuración y no la compartas por correo ni la guardes en el repositorio.
- Revisa que la hoja de cálculo original de Google ya no tenga acceso público una vez cerrada la migración inicial.
- Los borradores locales se eliminan al enviar. Si se usa un equipo compartido, el encuestador debe cerrar sesión al terminar.
