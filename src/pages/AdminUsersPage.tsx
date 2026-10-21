import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  adminCreateUser,
  adminResetPassword,
  createArea,
  errorMessage,
  fetchAreas,
  fetchProfiles,
  updateArea,
  updateProfile,
} from '../lib/api';
import { formatDateTime, normalizeEmailInput, plural } from '../lib/format';
import type { Area, Profile, Rol } from '../types';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { ActiveBadge, Alert, Avatar, EmptyState, PageLoader, RoleBadge } from '../components/Ui';

type Tab = 'usuarios' | 'areas';

interface Credentials {
  nombre: string;
  email: string;
  password: string;
  kind: 'created' | 'reset';
}

export function AdminUsersPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('usuarios');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRol, setCreateRol] = useState<Rol>('encuestador');
  const [createShowPassword, setCreateShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [resetProfile, setResetProfile] = useState<Profile | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [toggleProfile, setToggleProfile] = useState<Profile | null>(null);
  const [toggling, setToggling] = useState(false);

  const [roleProfile, setRoleProfile] = useState<Profile | null>(null);
  const [roleTarget, setRoleTarget] = useState<Rol>('encuestador');
  const [changingRole, setChangingRole] = useState(false);

  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const [areaName, setAreaName] = useState('');
  const [areaOrder, setAreaOrder] = useState('');
  const [savingArea, setSavingArea] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const [editAreaName, setEditAreaName] = useState('');
  const [editAreaOrder, setEditAreaOrder] = useState('');
  const [editAreaDescription, setEditAreaDescription] = useState('');
  const [savingEditArea, setSavingEditArea] = useState(false);
  const [toggleArea, setToggleArea] = useState<Area | null>(null);
  const [togglingArea, setTogglingArea] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, areaData] = await Promise.all([
        fetchProfiles(),
        fetchAreas(true),
      ]);
      setProfiles(profileData);
      setAreas(areaData);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // Carga inicial de la administración.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = [...profiles].sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1;
      if (a.rol !== b.rol) return a.rol === 'admin' ? -1 : 1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
    if (!needle) return sorted;
    return sorted.filter(
      (item) =>
        item.nombre.toLowerCase().includes(needle) ||
        item.email.toLowerCase().includes(needle),
    );
  }, [profiles, query]);

  const activeCount = profiles.filter((item) => item.activo).length;
  const adminCount = profiles.filter((item) => item.rol === 'admin').length;

  const openCreate = () => {
    setCreateName('');
    setCreateEmail('');
    setCreatePassword(generatePassword());
    setCreateRol('encuestador');
    setCreateError(null);
    setCreateShowPassword(true);
    setCreateOpen(true);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    const fullEmail = normalizeEmailInput(createEmail);
    if (!createName.trim()) {
      setCreateError('Ingresa el nombre completo del usuario.');
      return;
    }
    if (!fullEmail || !fullEmail.includes('@')) {
      setCreateError('Ingresa un correo o usuario válido.');
      return;
    }
    if (createPassword.length < 8) {
      setCreateError('La contraseña temporal debe tener al menos 8 caracteres.');
      return;
    }

    setCreating(true);
    try {
      const result = await adminCreateUser({
        email: fullEmail,
        password: createPassword,
        nombre: createName.trim(),
        rol: createRol,
      });
      if (!result.ok) throw new Error(result.error || 'No se pudo crear el usuario.');
      setCreateOpen(false);
      setCredentials({
        nombre: createName.trim(),
        email: fullEmail,
        password: createPassword,
        kind: 'created',
      });
      toast('Usuario creado. Comparte las credenciales temporales.', 'success');
      await loadData();
    } catch (createFailure) {
      setCreateError(errorMessage(createFailure));
    } finally {
      setCreating(false);
    }
  };

  const openReset = (item: Profile) => {
    setResetProfile(item);
    setResetPassword(generatePassword());
    setResetShowPassword(true);
    setResetError(null);
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetProfile) return;
    setResetError(null);
    if (resetPassword.length < 8) {
      setResetError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setResetting(true);
    try {
      const result = await adminResetPassword(resetProfile.id, resetPassword);
      if (!result.ok) {
        throw new Error(result.error || 'No se pudo restablecer la contraseña.');
      }
      const target = resetProfile;
      setResetProfile(null);
      setCredentials({
        nombre: target.nombre,
        email: target.email,
        password: resetPassword,
        kind: 'reset',
      });
      toast('Contraseña restablecida. Comparte la nueva clave temporal.', 'success');
    } catch (resetFailure) {
      setResetError(errorMessage(resetFailure));
    } finally {
      setResetting(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleProfile) return;
    if (toggleProfile.id === profile?.id) {
      toast('No puedes desactivar tu propia cuenta.', 'error');
      setToggleProfile(null);
      return;
    }
    setToggling(true);
    try {
      const next = !toggleProfile.activo;
      await updateProfile(toggleProfile.id, { activo: next });
      toast(
        next
          ? 'Usuario activado. Ya puede volver a ingresar.'
          : 'Usuario desactivado. Se bloquea el acceso y las consultas.',
        'success',
      );
      setToggleProfile(null);
      await loadData();
    } catch (toggleFailure) {
      toast(errorMessage(toggleFailure), 'error');
    } finally {
      setToggling(false);
    }
  };

  const openRole = (item: Profile) => {
    setRoleProfile(item);
    setRoleTarget(item.rol === 'admin' ? 'encuestador' : 'admin');
  };

  const handleRole = async () => {
    if (!roleProfile) return;
    if (roleProfile.id === profile?.id) {
      toast('No puedes cambiar tu propio rol.', 'error');
      setRoleProfile(null);
      return;
    }
    setChangingRole(true);
    try {
      await updateProfile(roleProfile.id, { rol: roleTarget });
      toast(
        roleTarget === 'admin'
          ? 'El usuario ahora es administrador.'
          : 'El usuario ahora es encuestador.',
        'success',
      );
      setRoleProfile(null);
      await loadData();
    } catch (roleFailure) {
      toast(errorMessage(roleFailure), 'error');
    } finally {
      setChangingRole(false);
    }
  };

  const handleCreateArea = async (event: FormEvent) => {
    event.preventDefault();
    setAreaError(null);
    if (!areaName.trim()) {
      setAreaError('Ingresa el nombre del área.');
      return;
    }
    setSavingArea(true);
    try {
      const orden =
        Number(areaOrder) || Math.max(0, ...areas.map((item) => item.orden)) + 1;
      await createArea({
        nombre: areaName.trim(),
        orden,
      });
      setAreaName('');
      setAreaOrder('');
      toast('Área creada.', 'success');
      await loadData();
    } catch (areaFailure) {
      setAreaError(errorMessage(areaFailure));
    } finally {
      setSavingArea(false);
    }
  };

  const openEditArea = (area: Area) => {
    setEditArea(area);
    setEditAreaName(area.nombre);
    setEditAreaOrder(String(area.orden));
    setEditAreaDescription(area.descripcion ?? '');
  };

  const handleEditArea = async (event: FormEvent) => {
    event.preventDefault();
    if (!editArea) return;
    setSavingEditArea(true);
    try {
      await updateArea(editArea.id, {
        nombre: editAreaName.trim(),
        orden: Number(editAreaOrder) || editArea.orden,
        descripcion: editAreaDescription.trim() || null,
      });
      toast('Área actualizada.', 'success');
      setEditArea(null);
      await loadData();
    } catch (areaFailure) {
      toast(errorMessage(areaFailure), 'error');
    } finally {
      setSavingEditArea(false);
    }
  };

  const handleToggleArea = async () => {
    if (!toggleArea) return;
    setTogglingArea(true);
    try {
      await updateArea(toggleArea.id, { activo: !toggleArea.activo });
      toast(
        toggleArea.activo
          ? 'Área desactivada. No aparecerá en encuestas nuevas.'
          : 'Área activada. Ya está disponible para encuestas nuevas.',
        'success',
      );
      setToggleArea(null);
      await loadData();
    } catch (areaFailure) {
      toast(errorMessage(areaFailure), 'error');
    } finally {
      setTogglingArea(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado al portapapeles.', 'success');
    } catch {
      toast('No se pudo copiar automáticamente. Selecciona el texto.', 'error');
    }
  };

  if (loading && !profiles.length && !areas.length) {
    return <PageLoader label="Cargando usuarios y áreas…" />;
  }

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Configuración del estudio"
        title="Administración"
        subtitle="Gestiona el equipo encuestador, los roles y las áreas disponibles en el instrumento."
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              icon={<RefreshCw size={15} />}
              onClick={() => void loadData()}
              aria-label="Actualizar"
            />
            {tab === 'usuarios' ? (
              <Button variant="primary" icon={<UserPlus size={15} />} onClick={openCreate}>
                Nuevo usuario
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Plus size={15} />}
                onClick={() =>
                  document.getElementById('nueva-area-input')?.focus()
                }
              >
                Nueva área
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-3 section" style={{ marginBottom: 20 }}>
        <div className="kpi-card" style={{ minHeight: 96 }}>
          <div className="kpi-top">
            <span className="kpi-label">Usuarios del equipo</span>
            <span className="kpi-icon">
              <Users size={15} />
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {profiles.length}
          </div>
        </div>
        <div className="kpi-card" style={{ minHeight: 96 }}>
          <div className="kpi-top">
            <span className="kpi-label">Usuarios activos</span>
            <span className="kpi-icon">
              <Check size={15} />
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {activeCount}
          </div>
        </div>
        <div className="kpi-card" style={{ minHeight: 96 }}>
          <div className="kpi-top">
            <span className="kpi-label">Áreas configuradas</span>
            <span className="kpi-icon">
              <Building2 size={15} />
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: 28 }}>
            {areas.length}
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Secciones de administración">
        <button
          type="button"
          className={`tab${tab === 'usuarios' ? ' active' : ''}`}
          onClick={() => setTab('usuarios')}
          role="tab"
          aria-selected={tab === 'usuarios'}
        >
          Usuarios <span className="muted">({profiles.length})</span>
        </button>
        <button
          type="button"
          className={`tab${tab === 'areas' ? ' active' : ''}`}
          onClick={() => setTab('areas')}
          role="tab"
          aria-selected={tab === 'areas'}
        >
          Áreas <span className="muted">({areas.length})</span>
        </button>
      </div>

      {tab === 'usuarios' ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <Alert tone="success">
              <strong>Administración segura.</strong> La creación de usuarios y el
              restablecimiento de contraseñas se validan en la base de datos con tu rol
              de administrador. Ninguna clave de servicio se expone en el navegador.
            </Alert>
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert tone="danger" title="No se pudieron cargar los usuarios.">
                {error}
              </Alert>
            </div>
          )}

          <div className="card">
            <div className="table-toolbar">
              <div className="admin-toolbar-left">
                <div className="search-input">
                  <Search size={14} />
                  <input
                    className="input"
                    type="search"
                    placeholder="Buscar usuario…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Buscar usuarios"
                  />
                </div>
                <span className="badge badge-muted">
                  {filteredProfiles.length} de {profiles.length}
                </span>
              </div>
              <span className="small muted">
                {plural(adminCount, 'administrador', 'administradores')}
              </span>
            </div>

            {filteredProfiles.length ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Creado</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((item) => {
                      const isSelf = item.id === profile?.id;
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="user-cell">
                              <Avatar name={item.nombre} />
                              <div className="user-cell-copy">
                                <span className="user-cell-name">
                                  {item.nombre} {isSelf && <span className="muted">(tú)</span>}
                                </span>
                                <span className="user-cell-email">{item.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <RoleBadge rol={item.rol} />
                          </td>
                          <td>
                            <ActiveBadge activo={item.activo} />
                          </td>
                          <td className="cell-nowrap small muted">
                            {formatDateTime(item.creado_en)}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-icon"
                                title="Restablecer contraseña"
                                aria-label={`Restablecer contraseña de ${item.nombre}`}
                                onClick={() => openReset(item)}
                              >
                                <KeyRound size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-icon"
                                title={
                                  isSelf
                                    ? 'No puedes cambiar tu propio rol'
                                    : item.rol === 'admin'
                                      ? 'Convertir en encuestador'
                                      : 'Convertir en administrador'
                                }
                                aria-label={`Cambiar rol de ${item.nombre}`}
                                onClick={() => openRole(item)}
                                disabled={isSelf}
                              >
                                {item.rol === 'admin' ? (
                                  <UserRound size={14} />
                                ) : (
                                  <Shield size={14} />
                                )}
                              </button>
                              <button
                                type="button"
                                className={`btn btn-icon${item.activo ? ' danger' : ''}`}
                                title={
                                  isSelf
                                    ? 'No puedes desactivar tu propia cuenta'
                                    : item.activo
                                      ? 'Desactivar usuario'
                                      : 'Activar usuario'
                                }
                                aria-label={
                                  item.activo
                                    ? `Desactivar a ${item.nombre}`
                                    : `Activar a ${item.nombre}`
                                }
                                onClick={() => setToggleProfile(item)}
                                disabled={isSelf}
                              >
                                {item.activo ? (
                                  <PowerOff size={14} />
                                ) : (
                                  <Power size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Users size={19} />}
                title={query ? 'No hay usuarios que coincidan' : 'No hay usuarios'}
                text={
                  query
                    ? 'Prueba con otro nombre o correo.'
                    : 'Crea el primer usuario del equipo encuestador.'
                }
                actions={
                  <Button variant="primary" size="sm" onClick={openCreate}>
                    <UserPlus size={14} />
                    Nuevo usuario
                  </Button>
                }
              />
            )}

            <div className="table-footer">
              <span>
                Los usuarios inactivos no pueden iniciar sesión ni consultar datos.
              </span>
              <span className="row gap-6">
                <ShieldCheck size={12} />
                RLS activo en todas las tablas
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <div className="row-between wrap gap-16" style={{ marginBottom: 14 }}>
              <div>
                <h2 className="card-title">Áreas del instrumento</h2>
                <p className="card-subtitle">
                  Estas opciones aparecen en “Área / grupo funcional principal” al
                  registrar una encuesta. Las áreas inactivas se conservan en los
                  registros existentes.
                </p>
              </div>
            </div>
            <form className="inline-form" onSubmit={handleCreateArea}>
              <div className="field">
                <label className="field-label" htmlFor="nueva-area-input">
                  Nombre del área
                </label>
                <input
                  id="nueva-area-input"
                  className="input"
                  placeholder="Ej. Recursos humanos"
                  value={areaName}
                  onChange={(event) => setAreaName(event.target.value)}
                />
              </div>
              <div className="field narrow">
                <label className="field-label" htmlFor="nueva-area-orden">
                  Orden
                </label>
                <input
                  id="nueva-area-orden"
                  className="input"
                  type="number"
                  min={1}
                  placeholder={String(Math.max(0, ...areas.map((item) => item.orden)) + 1)}
                  value={areaOrder}
                  onChange={(event) => setAreaOrder(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                icon={<Plus size={14} />}
                loading={savingArea}
              >
                Agregar
              </Button>
            </form>
            {areaError && (
              <p className="field-error" style={{ marginTop: 8 }}>
                {areaError}
              </p>
            )}
          </div>

          <div className="card">
            <div className="table-toolbar">
              <span className="table-toolbar-title">Listado de áreas</span>
              <span className="badge badge-muted">
                {plural(areas.length, 'área', 'áreas')}
              </span>
            </div>
            <div className="card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {areas.length ? (
                areas.map((area) => (
                  <div className="area-admin-row" key={area.id}>
                    <div className="area-admin-name">
                      <span className="dimension-code">{area.orden}</span>
                      <span>{area.nombre}</span>
                      {!area.activo && <span className="badge badge-muted">Inactiva</span>}
                    </div>
                    <div className="area-admin-actions">
                      <button
                        type="button"
                        className="btn btn-icon"
                        title="Editar área"
                        aria-label={`Editar ${area.nombre}`}
                        onClick={() => openEditArea(area)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={`btn btn-icon${area.activo ? ' danger' : ''}`}
                        title={area.activo ? 'Desactivar área' : 'Activar área'}
                        aria-label={
                          area.activo
                            ? `Desactivar ${area.nombre}`
                            : `Activar ${area.nombre}`
                        }
                        onClick={() => setToggleArea(area)}
                      >
                        {area.activo ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Building2 size={19} />}
                  title="No hay áreas configuradas"
                  text="Agrega la primera área para que aparezca en las encuestas."
                />
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        title="Nuevo usuario"
        subtitle="Se crea una cuenta de autenticación y su perfil con el rol seleccionado."
        closeOnOverlay={!creating}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-user-form"
              loading={creating}
              icon={<UserPlus size={15} />}
            >
              Crear usuario
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreate} noValidate>
          {createError && (
            <div style={{ marginBottom: 14 }}>
              <Alert tone="danger">{createError}</Alert>
            </div>
          )}
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label" htmlFor="create-name">
              Nombre completo
            </label>
            <input
              id="create-name"
              className="input"
              placeholder="Ej. María Fernanda Rojas"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              autoFocus
            />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label" htmlFor="create-email">
              Correo interno
            </label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                id="create-email"
                className="input"
                placeholder="nombre@encuesta.com"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                autoComplete="off"
              />
            </div>
            <span className="field-help">
              Puedes escribir solo el usuario; se completará con @encuesta.com.
            </span>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label" htmlFor="create-password">
              Contraseña temporal
            </label>
            <div className="password-wrap">
              <input
                id="create-password"
                className="input"
                type={createShowPassword ? 'text' : 'password'}
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setCreateShowPassword((value) => !value)}
                aria-label={createShowPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {createShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="field-help">
              Mínimo 8 caracteres. El usuario deberá cambiarla al ingresar.{' '}
              <button
                type="button"
                className="btn btn-text btn-sm"
                onClick={() => {
                  setCreatePassword(generatePassword());
                  setCreateShowPassword(true);
                }}
              >
                Generar otra
              </button>
            </span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="create-role">
              Rol
            </label>
            <select
              id="create-role"
              className="select"
              value={createRol}
              onChange={(event) => setCreateRol(event.target.value as Rol)}
            >
              <option value="encuestador">Encuestador</option>
              <option value="admin">Administrador</option>
            </select>
            <span className="field-help">
              Los administradores ven todos los registros, gestionan usuarios y áreas, y
              pueden exportar la base completa.
            </span>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!resetProfile}
        onClose={() => {
          if (!resetting) setResetProfile(null);
        }}
        title="Restablecer contraseña"
        subtitle={resetProfile ? resetProfile.nombre : undefined}
        closeOnOverlay={!resetting}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setResetProfile(null)}
              disabled={resetting}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="reset-password-form"
              loading={resetting}
              icon={<KeyRound size={15} />}
            >
              Restablecer
            </Button>
          </>
        }
      >
        <form id="reset-password-form" onSubmit={handleReset} noValidate>
          {resetError && (
            <div style={{ marginBottom: 14 }}>
              <Alert tone="danger">{resetError}</Alert>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="reset-password">
              Nueva contraseña temporal
            </label>
            <div className="password-wrap">
              <input
                id="reset-password"
                className="input"
                type={resetShowPassword ? 'text' : 'password'}
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setResetShowPassword((value) => !value)}
                aria-label={resetShowPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {resetShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="field-help">
              Mínimo 8 caracteres. Comparte la nueva clave por un canal seguro; no se
              vuelve a mostrar después.
            </span>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title={credentials?.kind === 'created' ? 'Usuario creado' : 'Contraseña restablecida'}
        subtitle="Guarda o comparte estas credenciales temporales antes de cerrar."
        footer={
          <Button variant="primary" onClick={() => setCredentials(null)}>
            Entendido
          </Button>
        }
      >
        {credentials && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 14 }}>
              <ShieldCheck size={16} />
              <div>
                La cuenta de <strong>{credentials.nombre}</strong> está lista. El usuario
                debe cambiar la contraseña en <strong>Mi cuenta</strong> después de
                ingresar.
              </div>
            </div>
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="detail-item">
                <div className="detail-label">Correo</div>
                <div className="detail-value row-between gap-8">
                  <span>{credentials.email}</span>
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => void copyText(credentials.email)}
                    aria-label="Copiar correo"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Contraseña temporal</div>
                <div className="detail-value row-between gap-8">
                  <code style={{ fontSize: 13 }}>{credentials.password}</code>
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() =>
                      void copyText(
                        `${credentials.email} / ${credentials.password}`,
                      )
                    }
                    aria-label="Copiar credenciales"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              fullWidth
              icon={<Copy size={14} />}
              onClick={() =>
                void copyText(`${credentials.email} / ${credentials.password}`)
              }
              style={{ marginTop: 14 }}
            >
              Copiar correo y contraseña
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editArea}
        onClose={() => {
          if (!savingEditArea) setEditArea(null);
        }}
        title="Editar área"
        subtitle="El cambio de nombre se refleja en las encuestas nuevas y en las exportaciones."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setEditArea(null)}
              disabled={savingEditArea}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="edit-area-form"
              loading={savingEditArea}
            >
              Guardar
            </Button>
          </>
        }
      >
        <form id="edit-area-form" onSubmit={handleEditArea}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label" htmlFor="edit-area-name">
              Nombre
            </label>
            <input
              id="edit-area-name"
              className="input"
              value={editAreaName}
              onChange={(event) => setEditAreaName(event.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="field-label" htmlFor="edit-area-order">
              Orden
            </label>
            <input
              id="edit-area-order"
              className="input"
              type="number"
              min={1}
              value={editAreaOrder}
              onChange={(event) => setEditAreaOrder(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="edit-area-description">
              Descripción <span className="optional">(opcional)</span>
            </label>
            <textarea
              id="edit-area-description"
              className="textarea"
              value={editAreaDescription}
              onChange={(event) => setEditAreaDescription(event.target.value)}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toggleProfile}
        title={toggleProfile?.activo ? 'Desactivar usuario' : 'Activar usuario'}
        description={
          toggleProfile?.activo
            ? `${toggleProfile.nombre} no podrá iniciar sesión ni consultar datos. Sus registros se conservan y siguen en el análisis.`
            : `${toggleProfile?.nombre} podrá volver a iniciar sesión y consultar sus registros.`
        }
        confirmLabel={toggleProfile?.activo ? 'Desactivar' : 'Activar'}
        destructive={toggleProfile?.activo}
        loading={toggling}
        onConfirm={() => void handleToggle()}
        onClose={() => setToggleProfile(null)}
      />

      <ConfirmDialog
        open={!!roleProfile}
        title="Cambiar rol"
        description={
          roleProfile
            ? `${roleProfile.nombre} pasará a ser ${
                roleTarget === 'admin' ? 'administrador' : 'encuestador'
              }. ${
                roleTarget === 'admin'
                  ? 'Tendrá acceso a todos los registros y a la administración.'
                  : 'Solo verá sus propios registros y el panel agregado.'
              }`
            : ''
        }
        confirmLabel="Cambiar rol"
        loading={changingRole}
        onConfirm={() => void handleRole()}
        onClose={() => setRoleProfile(null)}
      />

      <ConfirmDialog
        open={!!toggleArea}
        title={toggleArea?.activo ? 'Desactivar área' : 'Activar área'}
        description={
          toggleArea?.activo
            ? `“${toggleArea.nombre}” dejará de aparecer en las encuestas nuevas. Los registros existentes conservan el área y siguen en el análisis.`
            : `“${toggleArea?.nombre}” volverá a estar disponible al registrar encuestas.`
        }
        confirmLabel={toggleArea?.activo ? 'Desactivar' : 'Activar'}
        destructive={toggleArea?.activo}
        loading={togglingArea}
        onConfirm={() => void handleToggleArea()}
        onClose={() => setToggleArea(null)}
      />
    </div>
  );
}

function generatePassword(): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = lower + upper + digits + symbols;
  const required = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const rest = Array.from({ length: 8 }, () =>
    all.charAt(Math.floor(Math.random() * all.length)),
  );
  return [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('');
}
