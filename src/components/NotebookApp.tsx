import { useState, useEffect, useMemo, useRef } from 'react'
import type { NotebookList, NotebookItem, MercadonaProduct } from '../domain/notebookTypes'
import { formatPrice } from '../domain/notebookTypes'
import { useMercadonaCatalog, normalizeText } from '../hooks/useMercadonaCatalog'
import { useKeepAwake } from '../hooks/useKeepAwake'
import NotebookItemRow from './NotebookItemRow'
import MercadonaCatalogModal from './MercadonaCatalogModal'
import EditItemModal from './EditItemModal'
import EditListModal from './EditListModal'
import SyncPinModal from './SyncPinModal'
import {
  subscribeHouseholdNotebook,
  pushHouseholdNotebook,
  fetchHouseholdNotebook,
  getDeviceId,
} from '../data/notebookSync'
import '../styles/notebook.css'

export default function NotebookApp() {
  // Mantener la pantalla del móvil encendida siempre
  useKeepAwake()

  const { catalog, categories, searchProducts } = useMercadonaCatalog()

  // Estado de listas. Inicializamos "Lista Casa"
  const [lists, setLists] = useState<NotebookList[]>(() => {
    const saved = localStorage.getItem('lista-casa-notebook')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        // Fallback
      }
    }
    return []
  })

  const [activeId, setActiveId] = useState<string | number>(() => lists[0]?.id ?? 1)
  const [searchFilter, setSearchFilter] = useState('')
  const [newItemText, setNewItemText] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)
  const [showDualSearchResults, setShowDualSearchResults] = useState(false)
  const [editingItem, setEditingItem] = useState<NotebookItem | null>(null)
  const [isEditingList, setIsEditingList] = useState(false)
  const [newsNotice, setNewsNotice] = useState<{ count: number; date: string } | null>(null)
  const [syncPin, setSyncPin] = useState<string>(() => {
    return localStorage.getItem('listia-sync-pin') || ''
  })
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const isSyncingFromRemote = useRef(false)

  // Detección de pulsación larga sobre el nombre de la lista (con cancelación si hay scroll)
  const listTouchTimer = useRef<number | null>(null)
  const listTouchStartPos = useRef<{ x: number; y: number } | null>(null)

  const handleListTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    listTouchStartPos.current = { x: t.clientX, y: t.clientY }
    listTouchTimer.current = window.setTimeout(() => {
      setIsEditingList(true)
    }, 550)
  }

  const handleListTouchMove = (e: React.TouchEvent) => {
    if (!listTouchStartPos.current || !listTouchTimer.current) return
    const t = e.touches[0]
    const dx = Math.abs(t.clientX - listTouchStartPos.current.x)
    const dy = Math.abs(t.clientY - listTouchStartPos.current.y)
    if (dx > 8 || dy > 8) {
      clearTimeout(listTouchTimer.current)
      listTouchTimer.current = null
      listTouchStartPos.current = null
    }
  }

  const handleListTouchEnd = () => {
    if (listTouchTimer.current) {
      clearTimeout(listTouchTimer.current)
      listTouchTimer.current = null
    }
    listTouchStartPos.current = null
  }

  // Comprobar si hay novedades registradas del catálogo de Mercadona
  useEffect(() => {
    const basePath = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`
    fetch(`${basePath}mercadona-news.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.newProductsCount > 0) {
          const dismissed = localStorage.getItem('dismissed-news-' + data.lastSync)
          if (!dismissed) {
            setNewsNotice({ count: data.newProductsCount, date: data.lastSync })
          }
        }
      })
      .catch(() => undefined)
  }, [])

  // Capturar PIN desde enlace compartido / QR (?pin=123456)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const pinParam = urlParams.get('pin')
    if (pinParam && /^\d{6}$/.test(pinParam)) {
      setSyncPin(pinParam)
      localStorage.setItem('listia-sync-pin', pinParam)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Suscribirse a Firebase Firestore en tiempo real cuando hay PIN activo
  useEffect(() => {
    if (!syncPin || !/^\d{6}$/.test(syncPin)) return

    // Cargar listas remotas existentes
    fetchHouseholdNotebook(syncPin).then((remoteLists) => {
      if (remoteLists && remoteLists.length > 0) {
        isSyncingFromRemote.current = true
        setLists(remoteLists)
      } else if (lists.length > 0) {
        pushHouseholdNotebook(syncPin, lists).catch(() => undefined)
      }
    })

    // Escuchar cambios de la pareja en tiempo real
    const myDeviceId = getDeviceId()
    const unsubscribe = subscribeHouseholdNotebook(syncPin, (remoteLists, updatedBy) => {
      if (updatedBy !== myDeviceId && Array.isArray(remoteLists) && remoteLists.length > 0) {
        isSyncingFromRemote.current = true
        setLists(remoteLists)
      }
    })

    return () => unsubscribe()
  }, [syncPin])

  // Publicar cambios locales a la pareja en Firebase
  useEffect(() => {
    if (isSyncingFromRemote.current) {
      isSyncingFromRemote.current = false
      return
    }
    if (syncPin && /^\d{6}$/.test(syncPin) && lists.length > 0) {
      const timer = setTimeout(() => {
        pushHouseholdNotebook(syncPin, lists).catch(() => undefined)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [lists, syncPin])

  const handleSetSyncPin = (newPin: string) => {
    setSyncPin(newPin)
    localStorage.setItem('listia-sync-pin', newPin)
    if (lists.length > 0) {
      pushHouseholdNotebook(newPin, lists).catch(() => undefined)
    }
  }

  const handleDisconnectSync = () => {
    setSyncPin('')
    localStorage.removeItem('listia-sync-pin')
  }

  // Cargar los 466 productos de Listonic enriquecidos como "Lista Casa"
  useEffect(() => {
    const saved = localStorage.getItem('lista-casa-notebook')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const casaList = parsed.find((l: NotebookList) => l.name === 'Lista Casa')
          if (casaList && casaList.items.length >= 400) {
            return
          }
        }
      } catch {
        // Continuar a fetch
      }
    }

    const basePath = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`
    fetch(`${basePath}listonic-import.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((imported: NotebookList | null) => {
        if (!imported || !imported.items) return
        const casaList: NotebookList = {
          id: 1,
          name: 'Lista Casa',
          color: 'yellow',
          items: imported.items.map((item, idx) => ({
            ...item,
            id: item.id || idx + 1,
            // inList = true para los 5 que estaban pendientes; false para los comprados
            inList: item.inList !== undefined ? item.inList : !item.checked,
            checked: false, // El check se usa para seleccionar y quitar
          })),
        }

        setLists([casaList])
        setActiveId(casaList.id)
      })
      .catch((e) => console.warn('Error cargando catálogo inicial de Lista Casa:', e))
  }, [])

  // Guardar en localStorage
  useEffect(() => {
    if (lists.length > 0) {
      try {
        localStorage.setItem('lista-casa-notebook', JSON.stringify(lists))
      } catch (e) {
        console.warn('Error guardando en localStorage:', e)
      }
    }
  }, [lists])

  // Lista activa
  const activeList = useMemo(() => {
    return lists.find((l) => l.id === activeId) ?? lists[0]
  }, [lists, activeId])

  // Actualizar lista activa
  const updateActiveList = (updater: (list: NotebookList) => NotebookList) => {
    setLists((current) =>
      current.map((list) => (list.id === activeId ? updater(list) : list))
    )
  }

  // Items activos en la libreta (inList !== false) con filtro insensible a mayúsculas y acentos
  const pendingItems = useMemo(() => {
    if (!activeList) return []
    const term = normalizeText(searchFilter)
    return activeList.items.filter((item) => {
      const isInList = item.inList !== false
      if (!isInList) return false
      if (!term) return true
      return (
        normalizeText(item.name).includes(term) ||
        normalizeText(item.category || '').includes(term)
      )
    })
  }, [activeList, searchFilter])

  // Items en despensa / comprados (inList === false) con filtro insensible a mayúsculas y acentos
  const despensaItems = useMemo(() => {
    if (!activeList) return []
    const term = normalizeText(searchFilter)
    return activeList.items.filter((item) => {
      const isInList = item.inList !== false
      if (isInList) return false
      if (!term) return true
      return (
        normalizeText(item.name).includes(term) ||
        normalizeText(item.category || '').includes(term)
      )
    })
  }, [activeList, searchFilter])

  // Cantidad de seleccionados con el cuadro check para quitar de una vez
  const selectedCheckedItems = useMemo(() => {
    return pendingItems.filter((i) => i.checked)
  }, [pendingItems])

  // Métricas
  const totalInListCount = pendingItems.length
  const totalDespensaCount = despensaItems.length

  const totalCost = useMemo(() => {
    if (!activeList) return 0
    return pendingItems
      .filter((i) => i.price != null && i.price !== '')
      .reduce((acc, curr) => {
        const num =
          typeof curr.price === 'number'
            ? curr.price
            : parseFloat(String(curr.price).replace(',', '.'))
        return acc + (isNaN(num) ? 0 : num)
      }, 0)
  }, [activeList, pendingItems])

  // Opciones de configuración de la libreta activa
  const isDespensaEnabled = activeList?.enableDespensa !== false
  const isMercadonaEnabled = activeList?.enableMercadona !== false

  // BÚSQUEDA DUAL: Insensible a mayúsculas y acentos
  const dualSearchResults = useMemo(() => {
    const query = normalizeText(newItemText)
    if (!query || query.length < 2) {
      return { casaItems: [], mercadonaItems: [] }
    }

    // 1. Buscar en los productos de la libreta / despensa (si despensa está habilitada)
    const matchedCasa =
      activeList && isDespensaEnabled
        ? activeList.items
            .filter((it) => {
              const nameNorm = normalizeText(it.name)
              const catNorm = normalizeText(it.category || '')
              return nameNorm.includes(query) || catNorm.includes(query)
            })
            .slice(0, 8)
        : []

    // 2. Buscar en el catálogo oficial de Mercadona (si está habilitado para esta libreta)
    const matchedMercadona = isMercadonaEnabled ? searchProducts(query, undefined, 8) : []

    return {
      casaItems: matchedCasa,
      mercadonaItems: matchedMercadona,
    }
  }, [newItemText, activeList, isDespensaEnabled, isMercadonaEnabled, searchProducts])

  // Toggle checkbox (seleccionar / deseleccionar)
  const handleToggleCheck = (itemId: string | number) => {
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((i) =>
        i.id === itemId ? { ...i, checked: !i.checked } : i
      ),
    }))
  }

  // Marcar o desmarcar todos los productos de la compra activa
  const handleToggleCheckAll = () => {
    const allChecked = pendingItems.length > 0 && pendingItems.every((i) => i.checked)
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((i) =>
        i.inList !== false ? { ...i, checked: !allChecked } : i
      ),
    }))
  }

  // Quitar varios productos seleccionados DE UNA VEZ (se mueven a despensa)
  const handleRemoveSelected = () => {
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((i) =>
        i.checked ? { ...i, inList: false, checked: false } : i
      ),
    }))
  }

  // Desmarcar todos los checks
  const handleUncheckAll = () => {
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((i) => ({ ...i, checked: false })),
    }))
  }

  // Quitar un único producto mediante la X (se mueve a despensa)
  const handleSingleDelete = (itemId: string | number) => {
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((i) =>
        i.id === itemId ? { ...i, inList: false, checked: false } : i
      ),
    }))
  }

  // Activar producto desde despensa o búsqueda hacia la libreta activa
  const handleActivateToNotebook = (itemId: string | number) => {
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((i) =>
        i.id === itemId ? { ...i, inList: true, checked: false } : i
      ),
    }))
    setNewItemText('')
    setShowDualSearchResults(false)
    ;(document.activeElement as HTMLElement)?.blur?.()
  }

  // Añadir desde catálogo de Mercadona a Lista Casa
  const handleAddFromMercadona = (product: MercadonaProduct) => {
    if (!activeList) return

    const normName = normalizeText(product.name)
    const existing = activeList.items.find(
      (it) => it.mercadonaId === product.id || normalizeText(it.name) === normName
    )

    if (existing) {
      handleActivateToNotebook(existing.id)
      return
    }

    const newItem: NotebookItem = {
      id: Date.now(),
      name: product.name,
      quantity: '1 ud',
      category: product.category,
      subcategory: product.subcategory,
      checked: false,
      inList: true,
      photo: product.photo,
      price: product.price,
      packaging: product.packaging,
      mercadonaId: product.id,
    }

    updateActiveList((list) => ({
      ...list,
      items: [newItem, ...list.items],
    }))

    setIsCatalogModalOpen(false)
    setNewItemText('')
    setShowDualSearchResults(false)
    ;(document.activeElement as HTMLElement)?.blur?.()
  }

  // Añadir a mano alzada: EXACTAMENTE LA PALABRA ESCRITA (sin sustitución por Mercadona)
  const handleAddManualItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const text = newItemText.trim()
    if (!text || !activeList) return

    const newItem: NotebookItem = {
      id: Date.now(),
      name: text, // La palabra exacta que escribió el usuario
      quantity: '1 ud',
      category: 'Otros',
      checked: false,
      inList: true,
      photo: null,
      price: null,
      packaging: null,
      mercadonaId: null,
    }

    updateActiveList((list) => ({
      ...list,
      items: [newItem, ...list.items],
    }))

    setNewItemText('')
    setShowDualSearchResults(false)
    ;(document.activeElement as HTMLElement)?.blur?.()
  }

  // Guardar edición de unidades/detalles de producto
  const handleSaveEditedItem = (updated: NotebookItem) => {
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((it) => (it.id === updated.id ? updated : it)),
    }))
  }

  // Guardar foto tomada con la cámara o galería
  const handleUpdatePhoto = (itemId: string | number, photoDataUrl: string) => {
    updateActiveList((list) => ({
      ...list,
      items: list.items.map((it) =>
        it.id === itemId ? { ...it, photo: photoDataUrl } : it
      ),
    }))
  }

  // Crear nueva página/lista
  const handleCreateList = () => {
    const name = window.prompt('Nombre de la nueva libreta:', 'Mercadona')?.trim()
    if (!name) return

    const colors: ('yellow' | 'mint' | 'coral' | 'blue' | 'lavender')[] = [
      'yellow',
      'mint',
      'coral',
      'blue',
      'lavender',
    ]
    const chosenColor = colors[lists.length % colors.length]
    const id = Date.now()

    const newList: NotebookList = {
      id,
      name,
      color: chosenColor,
      items: [],
      enableDespensa: true,
      enableMercadona: true,
    }

    setLists((current) => [...current, newList])
    setActiveId(id)
  }

  // Guardar configuración de la lista activa (nombre, color, despensa, mercadona)
  const handleSaveEditedList = (updated: {
    name: string
    color: NotebookList['color']
    enableDespensa: boolean
    enableMercadona: boolean
  }) => {
    updateActiveList((list) => ({
      ...list,
      name: updated.name,
      color: updated.color,
      enableDespensa: updated.enableDespensa,
      enableMercadona: updated.enableMercadona,
    }))
  }

  // Eliminar la lista activa (si hay más de 1)
  const handleDeleteActiveList = (id: string | number) => {
    if (lists.length <= 1) return
    const nextLists = lists.filter((l) => l.id !== id)
    setLists(nextLists)
    setActiveId(nextLists[0].id)
  }

  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }, [])

  return (
    <div className="notebook-wrapper">
      <div className="notebook-book">
        {/* Espiral superior metálica de libreta */}
        <div className="notebook-spiral-header">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="spiral-ring" />
          ))}
        </div>

        {/* Banner de novedades de Mercadona */}
        {newsNotice && (
          <div
            style={{
              background: '#007849',
              color: '#fff',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-note)',
              fontSize: '1rem',
            }}
          >
            <span>
              🔔 ¡Mercadona actualizado! {newsNotice.count} productos nuevos detectados.
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setIsCatalogModalOpen(true)
                  localStorage.setItem('dismissed-news-' + newsNotice.date, 'true')
                  setNewsNotice(null)
                }}
                style={{
                  background: '#fff',
                  color: '#007849',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '2px 10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Ver catálogo
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('dismissed-news-' + newsNotice.date, 'true')
                  setNewsNotice(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Pestañas Post-it de libretas */}
        <div className="notebook-tabs-container">
          {lists.map((l) => (
            <button
              key={l.id}
              className={`notebook-tab tab-${l.color} ${l.id === activeId ? 'active' : ''}`}
              onClick={() => {
                setActiveId(l.id)
                setSearchFilter('')
              }}
              onTouchStart={(e) => {
                if (l.id === activeId) handleListTouchStart(e)
              }}
              onTouchMove={(e) => {
                if (l.id === activeId) handleListTouchMove(e)
              }}
              onTouchEnd={handleListTouchEnd}
              onTouchCancel={handleListTouchEnd}
              onContextMenu={(e) => {
                e.preventDefault()
                setActiveId(l.id)
                setIsEditingList(true)
              }}
              type="button"
            >
              <span>{l.name}</span>
              <small>({l.items.filter((i) => i.inList !== false).length})</small>
            </button>
          ))}
          <button
            className="notebook-tab-add"
            onClick={handleCreateList}
            title="Crear otra libreta"
            type="button"
          >
            + Nueva
          </button>
        </div>

        {/* Hoja de libreta con líneas y margen rojo */}
        <main className="notebook-sheet">
          {/* Cabecera manuscrita (sin botones de guardar/cargar) */}
          <header className="notebook-header">
            <div className="notebook-title-row">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  cursor: 'pointer',
                }}
                onTouchStart={handleListTouchStart}
                onTouchMove={handleListTouchMove}
                onTouchEnd={handleListTouchEnd}
                onTouchCancel={handleListTouchEnd}
              >
                <h1
                  className="notebook-title"
                  title="Pulsación larga para editar nombre, despensa y Mercadona"
                  onDoubleClick={() => setIsEditingList(true)}
                >
                  {activeList?.name || 'Lista Casa'}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingList(true)}
                  title="Editar nombre y opciones de la libreta"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.15rem',
                    opacity: 0.65,
                    padding: '2px 4px',
                    cursor: 'pointer',
                  }}
                >
                  ✏️
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(true)}
                  title="Sincronizar libreta con tu pareja por PIN o QR"
                  style={{
                    background: syncPin ? '#dcfce7' : '#f4ede0',
                    color: syncPin ? '#166534' : '#5a544c',
                    border: `1px solid ${syncPin ? '#86efac' : '#dcd3bf'}`,
                    borderRadius: '16px',
                    padding: '3px 10px',
                    fontFamily: 'var(--font-note)',
                    fontSize: '0.92rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{syncPin ? '🟢' : '📲'}</span>
                  <span>{syncPin ? `PIN: ${syncPin}` : 'Sincronizar'}</span>
                </button>
                <span className="notebook-date">{todayStr}</span>
              </div>
            </div>

            <div className="notebook-meta-row">
              <div className="notebook-stats">
                <span>
                  <strong>{totalInListCount}</strong> en libreta
                </span>
                {totalCost > 0 && (
                  <>
                    <span>·</span>
                    <span style={{ color: '#007849', fontWeight: 'bold' }}>
                      ~{formatPrice(totalCost)}
                    </span>
                  </>
                )}
                {isDespensaEnabled && (
                  <>
                    <span>·</span>
                    <span>{totalDespensaCount} en despensa</span>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* SECCIÓN 1: PRODUCTOS PARA COMPRAR (SIEMPRE ARRIBA) */}
          <div
            style={{
              padding: '12px 14px 10px 38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid rgba(80, 75, 70, 0.2)',
              background: '#fcfaf4',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-note)',
                fontSize: '1.4rem',
                fontWeight: 'bold',
                color: '#2c2927',
              }}
            >
              🛒 Para comprar ({pendingItems.length})
            </span>

            {pendingItems.length > 0 && (
              <button
                type="button"
                onClick={handleToggleCheckAll}
                style={{
                  background: 'none',
                  border: '1px solid #b5ae9f',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  fontFamily: 'var(--font-note)',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  color: '#444',
                }}
              >
                {pendingItems.every((i) => i.checked)
                  ? '⬜ Desmarcar todos'
                  : '☑️ Marcar todos'}
              </button>
            )}
          </div>

          {/* BARRA DE ACCIÓN: MOVER A DESPENSA LOS MARCADOS */}
          {selectedCheckedItems.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px 8px 46px',
                background: '#e8f5e9',
                borderBottom: '2px solid #a5d6a7',
                animation: 'fadeIn 0.15s ease',
              }}
            >
              <span style={{ fontFamily: 'var(--font-note)', fontSize: '1.05rem', color: '#1b5e20' }}>
                <strong>{selectedCheckedItems.length}</strong> marcados
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleUncheckAll}
                  style={{
                    background: 'none',
                    border: '1px solid #a5d6a7',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontFamily: 'var(--font-note)',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    color: '#2e7d32',
                  }}
                >
                  Desmarcar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  style={{
                    background: '#007849',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontFamily: 'var(--font-note)',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,120,73,0.35)',
                  }}
                  title="Pasa los productos seleccionados a la despensa (como ya comprados)"
                >
                  📦 Mover a despensa ({selectedCheckedItems.length})
                </button>
              </div>
            </div>
          )}

          {/* Filtro rápido dentro de la hoja */}
          {totalInListCount > 6 && (
            <div className="notebook-tools">
              <div className="notebook-search-box">
                <input
                  type="text"
                  placeholder="🔍 Filtrar en esta libreta (sin importar acentos)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Lista de productos para comprar */}
          <ul className="notebook-items-list">
            {pendingItems.map((item) => (
              <NotebookItemRow
                key={item.id}
                item={item}
                onToggle={handleToggleCheck}
                onDelete={handleSingleDelete}
                onEdit={(it) => setEditingItem(it)}
                onUpdatePhoto={handleUpdatePhoto}
              />
            ))}
          </ul>

          {/* Estado vacío cuando no hay productos en la libreta */}
          {pendingItems.length === 0 && (
            <div className="notebook-empty-state">
              <div className="notebook-empty-icon">🛒</div>
              <h3>Libreta libre</h3>
              <p>
                Busca abajo un producto para añadirlo o búscalos en tu despensa / Mercadona.
              </p>
            </div>
          )}

          {/* SECCIÓN 2: DESPENSA Y PRODUCTOS GUARDADOS (EDITABLES) */}
          {isDespensaEnabled && totalDespensaCount > 0 && (
            <div style={{ marginTop: '24px', padding: '0 10px 24px 38px' }}>
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                style={{
                  background: 'none',
                  border: '1px dashed #b5ae9f',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: '#554e46',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {showHistory ? '▲ Ocultar' : '▼ Ver'} despensa ({despensaItems.length} productos)
                </span>
                <span style={{ fontSize: '0.95rem', color: '#777', fontWeight: 'normal' }}>
                  {showHistory ? 'Cerrar' : 'Toca para reactivar'}
                </span>
              </button>

              {showHistory && (
                <div style={{ marginTop: '10px' }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      color: '#888',
                      marginBottom: '6px',
                      fontFamily: 'var(--font-note)',
                    }}
                  >
                    💡 Pulsa ✏️ o las unidades para editar el producto. Pulsa el check o la X para moverlo.
                  </div>
                  <ul className="notebook-items-list" style={{ opacity: 0.9 }}>
                    {despensaItems.map((item) => (
                      <NotebookItemRow
                        key={item.id}
                        item={item}
                        isDespensa={true}
                        onToggle={() => handleActivateToNotebook(item.id)}
                        onDelete={handleSingleDelete}
                        onEdit={(it) => setEditingItem(it)}
                        onUpdatePhoto={handleUpdatePhoto}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* BARRA INFERIOR FIJA CON BÚSQUEDA DUAL (MÓVIL FIRST) */}
      <footer className="notebook-bottom-bar">
        <form className="notebook-input-row" onSubmit={handleAddManualItem}>
          <input
            className="notebook-main-input"
            type="text"
            placeholder={
              isMercadonaEnabled
                ? '🔍 Busca en Casa o Mercadona...'
                : '🔍 Añadir producto a la libreta...'
            }
            value={newItemText}
            onChange={(e) => {
              setNewItemText(e.target.value)
              setShowDualSearchResults(true)
            }}
            onFocus={() => setShowDualSearchResults(true)}
          />

          {/* Botón verde para abrir catálogo de Mercadona (si está habilitado para esta libreta) */}
          {isMercadonaEnabled && (
            <button
              type="button"
              className="notebook-btn-catalog"
              onClick={() => {
                ;(document.activeElement as HTMLElement)?.blur?.()
                setIsCatalogModalOpen(true)
              }}
              title="Explorar las 26 secciones de Mercadona con fotos"
            >
              🛒 Mercadona
            </button>
          )}

          {/* Botón añadir a lápiz */}
          <button type="submit" className="notebook-btn-add" title="Anotar en la libreta">
            +
          </button>

          {/* PANEL FLOTANTE DE BÚSQUEDA DUAL (CASA + MERCADONA) */}
          {showDualSearchResults && newItemText.trim().length >= 2 && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '8px',
                background: '#ffffff',
                border: '2px solid #5a544c',
                borderRadius: '12px',
                boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
                maxHeight: '380px',
                overflowY: 'auto',
                zIndex: 250,
              }}
            >
              {/* Barra de cabecera */}
              <div
                style={{
                  padding: '8px 12px',
                  background: '#f4ede0',
                  borderBottom: '1px solid #dcd3bf',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: '#36322d',
                }}
              >
                <span>Resultados para «{newItemText}»</span>
                <button
                  type="button"
                  onClick={() => setShowDualSearchResults(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: '#666',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* SECCIÓN A: EN TU LISTA CASA / DESPENSA */}
              <div style={{ padding: '6px 10px', background: '#faf6ee', borderBottom: '1px solid #eee' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#885500' }}>
                  🏠 En tu Lista Casa / Despensa ({dualSearchResults.casaItems.length})
                </span>
              </div>
              {dualSearchResults.casaItems.map((item) => (
                <div
                  key={`casa-${item.id}`}
                  onClick={() => handleActivateToNotebook(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderBottom: '1px solid #f2ede4',
                    background: item.inList !== false ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt={item.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        border: '1px solid #ddd',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        background: '#eee',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                      }}
                    >
                      🏠
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', color: '#222', fontFamily: 'var(--font-note)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#777' }}>
                      {item.category} {item.price ? `· ${formatPrice(item.price)}` : ''}
                    </div>
                  </div>

                  {item.inList === false ? (
                    <button
                      type="button"
                      style={{
                        background: '#007849',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontFamily: 'var(--font-note)',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                      }}
                    >
                      + Comprar
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.85rem',
                        color: '#007849',
                        fontWeight: 'bold',
                        padding: '3px 8px',
                        background: '#e0f4eb',
                        borderRadius: '4px',
                      }}
                    >
                      ✏️ En la libreta
                    </span>
                  )}
                </div>
              ))}

              {dualSearchResults.casaItems.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#888', fontStyle: 'italic' }}>
                  No está en tu Lista Casa.
                </div>
              )}

              {/* SECCIÓN B: EN EL CATÁLOGO DE MERCADONA (4.318 productos) */}
              <div style={{ padding: '6px 10px', background: '#eaf5ee', borderBottom: '1px solid #d0e8d8' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#007849' }}>
                  🛒 Del catálogo de Mercadona ({dualSearchResults.mercadonaItems.length})
                </span>
              </div>
              {dualSearchResults.mercadonaItems.map((prod) => (
                <div
                  key={`merca-${prod.id}`}
                  onClick={() => handleAddFromMercadona(prod)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderBottom: '1px solid #f2ede4',
                    cursor: 'pointer',
                  }}
                >
                  {prod.photo && (
                    <img
                      src={prod.photo}
                      alt={prod.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        border: '1px solid #ddd',
                      }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.15rem', color: '#222', fontFamily: 'var(--font-note)' }}>
                      {prod.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#777' }}>
                      {prod.category} {prod.price ? `· ${formatPrice(prod.price)}` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: '#007849',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              ))}

              {/* Opción rápida: Añadir exactamente la palabra escrita a mano */}
              <div
                onClick={handleAddManualItem}
                style={{
                  padding: '12px 14px',
                  background: '#fcfbf7',
                  borderTop: '2px dashed #dcd3bf',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.15rem',
                  color: '#2c2927',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>✏️</span>
                <span>Añadir a mano: «<strong>{newItemText}</strong>» (solo la palabra)</span>
              </div>
            </div>
          )}
        </form>
      </footer>

      {/* Modal de catálogo completo de Mercadona con fotos y precios */}
      <MercadonaCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        onSelectProduct={handleAddFromMercadona}
        catalog={catalog}
        categories={categories}
        searchProducts={searchProducts}
      />

      {/* Modal para editar unidades y detalles del producto */}
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditedItem}
      />

      {/* Modal para configurar libreta (nombre, color, despensa, Mercadona) */}
      <EditListModal
        isOpen={isEditingList}
        list={activeList ?? null}
        totalLists={lists.length}
        onClose={() => setIsEditingList(false)}
        onSave={handleSaveEditedList}
        onDeleteList={handleDeleteActiveList}
      />

      {/* Modal para sincronizar en pareja con PIN o código QR */}
      <SyncPinModal
        isOpen={isSyncModalOpen}
        currentPin={syncPin}
        onClose={() => setIsSyncModalOpen(false)}
        onSetPin={handleSetSyncPin}
        onDisconnect={handleDisconnectSync}
      />
    </div>
  )
}
