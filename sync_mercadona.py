import urllib.request
import json
import time
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def get_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.loads(r.read())

def sync_catalog():
    print("Iniciando sincronización con API de Mercadona...")
    t0 = time.time()

    # Cargar catálogo previo si existe
    old_products = []
    old_ids = {}
    if os.path.exists('public/mercadona-catalog.json'):
        try:
            with open('public/mercadona-catalog.json', 'r', encoding='utf-8') as f:
                old_products = json.load(f)
                old_ids = {str(p['id']): p for p in old_products if 'id' in p}
        except Exception as e:
            print("No se pudo leer catálogo previo:", e)

    # 1. Obtener árbol de categorías
    cats_data = get_json('https://tienda.mercadona.es/api/categories/')
    root_cats = cats_data.get('results', [])

    subcat_tasks = []
    for root in root_cats:
        root_name = root.get('name', '')
        for sub in root.get('categories', []):
            subcat_tasks.append((sub['id'], root_name, sub.get('name', '')))

    print(f"Descargando {len(subcat_tasks)} subcategorías en paralelo...")

    def fetch_subcat(task):
        sid, rname, sname = task
        try:
            data = get_json(f'https://tienda.mercadona.es/api/categories/{sid}/')
            items = []
            for c in data.get('categories', []):
                inner_name = c.get('name', sname)
                for p in c.get('products', []):
                    price_inst = p.get('price_instructions', {})
                    items.append({
                        'id': str(p.get('id')),
                        'name': p.get('display_name'),
                        'category': rname,
                        'subcategory': inner_name,
                        'photo': p.get('thumbnail'),
                        'price': price_inst.get('unit_price'),
                        'unit_size': price_inst.get('unit_size'),
                        'size_format': price_inst.get('size_format'),
                        'packaging': p.get('packaging'),
                    })
            return items
        except Exception as e:
            return []

    new_catalog = []
    with ThreadPoolExecutor(max_workers=14) as ex:
        results = ex.map(fetch_subcat, subcat_tasks)
        for res in results:
            new_catalog.extend(res)

    # Deduplicar
    seen = set()
    unique_catalog = []
    for p in new_catalog:
        if p['id'] and p['id'] not in seen:
            seen.add(p['id'])
            unique_catalog.append(p)

    if not unique_catalog:
        print("Error: No se obtuvieron productos.")
        return

    # Comparar para detectar novedades y variaciones de precio
    new_products = []
    price_changes = []

    for p in unique_catalog:
        pid = p['id']
        if pid not in old_ids:
            new_products.append(p)
        else:
            old_p = old_ids[pid]
            if str(p.get('price')) != str(old_p.get('price')):
                price_changes.append({
                    'id': pid,
                    'name': p['name'],
                    'oldPrice': old_p.get('price'),
                    'newPrice': p.get('price'),
                })

    # Guardar catálogo actualizado
    with open('public/mercadona-catalog.json', 'w', encoding='utf-8') as f:
        json.dump(unique_catalog, f, ensure_ascii=False)

    # Guardar informe de novedades
    news_report = {
        'lastSync': datetime.now().isoformat(),
        'totalProducts': len(unique_catalog),
        'newProductsCount': len(new_products),
        'newProducts': new_products[:30], # Muestra de hasta 30 nuevos
        'priceChangesCount': len(price_changes),
        'priceChanges': price_changes[:30],
    }

    with open('public/mercadona-news.json', 'w', encoding='utf-8') as f:
        json.dump(news_report, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - t0
    print(f"Completado en {elapsed:.1f}s. Total: {len(unique_catalog)} productos.")
    print(f"Nuevos productos encontrados: {len(new_products)}")
    print(f"Cambios de precio detectados: {len(price_changes)}")

if __name__ == '__main__':
    sync_catalog()
