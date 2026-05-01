/**
 * Expo SQLite Local Database
 *
 * Offline-first database layer. All CRUD operations go through
 * this file, reading/writing to the local SQLite database.
 * The sync layer (sync.ts) handles pushing changes to Supabase.
 */

import * as SQLite from 'expo-sqlite';
import { MealEntry, FoodItem, MealType, OnboardingProfile, WorkoutPlan, WorkoutSession, UserRewards, BodyPhotoRecord, BodySimulationResult, MilestonePhase } from '@/src/types';
import { supabase } from './supabase';
import { calculatePersonalizedCalorieRecommendation } from './calorieEngine';
import { DailyDietPlan, generateDailyDietPlan } from './dietPlanEngine';
import type { StoreProduct } from '../../components/store/products';

let db: SQLite.SQLiteDatabase | null = null;

// ============================================================
// Initialization
// ============================================================

export async function initDatabase(): Promise<void> {
    db = await SQLite.openDatabaseAsync('calorie_tracker.db');

    // Enable WAL mode for better performance
    await db.execAsync('PRAGMA journal_mode = WAL;');

    // Create tables
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS food_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      serving_size REAL NOT NULL DEFAULT 100,
      serving_unit TEXT NOT NULL DEFAULT 'g',
      calories REAL NOT NULL,
      protein_g REAL DEFAULT 0,
      carbs_g REAL DEFAULT 0,
      fat_g REAL DEFAULT 0,
      fiber_g REAL DEFAULT 0,
      image_url TEXT,
      barcode TEXT,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      food_item_id TEXT,
      food_name TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
      servings REAL NOT NULL DEFAULT 1,
      calories REAL NOT NULL,
      protein_g REAL DEFAULT 0,
      carbs_g REAL DEFAULT 0,
      fat_g REAL DEFAULT 0,
      logged_at TEXT NOT NULL DEFAULT (date('now')),
      notes TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_deleted INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending',
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      log_date TEXT NOT NULL,
      total_calories REAL DEFAULT 0,
      total_protein_g REAL DEFAULT 0,
      total_carbs_g REAL DEFAULT 0,
      total_fat_g REAL DEFAULT 0,
      water_ml INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      UNIQUE(user_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS scan_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      recognized_food TEXT,
      confidence REAL,
      estimated_calories REAL,
      was_accepted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_meal_entries_date ON meal_entries(logged_at);
    CREATE INDEX IF NOT EXISTS idx_meal_entries_sync ON meal_entries(sync_status);
    CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(log_date);
  `);

    // Workout tables
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_start_date TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      reasoning TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, week_start_date)
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT,
      day_date TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      session_json TEXT NOT NULL,
      total_calories_burned INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON workout_plans(user_id, week_start_date);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id, day_date);
  `);

    // Rewards / gamification table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_rewards (
      user_id TEXT PRIMARY KEY,
      total_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      achievements_json TEXT DEFAULT '[]',
      total_workouts INTEGER DEFAULT 0,
      total_exercises INTEGER DEFAULT 0,
      total_calories_burned INTEGER DEFAULT 0,
      categories_json TEXT DEFAULT '[]',
      profile_hash TEXT,
      last_updated TEXT DEFAULT (datetime('now'))
    );
  `);

    // Onboarding health profile table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_health_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      biological_gender TEXT,
      gender_identity TEXT,
      age INTEGER,
      height_cm REAL,
      weight_kg REAL,
      nationality_or_race TEXT,
      activity_level TEXT,
      work_type TEXT,
      wake_time TEXT,
      sleep_time TEXT,
      commute_type TEXT,
      exercise_frequency TEXT,
      diet_type TEXT,
      meals_per_day INTEGER,
      snacking_habit TEXT,
      water_intake_glasses INTEGER,
      food_allergies TEXT DEFAULT '[]',
      cuisine_preferences TEXT DEFAULT '[]',
      local_cuisine_ratio REAL DEFAULT 70,
      blood_sugar_level TEXT,
      cholesterol_level TEXT,
      health_conditions TEXT DEFAULT '[]',
      medications TEXT,
      family_history TEXT DEFAULT '[]',
      smoking_status TEXT,
      alcohol_frequency TEXT,
      sleep_hours REAL,
      stress_level INTEGER,
      marital_status TEXT,
      pregnancy_status TEXT,
      num_children INTEGER,
      children_notes TEXT,
      personal_notes TEXT,
      dream_weight_kg REAL,
      dream_fitness_level TEXT,
      dream_food_habits TEXT DEFAULT '[]',
      dream_daily_routine TEXT,
      dream_special_habits TEXT DEFAULT '[]',
      waist_cm REAL,
      hip_cm REAL,
      neck_cm REAL,
      wrist_cm REAL,
      body_type_dominant TEXT,
      body_type_blend TEXT,
      body_type_ecto INTEGER,
      body_type_meso INTEGER,
      body_type_endo INTEGER,
      body_type_bf REAL,
      body_type_frame TEXT,
      body_type_confidence TEXT,
      body_type_insights TEXT DEFAULT '[]',
      body_type_updated_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

    // Safe migrations — add new columns to existing tables if they don't exist yet
    const migrations = [
        `ALTER TABLE user_health_profiles ADD COLUMN waist_cm REAL`,
        `ALTER TABLE user_health_profiles ADD COLUMN hip_cm REAL`,
        `ALTER TABLE user_health_profiles ADD COLUMN neck_cm REAL`,
        `ALTER TABLE user_health_profiles ADD COLUMN wrist_cm REAL`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_dominant TEXT`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_blend TEXT`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_ecto INTEGER`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_meso INTEGER`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_endo INTEGER`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_bf REAL`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_frame TEXT`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_confidence TEXT`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_insights TEXT DEFAULT '[]'`,
        `ALTER TABLE user_health_profiles ADD COLUMN body_type_updated_at TEXT`,
        `ALTER TABLE user_health_profiles ADD COLUMN local_cuisine_ratio REAL DEFAULT 70`,
        // Body simulation columns
        `ALTER TABLE user_health_profiles ADD COLUMN dream_body_style TEXT`,
        `ALTER TABLE user_health_profiles ADD COLUMN dream_body_description TEXT`,
        `ALTER TABLE user_health_profiles ADD COLUMN target_bf_percent REAL`,
    ];
    for (const sql of migrations) {
        try { await db.execAsync(sql); } catch { /* column already exists, ignore */ }
    }

    // Body photos table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS body_photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      date_taken TEXT NOT NULL,
      phase INTEGER DEFAULT -1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_body_photos_user ON body_photos(user_id);
  `);

    // Body simulations cache table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS body_simulations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      phases_json TEXT NOT NULL,
      dream_body_style TEXT,
      dream_body_description TEXT,
      target_bf_percent REAL,
      generated_at TEXT DEFAULT (datetime('now'))
    );
  `);

    // User preferences table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      weight_unit TEXT DEFAULT 'kg',
      height_unit TEXT DEFAULT 'cm',
      energy_unit TEXT DEFAULT 'kcal',
      notifications_enabled INTEGER DEFAULT 1,
      marketing_emails INTEGER DEFAULT 0,
      privacy_data_sharing INTEGER DEFAULT 1,
      language TEXT DEFAULT 'en',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

    // Store tables (products, cart, orders)
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS store_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      previous_price REAL,
      description TEXT,
      image TEXT,
      tags_json TEXT DEFAULT '[]',
      rating REAL,
      is_new INTEGER DEFAULT 0,
      on_sale INTEGER DEFAULT 0,
      nutrition_json TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_cart_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      product_snapshot_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS store_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      shipping_fee REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      promo_code TEXT,
      status TEXT NOT NULL DEFAULT 'paid',
      shipping_address TEXT,
      placed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      product_snapshot_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_wishlist_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_snapshot_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_store_cart_user ON store_cart_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders(user_id, placed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_store_wishlist_user ON store_wishlist_items(user_id, created_at DESC);
  `);
}

function getDb(): SQLite.SQLiteDatabase {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

// ============================================================
// User Preferences
// ============================================================

export interface UserPreferences {
    user_id: string;
    weight_unit: 'kg' | 'lb';
    height_unit: 'cm' | 'ft';
    energy_unit: 'kcal' | 'kJ';
    notifications_enabled: boolean;
    marketing_emails: boolean;
    privacy_data_sharing: boolean;
    language: string;
    updated_at: string;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM user_preferences WHERE user_id = ?`,
        [userId]
    );

    if (!row) {
        // Return defaults
        return {
            user_id: userId,
            weight_unit: 'kg',
            height_unit: 'cm',
            energy_unit: 'kcal',
            notifications_enabled: true,
            marketing_emails: false,
            privacy_data_sharing: true,
            language: 'en',
            updated_at: new Date().toISOString(),
        };
    }

    return {
        ...row,
        notifications_enabled: row.notifications_enabled === 1,
        marketing_emails: row.marketing_emails === 1,
        privacy_data_sharing: row.privacy_data_sharing === 1,
    };
}

