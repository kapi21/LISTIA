import ListScreen from './components/ListScreen'
import WelcomeScreen from './components/WelcomeScreen'
import { isLocalMode } from './data/createSync'
import { useHousehold } from './hooks/useHousehold'
import { useShoppingList } from './hooks/useShoppingList'

function App() {
  const { pin, status, error, create, join, leave, sync } = useHousehold()
  const { items, add, toggle, update, remove, syncStatus } = useShoppingList(pin, sync)

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
  )
}

export default App
