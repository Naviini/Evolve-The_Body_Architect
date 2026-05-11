/**
 * Sync Layer — Local SQLite ↔ Supabase
 *
 * Implements the outbox pattern:
 * 1. All writes go to local SQLite first
 * 2. Records marked as 'pending' are pushed to Supabase when online
 * 3. Remote changes are pulled and merged locally
 * 4. Conflict resolution: last-write-wins via updated_at timestamp
 */

import NetInfo from '@react-native-community/netinfo';
import { isSupabaseConfigured, supabase } from './supabase';
import { getPendingMealEntries, markAsSynced, upsertMealEntryFromSupabase } from './database';

let isSyncing = false;
let lastSyncTimestamp: string | null = null;

// ============================================================
// Main Sync Function
// ============================================================

export async function syncAll(): Promise<{ pushed: number; pulled: number; errors: string[] }> {
    if (isSyncing) return { pushed: 0, pulled: 0, errors: ['Sync already in progress'] };

    if (!isSupabaseConfigured()) {
        return { pushed: 0, pulled: 0, errors: ['Supabase is not configured (check EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).'] };
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        return { pushed: 0, pulled: 0, errors: ['No internet connection'] };
    }

    isSyncing = true;
    const result = { pushed: 0, pulled: 0, errors: [] as string[] };

    try {
        // Push local changes
        const pushResult = await pushChanges();
        result.pushed = pushResult.count;
        result.errors.push(...pushResult.errors);

        // Pull remote changes
        const pullResult = await pullChanges();
        result.pulled = pullResult.count;
        result.errors.push(...pullResult.errors);

        // Update last sync timestamp
        lastSyncTimestamp = new Date().toISOString();
    } catch (error: any) {
        result.errors.push(`Sync failed: ${error.message}`);
    } finally {
        isSyncing = false;
    }

    return result;
}

// ============================================================
// Push local changes to Supabase
// ============================================================

async function pushChanges(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
        const pendingMeals = await getPendingMealEntries();

        for (const meal of pendingMeals) {
            try {
                if (meal.is_deleted) {
                    // Soft delete in Supabase
                    const { error } = await supabase
                        .from('meal_entries')
                        .update({ is_deleted: true, updated_at: meal.updated_at })
                        .eq('id', meal.id);

                    if (error) throw error;
                } else {
                    // Upsert
                    const { error } = await supabase.from('meal_entries').upsert({
                        id: meal.id,
                        user_id: meal.user_id,
                        food_item_id: meal.food_item_id,
                        food_name: meal.food_name,
                        meal_type: meal.meal_type,
                        servings: meal.servings,
                        calories: meal.calories,
                        protein_g: meal.protein_g,
                        carbs_g: meal.carbs_g,
                        fat_g: meal.fat_g,
                        logged_at: meal.logged_at,
                        notes: meal.notes,
                        image_url: meal.image_url,
                        created_at: meal.created_at,
                        updated_at: meal.updated_at,
                        is_deleted: false,
                    });

                    if (error) throw error;
                }

                await markAsSynced('meal_entries', meal.id);
                count++;
            } catch (err: any) {
                errors.push(`Failed to push meal ${meal.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        errors.push(`Push error: ${err.message}`);
    }

    return { count, errors };
}

// ============================================================
// Pull remote changes from Supabase
// ============================================================

async function pullChanges(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) return { count, errors: ['Not authenticated'] };

        let query = supabase
            .from('meal_entries')
            .select('*')
            .eq('user_id', session.session.user.id);

        if (lastSyncTimestamp) {
            query = query.gt('updated_at', lastSyncTimestamp);
        }

        const { data, error } = await query;

        if (error) {
            errors.push(`Pull error: ${error.message}`);
            return { count, errors };
        }

        const rows = data ?? [];
        for (const row of rows) {
            try {
                await upsertMealEntryFromSupabase(row);
                count++;
            } catch (e: any) {
                errors.push(`Merge error (meal_entries:${row?.id ?? 'unknown'}): ${e?.message ?? e}`);
            }
        }
    } catch (err: any) {
        errors.push(`Pull error: ${err.message}`);
    }

    return { count, errors };
}

// ============================================================
// Auto-Sync on Connectivity Change
// ============================================================

let unsubscribe: (() => void) | null = null;

export function startAutoSync(): void {
    if (unsubscribe) return;

    // Best-effort initial sync when app starts.
    syncAll().catch(() => {});

    unsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected) {
            // Delay slightly to let connection stabilize
            setTimeout(() => {
                syncAll().catch(console.error);
            }, 2000);
        }
    });
}

export function stopAutoSync(): void {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}

export function getSyncStatus(): { isSyncing: boolean; lastSync: string | null } {
    return { isSyncing, lastSync: lastSyncTimestamp };
}