export async function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<void> {
    const database = getDb();
    const current = await getUserPreferences(userId);
    const now = new Date().toISOString();

    const merged = { ...current, ...prefs };

    await database.runAsync(
        `INSERT OR REPLACE INTO user_preferences (
            user_id, weight_unit, height_unit, energy_unit,
            notifications_enabled, marketing_emails, privacy_data_sharing,
            language, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            merged.weight_unit,
            merged.height_unit,
            merged.energy_unit,
            merged.notifications_enabled ? 1 : 0,
            merged.marketing_emails ? 1 : 0,
            merged.privacy_data_sharing ? 1 : 0,
            merged.language,
            now
        ]
    );
}

// ============================================================
// Privacy Helpers
// ============================================================

export async function deleteUserData(userId: string): Promise<void> {
    const database = getDb();

    // In a real app, this should also delete from Supabase via Edge Function
    // For now we clear all local data for this user.
    await database.withTransactionAsync(async () => {
        await database.runAsync(`DELETE FROM meal_entries WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM daily_logs WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM scan_history WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM workout_plans WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM workout_sessions WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM user_health_profiles WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM body_photos WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM body_simulations WHERE user_id = ?`, [userId]);
        await database.runAsync(`DELETE FROM user_preferences WHERE user_id = ?`, [userId]);
    });
}
// ============================================================

// ============================================================
// Food Items
// ============================================================

export async function searchFoodItems(query: string): Promise<FoodItem[]> {
    const database = getDb();
    const results = await database.getAllAsync<FoodItem>(
        `SELECT * FROM food_items WHERE name LIKE ? OR brand LIKE ? ORDER BY name LIMIT 50`,
        [`%${query}%`, `%${query}%`]
    );
    return results;
}

export async function insertFoodItem(item: Partial<FoodItem>): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO food_items (id, name, brand, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, image_url, barcode, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item.id || generateId(),
            item.name || '',
            item.brand || null,
            item.serving_size || 100,
            item.serving_unit || 'g',
            item.calories || 0,
            item.protein_g || 0,
            item.carbs_g || 0,
            item.fat_g || 0,
            item.fiber_g || 0,
            item.image_url || null,
            item.barcode || null,
            item.is_verified ? 1 : 0,
        ]
    );
}

// ============================================================
// Meal Entries
// ============================================================

export async function getMealEntriesByDate(userId: string, date: string): Promise<MealEntry[]> {
    const database = getDb();
    const results = await database.getAllAsync<any>(
        `SELECT * FROM meal_entries WHERE user_id = ? AND logged_at = ? AND is_deleted = 0 ORDER BY created_at DESC`,
        [userId, date]
    );
    return results.map(mapMealEntry);
}

async function triggerBackgroundMealSync(): Promise<void> {
    try {
        const { syncAll } = await import('./sync');
        syncAll().catch(() => {});
    } catch {
        // Keep local-first behavior even if sync module is unavailable.
    }
}

export async function addMealEntry(entry: Partial<MealEntry>): Promise<string> {
    const database = getDb();
    const id = entry.id || generateId();
    const now = new Date().toISOString();

    await database.runAsync(
        `INSERT INTO meal_entries (id, user_id, food_item_id, food_name, meal_type, servings, calories, protein_g, carbs_g, fat_g, logged_at, notes, image_url, created_at, updated_at, sync_status, local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
            id,
            entry.user_id || '',
            entry.food_item_id || null,
            entry.food_name || 'Unknown Food',
            entry.meal_type || 'snack',
            entry.servings || 1,
            entry.calories || 0,
            entry.protein_g || 0,
            entry.carbs_g || 0,
            entry.fat_g || 0,
            entry.logged_at || new Date().toISOString().split('T')[0],
            entry.notes || null,
            entry.image_url || null,
            now,
            now,
            now,
        ]
    );

    // Update daily log
    await updateDailyLog(entry.user_id || '', entry.logged_at || new Date().toISOString().split('T')[0]);
    await triggerBackgroundMealSync();

    return id;
}

export async function deleteMealEntry(id: string, userId: string): Promise<void> {
    const database = getDb();
    const now = new Date().toISOString();

    // Get the meal entry first so we know which date to update
    const entry = await database.getFirstAsync<any>(
        `SELECT logged_at FROM meal_entries WHERE id = ?`,
        [id]
    );

    await database.runAsync(
        `UPDATE meal_entries SET is_deleted = 1, updated_at = ?, sync_status = 'pending', local_updated_at = ? WHERE id = ?`,
        [now, now, id]
    );

    if (entry) {
        await updateDailyLog(userId, entry.logged_at);
    }
    await triggerBackgroundMealSync();
}

export async function updateMealEntry(
    id: string,
    userId: string,
    fields: {
        food_name?: string;
        meal_type?: string;
        servings?: number;
        calories?: number;
        protein_g?: number;
        carbs_g?: number;
        fat_g?: number;
        notes?: string | null;
    }
): Promise<void> {
    const database = getDb();
    const now = new Date().toISOString();

    // Build SET clause dynamically from supplied fields
    const allowed = ['food_name', 'meal_type', 'servings', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'notes'];
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const key of allowed) {
        if (key in fields) {
            setClauses.push(`${key} = ?`);
            values.push((fields as any)[key]);
        }
    }

    if (setClauses.length === 0) return;

    setClauses.push(`updated_at = ?`, `sync_status = 'pending'`, `local_updated_at = ?`);
    values.push(now, now, id);

    await database.runAsync(
        `UPDATE meal_entries SET ${setClauses.join(', ')} WHERE id = ?`,
        values
    );

    // Re-aggregate daily log
    const entry = await database.getFirstAsync<any>(
        `SELECT logged_at FROM meal_entries WHERE id = ?`,
        [id]
    );
    if (entry) {
        await updateDailyLog(userId, entry.logged_at);
    }
    await triggerBackgroundMealSync();
}

