/**
 * Kit (c): the MUI components a generated view may use (genuiSandboxKit({ components })), a curated
 * list rather than all of @mui/material, plus two of the app's own styled ones.
 */
import { styled } from '@mui/material/styles'

export {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  InputAdornment,
  Menu,
  MenuItem,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

/** A price in the theme's primary color, large. */
export const PriceTag = styled('span')(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: '1.75rem',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
}))

/** A tinted panel for a result or a summary. */
export const Panel = styled('div')(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  background: theme.palette.mode === 'dark' ? 'rgba(77,182,172,.12)' : 'rgba(0,121,107,.08)',
}))
