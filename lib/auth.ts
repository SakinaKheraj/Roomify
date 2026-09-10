import puter from "@heyputer/puter.js";

/**
 * Signs the current user in via Puter's OAuth popup.
 * Returns true on success, false if the user cancels or an error occurs.
 */
export const signIn = async (): Promise<boolean> => {
    try {
        await puter.auth.signIn();
        return true;
    } catch (e) {
        console.warn("Sign-in failed or was cancelled:", e);
        return false;
    }
};

/**
 * Signs the current user out of Puter.
 * Returns true on success.
 */
export const signOut = async (): Promise<boolean> => {
    try {
        await puter.auth.signOut();
        return true;
    } catch (e) {
        console.warn("Sign-out failed:", e);
        return false;
    }
};

/**
 * Returns the currently authenticated Puter user, or null if not signed in.
 */
export const getCurrentUser = async (): Promise<{ userId: string; userName: string } | null> => {
    try {
        const isSignedIn = await puter.auth.isSignedIn();
        if (!isSignedIn) return null;

        const user = await puter.auth.getUser();
        if (!user) return null;

        const u = user as any;
        return {
            userId: u?.uuid ?? u?.username ?? "",
            userName: u?.username ?? "",
        };
    } catch (e) {
        console.warn("Failed to get current user:", e);
        return null;
    }
};

/**
 * Checks whether the user is currently authenticated with Puter.
 */
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        return await puter.auth.isSignedIn();
    } catch {
        return false;
    }
};
