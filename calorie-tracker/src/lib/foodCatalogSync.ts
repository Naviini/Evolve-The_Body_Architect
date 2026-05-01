/**
 * Food Catalog Sync
 *
 * Pulls the master food catalog from Supabase into local SQLite so that
 * searches work fully offline after the first sync.
 *
 * Strategy
 * ─────────
 * • On first app launch (or after 7 days): fetch all `food_items` from
 *   Supabase in pages of 500 and bulk-upsert into local SQLite.
 * • Subsequent launches re-use the local cache; no network call needed.
 * • `force = true` bypasses the 7-day guard (e.g. pull-to-refresh).
 * • Progress callback lets the UI show "Syncing… 1200 / 4800 items".
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase, isSupabaseConfigured } from './supabase';
import { insertFoodItemsBatch, getFoodCatalogCount } from './database';

// ── Constants ────────────────────────────────────────────────────
const CATALOG_SYNC_KEY      = 'food_catalog_sync_v1';
const SYNC_INTERVAL_MS      = 7 * 24 * 60 * 60 * 1000; // 7 days
const PAGE_SIZE             = 500;

// ── State ────────────────────────────────────────────────────────
let _syncing = false;

// ── Types ────────────────────────────────────────────────────────
export interface CatalogSyncResult {
  synced : number;
  errors : string[];
  skipped: boolean; // true when the cache is fresh and sync was not needed
}

export interface CatalogStatus {
  lastSync  : string | null;
  itemCount : number;
  needsSync : boolean;
  isSyncing : boolean;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Returns the current local catalog status without making any network call.
 */
export async function getCatalogStatus(): Promise<CatalogStatus> {
  const lastSync  = await AsyncStorage.getItem(CATALOG_SYNC_KEY);
  const itemCount = await getFoodCatalogCount();
  const age       = lastSync ? Date.now() - Date.parse(lastSync) : Infinity;
  const needsSync = !lastSync || age > SYNC_INTERVAL_MS || itemCount === 0;
  return { lastSync, itemCount, needsSync, isSyncing: _syncing };
}

/**
 * Syncs the Supabase food catalog into local SQLite.
 *
 * @param force      Skip the 7-day freshness guard.
 * @param onProgress Called each batch with (syncedSoFar, totalItems).
 */
export async function syncFoodCatalog(
  force       = false,
  onProgress?: (synced: number, total: number) => void,
): Promise<CatalogSyncResult> {

  if (_syncing) return { synced: 0, errors: ['Sync already in progress'], skipped: true };

  // ── Check if we actually need to sync ───────────────────────────
  if (!force) {
    const status = await getCatalogStatus();
    if (!status.needsSync) return { synced: 0, errors: [], skipped: true };
  }

  // ── Connectivity check ──────────────────────────────────────────
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { synced: 0, errors: ['No internet connection'], skipped: true };

  if (!isSupabaseConfigured()) {
    return { synced: 0, errors: ['Supabase is not configured'], skipped: true };
  }

  // ── Begin sync ──────────────────────────────────────────────────
  _syncing = true;
  const errors: string[] = [];
  let totalSynced = 0;

  try {
    // 1. Get total row count so the UI can show progress
    const { count, error: countErr } = await supabase
      .from('food_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);

    if (countErr) {
      errors.push(`Count error: ${countErr.message}`);
    }

    const total = count ?? 0;
    if (total === 0) {
      // Catalog hasn't been seeded yet — mark synced anyway so we don't retry every launch
      await AsyncStorage.setItem(CATALOG_SYNC_KEY, new Date().toISOString());
      return { synced: 0, errors: [], skipped: false };
    }

    // 2. Fetch in pages and write to SQLite
    let from = 0;
    while (from < total) {
      const { data, error } = await supabase
        .from('food_items')
        .select('id, name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, is_verified')
        .eq('is_verified', true)
        .order('name')
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        errors.push(`Page ${Math.floor(from / PAGE_SIZE)}: ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;

      await insertFoodItemsBatch(data as any[]);
      totalSynced += data.length;
      from        += PAGE_SIZE;
      onProgress?.(totalSynced, total);
    }

    // 3. Persist sync timestamp
    await AsyncStorage.setItem(CATALOG_SYNC_KEY, new Date().toISOString());

  } catch (err: any) {
    errors.push(`Unexpected error: ${err.message}`);
  } finally {
    _syncing = false;
  }

  return { synced: totalSynced, errors, skipped: false };
}

/**
 * Clears the local sync timestamp, forcing a full re-sync on next call.
 * Useful for debugging or manual refresh.
 */
export async function resetCatalogSync(): Promise<void> {
  await AsyncStorage.removeItem(CATALOG_SYNC_KEY);
}
