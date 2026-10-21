import { BarChart3 } from 'lucide-react';
import { formatDecimal, formatMonth, formatNumber } from '../lib/format';

export interface EvolutionPoint {
  mes: string;
  n: number;
  td: number | null;
  pa: number | null;
}

const WIDTH = 660;
const HEIGHT = 250;
const MARGIN = { top: 22, right: 44, bottom: 40, left: 36 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function scoreY(score: number): number {
  return MARGIN.top + PLOT_H - ((score - 1) / 4) * PLOT_H;
}

function countY(count: number, max: number): number {
  return MARGIN.top + PLOT_H - (max ? (count / max) * PLOT_H : 0);
}

function linePath(
  data: EvolutionPoint[],
  key: 'td' | 'pa',
  xFor: (index: number) => number,
): string {
  let path = '';
  let open = false;
  data.forEach((point, index) => {
    const value = point[key];
    if (value === null || value === undefined) {
      open = false;
      return;
    }
    const x = xFor(index);
    const y = scoreY(value);
    path += `${open ? ' L' : ' M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    open = true;
  });
  return path.trim();
}

export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  if (!data.length) {
    return (
      <div className="evolution-empty">
        <div className="text-center">
          <div className="empty-icon" style={{ marginBottom: 10 }}>
            <BarChart3 size={20} />
          </div>
          <p className="empty-title" style={{ fontSize: 15 }}>
            Sin evolución mensual todavía
          </p>
          <p className="empty-text">
            Las encuestas nuevas registrarán fecha de aplicación. Los 107 registros
            históricos no tienen fecha y se incluyen solo en los totales.
          </p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(1, ...data.map((point) => point.n));
  const xFor = (index: number) =>
    data.length === 1
      ? MARGIN.left + PLOT_W / 2
      : MARGIN.left + (index / (data.length - 1)) * PLOT_W;
  const barWidth = Math.min(38, Math.max(10, (PLOT_W / data.length) * 0.34));

  const gridLines = [0, 1, 2, 3, 4].map((step) => {
    const ratio = step / 4;
    return {
      y: MARGIN.top + PLOT_H - ratio * PLOT_H,
      count: Math.round(maxCount * ratio),
      score: 1 + step,
    };
  });

  return (
    <div>
      <div className="evolution-wrap">
        <svg
          className="evolution-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Evolución mensual de encuestas y promedios"
        >
          {gridLines.map((line) => (
            <g key={line.y}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={line.y}
                y2={line.y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 8}
                y={line.y + 3}
                textAnchor="end"
                fontSize={8}
                fill="#a1a1aa"
              >
                {line.count}
              </text>
              <text
                x={WIDTH - MARGIN.right + 8}
                y={line.y + 3}
                textAnchor="start"
                fontSize={8}
                fill="#a1a1aa"
              >
                {line.score}
              </text>
            </g>
          ))}

          {data.map((point, index) => {
            const x = xFor(index);
            const top = countY(point.n, maxCount);
            const height = MARGIN.top + PLOT_H - top;
            return (
              <g key={`${point.mes}-${index}`}>
                <rect
                  x={x - barWidth / 2}
                  y={top}
                  width={barWidth}
                  height={Math.max(1, height)}
                  rx={4}
                  fill="#d1fae5"
                >
                  <title>
                    {formatMonth(point.mes)}: {formatNumber(point.n)} encuestas
                  </title>
                </rect>
                <text
                  x={x}
                  y={top - 5}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#52525b"
                  fontWeight={600}
                >
                  {point.n}
                </text>
                <text
                  x={x}
                  y={HEIGHT - 18}
                  textAnchor="middle"
                  fontSize={7.5}
                  fill="#71717a"
                >
                  {formatMonth(point.mes)}
                </text>
              </g>
            );
          })}

          <path
            d={linePath(data, 'td', xFor)}
            fill="none"
            stroke="#059669"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={linePath(data, 'pa', xFor)}
            fill="none"
            stroke="#0d9488"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 4"
          />

          {data.map((point, index) => {
            const x = xFor(index);
            return (
              <g key={`points-${point.mes}-${index}`}>
                {point.td !== null && (
                  <circle cx={x} cy={scoreY(point.td)} r={3} fill="#059669">
                    <title>
                      {formatMonth(point.mes)} · TD: {formatDecimal(point.td)}
                    </title>
                  </circle>
                )}
                {point.pa !== null && (
                  <circle cx={x} cy={scoreY(point.pa)} r={3} fill="#0d9488">
                    <title>
                      {formatMonth(point.mes)} · PA: {formatDecimal(point.pa)}
                    </title>
                  </circle>
                )}
              </g>
            );
          })}

          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={MARGIN.top + PLOT_H}
            y2={MARGIN.top + PLOT_H}
            stroke="#d4d4d8"
            strokeWidth={1}
          />
        </svg>
      </div>
      <div className="chart-legend">
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ borderRadius: 2, width: 9, height: 9, background: '#d1fae5' }}
          />
          Encuestas por mes
        </span>
        <span className="legend-item">
          <span className="legend-dot" />
          Promedio TD
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#0d9488' }} />
          Promedio PA
        </span>
        <span className="legend-item muted">Eje derecho: escala 1–5</span>
      </div>
    </div>
  );
}
