export type ProductSuggestion = {
  productId: string
  name: string
  displayName: string
}

type AlgoliaHit = {
  id: number | string
  display_name?: string
  name?: string
}

export async function searchProducts(
  query: string,
  warehouse = 'mad1',
): Promise<ProductSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const appId = import.meta.env.VITE_ALGOLIA_APP_ID
  const apiKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY
  const indexPrefix = import.meta.env.VITE_ALGOLIA_INDEX_PREFIX ?? 'products_prod_'

  if (!apiKey) return []

  const indexName = `${indexPrefix}${warehouse}_es`
  const url = `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/query`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': appId,
        'X-Algolia-API-Key': apiKey,
      },
      body: JSON.stringify({ query: trimmed }),
    })

    if (!response.ok) return []

    const data = (await response.json()) as { hits?: AlgoliaHit[] }
    return (data.hits ?? []).map((hit) => ({
      productId: String(hit.id),
      name: hit.name ?? '',
      displayName: hit.display_name ?? hit.name ?? '',
    }))
  } catch {
    return []
  }
}
