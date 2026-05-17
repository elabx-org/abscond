import { createVuetify, type ThemeDefinition } from 'vuetify'
import 'vuetify/styles'
import '@/styles/global.css'

export const abscondTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background:     '#0e0e0e',
    surface:        '#111111',
    'surface-variant': '#141414',
    primary:        '#d4a017',
    'primary-darken-1': '#a87c12',
    secondary:      '#ffffff',
    error:          '#ef4444',
    info:           '#5ba4f5',
    success:        '#34d399',
    warning:        '#fbbf24',
    'on-background': '#f5f5f7',
    'on-surface':   '#f5f5f7',
    'on-primary':   '#000000',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'abscond',
    themes: { abscond: abscondTheme },
  },
  defaults: {
    VBtn: { variant: 'flat', rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VCard: { rounded: 'lg' },
  },
})
