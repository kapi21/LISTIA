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
    <li
      className={`item-row${item.done ? ' item-row--done' : ''}`}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(item)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <input
        type="checkbox"
        className="item-row__checkbox"
        checked={item.done}
        aria-label={`Marcar ${item.name} como ${item.done ? 'pendiente' : 'comprado'}`}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggle(item.id)}
      />
      <div className="item-row__body">
        <span className="item-row__name">{item.name}</span>
        {meta && <span className="item-row__meta">{meta}</span>}
      </div>
    </li>
  )
}