export async function restoreMealEntry(id: string, userId: string): Promise<void> {
    const database = getDb();
    const now = new Date().toISOString();

    await database.runAsync(
        `UPDATE meal_entries SET is_deleted = 0, updated_at = ?, sync_status = 'pending', local_updated_at = ? WHERE id = ?`,
        [now, now, id]
    );

    const entry = await database.getFirstAsync<any>(
        `SELECT logged_at FROM meal_entries WHERE id = ?`,
        [id]
    );
    if (entry) {
        await updateDailyLog(userId, entry.logged_at);
    }
    await triggerBackgroundMealSync();
}

export async function getMealEntryById(id: string): Promise<any | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM meal_entries WHERE id = ?`,
        [id]
    );
    return row ? mapMealEntry(row) : null;
}

/**
 * Merge/Upsert a remote Supabase meal entry into local SQLite.
 * Used by the sync pull step (remote → local).
 */
export async function upsertMealEntryFromSupabase(remote: any): Promise<void> {
    const database = getDb();
    if (!remote?.id) return;

    const id = remote.id as string;
    const userId = (remote.user_id as string) || '';
    const loggedAt = (remote.logged_at as string) || new Date().toISOString().split('T')[0];
    const createdAt = (remote.created_at as string) || new Date().toISOString();
    const updatedAt = (remote.updated_at as string) || new Date().toISOString();
    const isDeleted = remote.is_deleted ? 1 : 0;

    await database.runAsync(
        `INSERT OR REPLACE INTO meal_entries (
            id, user_id, food_item_id, food_name, meal_type,
            servings, calories, protein_g, carbs_g, fat_g,
            logged_at, notes, image_url,
            created_at, updated_at, is_deleted,
            sync_status, local_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [
            id,
            userId,
            remote.food_item_id ?? null,
            remote.food_name ?? 'Unknown Food',
            remote.meal_type ?? 'snack',
            remote.servings ?? 1,
            remote.calories ?? 0,
            remote.protein_g ?? 0,
            remote.carbs_g ?? 0,
            remote.fat_g ?? 0,
            loggedAt,
            remote.notes ?? null,
            remote.image_url ?? null,
            createdAt,
            updatedAt,
            isDeleted,
            updatedAt,
        ]
    );

    // Re-aggregate daily log locally so UI stays consistent.
    if (userId) {
        await updateDailyLog(userId, loggedAt);
    }
}

// ============================================================
// Daily Logs
// ============================================================

export async function getDailyLog(userId: string, date: string): Promise<any | null> {
    const database = getDb();
    return database.getFirstAsync(
        `SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?`,
        [userId, date]
    );
}

export async function updateDailyLog(userId: string, date: string): Promise<void> {
    const database = getDb();

    // Recalculate from meal_entries
    const totals = await database.getFirstAsync<any>(
        `SELECT
       COALESCE(SUM(calories * servings), 0) as total_calories,
       COALESCE(SUM(protein_g * servings), 0) as total_protein_g,
       COALESCE(SUM(carbs_g * servings), 0) as total_carbs_g,
       COALESCE(SUM(fat_g * servings), 0) as total_fat_g
     FROM meal_entries
     WHERE user_id = ? AND logged_at = ? AND is_deleted = 0`,
        [userId, date]
    );

    const now = new Date().toISOString();
    await database.runAsync(
        `INSERT INTO daily_logs (id, user_id, log_date, total_calories, total_protein_g, total_carbs_g, total_fat_g, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
     ON CONFLICT(user_id, log_date) DO UPDATE SET
       total_calories = excluded.total_calories,
       total_protein_g = excluded.total_protein_g,
       total_carbs_g = excluded.total_carbs_g,
       total_fat_g = excluded.total_fat_g,
       updated_at = excluded.updated_at,
       sync_status = 'pending'`,
        [
            generateId(),
            userId,
            date,
            totals?.total_calories || 0,
            totals?.total_protein_g || 0,
            totals?.total_carbs_g || 0,
            totals?.total_fat_g || 0,
            now,
        ]
    );
}

export async function getWeeklyLogs(userId: string, endDate: string): Promise<any[]> {
    const database = getDb();
    // Get last 7 days Including endDate
    return database.getAllAsync(
        `SELECT * FROM daily_logs
     WHERE user_id = ? AND log_date <= ? AND log_date >= date(?, '-6 days')
     ORDER BY log_date ASC`,
        [userId, endDate, endDate]
    );
}

export async function getMonthlyLogs(userId: string, endDate: string): Promise<any[]> {
    const database = getDb();
    return database.getAllAsync(
        `SELECT * FROM daily_logs
     WHERE user_id = ? AND log_date <= ? AND log_date >= date(?, '-29 days')
     ORDER BY log_date ASC`,
        [userId, endDate, endDate]
    );
}

// ============================================================
// Scan History
// ============================================================

export async function addScanHistory(scan: {
    userId: string;
    imageUrl: string;
    recognizedFood: string;
    confidence: number;
    estimatedCalories: number;
    wasAccepted: boolean;
}): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT INTO scan_history (id, user_id, image_url, recognized_food, confidence, estimated_calories, was_accepted)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            generateId(),
            scan.userId,
            scan.imageUrl,
            scan.recognizedFood,
            scan.confidence,
            scan.estimatedCalories,
            scan.wasAccepted ? 1 : 0,
        ]
    );
}

