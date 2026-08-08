import { useState } from 'react'
import { isLocalMode } from './data/createSync'
import { useHousehold } from './hooks/useHousehold'
import { useShoppingList } from './hooks/useShoppingList'

function App() {
  const { pin, status, error, create, join, leave, sync } = useHousehold()
  const { items, add, toggle, syncStatus } = useShoppingList(pin, sync)
  const [itemName, setItemName] = useState('')
  const [joinPin, setJoinPin] = useState('')

  return (
    <main>
      {isLocalMode && (
        <p role="status" style={{ background: '#fff3cd', padding: '0.5rem 1rem' }}>
          modo local (sin nube)
        </p>
      )}
      <h1>Lista compra PWA</h1>

      {status === 'loading' && <p>Cargando sesión…</p>}

      {!pin && status !== 'loading' && (
        <section>
          <button type="button" onClick={() => void create()}>
            Crear hogar
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void join(joinPin)
            }}
          >
            <input
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value)}
              placeholder="PIN 6 dígitos"
              inputMode="numeric"
            />
            <button type="submit">Unirse</button>
          </form>
        </section>
      )}

      {pin && (
        <section>
          <p>
            PIN: <strong>{pin}</strong> · sync: {syncStatus}
          </p>
          <button type="button" onClick={() => void leave()}>
            Salir
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!itemName.trim()) return
              void add({ name: itemName.trim(), quantity: '1', note: '', productId: null })
              setItemName('')
            }}
          >
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Nuevo ítem"
            />
            <button type="submit">Añadir</button>
          </form>
          <ul>
            {items.map((it) => (
              <li key={it.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={it.done}
                    onChange={() => void toggle(it.id)}
                  />{' '}
                  {it.name}
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" style={{ color: '#b00020' }}>
          {error}
        </p>
      )}
    </main>
  )
}

export default App
