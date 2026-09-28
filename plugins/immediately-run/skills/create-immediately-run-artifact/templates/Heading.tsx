import type { ReactNode } from 'react'
import { HeadingAnchor } from '@immediately-run/sdk'

// A section heading with a URL-fragment address. The host's MDX compiler only
// anchors TOP-LEVEL markdown headings — headings inside <Section> JSX get no
// id and no permalink — so report sections render their own: an explicit id
// (or one slugged from the text, same result on host and locally because the
// slug is computed at runtime) plus the SDK's HeadingAnchor. On the host the
// anchor's href is the absolute present URL with the fragment (copy-link and
// open-in-new-tab produce a link that resolves for a reader); a plain click
// just scrolls. Off-host it degrades to a bare #fragment anchor.
//
// If data-rendered cards slug their own heading ids too, move `slug` to
// `src/lib/slug.ts` and import it from both places.
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
}

function Heading({ id, children }: { id?: string; children: ReactNode }) {
  const anchorId = id ?? slug(typeof children === 'string' ? children : '')
  return (
    <h2 id={anchorId}>
      <HeadingAnchor id={anchorId} />
      {children}
    </h2>
  )
}

export default Heading
