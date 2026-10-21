import type { ReactNode } from 'react';
import { classNames } from '../lib/format';

export function KpiCard({
  label,
  value,
  unit,
  icon,
  meta,
  footer,
  iconTone = 'emerald',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  iconTone?: 'emerald' | 'onyx';
}) {
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        {icon && (
          <div className={classNames('kpi-icon', iconTone === 'onyx' && 'onyx')}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className="kpi-value-row">
          <span className="kpi-value">{value}</span>
          {unit && <span className="kpi-unit">{unit}</span>}
        </div>
        {meta && <div className="kpi-meta">{meta}</div>}
        {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
      </div>
    </article>
  );
}
