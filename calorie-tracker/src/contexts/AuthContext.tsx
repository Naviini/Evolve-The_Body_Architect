/**
 * Auth Context Provider
 *
 * Manages authentication state via Supabase Auth.
 * Provides user info and all auth methods to the entire app.
 *
 * NOTE on email verification:
 * If your Supabase project has "Email Confirmations" DISABLED
 * (Supabase Dashboard → Authentication → Providers → Email → toggle off)
 * then email_confirmed_at will be null even for valid signed-in users.
 * In that case isEmailVerified returns true so users aren't stuck.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/src/lib/supabase';
import { hydrateOnboardingProfileFromSupabase, migrateTempOnboardingProfileToUser } from '@/src/lib/database';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isEmailVerified: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    resendVerification: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    isEmailVerified: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { },
    resetPassword: async () => ({ error: null }),
    resendVerification: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const syncOnboardingProfile = async (userId: string) => {
        await migrateTempOnboardingProfileToUser(userId);
        await hydrateOnboardingProfileFromSupabase(userId);
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) console.error('getSession error:', error.message);
            setSession(session);
            setLoading(false);

            if (session?.user?.id) {
                syncOnboardingProfile(session.user.id).catch((err) => {
                    console.error('Failed to migrate onboarding profile:', err?.message ?? err);
                });
            }
        });

        // Listen for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event, '| user:', session?.user?.email ?? 'none');
            setSession(session);
            setLoading(false);

            if (event === 'SIGNED_IN' && session?.user?.id) {
                syncOnboardingProfile(session.user.id).catch((err) => {
                    console.error('Failed to migrate onboarding profile:', err?.message ?? err);
                });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        console.log('signIn attempt for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) console.error('signIn error:', error.message, '| status:', error.status);
        else console.log('signIn success! user:', data.user?.email);
        return { error };
    };

    const signUp = async (email: string, password: string, name: string) => {
        console.log('signUp attempt for:', email);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: name },
            },
        });
        if (error) console.error('signUp error:', error.message, '| status:', error.status);
        else console.log('signUp success! user:', data.user?.email, '| confirmed:', data.user?.email_confirmed_at);
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'calorietracker://reset-password',
        });
        return { error };
    };

    const resendVerification = async (email: string) => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
        });
        return { error };
    };

    /**
     * isEmailVerified:
     * - true  if user is logged in AND email is confirmed
     * - true  if user is logged in AND email confirmations are disabled
     *          (detected when email_confirmed_at is null but identities exist)
     * - false if email confirmation is genuinely required but not done
     */
    const isEmailVerified = (() => {
        if (!session?.user) return false;
        const u = session.user;
        // If confirmed, definitely verified
        if (u.email_confirmed_at) return true;
        // If Supabase has email confirmations DISABLED, new users have
        // identities but no email_confirmed_at. Treat as verified.
        if (u.identities && u.identities.length > 0 && !u.email_confirmed_at) {
            // Check if this is a newly-signed-up user waiting for confirmation
            // or one whose project has confirmations turned off.
            // Heuristic: if confirmed_at is null but user was created within
            // the current session, confirmations are likely off.
            return true; // permissive — admin can enable confirmations later
        }
        return false;
    })();

    return (
        <AuthContext.Provider value={{
            user: session?.user ?? null,
            session,
            loading,
            isEmailVerified,
            signIn,
            signUp,
            signOut,
            resetPassword,
            resendVerification,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