export async function getRecentScans(userId: string, limit: number = 10): Promise<any[]> {
    const database = getDb();
    return database.getAllAsync(
        `SELECT * FROM scan_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limit]
    );
}

// ============================================================
// Sync Helpers
// ============================================================

export async function getPendingMealEntries(): Promise<MealEntry[]> {
    const database = getDb();
    const results = await database.getAllAsync<any>(
        `SELECT * FROM meal_entries WHERE sync_status = 'pending'`
    );
    return results.map(mapMealEntry);
}

export async function markAsSynced(table: string, id: string): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `UPDATE ${table} SET sync_status = 'synced' WHERE id = ?`,
        [id]
    );
}

// ============================================================
// Onboarding Health Profile
// ============================================================

export async function saveOnboardingProfile(
    userId: string,
    data: Partial<OnboardingProfile>
): Promise<void> {
    await upsertLocalOnboardingProfile(userId, data, null);

    // Mirror onboarding data to Supabase when authenticated.
    if (userId !== 'onboarding-temp') {
        await syncOnboardingToSupabase(userId, data);
    }
}

export async function hydrateOnboardingProfileFromSupabase(userId: string): Promise<void> {
    if (!userId || userId === 'onboarding-temp') return;

    try {
        const { data: remote, error } = await supabase
            .from('user_health_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Failed to fetch onboarding profile from Supabase:', error.message);
            return;
        }

        if (!remote) return;

        const local = await getOnboardingProfile(userId);
        const remoteTs = Date.parse(remote.updated_at ?? '');
        const localTs = Date.parse(local?.updated_at ?? '');
        const remoteHasTs = Number.isFinite(remoteTs);
        const localHasTs = Number.isFinite(localTs);

        // Keep local data when it is as new or newer.
        if (local && remoteHasTs && localHasTs && localTs >= remoteTs) {
            return;
        }

        await upsertLocalOnboardingProfile(userId, remote as Partial<OnboardingProfile>, remote.updated_at ?? null);
    } catch (e: any) {
        console.error('Unexpected onboarding hydration error:', e?.message ?? e);
    }
}

/**
 * Canonical accessor for the user's health profile (used by engines).
 * Ensures we hydrate from Supabase (when authenticated) so downstream
 * generators use the freshest profile values.
 */
export async function getUserHealthProfileForProcessing(
    userId: string
): Promise<OnboardingProfile | null> {
    if (!userId) return null;

    // Best-effort remote hydration. This is safe even when offline or not authed.
    try {
        await hydrateOnboardingProfileFromSupabase(userId);
    } catch {
        // ignore
    }

    return getOnboardingProfile(userId);
}

async function upsertLocalOnboardingProfile(
    userId: string,
    data: Partial<OnboardingProfile>,
    updatedAt: string | null
): Promise<void> {
    const database = getDb();
    const id = generateId();
    const existing = await database.getFirstAsync<any>(
        `SELECT * FROM user_health_profiles WHERE user_id = ?`,
        [userId]
    );

    const pick = (key: string, fallback: any = null) => {
        const incoming = (data as any)[key];
        if (incoming !== undefined) return incoming;
        if (existing && existing[key] !== undefined) return existing[key];
        return fallback;
    };

    const serialize = (arr: any) => JSON.stringify(normalizeStringArray(arr));

    await database.runAsync(
        `INSERT OR REPLACE INTO user_health_profiles (
            id, user_id,
            biological_gender, gender_identity, age, height_cm, weight_kg,
            nationality_or_race, activity_level,
            work_type, wake_time, sleep_time, commute_type, exercise_frequency,
            diet_type, meals_per_day, snacking_habit, water_intake_glasses,
            food_allergies, cuisine_preferences, local_cuisine_ratio,
            blood_sugar_level, cholesterol_level, health_conditions,
            medications, family_history,
            smoking_status, alcohol_frequency, sleep_hours, stress_level,
            marital_status, pregnancy_status, num_children, children_notes,
            personal_notes,
            dream_weight_kg, dream_fitness_level, dream_food_habits,
            dream_daily_routine, dream_special_habits,
            waist_cm, hip_cm, neck_cm, wrist_cm,
            body_type_dominant, body_type_blend,
            body_type_ecto, body_type_meso, body_type_endo,
            body_type_bf, body_type_frame, body_type_confidence,
            body_type_insights, body_type_updated_at,
            updated_at
        ) VALUES (
            COALESCE((SELECT id FROM user_health_profiles WHERE user_id = ?), ?),
            ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            COALESCE(?, datetime('now'))
        )`,
        [
            userId, id,
            userId,
            pick('biological_gender'),
            pick('gender_identity'),
            pick('age'),
            pick('height_cm'),
            pick('weight_kg'),
            pick('nationality_or_race'),
            pick('activity_level'),
            pick('work_type'),
            pick('wake_time'),
            pick('sleep_time'),
            pick('commute_type'),
            pick('exercise_frequency'),
            pick('diet_type'),
            pick('meals_per_day'),
            pick('snacking_habit'),
            pick('water_intake_glasses'),
            serialize(pick('food_allergies', [])),
            JSON.stringify(normalizeCuisinePreferences(pick('cuisine_preferences', []))),
            pick('local_cuisine_ratio', 70),
            pick('blood_sugar_level'),
            pick('cholesterol_level'),
            serialize(pick('health_conditions', [])),
            pick('medications'),
            JSON.stringify(normalizeFamilyHistory(pick('family_history', []))),
            pick('smoking_status'),
            pick('alcohol_frequency'),
            pick('sleep_hours'),
            pick('stress_level'),
            pick('marital_status'),
            pick('pregnancy_status'),
            pick('num_children'),
            pick('children_notes'),
            pick('personal_notes'),
            pick('dream_weight_kg'),
            pick('dream_fitness_level'),
            serialize(pick('dream_food_habits', [])),
            pick('dream_daily_routine'),
            serialize(pick('dream_special_habits', [])),
            pick('waist_cm'),
            pick('hip_cm'),
            pick('neck_cm'),
            pick('wrist_cm'),
            pick('body_type_dominant'),
            pick('body_type_blend'),
            pick('body_type_ecto'),
            pick('body_type_meso'),
            pick('body_type_endo'),
            pick('body_type_bf'),
            pick('body_type_frame'),
            pick('body_type_confidence'),
            serialize(pick('body_type_insights', [])),
            pick('body_type_updated_at'),
            updatedAt,
        ]
    );
}

export async function migrateTempOnboardingProfileToUser(userId: string): Promise<void> {
    const database = getDb();
    const existing = await database.getFirstAsync<any>(
        `SELECT * FROM user_health_profiles WHERE user_id = ?`,
        [userId]
    );

    // If user already has a profile, just ensure Supabase mirror is updated.
    if (existing) {
        await syncOnboardingToSupabase(userId, existing);
        return;
    }

    const temp = await database.getFirstAsync<any>(
        `SELECT * FROM user_health_profiles WHERE user_id = ?`,
        ['onboarding-temp']
    );

    if (!temp) return;

    await database.runAsync(
        `UPDATE user_health_profiles
         SET user_id = ?, updated_at = datetime('now')
         WHERE user_id = ?`,
        [userId, 'onboarding-temp']
    );

    await syncOnboardingToSupabase(userId, temp);
}

function toProfileGender(value: any): 'male' | 'female' | 'other' | null {
    if (value === 'male' || value === 'female') return value;
    if (!value) return null;
    return 'other';
}

const CUISINE_PREFERENCE_CANONICAL_MAP: Record<string, string> = {
    'sri lankan': 'Sri Lankan',
    'srilankan': 'Sri Lankan',
    'sri-lankan': 'Sri Lankan',
    'mediterranean': 'Mediterranean',
    'asian': 'Asian',
    'middle eastern': 'Middle Eastern',
    'western': 'Western',
    'latin': 'Latin',
    'african': 'African',
    'africn': 'African',
    'japanese': 'Japanese',
    'indian': 'Indian',
    'no preference': 'No Preference',
    'no preferences': 'No Preference',
    'other': 'Other',
    'others': 'Other',
    'other cuisine': 'Other',
    'other cuisines': 'Other',
};

const FAMILY_HISTORY_CANONICAL_MAP: Record<string, string> = {
    'diabetes': 'Diabetes',
    'heart disease': 'Heart Disease',
    'cancer': 'Cancer',
    'hypertension': 'Hypertension',
    'obesity': 'Obesity',
    'stroke': 'Stroke',
    'none / unknown': 'None / Unknown',
    'none/unknown': 'None / Unknown',
    'none unknown': 'None / Unknown',
    'none': 'None / Unknown',
    'unknown': 'None / Unknown',
    'other': 'Other',
    'others': 'Other',
};

function normalizeStringArray(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function normalizeCuisinePreferences(value: any): string[] {
    const normalized = normalizeStringArray(value)
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .map(item => {
            const key = item.toLowerCase().replace(/\s+/g, ' ');
            return CUISINE_PREFERENCE_CANONICAL_MAP[key] ?? item;
        });

    return Array.from(new Set(normalized));
}

function normalizeFamilyHistory(value: any): string[] {
    const normalized = normalizeStringArray(value)
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .map(item => {
            const key = item.toLowerCase().replace(/\s+/g, ' ');
            return FAMILY_HISTORY_CANONICAL_MAP[key] ?? item;
        });

    return Array.from(new Set(normalized));
}

async function syncOnboardingToSupabase(
    userId: string,
    data: Partial<OnboardingProfile>
): Promise<void> {
    try {
        const calorieRecommendation = calculatePersonalizedCalorieRecommendation(data);

        const assignIfDefined = (obj: Record<string, any>, key: string, value: any) => {
            if (value !== undefined) obj[key] = value;
        };

        const profilePayload: Record<string, any> = {
            id: userId,
            daily_calorie_goal: calorieRecommendation.dailyCalories,
            updated_at: new Date().toISOString(),
        };
        assignIfDefined(profilePayload, 'height_cm', data.height_cm);
        assignIfDefined(profilePayload, 'weight_kg', data.weight_kg);
        assignIfDefined(profilePayload, 'age', data.age);
        assignIfDefined(profilePayload, 'gender', data.biological_gender === undefined ? undefined : toProfileGender(data.biological_gender));
        assignIfDefined(profilePayload, 'activity_level', data.activity_level);

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });

        if (profileError) {
            console.error('Failed to sync onboarding profile basics to Supabase:', profileError.message);
        }

        const healthPayload: Record<string, any> = {
            user_id: userId,
            recommended_daily_calories: calorieRecommendation.dailyCalories,
            recommendation_bmr: calorieRecommendation.bmr,
            recommendation_tdee: calorieRecommendation.tdee,
            recommendation_activity_multiplier: calorieRecommendation.activityMultiplier,
            recommendation_goal_adjustment_pct: calorieRecommendation.goalAdjustmentPct,
            recommendation_reasons: calorieRecommendation.reasons,
            updated_at: new Date().toISOString(),
        };

        assignIfDefined(healthPayload, 'biological_gender', data.biological_gender);
        assignIfDefined(healthPayload, 'gender_identity', data.gender_identity);
        assignIfDefined(healthPayload, 'age', data.age);
        assignIfDefined(healthPayload, 'height_cm', data.height_cm);
        assignIfDefined(healthPayload, 'weight_kg', data.weight_kg);
        assignIfDefined(healthPayload, 'nationality_or_race', data.nationality_or_race);
        assignIfDefined(healthPayload, 'activity_level', data.activity_level);
        assignIfDefined(healthPayload, 'work_type', data.work_type);
        assignIfDefined(healthPayload, 'wake_time', data.wake_time);
        assignIfDefined(healthPayload, 'sleep_time', data.sleep_time);
        assignIfDefined(healthPayload, 'commute_type', data.commute_type);
        assignIfDefined(healthPayload, 'exercise_frequency', data.exercise_frequency);
        assignIfDefined(healthPayload, 'diet_type', data.diet_type);
        assignIfDefined(healthPayload, 'meals_per_day', data.meals_per_day);
        assignIfDefined(healthPayload, 'snacking_habit', data.snacking_habit);
        assignIfDefined(healthPayload, 'water_intake_glasses', data.water_intake_glasses);
        if ((data as any).food_allergies !== undefined) healthPayload.food_allergies = normalizeStringArray((data as any).food_allergies);
        if ((data as any).cuisine_preferences !== undefined) healthPayload.cuisine_preferences = normalizeCuisinePreferences((data as any).cuisine_preferences);
        assignIfDefined(healthPayload, 'blood_sugar_level', data.blood_sugar_level);
        assignIfDefined(healthPayload, 'cholesterol_level', data.cholesterol_level);
        if ((data as any).health_conditions !== undefined) healthPayload.health_conditions = normalizeStringArray((data as any).health_conditions);
        assignIfDefined(healthPayload, 'medications', data.medications);
        if ((data as any).family_history !== undefined) healthPayload.family_history = normalizeFamilyHistory((data as any).family_history);
        assignIfDefined(healthPayload, 'smoking_status', data.smoking_status);
        assignIfDefined(healthPayload, 'alcohol_frequency', data.alcohol_frequency);
        assignIfDefined(healthPayload, 'sleep_hours', data.sleep_hours);
        assignIfDefined(healthPayload, 'stress_level', data.stress_level);
        assignIfDefined(healthPayload, 'marital_status', data.marital_status);
        assignIfDefined(healthPayload, 'pregnancy_status', data.pregnancy_status);
        assignIfDefined(healthPayload, 'num_children', data.num_children);
        assignIfDefined(healthPayload, 'children_notes', data.children_notes);
        assignIfDefined(healthPayload, 'personal_notes', data.personal_notes);
        assignIfDefined(healthPayload, 'dream_weight_kg', data.dream_weight_kg);
        assignIfDefined(healthPayload, 'dream_fitness_level', data.dream_fitness_level);
        if ((data as any).dream_food_habits !== undefined) healthPayload.dream_food_habits = normalizeStringArray((data as any).dream_food_habits);
        assignIfDefined(healthPayload, 'dream_daily_routine', data.dream_daily_routine);
        if ((data as any).dream_special_habits !== undefined) healthPayload.dream_special_habits = normalizeStringArray((data as any).dream_special_habits);
        assignIfDefined(healthPayload, 'waist_cm', data.waist_cm);
        assignIfDefined(healthPayload, 'hip_cm', data.hip_cm);
        assignIfDefined(healthPayload, 'neck_cm', data.neck_cm);
        assignIfDefined(healthPayload, 'wrist_cm', data.wrist_cm);
        if ((data as any).body_type_dominant !== undefined) healthPayload.body_type_dominant = (data as any).body_type_dominant;
        if ((data as any).body_type_blend !== undefined) healthPayload.body_type_blend = (data as any).body_type_blend;
        if ((data as any).body_type_ecto !== undefined) healthPayload.body_type_ecto = (data as any).body_type_ecto;
        if ((data as any).body_type_meso !== undefined) healthPayload.body_type_meso = (data as any).body_type_meso;
        if ((data as any).body_type_endo !== undefined) healthPayload.body_type_endo = (data as any).body_type_endo;
        if ((data as any).body_type_bf !== undefined) healthPayload.body_type_bf = (data as any).body_type_bf;
        if ((data as any).body_type_frame !== undefined) healthPayload.body_type_frame = (data as any).body_type_frame;
        if ((data as any).body_type_confidence !== undefined) healthPayload.body_type_confidence = (data as any).body_type_confidence;
        if ((data as any).body_type_insights !== undefined) healthPayload.body_type_insights = normalizeStringArray((data as any).body_type_insights);
        if ((data as any).body_type_updated_at !== undefined) healthPayload.body_type_updated_at = (data as any).body_type_updated_at;
        
        // Sync dream body simulation fields
        assignIfDefined(healthPayload, 'dream_body_style', (data as any).dream_body_style);
        assignIfDefined(healthPayload, 'dream_body_description', (data as any).dream_body_description);
        assignIfDefined(healthPayload, 'target_bf_percent', (data as any).target_bf_percent);

        const { error: healthError } = await supabase
            .from('user_health_profiles')
            .upsert(healthPayload, { onConflict: 'user_id' });

        if (healthError) {
            console.error('Failed to sync full onboarding profile to Supabase:', healthError.message);
        }
    } catch (e: any) {
        console.error('Unexpected onboarding sync error:', e?.message ?? e);
    }
}

export async function getDailyCalorieGoalForUser(userId: string): Promise<number> {
    if (!userId || userId === 'demo-user') return 2000;

    const localProfile = await getUserHealthProfileForProcessing(userId).catch(() => null);
    if (localProfile) {
        return calculatePersonalizedCalorieRecommendation(localProfile).dailyCalories;
    }

    if (userId === 'onboarding-temp') return 2000;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('daily_calorie_goal')
            .eq('id', userId)
            .maybeSingle();

        if (!error && typeof data?.daily_calorie_goal === 'number' && data.daily_calorie_goal > 0) {
            return data.daily_calorie_goal;
        }
    } catch {
        // fall through to default
    }

    return 2000;
}

/**
 * Generate (on-demand) personalized daily diet plan from the latest
 * user health profile and today's actual intake/workout context.
 */
export async function getDailyDietPlanForUser(
    userId: string,
    date: string = new Date().toISOString().split('T')[0]
): Promise<DailyDietPlan | null> {
    if (!userId) return null;
    const profile = await getUserHealthProfileForProcessing(userId).catch(() => null);
    if (!profile) return null;

    const daily = await getDailyLog(userId, date).catch(() => null);
    const context = {
        todayCalories: daily?.total_calories ?? 0,
        todayProteinG: daily?.total_protein_g ?? 0,
        todayCarbsG: daily?.total_carbs_g ?? 0,
        todayFatG: daily?.total_fat_g ?? 0,
        recentWorkouts: normalizeStringArray(daily?.recent_workouts),
    };

    return generateDailyDietPlan(profile, date, context);
}

export async function getOnboardingProfile(
    userId: string
): Promise<OnboardingProfile | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM user_health_profiles WHERE user_id = ?`,
        [userId]
    );
    if (!row) return null;

    const parse = (val: any) => {
        try { return JSON.parse(val || '[]'); }
        catch { return []; }
    };

    return {
        ...row,
        food_allergies: parse(row.food_allergies),
        cuisine_preferences: normalizeCuisinePreferences(parse(row.cuisine_preferences)),
        health_conditions: parse(row.health_conditions),
        family_history: normalizeFamilyHistory(parse(row.family_history)),
        dream_food_habits: parse(row.dream_food_habits),
        dream_special_habits: parse(row.dream_special_habits),
        body_type_insights: parse(row.body_type_insights),
    };
}

