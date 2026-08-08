import { useEffect, useState } from 'react'
import type { ShoppingItem } from '../domain/types'

type Props = {
  item: ShoppingItem | null
  onClose: () => void
  onSave: (id: string, patch: { quantity: string; note: string }) => void
  onDelete: (id: string) => void
}

export default function EditItemSheet({ item, onClose, onSave, onDelete }: Props) {
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity)
      setNote(item.note)
    }
  }, [item])

  if (!item) return null

  const handleSave = () => {
    onSave(item.id, { quantity: quantity.trim() || '1', note: note.trim() })
    onClose()
  }

  const handleDelete = () => {
    onDelete(item.id)
    onClose()
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      role="presentation"
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-sheet-title" className="sheet__title">
          {item.name}
        </h2>

        <div className="sheet__field">
          <label className="sheet__label" htmlFor="edit-quantity">
            Cantidad
          </label>
          <input
            id="edit-quantity"
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
        </div>

        <div className="sheet__field">
          <label className="sheet__label" htmlFor="edit-note">
            Nota
          </label>
          <input
            id="edit-note"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. entera, sin lactosa…"
          />
        </div>

        <div className="sheet__actions">
          <button type="button" className="btn btn--primary btn--block" onClick={handleSave}>
            Guardar
          </button>
          <button type="button" className="btn btn--danger btn--block" onClick={handleDelete}>
            Eliminar
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
