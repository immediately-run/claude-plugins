import { useCallback, useEffect } from 'react'
import { navigate, usePlatformHref } from '@immediately-run/sdk'

// Keep the address bar's #fragment in step with the heading the reader jumps
// to. A delegated click listener covers all three ways a heading is reached:
// the TOC's bare `#id` links, the SDK permalink anchors (whose href is the
// absolute present URL on the host), and clicks on a heading element itself.
//
// ON THE HOST, `navigate(target)` is the sanctioned iframe→host URL channel:
// an in-prefix urlchange whose target carries a hash is pushed onto the
// browser's address bar without reloading the app. The target must be an
// ABSOLUTE in-prefix URL, built on the base `usePlatformHref()('')` returns —
// KEEP that base's sandbox subpath (e.g. `/files/src/App.tsx`) verbatim: a
// navigate whose pathname matches the current one is a clean hash-only push,
// and the resulting bar URL is the platform's own canonical app permalink.
// Trimming the subpath makes it a path navigation, and the host's editor sync
// responds by rewriting the bar — the hash is lost again (measured).
// For permalink anchors only the FRAGMENT is taken (never their URL as-is).
//
// OFF-HOST (vite dev) there is no host to tell; `history.replaceState` keeps
// the app frame's own fragment accurate so a reload lands where the reader
// was, without spamming history.
function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

function targetFragment(element: HTMLElement | null, base: string): string | null {
  const anchor = element?.closest('a')
  if (anchor) {
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('#')) return href.slice(1) || null
    try {
      const url = new URL(href, window.location.href)
      // Absolute hrefs: only same-origin fragment links (the SDK's heading
      // permalinks, whose origin is the app's outer origin, not the sandbox
      // frame's) are heading navigation; external links are not ours.
      const ownOrigin = base ? new URL(base).origin : window.location.origin
      if (!url.hash || url.origin !== ownOrigin) return null
      return url.hash.slice(1)
    } catch {
      return null
    }
  }
  return element?.closest('h1[id], h2[id], h3[id]')?.id ?? null
}

export function useFragmentSync(): void {
  const platformHref = usePlatformHref()
  const base = platformHref('')
  const hosted = platformHref('/') !== '/'

  const sync = useCallback(
    (fragment: string) => {
      if (hosted) {
        try {
          navigate(new URL(`#${fragment}`, base).toString())
        } catch {
          // an unparseable base is dev noise, not an error
        }
      } else {
        history.replaceState(null, '', `#${fragment}`)
      }
    },
    [hosted, base],
  )

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return
      const fragment = targetFragment(event.target as HTMLElement | null, base)
      if (fragment) sync(fragment)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [sync, base])
}