export async function saveBodyTypeResult(
    userId: string,
    result: {
        dominant: string;
        blend: string | null;
        scores: { ecto: number; meso: number; endo: number };
        estimatedBF: number | null;
        frameSize: string | null;
        confidence: string;
        insights: string[];
    }
): Promise<void> {
    const database = getDb();
    const updatedAtIso = new Date().toISOString();

    await database.runAsync(
        `UPDATE user_health_profiles SET
            body_type_dominant = ?,
            body_type_blend = ?,
            body_type_ecto = ?,
            body_type_meso = ?,
            body_type_endo = ?,
            body_type_bf = ?,
            body_type_frame = ?,
            body_type_confidence = ?,
            body_type_insights = ?,
            body_type_updated_at = datetime('now')
        WHERE user_id = ?`,
        [
            result.dominant,
            result.blend ?? null,
            result.scores.ecto,
            result.scores.meso,
            result.scores.endo,
            result.estimatedBF ?? null,
            result.frameSize ?? null,
            result.confidence,
            JSON.stringify(result.insights),
            userId,
        ]
    );

    if (userId !== 'onboarding-temp') {
        try {
            const { error } = await supabase
                .from('user_health_profiles')
                .upsert({
                    user_id: userId,
                    body_type_dominant: result.dominant,
                    body_type_blend: result.blend ?? null,
                    body_type_ecto: result.scores.ecto,
                    body_type_meso: result.scores.meso,
                    body_type_endo: result.scores.endo,
                    body_type_bf: result.estimatedBF ?? null,
                    body_type_frame: result.frameSize ?? null,
                    body_type_confidence: result.confidence,
                    body_type_insights: result.insights,
                    body_type_updated_at: updatedAtIso,
                    updated_at: updatedAtIso,
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Failed to sync body type result to Supabase:', error.message);
            }
        } catch (e: any) {
            console.error('Unexpected body type sync error:', e?.message ?? e);
        }
    }
}

export async function getBodyTypeResult(
    userId: string
): Promise<{
    dominant: string;
    blend: string | null;
    scores: { ecto: number; meso: number; endo: number };
    estimatedBF: number | null;
    frameSize: string | null;
    confidence: string;
    insights: string[];
    updatedAt: string | null;
} | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT body_type_dominant, body_type_blend, body_type_ecto, body_type_meso,
                body_type_endo, body_type_bf, body_type_frame, body_type_confidence,
                body_type_insights, body_type_updated_at
         FROM user_health_profiles WHERE user_id = ?`,
        [userId]
    );
    if (!row || !row.body_type_dominant) return null;

    let insights: string[] = [];
    try { insights = JSON.parse(row.body_type_insights || '[]'); } catch { }

    return {
        dominant: row.body_type_dominant,
        blend: row.body_type_blend ?? null,
        scores: {
            ecto: row.body_type_ecto ?? 0,
            meso: row.body_type_meso ?? 0,
            endo: row.body_type_endo ?? 0,
        },
        estimatedBF: row.body_type_bf ?? null,
        frameSize: row.body_type_frame ?? null,
        confidence: row.body_type_confidence ?? 'low',
        insights,
        updatedAt: row.body_type_updated_at ?? null,
    };
}

// ============================================================
// Utilities
// ============================================================

function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function mapMealEntry(row: any): MealEntry {
    return {
        ...row,
        is_deleted: !!row.is_deleted,
        servings: row.servings || 1,
    };
}

export { generateId };

// ============================================================
// Workout Plans
// ============================================================

export async function saveWorkoutPlan(
    userId: string,
    plan: WorkoutPlan
): Promise<void> {
    const database = getDb();
    const id = plan.id || generateId();
    await database.runAsync(
        `INSERT INTO workout_plans (id, user_id, week_start_date, plan_json, reasoning, generated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, week_start_date) DO UPDATE SET
           plan_json = excluded.plan_json,
           reasoning = excluded.reasoning,
           generated_at = excluded.generated_at`,
        [
            id,
            userId,
            plan.weekStartDate,
            JSON.stringify(plan),
            plan.reasoning,
            plan.generatedAt,
        ]
    );
}

export async function getWorkoutPlan(
    userId: string,
    weekStartDate: string
): Promise<WorkoutPlan | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM workout_plans WHERE user_id = ? AND week_start_date = ?`,
        [userId, weekStartDate]
    );
    if (!row) return null;
    try {
        return JSON.parse(row.plan_json) as WorkoutPlan;
    } catch {
        return null;
    }
}

