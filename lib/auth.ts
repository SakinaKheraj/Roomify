import { createClient } from '@supabase/supabase-js';

// ── Supabase client (browser-safe anon key) ───────────────────────────────────
export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

/**
 * Opens the Google OAuth popup / redirect via Supabase Auth.
 * Returns true on successful initiation (redirect will follow).
 */
export const signIn = async (): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });
    if (error) {
        console.warn('Sign-in failed:', error.message);
        return false;
    }
    return true;
};

/**
 * Signs the current user out.
 */
export const signOut = async (): Promise<boolean> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.warn('Sign-out failed:', error.message);
        return false;
    }
    return true;
};

/**
 * Returns the currently authenticated user or null.
 */
export const getCurrentUser = async (): Promise<{
    userId: string;
    userName: string;
} | null> => {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const user = session.user;
    return {
        userId: user.id,
        userName:
            (user.user_metadata?.['full_name'] as string) ??
            (user.user_metadata?.['name'] as string) ??
            user.email ??
            '',
    };
};

/**
 * Checks if a valid session exists.
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return !!session;
};
