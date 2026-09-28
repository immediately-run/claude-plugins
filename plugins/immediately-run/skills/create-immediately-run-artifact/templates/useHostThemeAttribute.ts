import { useEffect } from 'react'
import { useHostTheme } from '@immediately-run/sdk/theme'

// Follow the immediately.run host's light/dark polarity instead of shipping a
// theme toggle of our own: reflect it on <html data-theme>, which index.css
// keys the light palette on. Dark (no attribute) is the default.
export function useHostThemeAttribute(): void {
  const theme = useHostTheme()
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
  }, [theme])
}