export async function getLatestWorkoutPlan(
    userId: string
): Promise<WorkoutPlan | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM workout_plans WHERE user_id = ? ORDER BY week_start_date DESC LIMIT 1`,
        [userId]
    );
    if (!row) return null;
    try {
        return JSON.parse(row.plan_json) as WorkoutPlan;
    } catch {
        return null;
    }
}

// ============================================================
// Workout Sessions
// ============================================================

export async function saveWorkoutSession(
    session: WorkoutSession
): Promise<string> {
    const database = getDb();
    const id = session.id || generateId();
    await database.runAsync(
        `INSERT INTO workout_sessions
           (id, user_id, plan_id, day_date, started_at, completed_at,
            session_json, total_calories_burned, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            session.userId,
            session.planId || null,
            session.dayDate,
            session.startedAt,
            session.completedAt || null,
            JSON.stringify(session),
            session.totalCaloriesBurned,
            session.notes || null,
        ]
    );
    return id;
}

export async function getWorkoutHistory(
    userId: string,
    limit: number = 10
): Promise<WorkoutSession[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>(
        `SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY day_date DESC LIMIT ?`,
        [userId, limit]
    );
    return rows.map(r => {
        try { return JSON.parse(r.session_json) as WorkoutSession; } catch { return r; }
    });
}

