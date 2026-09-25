import { useState, useMemo } from 'react'
import type { MercadonaProduct } from '../domain/notebookTypes'
import { formatPrice } from '../domain/notebookTypes'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSelectProduct: (product: MercadonaProduct) => void
  catalog: MercadonaProduct[]
  categories: { name: string; count: number }[]
  searchProducts: (query: string, categoryFilter?: string, limit?: number) => MercadonaProduct[]
}

export default function MercadonaCatalogModal({
  isOpen,
  onClose,
  onSelectProduct,
  catalog,
  categories,
  searchProducts,
}: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [displayLimit, setDisplayLimit] = useState(80)

  // Calcular el total real de productos que coinciden con el filtro
  const totalMatching = useMemo(() => {
    if (!search && !selectedCategory) return catalog.length
    return searchProducts(search, selectedCategory || undefined, 9999).length
  }, [search, selectedCategory, catalog, searchProducts])

  const results = useMemo(() => {
    return searchProducts(search, selectedCategory || undefined, displayLimit)
  }, [search, selectedCategory, displayLimit, searchProducts])

  if (!isOpen) return null

  // Título explicativo según el filtro activo
  let titleText = `Catálogo Mercadona (${catalog.length} productos)`
  if (selectedCategory) {
    titleText = `${selectedCategory} (${totalMatching} productos)`
  } else if (search.trim()) {
    titleText = `Resultados: «${search}» (${totalMatching} productos)`
  }

  return (
    <div className="catalog-modal-backdrop" onClick={onClose}>
      <div className="catalog-modal" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera Mercadona con total real */}
        <div className="catalog-modal-header">
          <h2>
            <span>🛒</span> {titleText}
          </h2>
          <button className="catalog-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Buscador en vivo */}
        <div className="catalog-modal-search">
          <input
            type="text"
            placeholder="Buscar por nombre (ej: leche, atún, tomate, lejía)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="notebook-btn-eraser"
              onClick={() => setSearch('')}
              type="button"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Filtro por categorías de Mercadona */}
        <div className="catalog-categories-scroll">
          <button
            className={`category-pill ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
            type="button"
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              className={`category-pill ${selectedCategory === cat.name ? 'active' : ''}`}
              onClick={() =>
                setSelectedCategory((prev) => (prev === cat.name ? '' : cat.name))
              }
              type="button"
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Lista de productos con foto y precio */}
        <div className="catalog-products-list">
          {results.map((product) => (
            <div
              key={product.id}
              className="catalog-product-card"
              onClick={() => {
                onSelectProduct(product)
              }}
            >
              {product.photo ? (
                <img
                  src={product.photo}
                  alt={product.name}
                  className="catalog-product-photo"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback si falla la imagen
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="catalog-product-photo notebook-item-no-photo">🛒</div>
              )}

              <div className="catalog-product-info">
                <div className="catalog-product-name">{product.name}</div>
                <div className="catalog-product-meta">
                  <span>{product.packaging || product.subcategory || product.category}</span>
                </div>
              </div>

              {product.price && (
                <div className="catalog-product-price">
                  {formatPrice(product.price)}
                </div>
              )}

              <button
                className="catalog-product-add-btn"
                type="button"
                title="Añadir a la libreta"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectProduct(product)
                }}
              >
                +
              </button>
            </div>
          ))}

          {results.length < totalMatching && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + 60)}
                style={{
                  background: '#007849',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,120,73,0.3)',
                }}
              >
                + Mostrar más ({totalMatching - results.length} restantes)
              </button>
            </div>
          )}

          {results.length === 0 && (
            <div className="notebook-empty-state">
              <div className="notebook-empty-icon">🔍</div>
              <h3>No se encontraron productos</h3>
              <p>Prueba con otra palabra o añade el producto manualmente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
