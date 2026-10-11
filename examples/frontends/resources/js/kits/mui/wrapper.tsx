import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { appTheme } from './theme.js'

/** Light or dark, as the frame's root says (it mirrors the page's `data-theme`). */
function useMode(): 'light' | 'dark' {
  const read = (): 'light' | 'dark' => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const [mode, setMode] = useState(read)
  useEffect(() => {
    const observer = new MutationObserver(() => setMode(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return mode
}

/**
 * Kit (c)'s `wrapper` (genuiSandboxKit({ wrapper })): the model's App is rendered inside it, in the
 * sandbox frame — the app's theme and MUI's CssBaseline, emotion injecting into the frame's document.
 */
export default function SandboxWrapper({ children }: { children?: ReactNode }) {
  const mode = useMode()
  const theme = useMemo(() => appTheme(mode), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