export async function getWorkoutStreak(userId: string): Promise<number> {
    const database = getDb();
    // Count consecutive distinct days going backwards from today
    const rows = await database.getAllAsync<any>(
        `SELECT DISTINCT day_date FROM workout_sessions
         WHERE user_id = ? AND completed_at IS NOT NULL
         ORDER BY day_date DESC LIMIT 60`,
        [userId]
    );
    if (rows.length === 0) return 0;

    let streak = 0;
    let expected = new Date();
    expected.setHours(0, 0, 0, 0);

    for (const row of rows) {
        const d = new Date(row.day_date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((expected.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0 || diff === 1) {
            streak++;
            expected = d;
        } else {
            break;
        }
    }
    return streak;
}

// ============================================================
// User Rewards
// ============================================================

export async function getUserRewards(userId: string): Promise<UserRewards | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM user_rewards WHERE user_id = ?`,
        [userId]
    );
    if (!row) return null;
    const { getLevelForXP } = await import('@/src/lib/rewardEngine');
    const lvl = getLevelForXP(row.total_xp ?? 0);
    let achievements = [];
    try { achievements = JSON.parse(row.achievements_json || '[]'); } catch { }
    return {
        userId,
        totalXP: row.total_xp ?? 0,
        level: lvl.level,
        levelName: lvl.name,
        xpToNextLevel: lvl.xpToNext,
        achievements,
        totalWorkoutsCompleted: row.total_workouts ?? 0,
        totalExercisesCompleted: row.total_exercises ?? 0,
        totalCaloriesBurned: row.total_calories_burned ?? 0,
        profileHash: row.profile_hash ?? undefined,
        lastUpdated: row.last_updated ?? new Date().toISOString(),
    };
}

export async function addXP(
    userId: string,
    xp: number,
    sessionStats: {
        exercisesCompleted: number;
        caloriesBurned: number;
        categories: string[];
    }
): Promise<void> {
    const database = getDb();
    const now = new Date().toISOString();
    // Merge categories into existing list
    const existing = await database.getFirstAsync<any>(
        `SELECT categories_json, total_workouts FROM user_rewards WHERE user_id = ?`,
        [userId]
    );
    let cats: string[] = [];
    try { cats = JSON.parse(existing?.categories_json || '[]'); } catch { }
    for (const c of sessionStats.categories) {
        if (!cats.includes(c)) cats.push(c);
    }
    const isFirst = !existing || (existing.total_workouts ?? 0) === 0;

    await database.runAsync(
        `INSERT INTO user_rewards (user_id, total_xp, level, total_workouts, total_exercises, total_calories_burned, categories_json, last_updated)
         VALUES (?, ?, 1, 1, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           total_xp = total_xp + ?,
           total_workouts = total_workouts + 1,
           total_exercises = total_exercises + ?,
           total_calories_burned = total_calories_burned + ?,
           categories_json = ?,
           last_updated = ?`,
        [
            userId, xp, sessionStats.exercisesCompleted,
            sessionStats.caloriesBurned, JSON.stringify(cats), now,
            // update set:
            xp, sessionStats.exercisesCompleted, sessionStats.caloriesBurned,
            JSON.stringify(cats), now,
        ]
    );
}

export async function unlockAchievement(
    userId: string,
    achievementId: string
): Promise<void> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT achievements_json FROM user_rewards WHERE user_id = ?`,
        [userId]
    );
    let achievements: { id: string; unlockedAt: string }[] = [];
    try { achievements = JSON.parse(row?.achievements_json || '[]'); } catch { }
    if (achievements.some(a => a.id === achievementId)) return; // already unlocked
    achievements.push({ id: achievementId, unlockedAt: new Date().toISOString() });
    await database.runAsync(
        `UPDATE user_rewards SET achievements_json = ?, last_updated = datetime('now') WHERE user_id = ?`,
        [JSON.stringify(achievements), userId]
    );
}

export async function saveProfileHash(userId: string, hash: string): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT INTO user_rewards (user_id, profile_hash, last_updated)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET profile_hash = ?, last_updated = datetime('now')`,
        [userId, hash, hash]
    );
}

// ============================================================
// Body Photos
// ============================================================

export async function saveBodyPhoto(photo: Omit<BodyPhotoRecord, 'createdAt'>): Promise<string> {
    const database = getDb();
    const id = photo.id || generateId();
    await database.runAsync(
        `INSERT INTO body_photos (id, user_id, local_uri, date_taken, phase, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, photo.userId, photo.localUri, photo.dateTaken, photo.phase, photo.notes]
    );

    // Sync to Supabase
    if (photo.userId !== 'onboarding-temp') {
        supabase.from('body_photos').upsert({
            id,
            user_id: photo.userId,
            local_uri: photo.localUri,
            date_taken: photo.dateTaken,
            phase: photo.phase,
            notes: photo.notes,
            created_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .then(({error}) => { if (error) console.error("Body photo sync error:", error); });
    }

    return id;
}

export async function getBodyPhotos(userId: string): Promise<BodyPhotoRecord[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>(
        `SELECT * FROM body_photos WHERE user_id = ? ORDER BY date_taken DESC`,
        [userId]
    );
    return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        localUri: r.local_uri,
        dateTaken: r.date_taken,
        phase: r.phase,
        notes: r.notes,
        createdAt: r.created_at,
    }));
}

export async function deleteBodyPhoto(id: string): Promise<void> {
    const database = getDb();
    await database.runAsync(`DELETE FROM body_photos WHERE id = ?`, [id]);
    
    // Sync to Supabase
    supabase.from('body_photos').delete().eq('id', id)
    .then(({error}) => { if (error) console.error("Body photo delete sync error:", error); });
}

// ============================================================
// Body Simulation Cache
// ============================================================

