import { useMemo, useState } from 'react'
import type { ShoppingItem, SyncStatus } from '../domain/types'
import AddBar from './AddBar'
import EditItemSheet from './EditItemSheet'
import ItemRow from './ItemRow'
import SyncBadge from './SyncBadge'

type AddInput = {
  name: string
  quantity: string
  note: string
  productId: string | null
}

type Props = {
  pin: string
  items: ShoppingItem[]
  syncStatus: SyncStatus
  isLocalMode?: boolean
  onLeave: () => void
  onAdd: (input: AddInput) => void | Promise<void>
  onToggle: (id: string) => void | Promise<void>
  onUpdate: (
    id: string,
    patch: Partial<Pick<ShoppingItem, 'quantity' | 'note'>>,
  ) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
}

export default function ListScreen({
  pin,
  items,
  syncStatus,
  isLocalMode,
  onLeave,
  onAdd,
  onToggle,
  onUpdate,
  onRemove,
}: Props) {
  const [editing, setEditing] = useState<ShoppingItem | null>(null)

  const pending = useMemo(() => items.filter((it) => !it.done), [items])
  const done = useMemo(() => items.filter((it) => it.done), [items])

  return (
    <div className="app list-screen">
      {isLocalMode && (
        <p className="banner banner--local" role="status">
          Modo local — sin sincronización en la nube
        </p>
      )}

      <header className="list-screen__header">
        <div className="list-screen__title-group">
          <h1 className="list-screen__title">Lista Casa</h1>
          <p className="list-screen__pin">
            PIN <strong>{pin}</strong>
          </p>
        </div>
        <div className="list-screen__meta">
          <SyncBadge status={syncStatus} />
          <button type="button" className="btn btn--ghost" onClick={onLeave}>
            Salir
          </button>
        </div>
      </header>

      <AddBar onAdd={onAdd} />

      {items.length === 0 ? (
        <p className="item-list__empty">Tu lista está vacía. Añade el primer producto arriba.</p>
      ) : (
        <ul className="item-list">
          {pending.length > 0 && (
            <>
              {pending.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={(id) => void onToggle(id)}
                  onEdit={setEditing}
                />
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              {pending.length > 0 && (
                <li className="item-list__section-label" aria-hidden>
                  Comprados
                </li>
              )}
              {done.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={(id) => void onToggle(id)}
                  onEdit={setEditing}
                />
              ))}
            </>
          )}
        </ul>
      )}

      <EditItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(id, patch) => void onUpdate(id, patch)}
        onDelete={(id) => void onRemove(id)}
      />
    </div>
  )
}
