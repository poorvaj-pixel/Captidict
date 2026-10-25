'use client'

import { createLocalPreference } from './local-preference'
import { THEME_KEY } from './theme-script'

export type Theme = 'light' | 'dark'

export const themePreference = createLocalPreference<Theme>(THEME_KEY, (raw) =>
  raw === 'light' || raw === 'dark' ? raw : null,
)

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}
