import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, ShieldAlert } from 'lucide-react';
import { classNames, initials } from '../lib/format';
import type { Rol } from '../types';

export function SurveyStatusBadge({
  estado,
  origen,
}: {
  estado: string;
  origen?: string;
}) {
  if (origen === 'importado') {
    return <span className="badge badge-muted">Histórico</span>;
  }
  if (estado === 'borrador') {
    return <span className="badge badge-warning">Borrador</span>;
  }
  if (estado === 'validada') {
    return <span className="badge badge-info">Validada</span>;
  }
  return <span className="badge badge-success">Completa</span>;
}

export function RoleBadge({ rol }: { rol: Rol }) {
  return (
    <span className={rol === 'admin' ? 'badge badge-emerald' : 'badge badge-muted'}>
      {rol === 'admin' ? 'Administrador' : 'Encuestador'}
    </span>
  );
}

export function ActiveBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="badge badge-success">Activo</span>
  ) : (
    <span className="badge badge-danger">Inactivo</span>
  );
}

export function Avatar({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  return (
    <span className={classNames('avatar', className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="page-loader">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3 className="empty-title">{title}</h3>
      {text && <p className="empty-text">{text}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export function Alert({
  tone = 'info',
  title,
  children,
  icon,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const renderedIcon =
    icon ??
    (tone === 'success' ? (
      <CircleCheck size={16} />
    ) : tone === 'danger' ? (
      <ShieldAlert size={16} />
    ) : tone === 'warning' ? (
      <CircleAlert size={16} />
    ) : (
      <Info size={16} />
    ));
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      {renderedIcon}
      <div>
        {title && <strong>{title} </strong>}
        {children}
      </div>
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="loading-inline">
      <span className="spinner" style={{ width: 13, height: 13 }} />
      {label}
    </span>
  );
}
