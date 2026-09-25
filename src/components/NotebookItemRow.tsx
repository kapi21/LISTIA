import { useState, useRef } from 'react'
import type { NotebookItem } from '../domain/notebookTypes'
import { formatPrice } from '../domain/notebookTypes'
import { compressImageFile } from '../utils/imageResize'

type Props = {
  item: NotebookItem
  onToggle: (id: string | number) => void
  onDelete: (id: string | number) => void
  onEdit?: (item: NotebookItem) => void
  onUpdatePhoto?: (id: string | number, photoDataUrl: string) => void
  isDespensa?: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  'Aceite, especias y salsas': '🫒',
  'Agua y refrescos': '🥤',
  'Aperitivos': '🥜',
  'Arroz, legumbres y pasta': '🍚',
  'Azúcar, caramelos y chocolate': '🍫',
  'Bebé': '🍼',
  'Bodega': '🍷',
  'Cacao, café e infusiones': '☕',
  'Carne': '🥩',
  'Cereales y galletas': '🥣',
  'Charcutería y quesos': '🧀',
  'Congelados': '🧊',
  'Conservas, caldos y cremas': '🥫',
  'Cuidado del cabello': '🧴',
  'Cuidado facial y corporal': '🧼',
  'Fitoterapia y parafarmacia': '🌿',
  'Fruta y verdura': '🍎',
  'Huevos, leche y mantequilla': '🥛',
  'Lácteos y huevos': '🥛',
  'Limpieza y hogar': '🧹',
  'Maquillaje': '💄',
  'Marisco y pescado': '🐟',
  'Mascotas': '🐾',
  'Panadería y pastelería': '🥖',
  'Pizzas y platos preparados': '🍕',
  'Postres y yogures': '🍮',
  'Otros': '📝',
}

export default function NotebookItemRow({
  item,
  onToggle,
  onDelete,
  onEdit,
  onUpdatePhoto,
  isDespensa,
}: Props) {
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false)
  const timerRef = useRef<number | null>(null)
  const isLongPressRef = useRef(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const icon = CATEGORY_ICONS[item.category] || '🛒'

  const touchStartPos = useRef<{ x: number; y: number } | null>(null)

  // Control estricto de pulsación prolongada (Long Press 600ms sin mover el dedo)
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartPos.current = { x: t.clientX, y: t.clientY }
    isLongPressRef.current = false
    timerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true
      if (onEdit) {
        onEdit(item)
      }
    }, 600)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return
    const t = e.touches[0]
    const dx = Math.abs(t.clientX - touchStartPos.current.x)
    const dy = Math.abs(t.clientY - touchStartPos.current.y)
    // Si el dedo se desplaza más de 8px (scroll de la pantalla), cancelar de inmediato
    if (dx > 8 || dy > 8) {
      cancelLongPress()
    }
  }

  const handleTouchEnd = () => {
    cancelLongPress()
    touchStartPos.current = null
  }

  const cancelLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    cancelLongPress()
    if (item.photo) {
      setIsPhotoZoomed((prev) => !prev)
    } else {
      // Activar cámara o galería
      photoInputRef.current?.click()
    }
  }

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file)
      if (onUpdatePhoto) {
        onUpdatePhoto(item.id, dataUrl)
      }
    } catch (err) {
      console.warn('Error procesando foto:', err)
    }
    e.target.value = ''
  }

  const closeZoom = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPhotoZoomed(false)
  }

  return (
    <>
      <li
        className={`notebook-item-row ${item.checked ? 'checked' : ''}`}
        onMouseDown={handleTouchStart as unknown as React.MouseEventHandler}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={cancelLongPress}
        title="Mantén pulsado para editar unidades"
      >
        {/* Casilla a lápiz para marcar */}
        <div className="notebook-checkbox-col">
          <button
            type="button"
            className={`notebook-checkbox ${item.checked ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(item.id)
            }}
            aria-label={item.checked ? `Desmarcar ${item.name}` : `Marcar ${item.name}`}
          />
        </div>

        {/* Miniatura de foto o botón para activar cámara */}
        <div
          className="notebook-item-photo-col"
          onClick={handlePhotoClick}
          style={{ cursor: 'pointer' }}
          title={item.photo ? 'Toca para ampliar foto y ver catálogo' : 'Toca para hacer foto con la cámara'}
        >
          {item.photo ? (
            <img
              src={item.photo}
              alt={item.name}
              className="notebook-item-photo"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="notebook-item-no-photo" style={{ position: 'relative' }}>
              <span>{icon}</span>
              <span
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  fontSize: '0.8rem',
                  background: '#2c2927',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                📷
              </span>
            </div>
          )}

          {/* Input oculto para cámara o galería */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handlePhotoFileChange}
          />
        </div>

        {/* Nombre del producto (sin click accidental) */}
        <div className="notebook-item-body">
          <span className="notebook-item-name">{item.name}</span>
        </div>

        {/* Cantidad anotada: clic directo abre editor de unidades */}
        <span
          className="notebook-item-qty"
          onClick={(e) => {
            e.stopPropagation()
            if (onEdit) onEdit(item)
          }}
          title="Toca para cambiar unidades"
          style={{ cursor: 'pointer' }}
        >
          {item.quantity || '1 ud'}
        </span>

        {/* Botón de edición rápida en despensa */}
        {isDespensa && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              color: '#888',
              padding: '4px',
            }}
            title="Editar producto de despensa"
          >
            ✏️
          </button>
        )}

        {/* Botón X: ÚNICA FORMA de quitar o borrar el producto */}
        <button
          type="button"
          className="notebook-item-delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          title="Quitar producto de la lista"
          aria-label={`Quitar ${item.name}`}
        >
          ✕
        </button>
      </li>

      {/* FOTO GRANDE Y FICHA DE CATALOGACIÓN EN LA PARTE INFERIOR (LIGHTBOX) */}
      {isPhotoZoomed && item.photo && (
        <div className="photo-lightbox-backdrop" onClick={closeZoom}>
          <div className="photo-lightbox-card" onClick={closeZoom}>
            <img
              src={item.photo}
              alt={item.name}
              className="photo-lightbox-img"
            />

            {/* Ficha de catalogación que aparece bajo la imagen */}
            <div className="photo-lightbox-info" onClick={(e) => e.stopPropagation()}>
              <div className="photo-lightbox-title">{item.name}</div>

              {item.category && item.category !== 'Otros' && (
                <div className="photo-lightbox-category">
                  {item.category}
                  {item.subcategory ? ` · ${item.subcategory}` : ''}
                </div>
              )}

              <div className="photo-lightbox-meta">
                {item.packaging && <span>📦 {item.packaging}</span>}
                {item.price != null && (
                  <span style={{ color: '#007849', fontWeight: 'bold' }}>
                    🏷️ {formatPrice(item.price)}
                  </span>
                )}
              </div>

              {/* Botón para cambiar o hacer nueva foto */}
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    background: '#f0ece1',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '4px 12px',
                    fontFamily: 'var(--font-note)',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    color: '#444',
                  }}
                >
                  📷 Hacer nueva foto
                </button>
              </div>
            </div>

            <span className="photo-lightbox-hint">Toca la foto para volver</span>
          </div>
        </div>
      )}
    </>
  )
}
