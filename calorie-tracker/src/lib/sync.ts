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
import { supabase, isSupabaseConfigured } from './supabase';
import {
    getPendingMealEntries,
    markAsSynced,
    addMealEntry,
    getMealEntryById,
    updateDailyLog,
    getAllWorkoutPlans,
    saveWorkoutPlan,
    getPendingDailyLogs,
    upsertDailyLogDirect,
} from './database';
import type { WorkoutPlan } from '@/src/types';

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

    // Push pending meal entries
    try {
        const pendingMeals = await getPendingMealEntries();

        for (const meal of pendingMeals) {
            try {
                if (meal.is_deleted) {
                    const { error } = await supabase
                        .from('meal_entries')
                        .update({ is_deleted: true, updated_at: meal.updated_at })
                        .eq('id', meal.id);

                    if (error) throw error;
                } else {
                    // food_item_id is set to null for custom foods
                    // (custom items only exist locally; FK would fail otherwise)
                    const { error } = await supabase.from('meal_entries').upsert({
                        id: meal.id,
                        user_id: meal.user_id,
                        food_item_id: null,
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
        errors.push(`Push meals error: ${err.message}`);
    }

    // Push pending daily logs (outbox pattern — same as meal_entries)
    try {
        const pendingLogs = await getPendingDailyLogs();

        for (const log of pendingLogs) {
            try {
                const { error } = await supabase.from('daily_logs').upsert({
                    id: log.id,
                    user_id: log.user_id,
                    log_date: log.log_date,
                    total_calories: log.total_calories,
                    total_protein_g: log.total_protein_g,
                    total_carbs_g: log.total_carbs_g,
                    total_fat_g: log.total_fat_g,
                    water_ml: log.water_ml,
                    updated_at: log.updated_at,
                }, { onConflict: 'user_id,log_date' });

                if (error) throw error;
                await markAsSynced('daily_logs', log.id);
                count++;
            } catch (err: any) {
                errors.push(`Failed to push daily log ${log.log_date}: ${err.message}`);
            }
        }
    } catch (err: any) {
        errors.push(`Push daily logs error: ${err.message}`);
    }

    // Push local workout plans (backfills any that were never synced)
    try {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;

        if (userId) {
            const localPlans = await getAllWorkoutPlans(userId);

            for (const plan of localPlans) {
                try {
                    const { error } = await supabase.from('workout_plans').upsert({
                        id: plan.id,
                        user_id: plan.user_id,
                        week_start_date: plan.week_start_date,
                        plan_json: plan.plan_json,
                        reasoning: plan.reasoning ?? null,
                        generated_at: plan.generated_at,
                    }, { onConflict: 'user_id,week_start_date' });

                    if (error) throw error;
                    count++;
                } catch (err: any) {
                    errors.push(`Failed to push workout plan ${plan.week_start_date}: ${err.message}`);
                }
            }
        }
    } catch (err: any) {
        errors.push(`Push workout plans error: ${err.message}`);
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

        // Merge remote rows into local SQLite (last-write-wins)
        for (const remote of data ?? []) {
            try {
                const existing = await getMealEntryById(remote.id);
                const remoteTs = Date.parse(remote.updated_at ?? '');
                const localTs = Date.parse(existing?.updated_at ?? '');

                // Skip if local copy is newer
                if (existing && Number.isFinite(localTs) && localTs >= remoteTs) continue;

                await addMealEntry({
                    id: remote.id,
                    user_id: remote.user_id,
                    food_item_id: remote.food_item_id ?? null,
                    food_name: remote.food_name ?? 'Unknown Food',
                    meal_type: remote.meal_type,
                    servings: remote.servings,
                    calories: remote.calories,
                    protein_g: remote.protein_g ?? 0,
                    carbs_g: remote.carbs_g ?? 0,
                    fat_g: remote.fat_g ?? 0,
                    logged_at: remote.logged_at,
                    notes: remote.notes ?? null,
                    image_url: remote.image_url ?? null,
                });

                // If soft-deleted remotely, remove locally
                if (remote.is_deleted) {
                    await updateDailyLog(remote.user_id, remote.logged_at);
                }

                await markAsSynced('meal_entries', remote.id);
                count++;
            } catch { /* skip individual row errors */ }
        }

        // Pull remote workout plans
        let plansQuery = supabase
            .from('workout_plans')
            .select('*')
            .eq('user_id', session.session.user.id);

        if (lastSyncTimestamp) {
            plansQuery = plansQuery.gt('generated_at', lastSyncTimestamp);
        }

        const { data: remotePlans, error: plansError } = await plansQuery;

        if (plansError) {
            errors.push(`Pull workout plans error: ${plansError.message}`);
        } else {
            for (const remote of remotePlans ?? []) {
                try {
                    let plan: WorkoutPlan;
                    try {
                        plan = JSON.parse(remote.plan_json) as WorkoutPlan;
                    } catch {
                        continue;
                    }
                    plan.id = remote.id;
                    plan.weekStartDate = remote.week_start_date;
                    plan.generatedAt = remote.generated_at;
                    plan.reasoning = remote.reasoning ?? plan.reasoning;

                    await saveWorkoutPlan(remote.user_id, plan);
                    count++;
                } catch { /* skip individual row errors */ }
            }
        }

        // Pull remote daily logs (last-write-wins via updated_at)
        let logsQuery = supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', session.session.user.id);

        if (lastSyncTimestamp) {
            logsQuery = logsQuery.gt('updated_at', lastSyncTimestamp);
        }

        const { data: remoteLogs, error: logsError } = await logsQuery;

        if (logsError) {
            errors.push(`Pull daily logs error: ${logsError.message}`);
        } else {
            for (const remote of remoteLogs ?? []) {
                try {
                    await upsertDailyLogDirect({
                        id: remote.id,
                        user_id: remote.user_id,
                        log_date: remote.log_date,
                        total_calories: remote.total_calories ?? 0,
                        total_protein_g: remote.total_protein_g ?? 0,
                        total_carbs_g: remote.total_carbs_g ?? 0,
                        total_fat_g: remote.total_fat_g ?? 0,
                        water_ml: remote.water_ml ?? 0,
                        updated_at: remote.updated_at ?? new Date().toISOString(),
                    });
                    count++;
                } catch { /* skip individual row errors */ }
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
