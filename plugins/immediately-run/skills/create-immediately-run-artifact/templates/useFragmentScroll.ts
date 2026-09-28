import { useEffect } from 'react'

// Deep-link the report from the OUTER URL's #fragment.
//
// The host forwards the reader's URL fragment into the sandbox frame's own
// URL: the frame is `https://sandbox.immediately.run/index.html?href=<encoded
// outer URL>#…`, and the encoded `href` param keeps the outer fragment. Apps
// that run through the platform's boot() get this for free
// (ScrollAfterNavigation); a hand-rolled report app reads it itself. Off-host
// (vite dev) the fragment is simply location.hash.
//
// Scroll semantics mirror the SDK's ScrollAfterNavigation: try immediately,
// retry while late-mounting trees appear (MutationObserver) and at
// [120, 300, 600]ms, then give up silently — a missing fragment is a soft
// failure, never an error.
function outerFragment(): string {
  try {
    const href = new URLSearchParams(window.location.search).get('href')
    if (href) return new URL(href).hash.replace(/^#/, '')
  } catch {
    // an unparseable href param is dev noise, not an error
  }
  return window.location.hash.replace(/^#/, '')
}

export function useFragmentScroll(): void {
  useEffect(() => {
    const frag = outerFragment()
    if (!frag) return

    let done = false
    const finish = () => {
      done = true
      observer.disconnect()
      timers.forEach(clearTimeout)
    }
    const tryScroll = () => {
      if (done) return
      const el = document.getElementById(frag)
      if (el) {
        el.scrollIntoView()
        finish()
      }
    }

    const observer = new MutationObserver(tryScroll)
    const timers = [120, 300, 600].map((ms) => setTimeout(tryScroll, ms))
    observer.observe(document.body, { childList: true, subtree: true })
    tryScroll()
    return finish
  }, [])
}
