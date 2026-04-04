/**
 * Expo SQLite Local Database
 *
 * Offline-first database layer. All CRUD operations go through
 * this file, reading/writing to the local SQLite database.
 * The sync layer (sync.ts) handles pushing changes to Supabase.
 */

import * as SQLite from 'expo-sqlite';
import { MealEntry, FoodItem, MealType, OnboardingProfile, WorkoutPlan, WorkoutSession, UserRewards } from '@/src/types';
import { supabase } from './supabase';

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
    ];
    for (const sql of migrations) {
        try { await db.execAsync(sql); } catch { /* column already exists, ignore */ }
    }
}

function getDb(): SQLite.SQLiteDatabase {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

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
}

export async function getMealEntryById(id: string): Promise<any | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>(
        `SELECT * FROM meal_entries WHERE id = ?`,
        [id]
    );
    return row ? mapMealEntry(row) : null;
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
    const database = getDb();
    const id = generateId();

    // Serialize any JSON arrays
    const serialize = (arr: any) =>
        Array.isArray(arr) ? JSON.stringify(arr) : '[]';

    await database.runAsync(
        `INSERT OR REPLACE INTO user_health_profiles (
            id, user_id,
            biological_gender, gender_identity, age, height_cm, weight_kg,
            nationality_or_race, activity_level,
            work_type, wake_time, sleep_time, commute_type, exercise_frequency,
            diet_type, meals_per_day, snacking_habit, water_intake_glasses,
            food_allergies, cuisine_preferences,
            blood_sugar_level, cholesterol_level, health_conditions,
            medications, family_history,
            smoking_status, alcohol_frequency, sleep_hours, stress_level,
            marital_status, pregnancy_status, num_children, children_notes,
            personal_notes,
            dream_weight_kg, dream_fitness_level, dream_food_habits,
            dream_daily_routine, dream_special_habits,
            waist_cm, hip_cm, neck_cm, wrist_cm,
            updated_at
        ) VALUES (
            COALESCE((SELECT id FROM user_health_profiles WHERE user_id = ?), ?),
            ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            datetime('now')
        )`,
        [
            userId, id,
            userId,
            data.biological_gender ?? null,
            data.gender_identity ?? null,
            data.age ?? null,
            data.height_cm ?? null,
            data.weight_kg ?? null,
            data.nationality_or_race ?? null,
            data.activity_level ?? null,
            data.work_type ?? null,
            data.wake_time ?? null,
            data.sleep_time ?? null,
            data.commute_type ?? null,
            data.exercise_frequency ?? null,
            data.diet_type ?? null,
            data.meals_per_day ?? null,
            data.snacking_habit ?? null,
            data.water_intake_glasses ?? null,
            serialize(data.food_allergies),
            serialize(data.cuisine_preferences),
            data.blood_sugar_level ?? null,
            data.cholesterol_level ?? null,
            serialize(data.health_conditions),
            data.medications ?? null,
            serialize(data.family_history),
            data.smoking_status ?? null,
            data.alcohol_frequency ?? null,
            data.sleep_hours ?? null,
            data.stress_level ?? null,
            data.marital_status ?? null,
            data.pregnancy_status ?? null,
            data.num_children ?? null,
            data.children_notes ?? null,
            data.personal_notes ?? null,
            data.dream_weight_kg ?? null,
            data.dream_fitness_level ?? null,
            serialize(data.dream_food_habits),
            data.dream_daily_routine ?? null,
            serialize(data.dream_special_habits),
            data.waist_cm ?? null,
            data.hip_cm ?? null,
            data.neck_cm ?? null,
            data.wrist_cm ?? null,
        ]
    );

    // Mirror onboarding data to Supabase when authenticated.
    if (userId !== 'onboarding-temp') {
        await syncOnboardingToSupabase(userId, data);
    }
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

