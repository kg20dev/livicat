/**
 * Theme Marketplace Registry
 *
 * Scans src/marketplace/theme/{installed,uninstalled}/ for .livicat folders
 * and provides install/uninstall management.
 *
 * A .livicat folder contains:
 *   manifest.json      — Theme metadata
 *   project.livi       — Scene Graph (Monkeywork format)
 *   assets/skins/      — SVG skins, images
 *   fonts/             — Custom fonts
 *   animations/        — Lottie/CSS animations
 *   localization/      — i18n strings
 *
 * Built-in themes (IM, Ink Sticker, Crayon, Block, Phantom) live in
 * src/theme/ and are always available. Marketplace themes are loaded
 * from the marketplace directories.
 */

import type { ThemeInstallStatus, ThemeMarketplaceEntry } from './types'
export type { ThemeMarketplaceEntry, ThemeInstallStatus } from './types'

// ─── Built-in themes (always installed, not in marketplace dirs) ───

const BUILT_IN_THEME_IDS = ['im', 'ink-sticker', 'crayon', 'block', 'phantom'] as const

// ─── Known .livicat packages ──────────────────────────────────────

/**
 * Registry of known .livicat packages on disk.
 * In production, this would be discovered by scanning the filesystem.
 * Each entry maps a folder name to its marketplace metadata.
 */
const KNOWN_PACKAGES: Record<
  string,
  { folder: string; dir: 'installed' | 'uninstalled'; author: string; description: string }
> = {
  phantom: {
    folder: 'phantom.livicat',
    dir: 'installed',
    author: 'Livicat',
    description:
      'Persona 5 — jagged ribbon message plates with a tilted name flag, pure red/black/white palette',
  },
}

// ─── Marketplace directory scanning ────────────────────────────────

/**
 * Scan for .livicat folders in the installed/uninstalled directories.
 * Returns marketplace entries for each discovered package.
 */
export function scanMarketplaceDir(): ThemeMarketplaceEntry[] {
  const entries: ThemeMarketplaceEntry[] = []

  for (const [id, pkg] of Object.entries(KNOWN_PACKAGES)) {
    entries.push({
      id,
      name: capitalize(id),
      author: pkg.author,
      description: pkg.description,
      status: pkg.dir === 'installed' ? 'installed' : 'uninstalled',
      packagePath: `${pkg.dir}/${pkg.folder}`,
      engine: 'monkeywork-v1',
    })
  }

  return entries
}

// ─── Install / Uninstall ───────────────────────────────────────────

const STORAGE_KEY = 'livicat_marketplace_status'

function loadStatusMap(): Record<string, ThemeInstallStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStatusMap(map: Record<string, ThemeInstallStatus>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

/**
 * Install a marketplace theme.
 * Updates localStorage and returns the updated entry.
 */
export function installTheme(
  entries: ThemeMarketplaceEntry[],
  themeId: string
): ThemeMarketplaceEntry[] {
  const map = loadStatusMap()
  map[themeId] = 'installed'
  saveStatusMap(map)

  return entries.map((e) => (e.id === themeId ? { ...e, status: 'installed' as const } : e))
}

/**
 * Uninstall a marketplace theme.
 * Updates localStorage and returns the updated entry.
 */
export function uninstallTheme(
  entries: ThemeMarketplaceEntry[],
  themeId: string
): ThemeMarketplaceEntry[] {
  const map = loadStatusMap()
  map[themeId] = 'uninstalled'
  saveStatusMap(map)

  return entries.map((e) => (e.id === themeId ? { ...e, status: 'uninstalled' as const } : e))
}

/**
 * Get all installed themes (marketplace entries marked as installed).
 * Does NOT include built-in themes — those are always available.
 */
export function getInstalledThemes(entries: ThemeMarketplaceEntry[]): ThemeMarketplaceEntry[] {
  const map = loadStatusMap()
  return entries.filter((e) => (map[e.id] ?? e.status) === 'installed')
}

/**
 * Get all uninstalled themes (marketplace entries not installed).
 */
export function getUninstalledThemes(entries: ThemeMarketplaceEntry[]): ThemeMarketplaceEntry[] {
  const map = loadStatusMap()
  return entries.filter((e) => (map[e.id] ?? e.status) === 'uninstalled')
}

/**
 * Check if a theme is a built-in theme (always available).
 */
export function isBuiltinTheme(themeId: string): boolean {
  return (BUILT_IN_THEME_IDS as readonly string[]).includes(themeId)
}

/**
 * Get the path to a .livicat package's project.livi file.
 */
export function getProjectPath(entry: ThemeMarketplaceEntry): string {
  return `${entry.packagePath}/project.livi`
}

/**
 * Get the path to a .livicat package's manifest.json file.
 */
export function getManifestPath(entry: ThemeMarketplaceEntry): string {
  return `${entry.packagePath}/manifest.json`
}

// ─── Helpers ───────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}
