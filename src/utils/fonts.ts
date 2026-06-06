/**
 * Web font definitions and auto-loader for Google Fonts
 *
 * Provides a curated list of display-safe web fonts and utilities to:
 * - Look up font URLs by CSS font-family value
 * - Dynamically inject <link> tags to load fonts in the browser
 * - Include @import rules in exported OBS CSS
 */

/* ─── Font Options ───────────────────────────────────────────────────── */

export interface FontOption {
  value: string
  label: string
  url: string
}

export const FONT_OPTIONS: FontOption[] = [
  {
    value: 'Inter, sans-serif',
    label: 'Inter',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400..900&display=swap',
  },
  {
    value: 'Roboto, sans-serif',
    label: 'Roboto',
    url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  },
  {
    value: '"Open Sans", sans-serif',
    label: 'Open Sans',
    url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
  },
  {
    value: 'Lato, sans-serif',
    label: 'Lato',
    url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap',
  },
  {
    value: 'Montserrat, sans-serif',
    label: 'Montserrat',
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  },
  {
    value: 'Oswald, sans-serif',
    label: 'Oswald',
    url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap',
  },
  {
    value: 'Raleway, sans-serif',
    label: 'Raleway',
    url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap',
  },
  {
    value: '"Source Sans 3", sans-serif',
    label: 'Source Sans 3',
    url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap',
  },
  {
    value: 'Poppins, sans-serif',
    label: 'Poppins',
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  },
  {
    value: 'Nunito, sans-serif',
    label: 'Nunito',
    url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  },
  {
    value: 'Ubuntu, sans-serif',
    label: 'Ubuntu',
    url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap',
  },
  {
    value: 'Quicksand, sans-serif',
    label: 'Quicksand',
    url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap',
  },
  {
    value: '"JetBrains Mono", monospace',
    label: 'JetBrains Mono',
    url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
  },
  {
    value: '"Fira Code", monospace',
    label: 'Fira Code',
    url: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap',
  },
  {
    value: '"Playfair Display", serif',
    label: 'Playfair Display',
    url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
  },
]

/* ─── Lookup Helpers ────────────────────────────────────────────────── */

/**
 * Get the Google Fonts URL for a given font-family CSS value.
 * Returns empty string if font not found (e.g., system fonts like "sans-serif").
 */
export function getFontUrl(fontFamily: string): string {
  const font = FONT_OPTIONS.find((f) => f.value === fontFamily)
  return font?.url ?? ''
}

/* ─── Font Loader ───────────────────────────────────────────────────── */

/**
 * Dynamically inject a <link rel="stylesheet"> tag for a Google Font.
 * Skips if the font URL is already present in <head>.
 *
 * Call this whenever the user changes the fontFamily setting
 * to ensure the font loads immediately in the preview.
 */
export function loadWebFont(fontFamily: string): void {
  const url = getFontUrl(fontFamily)
  if (!url) return

  // Check if this font URL is already loaded
  const existing = document.querySelector(`link[href="${url}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}
