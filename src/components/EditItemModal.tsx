import { useState } from 'react'
import type { NotebookItem } from '../domain/notebookTypes'

type Props = {
  item: NotebookItem | null
  onClose: () => void
  onSave: (updatedItem: NotebookItem) => void
}

const QUICK_UNITS = ['1 ud', '2 uds', '3 uds', '4 uds', '5 uds', '1 kg', '2 kg', '1 pack', '1 bandeja', '1 botella']

export default function EditItemModal({ item, onClose, onSave }: Props) {
  if (!item) return null

  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity || '1 ud')
  const [category, setCategory] = useState(item.category || 'Otros')
  const [priceStr, setPriceStr] = useState(
    item.price != null ? String(item.price).replace('.', ',') : ''
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return

    let parsedPrice: number | null = null
    if (priceStr.trim()) {
      const num = parseFloat(priceStr.replace(',', '.'))
      if (!isNaN(num)) parsedPrice = num
    }

    onSave({
      ...item,
      name: cleanName,
      quantity: quantity.trim() || '1 ud',
      category: category.trim() || 'Otros',
      price: parsedPrice,
    })
    onClose()
  }

  return (
    <div className="catalog-modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="catalog-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          height: 'auto',
          maxHeight: '90vh',
          borderRadius: '16px',
        }}
      >
        <div className="catalog-modal-header" style={{ background: '#2c2927' }}>
          <h2>
            <span>✏️</span> Editar producto
          </h2>
          <button className="catalog-modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px 20px' }}>
          {/* Nombre */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-note)',
                fontSize: '1.1rem',
                color: '#555',
                marginBottom: '4px',
              }}
            >
              Nombre del producto:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-note)',
                fontSize: '1.2rem',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #c9c1af',
                background: '#fff',
              }}
            />
          </div>

          {/* Unidades / Cantidad */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-note)',
                fontSize: '1.1rem',
                color: '#555',
                marginBottom: '4px',
              }}
            >
              Unidades / Cantidad:
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ej: 2 uds, 1 kg..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-note)',
                fontSize: '1.2rem',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #c9c1af',
                background: '#fff',
              }}
            />

            {/* Accesos rápidos de cantidad */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '8px',
              }}
            >
              {QUICK_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setQuantity(u)}
                  style={{
                    background: quantity === u ? '#2c2927' : '#f0ece1',
                    color: quantity === u ? '#fff' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '14px',
                    padding: '3px 10px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-note)',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Precio y Categoría */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.05rem',
                  color: '#555',
                  marginBottom: '4px',
                }}
              >
                Precio (€):
              </label>
              <input
                type="text"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="0,00"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.15rem',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #c9c1af',
                  background: '#fff',
                }}
              />
            </div>

            <div style={{ flex: 1.5 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.05rem',
                  color: '#555',
                  marginBottom: '4px',
                }}
              >
                Categoría:
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.15rem',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #c9c1af',
                  background: '#fff',
                }}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid #bbb',
                borderRadius: '8px',
                padding: '8px 16px',
                fontFamily: 'var(--font-note)',
                fontSize: '1.1rem',
                cursor: 'pointer',
                color: '#555',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                background: '#007849',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 22px',
                fontFamily: 'var(--font-note)',
                fontSize: '1.15rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,120,73,0.3)',
              }}
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
