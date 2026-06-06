import { createContext, useContext } from 'react'

/* ─── Context ──────────────────────────────────────────────────── */

interface AssetsPageContext {
  filter: string
  onFilterChange: (filter: string) => void
}

const AssetsPageContext = createContext<AssetsPageContext | null>(null)

function useAssetsPageContext() {
  const ctx = useContext(AssetsPageContext)
  if (!ctx) throw new Error('AssetsPage compound components must be used within <AssetsPage>')
  return ctx
}

/* ─── Types ──────────────────────────────────────────────────────── */

export interface AssetItem {
  id: string
  name: string
  type: 'theme' | 'template' | 'export' | 'frame'
  thumbnail?: string
  createdAt: string
}

/* ─── Root ──────────────────────────────────────────────────────── */

interface AssetsPageRootProps {
  filter?: string
  onFilterChange?: (filter: string) => void
  children: React.ReactNode
  className?: string
}

export default function AssetsPage({
  filter = '',
  onFilterChange = () => {},
  children,
  className = '',
}: AssetsPageRootProps) {
  return (
    <AssetsPageContext.Provider value={{ filter, onFilterChange }}>
      <div className={`flex-1 bg-surface flex flex-col h-full ${className}`}>{children}</div>
    </AssetsPageContext.Provider>
  )
}

/* ─── Sub-components (exact HTML classes) ────────────────────────── */

AssetsPage.Header = function AssetsPageHeader({
  title = 'Assets Library',
  subtitle = 'Manage your themes, templates, and exports',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div className="px-container-margin py-8 border-b border-outline-variant">
      <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">{title}</h1>
      <p className="text-body-md text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}

AssetsPage.Toolbar = function AssetsPageToolbar() {
  const { filter, onFilterChange } = useAssetsPageContext()

  return (
    <div className="px-container-margin py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 rounded-lg text-label-md font-medium bg-surface-container-high text-on-surface border border-outline-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined text-[18px] align-middle mr-1">add</span>
          New Asset
        </button>
      </div>
      <div className="flex items-center bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">
          search
        </span>
        <input
          type="text"
          placeholder="Search assets..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="bg-transparent border-none outline-none text-body-md w-48 placeholder:text-on-surface-variant"
        />
      </div>
    </div>
  )
}

AssetsPage.Grid = function AssetsPageGrid({
  assets,
  onSelectAsset,
}: {
  assets: AssetItem[]
  onSelectAsset?: (asset: AssetItem) => void
}) {
  const { filter } = useAssetsPageContext()

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="px-container-margin pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => (
          <AssetsPage.AssetCard
            key={asset.id}
            asset={asset}
            onSelect={() => onSelectAsset?.(asset)}
          />
        ))}
      </div>
      {filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="material-symbols-outlined text-outline text-[48px] mb-4">
            folder_open
          </span>
          <p className="text-body-md text-on-surface-variant">No assets found</p>
        </div>
      )}
    </div>
  )
}

AssetsPage.AssetCard = function AssetsPageAssetCard({
  asset,
  onSelect,
}: {
  asset: AssetItem
  onSelect?: () => void
}) {
  const typeColors = {
    theme: 'bg-primary/10 text-primary',
    template: 'bg-tertiary-container/10 text-tertiary',
    export: 'bg-secondary-container/10 text-secondary',
    frame: 'bg-error-container/10 text-error',
  }

  const typeLabels = {
    theme: 'Theme',
    template: 'Template',
    export: 'Export',
    frame: 'Frame',
  }

  return (
    <button
      onClick={onSelect}
      className="bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-xl p-4 text-left transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-label-md font-medium px-2 py-0.5 rounded ${typeColors[asset.type]}`}>
          {typeLabels[asset.type]}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
          }}
          className="p-1 text-on-surface-variant hover:text-on-surface opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
      </div>
      <h3 className="text-body-md font-medium text-on-surface mb-1">{asset.name}</h3>
      <p className="text-label-md text-on-surface-variant">Created {asset.createdAt}</p>
    </button>
  )
}

export type { AssetsPageRootProps }