export async function saveBodySimulation(
    userId: string,
    phases: MilestonePhase[],
    dreamStyle: string | null,
    dreamDesc: string | null,
    targetBF: number | null,
): Promise<void> {
    const database = getDb();
    const id = generateId();
    await database.runAsync(
        `INSERT OR REPLACE INTO body_simulations
         (id, user_id, phases_json, dream_body_style, dream_body_description, target_bf_percent, generated_at)
         VALUES (
           COALESCE((SELECT id FROM body_simulations WHERE user_id = ?), ?),
           ?, ?, ?, ?, ?, datetime('now')
         )`,
        [userId, id, userId, JSON.stringify(phases), dreamStyle, dreamDesc, targetBF]
    );

    // Sync to Supabase
    if (userId !== 'onboarding-temp') {
        supabase.from('body_simulations').upsert({
            id,
            user_id: userId,
            phases_json: JSON.stringify(phases),
            dream_body_style: dreamStyle,
            dream_body_description: dreamDesc,
            target_bf_percent: targetBF,
            generated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .then(({error}) => { if (error) console.error("Body simulation sync error:", error); });
    }
}

export async function getBodySimulation(userId: string): Promise<{
    phases: MilestonePhase[];
    dreamBodyStyle: string | null;
    dreamBodyDescription: string | null;
    targetBFPercent: number | null;
    generatedAt: string;
} | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM body_simulations WHERE user_id = ?`,
        [userId]
    );
    if (!row) return null;
    try {
        return {
            phases: JSON.parse(row.phases_json),
            dreamBodyStyle: row.dream_body_style,
            dreamBodyDescription: row.dream_body_description,
            targetBFPercent: row.target_bf_percent,
            generatedAt: row.generated_at,
        };
    } catch {
        return null;
    }
}

// ============================================================
// Store Backend (Products, Cart, Orders)
// ============================================================

export interface StoreCartItemRecord {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
    product: StoreProduct;
    updatedAt: string;
}

export interface StoreOrderItemRecord {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: StoreProduct;
}

export interface StoreOrderRecord {
    id: string;
    userId: string;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    promoCode?: string;
    status: 'paid' | 'pending' | 'processing';
    shippingAddress?: string;
    placedAt: string;
    items: StoreOrderItemRecord[];
}

export interface StoreWishlistItemRecord {
    id: string;
    userId: string;
    productId: string;
    product: StoreProduct;
    createdAt: string;
}

function mapStoreProductRow(row: any): StoreProduct {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        price: Number(row.price) || 0,
        previousPrice: row.previous_price == null ? undefined : Number(row.previous_price),
        description: row.description ?? undefined,
        image: row.image ?? undefined,
        tags: row.tags_json ? JSON.parse(row.tags_json) : [],
        rating: row.rating == null ? undefined : Number(row.rating),
        isNew: row.is_new === 1,
        onSale: row.on_sale === 1,
        nutrition: row.nutrition_json ? JSON.parse(row.nutrition_json) : undefined,
    };
}

export async function seedStoreProductsIfEmpty(seedProducts: StoreProduct[]): Promise<void> {
    const database = getDb();
    const row = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM store_products`
    );
    const count = row?.count ?? 0;
    if (count > 0) return;

    await database.withTransactionAsync(async () => {
        for (const product of seedProducts) {
            await database.runAsync(
                `INSERT INTO store_products (
                    id, name, category, price, previous_price, description, image,
                    tags_json, rating, is_new, on_sale, nutrition_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    product.id,
                    product.name,
                    product.category,
                    product.price,
                    product.previousPrice ?? null,
                    product.description ?? null,
                    product.image ?? null,
                    JSON.stringify(product.tags || []),
                    product.rating ?? null,
                    product.isNew ? 1 : 0,
                    product.onSale ? 1 : 0,
                    product.nutrition ? JSON.stringify(product.nutrition) : null,
                ]
            );
        }
    });
}

export async function getStoreProducts(): Promise<StoreProduct[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>(
        `SELECT * FROM store_products ORDER BY name ASC`
    );
    return rows.map(mapStoreProductRow);
}

export async function getStoreProductById(id: string): Promise<StoreProduct | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM store_products WHERE id = ?`,
        [id]
    );
    return row ? mapStoreProductRow(row) : null;
}

export async function getStoreCartItems(userId: string): Promise<StoreCartItemRecord[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>(
        `SELECT * FROM store_cart_items WHERE user_id = ? ORDER BY updated_at DESC`,
        [userId]
    );
    return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        quantity: row.quantity,
        product: JSON.parse(row.product_snapshot_json) as StoreProduct,
        updatedAt: row.updated_at,
    }));
}

export async function upsertStoreCartItem(
    userId: string,
    product: StoreProduct,
    quantity: number
): Promise<void> {
    const database = getDb();
    const existing = await database.getFirstAsync<any>(
        `SELECT id, quantity FROM store_cart_items WHERE user_id = ? AND product_id = ?`,
        [userId, product.id]
    );

    if (existing) {
        await database.runAsync(
            `UPDATE store_cart_items
             SET quantity = ?, product_snapshot_json = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [existing.quantity + quantity, JSON.stringify(product), existing.id]
        );
        return;
    }

    await database.runAsync(
        `INSERT INTO store_cart_items (id, user_id, product_id, quantity, product_snapshot_json, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [generateId(), userId, product.id, quantity, JSON.stringify(product)]
    );
}

export async function removeStoreCartItem(userId: string, productId: string): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `DELETE FROM store_cart_items WHERE user_id = ? AND product_id = ?`,
        [userId, productId]
    );
}

export async function clearStoreCart(userId: string): Promise<void> {
    const database = getDb();
    await database.runAsync(`DELETE FROM store_cart_items WHERE user_id = ?`, [userId]);
}

export async function createStoreOrder(
    userId: string,
    payload: {
        items: Array<{ product: StoreProduct; quantity: number }>;
        subtotal: number;
        shippingFee: number;
        discount: number;
        total: number;
        promoCode?: string;
        status?: 'paid' | 'pending' | 'processing';
        shippingAddress?: string;
    }
): Promise<string> {
    const database = getDb();
    const orderId = generateId();
    const status = payload.status ?? 'paid';

    await database.withTransactionAsync(async () => {
        await database.runAsync(
            `INSERT INTO store_orders (
                id, user_id, subtotal, shipping_fee, discount, total, promo_code, status, shipping_address, placed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                orderId,
                userId,
                payload.subtotal,
                payload.shippingFee,
                payload.discount,
                payload.total,
                payload.promoCode ?? null,
                status,
                payload.shippingAddress ?? null,
            ]
        );

        for (const item of payload.items) {
            const lineTotal = item.product.price * item.quantity;
            await database.runAsync(
                `INSERT INTO store_order_items (
                    id, order_id, product_id, product_name, quantity, unit_price, line_total, product_snapshot_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    generateId(),
                    orderId,
                    item.product.id,
                    item.product.name,
                    item.quantity,
                    item.product.price,
                    lineTotal,
                    JSON.stringify(item.product),
                ]
            );
        }

        await clearStoreCart(userId);
    });

    return orderId;
}

export async function getStoreOrders(userId: string): Promise<StoreOrderRecord[]> {
    const database = getDb();
    const orders = await database.getAllAsync<any>(
        `SELECT * FROM store_orders WHERE user_id = ? ORDER BY placed_at DESC`,
        [userId]
    );

    const result: StoreOrderRecord[] = [];
    for (const order of orders) {
        const items = await database.getAllAsync<any>(
            `SELECT * FROM store_order_items WHERE order_id = ?`,
            [order.id]
        );

        result.push({
            id: order.id,
            userId: order.user_id,
            subtotal: Number(order.subtotal) || 0,
            shippingFee: Number(order.shipping_fee) || 0,
            discount: Number(order.discount) || 0,
            total: Number(order.total) || 0,
            promoCode: order.promo_code ?? undefined,
            status: (order.status as 'paid' | 'pending' | 'processing') || 'paid',
            shippingAddress: order.shipping_address ?? undefined,
            placedAt: order.placed_at,
            items: items.map(item => ({
                id: item.id,
                productId: item.product_id,
                productName: item.product_name,
                quantity: item.quantity,
                unitPrice: Number(item.unit_price) || 0,
                lineTotal: Number(item.line_total) || 0,
                product: JSON.parse(item.product_snapshot_json) as StoreProduct,
            })),
        });
    }

    return result;
}

export async function updateStoreOrderStatus(
    orderId: string,
    status: 'paid' | 'pending' | 'processing'
): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `UPDATE store_orders SET status = ? WHERE id = ?`,
        [status, orderId]
    );
}

export async function getStoreWishlistItems(userId: string): Promise<StoreWishlistItemRecord[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>(
        `SELECT * FROM store_wishlist_items WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );

    return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
        product: JSON.parse(row.product_snapshot_json) as StoreProduct,
        createdAt: row.created_at,
    }));
}

export async function upsertStoreWishlistItem(userId: string, product: StoreProduct): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO store_wishlist_items (id, user_id, product_id, product_snapshot_json, created_at)
         VALUES (
           COALESCE((SELECT id FROM store_wishlist_items WHERE user_id = ? AND product_id = ?), ?),
           ?, ?, ?, datetime('now')
         )`,
        [userId, product.id, generateId(), userId, product.id, JSON.stringify(product)]
    );
}

export async function removeStoreWishlistItem(userId: string, productId: string): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `DELETE FROM store_wishlist_items WHERE user_id = ? AND product_id = ?`,
        [userId, productId]
    );
}
