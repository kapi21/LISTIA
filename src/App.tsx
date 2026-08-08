import { useState } from 'react'
import AppShell, { type AppTab } from './components/AppShell'
import ListScreen from './components/ListScreen'
import PurchasesScreen from './components/PurchasesScreen'
import WelcomeScreen from './components/WelcomeScreen'
import { isLocalMode } from './data/createSync'
import { useHousehold } from './hooks/useHousehold'
import { useShoppingList } from './hooks/useShoppingList'

function App() {
  const { pin, status, error, create, join, leave, sync } = useHousehold()
  const { items, add, toggle, update, remove, syncStatus } = useShoppingList(pin, sync)
  const [tab, setTab] = useState<AppTab>('lista')

  if (status === 'loading') {
    return (
      <div className="app app--loading">
        <p>Cargando sesión…</p>
      </div>
    )
  }

  if (!pin) {
    return (
      <WelcomeScreen
        onCreate={() => void create()}
        onJoin={(p) => void join(p)}
        error={error}
        isLocalMode={isLocalMode}
      />
    )
  }

  return (
    <AppShell
      tab={tab}
      onTabChange={setTab}
      lista={
        <ListScreen
          pin={pin}
          items={items}
          syncStatus={syncStatus}
          isLocalMode={isLocalMode}
          onLeave={() => void leave()}
          onAdd={add}
          onToggle={toggle}
          onUpdate={update}
          onRemove={remove}
        />
      }
      compras={<PurchasesScreen pin={pin} onLeave={() => void leave()} />}
    />
  )
}

export default App
