export type MercadonaProduct = {
  id: string
  name: string
  category: string
  subcategory?: string
  photo: string | null
  price?: number | string | null
  unit_size?: string | null
  size_format?: string | null
  packaging?: string | null
  approx_price?: number | string | null
}

export type NotebookItem = {
  id: string | number
  name: string
  quantity: string
  category: string
  subcategory?: string
  checked: boolean
  inList?: boolean
  photo?: string | null
  price?: number | string | null
  packaging?: string | null
  mercadonaId?: string | null
  note?: string
}

export type NotebookList = {
  id: string | number
  name: string
  color: 'yellow' | 'mint' | 'coral' | 'blue' | 'lavender'
  items: NotebookItem[]
  enableDespensa?: boolean // true por defecto
  enableMercadona?: boolean // true por defecto
}

export function formatPrice(price: string | number | null | undefined): string {
  if (price == null || price === '') return ''
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(',', '.'))
  if (isNaN(num)) return `${price} €`
  return `${num.toFixed(2).replace('.', ',')} €`
}
