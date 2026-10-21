import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Alert } from '../components/Ui';
import { INSTITUCION, TITULO_ESTUDIO } from '../lib/catalog';
import { errorMessage } from '../lib/api';

export function LoginPage() {
  const { signIn, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <aside className="login-aside">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <span
              style={{
                fontFamily: 'var(--font-inter-tight)',
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              E
            </span>
          </span>
          <div>
            <div className="login-brand-name">Encuestas GOREHCO</div>
            <div className="login-brand-sub">TD · Procesos administrativos</div>
          </div>
        </div>

        <div className="login-aside-main">
          <div className="eyebrow">Estudio académico 2026</div>
          <h1 className="login-aside-title">
            Transformación digital y procesos administrativo en el<span> Gobierno Regional</span>de Huánuco, 2026
          </h1>
          

          <div className="login-features">
            <div className="login-feature">
              
            </div>
            <div className="login-feature">
              
            </div>
            <div className="login-feature">
              
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
              marginTop: 26,
            }}
          >
          </div>
        </div>

        <div className="login-aside-footer">
          <div className="row gap-4" style={{ fontWeight: 600 }}>
            <ShieldCheck size={12} />
            Acceso restringido al equipo del estudio
          </div>
          <div style={{ marginTop: 5 }}>
            {INSTITUCION} · Gobierno Regional de Huánuco
          </div>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="login-card-head">
            <div className="eyebrow">Acceso al sistema</div>
            <h2 className="login-title">Bienvenido de vuelta</h2>
            <p className="login-subtitle">
              Ingresa con el correo interno asignado por el administrador del estudio.
            </p>
          </div>

          {(error || authError) && (
            <div style={{ marginBottom: 16 }}>
              <Alert tone="danger">{error || authError}</Alert>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="login-email">
                Correo interno
              </label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="nombre@encuesta.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                />
              </div>
              <span className="field-help">
                Puedes escribir solo tu usuario; se completará con @encuesta.com.
              </span>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="login-password">
                Contraseña
              </label>
              <div className="password-wrap">
                <input
                  id="login-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              icon={!submitting ? <LockKeyhole size={15} /> : undefined}
            >
              {submitting ? 'Ingresando…' : 'Ingresar al panel'}
            </Button>
          </form>

          <div className="login-footer">
            <div className="row gap-6" style={{ marginBottom: 6 }}>
              <LockKeyhole size={12} />
              <span>
                ¿No tienes acceso? Solicítalo al administrador del estudio. No uses
                correos personales.
              </span>
            </div>
            <Link
              to="/login"
              onClick={(event) => event.preventDefault()}
              style={{ color: 'var(--color-emerald-signal)', fontWeight: 600 }}
            >
              Conexión segura con Supabase
              <ArrowRight size={11} style={{ display: 'inline', marginLeft: 3 }} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
