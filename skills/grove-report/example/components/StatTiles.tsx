import './StatTiles.css';

interface Stat {
  label: string;
  value: string;
  note?: string;
}

// A row of headline figures. The records come from a JSON file the MDX imports,
// so a number changes in one line of data, not in the page.
export default function StatTiles({ items = [] }: { items?: Stat[] }) {
  return (
    <div className="rpt-stats">
      {items.map((s) => (
        <div key={s.label} className="rpt-stat">
          <div className="rpt-stat__value">{s.value}</div>
          <div className="rpt-stat__label">{s.label}</div>
          {s.note && <div className="rpt-stat__note">{s.note}</div>}
        </div>
      ))}
    </div>
  );
}
