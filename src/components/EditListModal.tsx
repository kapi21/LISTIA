import { useState, useEffect } from 'react'
import type { NotebookList } from '../domain/notebookTypes'

type Props = {
  isOpen: boolean
  list: NotebookList | null
  totalLists: number
  onClose: () => void
  onSave: (updated: {
    name: string
    color: NotebookList['color']
    enableDespensa: boolean
    enableMercadona: boolean
  }) => void
  onDeleteList?: (id: string | number) => void
}

const COLORS: Array<{ id: NotebookList['color']; label: string; bg: string }> = [
  { id: 'yellow', label: 'Amarillo', bg: '#fef08a' },
  { id: 'mint', label: 'Menta', bg: '#bbf7d0' },
  { id: 'coral', label: 'Coral', bg: '#fecdd3' },
  { id: 'blue', label: 'Azul', bg: '#bfdbfe' },
  { id: 'lavender', label: 'Lavanda', bg: '#e9d5ff' },
]

export default function EditListModal({
  isOpen,
  list,
  totalLists,
  onClose,
  onSave,
  onDeleteList,
}: Props) {
  if (!isOpen || !list) return null

  const [name, setName] = useState(list.name)
  const [color, setColor] = useState<NotebookList['color']>(list.color || 'yellow')
  const [enableDespensa, setEnableDespensa] = useState(list.enableDespensa !== false)
  const [enableMercadona, setEnableMercadona] = useState(list.enableMercadona !== false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (list) {
      setName(list.name)
      setColor(list.color || 'yellow')
      setEnableDespensa(list.enableDespensa !== false)
      setEnableMercadona(list.enableMercadona !== false)
      setConfirmDelete(false)
    }
  }, [list, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return

    onSave({
      name: clean,
      color,
      enableDespensa,
      enableMercadona,
    })
    onClose()
  }

  return (
    <div className="catalog-modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="catalog-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '430px',
          height: 'auto',
          maxHeight: '90vh',
          borderRadius: '16px',
        }}
      >
        <div className="catalog-modal-header" style={{ background: '#2c2927' }}>
          <h2>
            <span>⚙️</span> Configurar libreta
          </h2>
          <button className="catalog-modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Nombre de la libreta */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-note)',
                fontSize: '1.15rem',
                color: '#444',
                marginBottom: '6px',
                fontWeight: 'bold',
              }}
            >
              Nombre de la lista / libreta:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Lista Casa, Ferretería, Farmacia..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-note)',
                fontSize: '1.25rem',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '2px solid #b5ae9f',
                background: '#fff',
              }}
            />
          </div>

          {/* Color del post-it */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-note)',
                fontSize: '1.1rem',
                color: '#555',
                marginBottom: '8px',
              }}
            >
              Color de pestaña:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: color === c.id ? '2px solid #2c2927' : '1px solid #ccc',
                    background: c.bg,
                    fontFamily: 'var(--font-note)',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    fontWeight: color === c.id ? 'bold' : 'normal',
                    transform: color === c.id ? 'scale(1.05)' : 'none',
                    boxShadow: color === c.id ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {c.label} {color === c.id && '✓'}
                </button>
              ))}
            </div>
          </div>

          {/* Opciones de la lista */}
          <div
            style={{
              background: '#fcfaf5',
              border: '1px solid #e0d8c7',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-note)',
                fontSize: '1.05rem',
                fontWeight: 'bold',
                color: '#36322d',
                marginBottom: '10px',
              }}
            >
              Herramientas disponibles para esta lista:
            </div>

            {/* Checkbox Despensa */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              <input
                type="checkbox"
                checked={enableDespensa}
                onChange={(e) => setEnableDespensa(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  marginTop: '2px',
                  accentColor: '#007849',
                  cursor: 'pointer',
                }}
              />
              <div>
                <strong style={{ fontFamily: 'var(--font-note)', fontSize: '1.1rem', color: '#2c2927' }}>
                  📦 La Despensa
                </strong>
                <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.3 }}>
                  Mantiene el histórico de productos en la libreta para reactivarlos cuando se gasten.
                </div>
              </div>
            </label>

            {/* Checkbox Catálogo Mercadona */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={enableMercadona}
                onChange={(e) => setEnableMercadona(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  marginTop: '2px',
                  accentColor: '#007849',
                  cursor: 'pointer',
                }}
              />
              <div>
                <strong style={{ fontFamily: 'var(--font-note)', fontSize: '1.1rem', color: '#007849' }}>
                  🛒 Catálogo Mercadona
                </strong>
                <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.3 }}>
                  Muestra el botón oficial de Mercadona y busca precios y fotos entre sus 4.318 productos.
                </div>
              </div>
            </label>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {totalLists > 1 && onDeleteList && (
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete) {
                    onDeleteList(list.id)
                    onClose()
                  } else {
                    setConfirmDelete(true)
                  }
                }}
                style={{
                  marginRight: 'auto',
                  background: confirmDelete ? '#b91c1c' : '#fee2e2',
                  color: confirmDelete ? '#fff' : '#b91c1c',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontFamily: 'var(--font-note)',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {confirmDelete ? '¿Seguro borrar?' : '🗑️ Eliminar'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f3efe6',
                border: '1px solid #c9c1af',
                borderRadius: '8px',
                padding: '9px 14px',
                fontFamily: 'var(--font-note)',
                fontSize: '1.05rem',
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
                border: 'none',
                borderRadius: '8px',
                padding: '9px 20px',
                fontFamily: 'var(--font-note)',
                fontSize: '1.1rem',
                cursor: 'pointer',
                color: '#fff',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
