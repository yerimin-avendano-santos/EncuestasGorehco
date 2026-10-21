import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './Ui';
import { Button } from './Button';
import { PageHeader } from './PageHeader';

function AccessDenied() {
  return (
    <div className="container page">
      <PageHeader
        eyebrow="Acceso restringido"
        title="Esta sección es solo para administradores"
        subtitle="Si necesitas gestionar usuarios o áreas, solicita que tu cuenta tenga el rol de administrador."
        actions={
          <Link to="/">
            <Button variant="primary">Volver al panel</Button>
          </Link>
        }
      />
      <div className="card card-pad" style={{ maxWidth: 620 }}>
        <div className="empty-state" style={{ padding: 20 }}>
          <div className="empty-icon">
            <ShieldAlert size={20} />
          </div>
          <h3 className="empty-title">No tienes permisos para ver esta página</h3>
          <p className="empty-text">
            La información de usuarios y la configuración del estudio está reservada
            al equipo administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader label="Verificando tu sesión…" />;
  }

  if (!user || !profile) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (adminOnly && profile.rol !== 'admin') {
    return <AccessDenied />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <PageLoader label="Verificando tu sesión…" />;
  }

  if (profile) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
