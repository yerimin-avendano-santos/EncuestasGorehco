import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  backTo,
  backLabel = 'Volver',
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {backTo && (
          <Link
            to={backTo}
            className="row gap-4 small graphite"
            style={{ marginBottom: 12, fontWeight: 600, width: 'fit-content' }}
          >
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
        )}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
