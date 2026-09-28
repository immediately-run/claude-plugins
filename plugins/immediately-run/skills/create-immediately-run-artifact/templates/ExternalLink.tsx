import type { MouseEvent, ReactNode } from 'react'
import { openExternal } from '@immediately-run/sdk/openExternal'
import { usePlatformHref } from '@immediately-run/sdk/platformLink'

// A link to a site outside immediately.run. On the host a plain click asks the
// host to open the tab (`openExternal`): a bare `target="_blank"` from inside
// the sandboxed frame opens a tab with no origin of its own. The href and
// target stay so copy-link, middle-click and `vite dev` (no host) still work.
function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  // With no host, usePlatformHref returns the path unchanged.
  const hosted = usePlatformHref()('/') !== '/'

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (!hosted || !plainClick) return
    event.preventDefault()
    // Must run inside the gesture: the host checks its own user activation.
    openExternal(href).catch(() => {})
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  )
}

export default ExternalLink
