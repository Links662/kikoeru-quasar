export const THEME_STORAGE_KEY = 'themeMode'

export const THEME_MODES = ['auto', 'light', 'dark']

export function normalizeThemeMode (mode) {
  if (mode === true) return 'dark'
  if (mode === false) return 'light'
  return THEME_MODES.includes(mode) ? mode : 'auto'
}

export function updateThemeColor () {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return

  const color = getComputedStyle(document.body)
    .getPropertyValue('--app-browser-theme')
    .trim()

  if (color) meta.setAttribute('content', color)
}

export function setThemeMode ($q, mode) {
  const normalized = normalizeThemeMode(mode)
  const quasarMode = normalized === 'auto' ? 'auto' : normalized === 'dark'

  $q.dark.set(quasarMode)

  try {
    $q.localStorage.set(THEME_STORAGE_KEY, normalized)
  } catch {
    // The selected mode still applies for the current page session.
  }

  updateThemeColor()
}
