import { products, StoreProduct } from '../../components/store/products';
import { HEALTHY_MEAL_REMOTE_IMAGES } from '../../components/store/fitmealRemoteImages';
import {
  getStoreProductById,
  getStoreProducts,
  initDatabase,
  mergeMissingStoreProducts,
  seedStoreProductsIfEmpty,
} from '../lib/database';

/** Deprecated URL patterns + random Picsum meal shots → stable food imagery per SKU where defined. */
function repairRemoteProductImage(product: StoreProduct): StoreProduct {
    const curated = HEALTHY_MEAL_REMOTE_IMAGES[product.id];
    const uri = (product.image ?? '').trim();
    const isBadHealthyMealPic =
        curated !== undefined &&
        (!uri ||
            uri.includes('picsum.photos') ||
            uri.includes('source.unsplash.com'));

    if (curated && isBadHealthyMealPic) {
        return { ...product, image: curated };
    }

    if (!uri || uri.includes('source.unsplash.com')) {
        return {
            ...product,
            image: `https://picsum.photos/seed/evolve-fit-${encodeURIComponent(product.id)}/720/560`,
        };
    }
    return product;
}

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
  await mergeMissingStoreProducts(products);
}

export async function getAllProducts(query?: ProductQuery): Promise<StoreProduct[]> {
  await ensureStoreBackendReady();
  let list = (await getStoreProducts()).map(repairRemoteProductImage);

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

  if (query && typeof query.minRating === 'number') {
    const min = query.minRating;
    list = list.filter(product => (product.rating ?? 0) >= min);
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
  return product ? repairRemoteProductImage(product) : undefined;
}

export async function getFeaturedProducts(limit: number = 8): Promise<StoreProduct[]> {
  await ensureStoreBackendReady();
  const list = (await getStoreProducts()).map(repairRemoteProductImage);
  return list
    .filter(product => product.onSale || product.isNew || (product.rating ?? 0) >= 4.7)
    .slice(0, limit);
}
