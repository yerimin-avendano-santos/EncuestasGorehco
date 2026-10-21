import { formatNumber } from '../lib/format';

export interface DistributionItem {
  valor: number;
  n: number;
}

export function DistributionChart({ data }: { data: DistributionItem[] }) {
  const values = [1, 2, 3, 4, 5];
  const counts = new Map(data.map((item) => [item.valor, item.n]));
  const total = values.reduce((sum, value) => sum + (counts.get(value) ?? 0), 0);
  const max = Math.max(1, ...values.map((value) => counts.get(value) ?? 0));

  if (!total) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <p className="empty-text">Aún no hay respuestas válidas para graficar.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="distribution" role="img" aria-label="Distribución de respuestas Likert">
        {values.map((value) => {
          const count = counts.get(value) ?? 0;
          const height = Math.max(2, (count / max) * 100);
          return (
            <div className="distribution-col" key={value}>
              <span className="distribution-count">
                {formatNumber(count)}
                <span className="muted">
                  {' '}
                  · {total ? ((count / total) * 100).toFixed(1) : '0.0'}%
                </span>
              </span>
              <div className="distribution-bar-wrap">
                <div
                  className={`distribution-bar v${value}`}
                  style={{ height: `${height}%` }}
                  title={`${count} respuestas con valor ${value}`}
                />
              </div>
              <span className="distribution-label">{value}</span>
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-dot" />
          1 = Totalmente en desacuerdo
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#10b981' }} />5 =
          Totalmente de acuerdo
        </span>
        <span className="legend-item">
          <span className="legend-dot muted" />
          N/A excluido de promedios
        </span>
      </div>
    </div>
  );
}
