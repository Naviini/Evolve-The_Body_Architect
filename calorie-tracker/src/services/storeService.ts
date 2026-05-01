import { products, StoreProduct } from '../../components/store/products';
import { getStoreProductById, getStoreProducts, initDatabase, seedStoreProductsIfEmpty } from '../lib/database';

export interface ProductQuery {
  category?: string;
  search?: string;
  onlyOnSale?: boolean;
  onlyNew?: boolean;
  minRating?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc';
}

function includesNormalized(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

async function ensureStoreBackendReady() {
  await initDatabase();
  await seedStoreProductsIfEmpty(products);
}

export async function getAllProducts(query?: ProductQuery): Promise<StoreProduct[]> {
  await ensureStoreBackendReady();
  let list = await getStoreProducts();

  if (query?.category && query.category !== 'all') {
    list = list.filter(product => product.category === query.category);
  }

  if (query?.search?.trim()) {
    const keyword = query.search.trim().toLowerCase();
    list = list.filter(product => {
      const inName = includesNormalized(product.name, keyword);
      const inCategory = includesNormalized(product.category, keyword);
      const inTags = product.tags?.some(tag => includesNormalized(tag, keyword));
      return inName || inCategory || inTags;
    });
  }

  if (query?.onlyOnSale) {
    list = list.filter(product => product.onSale);
  }

  if (query?.onlyNew) {
    list = list.filter(product => product.isNew);
  }

  if (typeof query?.minRating === 'number') {
    list = list.filter(product => (product.rating ?? 0) >= query.minRating);
  }

  switch (query?.sortBy) {
    case 'price_asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating_desc':
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'name_asc':
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }

  return list;
}

export async function getProductById(id: string): Promise<StoreProduct | undefined> {
  await ensureStoreBackendReady();
  const product = await getStoreProductById(id);
  return product ?? undefined;
}

export async function getFeaturedProducts(limit: number = 8): Promise<StoreProduct[]> {
  await ensureStoreBackendReady();
  const list = await getStoreProducts();
  return list
    .filter(product => product.onSale || product.isNew || (product.rating ?? 0) >= 4.7)
    .slice(0, limit);
}
