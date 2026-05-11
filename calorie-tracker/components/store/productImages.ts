import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled catalogue photos (SQLite stores remote URIs — many break on device —
 * these locals always win when the row id matches).
 */
const STORE_IMAGE_BY_PRODUCT_ID: Record<string, ImageSourcePropType> = {
  p001: require('../../assets/store/whey_protein_isolate.jpg'),
  p002: require('../../assets/store/yoga_mat.jpg'),
  p003: require('../../assets/store/almond_butter.jpg'),
  p004: require('../../assets/store/electrolyte_drink.jpg'),
  p005: require('../../assets/store/dumbbell_set.jpg'),
  p006: require('../../assets/store/shaker_bottle.jpg'),
  /** Greek Yogurt Protein Parfait Meal — bundled for reliable thumbs (fresh berries / yogurt vibe). */
  p035: require('../../assets/store/greek_yogurt_parfait.jpg'),
};

function isHttpsUri(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** Primary image source for a store row — local asset when defined, else HTTPS URI from DB. */
export function storeProductImageSource(
  productId: string,
  remoteImage?: string | null
): ImageSourcePropType | undefined {
  const local = STORE_IMAGE_BY_PRODUCT_ID[productId];
  if (local !== undefined) {
    return local;
  }
  if (remoteImage && isHttpsUri(remoteImage)) {
    return { uri: remoteImage.trim() };
  }
  return undefined;
}
