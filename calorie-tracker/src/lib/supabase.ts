/**
 * Supabase Client Configuration
 *
 * Credentials are loaded from environment variables (.env file).
 *
 * ⚠️  IMPORTANT — The anon key MUST be the long JWT string:
 *   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
 *   - Copy "Project API keys → anon / public"
 *   - It looks like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiO...
 *   - It is NOT the short "sb_publishable_..." string
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ──────────────── Startup key validation ────────────────
if (__DEV__) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('[Supabase] ❌ Missing credentials in .env!');
    } else if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
        console.error(
            '[Supabase] ❌ WRONG ANON KEY FORMAT!\n' +
            'The key must start with "eyJ..." (a JWT token).\n' +
            'Go to: Supabase Dashboard → Settings → API → anon/public key\n' +
            'Current key starts with: "' + SUPABASE_ANON_KEY.substring(0, 25) + '"'
        );
    } else {
        console.log('[Supabase] ✅ Configured. URL:', SUPABASE_URL);
    }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export function isSupabaseConfigured(): boolean {
    return Boolean(SUPABASE_URL) &&
        SUPABASE_URL.startsWith('https://') &&
        Boolean(SUPABASE_ANON_KEY) &&
        SUPABASE_ANON_KEY.startsWith('eyJ');
}

export { SUPABASE_URL };
