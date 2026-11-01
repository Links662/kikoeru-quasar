import { Dark, LocalStorage } from 'quasar'
import {
  normalizeThemeMode,
  THEME_STORAGE_KEY,
  updateThemeColor
} from '../services/theme'

export default () => {
  let storedMode = null

  try {
    storedMode = LocalStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  const mode = normalizeThemeMode(storedMode)
  Dark.set(mode === 'auto' ? 'auto' : mode === 'dark')
  updateThemeColor()
}
