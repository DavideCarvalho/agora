import { createTheme } from '@mui/material/styles'

/** The app's MUI theme: its palette, shape and typography — what the sandbox's wrapper provides. */
export function appTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#4db6ac' : '#00796b' },
      secondary: { main: '#ff7043' },
      background: mode === 'dark' ? { default: '#101418', paper: '#182026' } : { default: '#f4f8f7', paper: '#ffffff' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiCard: { defaultProps: { variant: 'outlined' } },
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  })
}
