import type { ReactNode } from 'react'

// A top-level report section. The `id` is the anchor the table of contents
// links to (see src/data/sections.ts).
function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="section">
      {children}
    </section>
  )
}

export default Section
