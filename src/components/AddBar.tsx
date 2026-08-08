import { useCallback, useEffect, useRef, useState } from 'react'
import { searchProducts, type ProductSuggestion } from '../data/mercadonaSearch'

type AddInput = {
  name: string
  quantity: string
  note: string
  productId: string | null
}

type Props = {
  onAdd: (input: AddInput) => void | Promise<void>
}

export default function AddBar({ onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = window.setTimeout(() => {
      void searchProducts(trimmed).then((results) => {
        setSuggestions(results)
        setActiveIndex(-1)
        setSearching(false)
      })
    }, 200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query])

  const submit = useCallback(
    (input: AddInput) => {
      if (!input.name.trim()) return
      void onAdd(input)
      setQuery('')
      setSuggestions([])
      setActiveIndex(-1)
      inputRef.current?.focus()
    },
    [onAdd],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      const s = suggestions[activeIndex]!
      submit({
        name: s.displayName || s.name,
        quantity: '1',
        note: '',
        productId: s.productId,
      })
      return
    }

    submit({ name: trimmed, quantity: '1', note: '', productId: null })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setActiveIndex(-1)
    }
  }

  const showDropdown = suggestions.length > 0 && query.trim().length >= 2

  return (
    <div className="add-bar">
      <form className="add-bar__form" onSubmit={handleSubmit}>
        <div className="add-bar__input-wrap">
          <input
            ref={inputRef}
            className="input add-bar__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Añadir producto…"
            aria-label="Buscar o añadir producto"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            autoComplete="off"
          />
          {showDropdown && (
            <ul className="add-bar__dropdown" role="listbox">
              {suggestions.map((s, i) => (
                <li
                  key={s.productId}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={`add-bar__suggestion${i === activeIndex ? ' add-bar__suggestion--active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    submit({
                      name: s.displayName || s.name,
                      quantity: '1',
                      note: '',
                      productId: s.productId,
                    })
                  }}
                >
                  {s.displayName || s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="btn btn--primary" aria-label="Añadir">
          +
        </button>
      </form>
      <p className="add-bar__hint">
        {searching ? 'Buscando…' : 'Enter para añadir texto libre'}
      </p>
    </div>
  )
}
