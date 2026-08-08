import type { ReactNode } from 'react'

export type AppTab = 'lista' | 'compras'

type Props = {
  tab: AppTab
  onTabChange: (tab: AppTab) => void
  lista: ReactNode
  compras: ReactNode
}

export default function AppShell({ tab, onTabChange, lista, compras }: Props) {
  return (
    <div className="app app-shell">
      <main className="app-shell__main">{tab === 'lista' ? lista : compras}</main>
      <nav className="app-shell__tabs" aria-label="Navegación principal">
        <button
          type="button"
          className={`app-shell__tab${tab === 'lista' ? ' app-shell__tab--active' : ''}`}
          aria-current={tab === 'lista' ? 'page' : undefined}
          onClick={() => onTabChange('lista')}
        >
          Lista
        </button>
        <button
          type="button"
          className={`app-shell__tab${tab === 'compras' ? ' app-shell__tab--active' : ''}`}
          aria-current={tab === 'compras' ? 'page' : undefined}
          onClick={() => onTabChange('compras')}
        >
          Compras
        </button>
      </nav>
    </div>
  )
}
