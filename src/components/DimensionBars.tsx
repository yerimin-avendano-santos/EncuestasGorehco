import { formatDecimal, formatNumber } from '../lib/format';

export interface DimensionBarItem {
  id: number;
  nombre: string;
  promedio: number | null;
  n: number;
}

export function DimensionBars({
  items,
  instrument,
}: {
  items: DimensionBarItem[];
  instrument: 'TD' | 'PA';
}) {
  return (
    <div className="dimension-bars">
      {items.map((item) => {
        const code = `${instrument === 'TD' ? 'X' : 'Y'}${item.id}`;
        const width =
          item.promedio === null
            ? 0
            : Math.max(0, Math.min(100, (item.promedio / 5) * 100));
        return (
          <div className="dimension-row" key={item.id}>
            <div className="dimension-head">
              <div className="dimension-name">
                <span className="dimension-code">{code}</span>
                <span>{item.nombre}</span>
              </div>
              <span className="dimension-value">
                {formatDecimal(item.promedio)} / 5
              </span>
            </div>
            <div
              className="dimension-track"
              role="img"
              aria-label={`${code} ${item.nombre}: ${formatDecimal(
                item.promedio,
              )} de 5, ${formatNumber(item.n)} respuestas`}
            >
              <div
                className={`dimension-fill${instrument === 'PA' ? ' pa' : ''}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="small muted" style={{ fontSize: 9 }}>
              {formatNumber(item.n)} respuestas válidas
            </div>
          </div>
        );
      })}
    </div>
  );
}
