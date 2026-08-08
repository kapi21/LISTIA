import type { ShoppingItem } from '../domain/types'

type Props = {
  item: ShoppingItem
  onToggle: (id: string) => void
  onEdit: (item: ShoppingItem) => void
}

function formatMeta(quantity: string, note: string): string | null {
  const parts = [quantity.trim(), note.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export default function ItemRow({ item, onToggle, onEdit }: Props) {
  const meta = formatMeta(item.quantity, item.note)

  return (
    <li className={`item-row${item.done ? ' item-row--done' : ''}`}>
      <input
        type="checkbox"
        className="item-row__checkbox"
        checked={item.done}
        aria-label={`Marcar ${item.name} como ${item.done ? 'pendiente' : 'comprado'}`}
        onChange={() => onToggle(item.id)}
      />
      <button type="button" className="item-row__body" onClick={() => onEdit(item)}>
        <span className="item-row__name">{item.name}</span>
        {meta && <span className="item-row__meta">{meta}</span>}
      </button>
    </li>
  )
}
