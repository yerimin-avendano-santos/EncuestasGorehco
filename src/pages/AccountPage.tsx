import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  FileText,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { changePassword, errorMessage, updateMyProfileName } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { supabase } from '../lib/supabase';
import { Button, buttonClass } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { ActiveBadge, Alert, Avatar, RoleBadge } from '../components/Ui';

const passwordRules = [
  { test: (value: string) => value.length >= 8, label: 'Al menos 8 caracteres' },
  { test: (value: string) => /[A-Z]/.test(value), label: 'Una letra mayúscula' },
  { test: (value: string) => /[a-z]/.test(value), label: 'Una letra minúscula' },
  { test: (value: string) => /[0-9]/.test(value), label: 'Un número' },
];

export function AccountPage() {
  const { profile, isAdmin, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.nombre ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.nombre ?? '');
  }, [profile?.nombre]);

  const handleName = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setNameError(null);
    if (!name.trim()) {
      setNameError('El nombre no puede quedar vacío.');
      return;
    }
    setSavingName(true);
    try {
      await updateMyProfileName(profile.id, name);
      await refreshProfile();
      toast('Nombre actualizado.', 'success');
    } catch (updateError) {
      setNameError(errorMessage(updateError));
    } finally {
      setSavingName(false);
    }
  };

  const handlePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Ingresa tu contraseña actual.');
      return;
    }
    if (!passwordRules.every((rule) => rule.test(newPassword))) {
      setPasswordError('La nueva contraseña no cumple todos los requisitos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('La nueva contraseña debe ser distinta de la actual.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (error) {
        throw new Error('La contraseña actual no es correcta.');
      }
      await changePassword(newPassword);
      toast('Contraseña actualizada. Ya puedes usar la nueva clave.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (updateError) {
      setPasswordError(errorMessage(updateError));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!profile) return null;

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Seguridad y perfil"
        title="Mi cuenta"
        subtitle="Administra tu nombre visible, tu contraseña y la sesión del estudio."
        actions={
          <Button
            variant="ghost"
            icon={<LogOut size={15} />}
            onClick={() => void handleSignOut()}
          >
            Cerrar sesión
          </Button>
        }
      />

      <section className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row-between wrap gap-16">
          <div className="row gap-12">
            <Avatar name={profile.nombre} />
            <div>
              <div className="row gap-8 wrap">
                <h2 className="card-title" style={{ fontSize: 18 }}>
                  {profile.nombre}
                </h2>
                <RoleBadge rol={profile.rol} />
                <ActiveBadge activo={profile.activo} />
              </div>
              <div
                className="row gap-12 wrap small muted"
                style={{ marginTop: 5 }}
              >
                <span className="row gap-4">
                  <Mail size={12} />
                  {profile.email}
                </span>
                <span className="row gap-4">
                  <ShieldCheck size={12} />
                  Cuenta desde {formatDateTime(profile.creado_en)}
                </span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <Link
              to="/admin/usuarios"
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
            >
              Administración
            </Link>
          )}
        </div>
      </section>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Datos del perfil</h2>
              <p className="card-subtitle">
                El nombre visible no se incluye en la hoja Base 2026.
              </p>
            </div>
            <UserRound size={16} className="muted" />
          </div>
          <div className="card-body">
            <form onSubmit={handleName} noValidate>
              {nameError && (
                <div style={{ marginBottom: 14 }}>
                  <Alert tone="danger">{nameError}</Alert>
                </div>
              )}
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label" htmlFor="profile-name">
                  Nombre visible
                </label>
                <input
                  id="profile-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
                <span className="field-help">
                  Se usa en el panel y en la administración de usuarios.
                </span>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label className="field-label" htmlFor="profile-email">
                  Correo interno
                </label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <input
                    id="profile-email"
                    className="input"
                    value={profile.email}
                    readOnly
                    disabled
                  />
                </div>
                <span className="field-help">
                  El correo solo lo puede cambiar un administrador desde Supabase Auth.
                </span>
              </div>
              <Button
                variant="secondary"
                type="submit"
                loading={savingName}
                icon={<Save size={14} />}
              >
                Guardar nombre
              </Button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Cambiar contraseña</h2>
              <p className="card-subtitle">
                Recomendado si ingresaste con una contraseña temporal.
              </p>
            </div>
            <KeyRound size={16} className="muted" />
          </div>
          <div className="card-body">
            <form onSubmit={handlePassword} noValidate>
              {passwordError && (
                <div style={{ marginBottom: 14 }}>
                  <Alert tone="danger">{passwordError}</Alert>
                </div>
              )}
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label" htmlFor="current-password">
                  Contraseña actual
                </label>
                <div className="password-wrap">
                  <input
                    id="current-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                  >
                    {showPassword ? <LockKeyhole size={16} /> : <KeyRound size={16} />}
                  </button>
                </div>
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label" htmlFor="new-password">
                  Nueva contraseña
                </label>
                <input
                  id="new-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <div className="row gap-10 wrap" style={{ marginTop: 7 }}>
                  {passwordRules.map((rule) => {
                    const ok = rule.test(newPassword);
                    return (
                      <span
                        key={rule.label}
                        className={`small row gap-4${ok ? ' emerald' : ' muted'}`}
                      >
                        {ok ? <Check size={11} /> : <X size={11} />}
                        {rule.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label className="field-label" htmlFor="confirm-password">
                  Repetir nueva contraseña
                </label>
                <input
                  id="confirm-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <span className="field-error">Las contraseñas no coinciden.</span>
                )}
              </div>
              <Button
                variant="secondary"
                type="submit"
                loading={savingPassword}
                icon={<KeyRound size={14} />}
              >
                Actualizar contraseña
              </Button>
            </form>
          </div>
        </section>
      </div>

      <div className="grid grid-2 section">
        <section className="card card-pad">
          <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
            <div className="kpi-icon">
              <ShieldCheck size={17} />
            </div>
            <div>
              <h2 className="card-title" style={{ fontSize: 15 }}>
                Privacidad del estudio
              </h2>
              <p className="body-sm graphite" style={{ marginTop: 6 }}>
                Las respuestas individuales solo se muestran al encuestador que las
                registró y a los administradores. El panel y el Excel presentan datos
                agregados; la hoja Base 2026 no incluye nombres ni correos de las
                personas encuestadas.
              </p>
              <div className="row gap-12 wrap" style={{ marginTop: 12 }}>
                <a
                  href="/docs/consentimiento-informado.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="card-link"
                >
                  <FileText size={13} />
                  Consentimiento informado
                </a>
                <a
                  href="/docs/cuestionario-td-pa.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="card-link"
                >
                  <FileText size={13} />
                  Cuestionario
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="card card-pad">
          <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
            <div className="kpi-icon onyx">
              <LockKeyhole size={17} />
            </div>
            <div>
              <h2 className="card-title" style={{ fontSize: 15 }}>
                Sesión y acceso
              </h2>
              <p className="body-sm graphite" style={{ marginTop: 6 }}>
                Tu sesión se mantiene en este navegador. Si usas un equipo compartido,
                cierra sesión al terminar. Los borradores locales se guardan solo en este
                dispositivo y se eliminan al enviar la encuesta.
              </p>
              <Button
                variant="ghost"
                size="sm"
                icon={<LogOut size={14} />}
                onClick={() => void handleSignOut()}
                style={{ marginTop: 12 }}
              >
                Cerrar sesión ahora
              </Button>
            </div>
          </div>
        </section>
      </div>

      <p className="small muted" style={{ marginTop: 18 }}>
        ¿Problemas para ingresar? Solicita al administrador del estudio que restablezca
        tu contraseña. Nunca compartas tu clave por correo o mensajería.
      </p>
    </div>
  );
}
