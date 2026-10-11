import { useState } from 'react';
import './BarChart.css';

interface Bar {
  label: string;
  value: number;
}

interface Props {
  data?: Bar[];
  title?: string;
  unit?: string;
}

// A dependency-free bar chart in SVG. Bars take the theme accent, text takes the
// theme ink, so it reads in every Grove look and in both light and dark.
// Hovering or focusing a bar shows its exact value.
export default function BarChart({ data = [], title, unit = '' }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 640;
  const h = 220;
  const pad = { top: 16, bottom: 28, left: 8, right: 8 };
  const slot = (w - pad.left - pad.right) / Math.max(1, data.length);
  const barW = slot * 0.66;
  const inner = h - pad.top - pad.bottom;
  const shown = active === null ? null : data[active];
  return (
    <figure className="rpt-chart">
      {title && <figcaption className="rpt-chart__title">{title}</figcaption>}
      <div className="rpt-chart__readout" aria-live="polite">
        {shown ? `${shown.label}: ${shown.value.toLocaleString()} ${unit}` : ' '}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
        {data.map((d, i) => {
          const bh = (d.value / max) * inner;
          const x = pad.left + i * slot + (slot - barW) / 2;
          return (
            <g key={d.label}>
              <rect
                className={i === active ? 'rpt-chart__bar is-active' : 'rpt-chart__bar'}
                x={x}
                y={pad.top + inner - bh}
                width={barW}
                height={bh}
                rx={3}
                tabIndex={0}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <title>{`${d.label}: ${d.value.toLocaleString()} ${unit}`}</title>
              </rect>
              <text className="rpt-chart__label" x={x + barW / 2} y={h - 8} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