async function syncOnboardingToSupabase(
    userId: string,
    data: Partial<OnboardingProfile>
): Promise<void> {
    try {
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                height_cm: data.height_cm ?? null,
                weight_kg: data.weight_kg ?? null,
                age: data.age ?? null,
                gender: toProfileGender(data.biological_gender),
                activity_level: data.activity_level ?? null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (profileError) {
            console.error('Failed to sync onboarding profile basics to Supabase:', profileError.message);
        }

        const { error: healthError } = await supabase
            .from('user_health_profiles')
            .upsert({
                user_id: userId,
                biological_gender: data.biological_gender ?? null,
                gender_identity: data.gender_identity ?? null,
                age: data.age ?? null,
                height_cm: data.height_cm ?? null,
                weight_kg: data.weight_kg ?? null,
                nationality_or_race: data.nationality_or_race ?? null,
                activity_level: data.activity_level ?? null,
                work_type: data.work_type ?? null,
                wake_time: data.wake_time ?? null,
                sleep_time: data.sleep_time ?? null,
                commute_type: data.commute_type ?? null,
                exercise_frequency: data.exercise_frequency ?? null,
                diet_type: data.diet_type ?? null,
                meals_per_day: data.meals_per_day ?? null,
                snacking_habit: data.snacking_habit ?? null,
                water_intake_glasses: data.water_intake_glasses ?? null,
                food_allergies: normalizeStringArray((data as any).food_allergies),
                cuisine_preferences: normalizeStringArray((data as any).cuisine_preferences),
                blood_sugar_level: data.blood_sugar_level ?? null,
                cholesterol_level: data.cholesterol_level ?? null,
                health_conditions: normalizeStringArray((data as any).health_conditions),
                medications: data.medications ?? null,
                family_history: normalizeStringArray((data as any).family_history),
                smoking_status: data.smoking_status ?? null,
                alcohol_frequency: data.alcohol_frequency ?? null,
                sleep_hours: data.sleep_hours ?? null,
                stress_level: data.stress_level ?? null,
                marital_status: data.marital_status ?? null,
                pregnancy_status: data.pregnancy_status ?? null,
                num_children: data.num_children ?? null,
                children_notes: data.children_notes ?? null,
                personal_notes: data.personal_notes ?? null,
                dream_weight_kg: data.dream_weight_kg ?? null,
                dream_fitness_level: data.dream_fitness_level ?? null,
                dream_food_habits: normalizeStringArray((data as any).dream_food_habits),
                dream_daily_routine: data.dream_daily_routine ?? null,
                dream_special_habits: normalizeStringArray((data as any).dream_special_habits),
                waist_cm: data.waist_cm ?? null,
                hip_cm: data.hip_cm ?? null,
                neck_cm: data.neck_cm ?? null,
                wrist_cm: data.wrist_cm ?? null,
                body_type_dominant: (data as any).body_type_dominant ?? null,
                body_type_blend: (data as any).body_type_blend ?? null,
                body_type_ecto: (data as any).body_type_ecto ?? null,
                body_type_meso: (data as any).body_type_meso ?? null,
                body_type_endo: (data as any).body_type_endo ?? null,
                body_type_bf: (data as any).body_type_bf ?? null,
                body_type_frame: (data as any).body_type_frame ?? null,
                body_type_confidence: (data as any).body_type_confidence ?? null,
                body_type_insights: normalizeStringArray((data as any).body_type_insights),
                body_type_updated_at: (data as any).body_type_updated_at ?? null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (healthError) {
            console.error('Failed to sync full onboarding profile to Supabase:', healthError.message);
        }
    } catch (e: any) {
        console.error('Unexpected onboarding sync error:', e?.message ?? e);
    }
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
        cuisine_preferences: parse(row.cuisine_preferences),
        health_conditions: parse(row.health_conditions),
        family_history: parse(row.family_history),
        dream_food_habits: parse(row.dream_food_habits),
        dream_special_habits: parse(row.dream_special_habits),
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
