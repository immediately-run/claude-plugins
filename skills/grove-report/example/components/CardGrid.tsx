import './CardGrid.css';

interface Card {
  title: string;
  tag?: string;
  body: string;
}

// Repeated records with a short plain-text body. If a card needs rich prose
// (links, emphasis, code), write it as an MDX component with children instead.
// Card titles are not headings, so the contents list shows only the sections.
export default function CardGrid({ items = [] }: { items?: Card[] }) {
  return (
    <div className="rpt-cards">
      {items.map((c) => (
        <article key={c.title} className="rpt-card">
          {c.tag && <div className="rpt-card__tag">{c.tag}</div>}
          <div className="rpt-card__title">{c.title}</div>
          <p className="rpt-card__body">{c.body}</p>
        </article>
      ))}
    </div>
  );
}
