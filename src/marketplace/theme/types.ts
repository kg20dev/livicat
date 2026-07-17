/**
 * Theme Marketplace Types
 *
 * Manages install/uninstall status for .livicat theme packages.
 * Built-in themes remain in src/theme/ — marketplace themes are loaded from
 * src/marketplace/theme/{installed,uninstalled}/.
 *
 * A .livicat package is a folder:
 *   phantom.livicat/
 *   ├── manifest.json      # Theme metadata
 *   ├── project.livi       # Scene Graph (Monkeywork format)
 *   ├── assets/skins/      # SVG skins, images
 *   ├── fonts/             # Custom fonts
 *   ├── animations/        # Lottie/CSS animations
 *   └── localization/      # i18n strings
 */

/* ─── Marketplace Entry ────────────────────────────────────── */

export type ThemeInstallStatus = 'installed' | 'uninstalled'

export interface ThemeMarketplaceEntry {
  /** Theme identifier (kebab-case) */
  id: string
  /** Human-readable name */
  name: string
  /** Creator attribution */
  author: string
  /** Short description */
  description: string
  /** Install status */
  status: ThemeInstallStatus
  /** Path to the .livicat folder (relative to marketplace root) */
  packagePath: string
  /** Optional screenshot or preview URL */
  preview?: string
  /** Theme version (semver) */
  version?: string
  /** Date of last update */
  updatedAt?: string
  /** Engine version required (e.g. "monkeywork-v1") */
  engine?: string
}

/* ─── Marketplace State ────────────────────────────────────── */

export interface ThemeMarketplaceState {
  /** All available themes (installed + uninstalled) */
  entries: ThemeMarketplaceEntry[]
  /** Currently active theme id */
  activeThemeId: string | null
}

/* ─── Marketplace Actions ──────────────────────────────────── */

export interface ThemeMarketplaceActions {
  /** Install a theme (move from uninstalled to installed) */
  install: (themeId: string) => void
  /** Uninstall a theme (move from installed to uninstalled) */
  uninstall: (themeId: string) => void
  /** Set the active theme */
  setActive: (themeId: string) => void
  /** Get all installed themes */
  getInstalled: () => ThemeMarketplaceEntry[]
  /** Get all uninstalled themes */
  getUninstalled: () => ThemeMarketplaceEntry[]
}

/* ─── .livicat Package Format ──────────────────────────────── */

export interface LiviManifest {
  /** Theme identifier (kebab-case) */
  id: string
  /** Human-readable name */
  name: string
  /** Creator attribution */
  author: string
  /** Short description */
  description: string
  /** Theme version (semver) */
  version?: string
  /** Engine version required */
  engine?: string
  /** Preview image path (relative to package root) */
  preview?: string
  /** Creation date (ISO 8601) */
  createdAt?: string
  /** Last update date (ISO 8601) */
  updatedAt?: string
  /** License identifier */
  license?: string
}

export interface LiviPackage {
  /** Theme manifest (manifest.json) */
  manifest: LiviManifest
  /** Scene graph — project.livi (Monkeywork format) */
  scene: {
    version: number
    theme: {
      id: string
      name: string
      author: string
    }
    variables: Record<string, string | number>
    chat: {
      direction: string
      spacing: number
      maxMessages: number
    }
    scene: Record<string, unknown>
  }
}

/* ─── Package Folder Structure ─────────────────────────────── */

/**
 * Expected files inside a .livicat folder:
 *
 * phantom.livicat/
 * ├── manifest.json          ← LiviManifest
 * ├── project.livi           ← Scene Graph JSON
 * ├── assets/
 * │   └── skins/
 * │       ├── phantom-flag.svg
 * │       └── phantom-message.svg
 * ├── fonts/
 * │   └── (custom font files)
 * ├── animations/
 * │   └── (Lottie JSON files)
 * └── localization/
 *     └── en.json
 */
export const PACKAGE_STRUCTURE = {
  manifest: 'manifest.json',
  scene: 'project.livi',
  assets: 'assets/',
  fonts: 'fonts/',
  animations: 'animations/',
  localization: 'localization/',
} as const
