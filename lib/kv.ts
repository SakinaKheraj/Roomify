/**
 * lib/kv.ts
 * Generic key-value helpers wrapping puter.kv, scoped by namespace prefix.
 * These are *client-side* direct KV calls, complementing the Worker-proxied
 * CRUD operations in puter.action.ts.
 */
import puter from "@heyputer/puter.js";

// ─── Key builders ────────────────────────────────────────────────────────────

/** Key for a user-scoped project (stored inside the Puter Worker's KV) */
export const projectKey = (projectId: string) => `roomify_project_${projectId}`;

/**
 * Key for the global community index entry for a project.
 * Written to when a project is published; read by /api/community/list.
 */
export const communityKey = (projectId: string) => `community_${projectId}`;

// ─── Generic helpers ─────────────────────────────────────────────────────────

/**
 * Get a typed value from puter.kv. Returns null if the key does not exist or
 * if parsing fails.
 */
export const kvGet = async <T>(key: string): Promise<T | null> => {
  try {
    const value = (await puter.kv.get(key)) as T | null;
    return value ?? null;
  } catch {
    return null;
  }
};

/**
 * Set a value in puter.kv. Serialises the value for you.
 */
export const kvSet = async (key: string, value: unknown): Promise<void> => {
  await puter.kv.set(key, value);
};

/**
 * List all entries whose key starts with `prefix`.
 * Returns an array of typed values; silently returns [] on error.
 */
export const kvList = async <T>(prefix: string): Promise<T[]> => {
  try {
    const entries = (await puter.kv.list(prefix, true)) as Array<{
      key: string;
      value: T;
    }>;
    return Array.isArray(entries) ? entries.map((e) => e.value) : [];
  } catch {
    return [];
  }
};

/**
 * Delete a key from puter.kv. Silent on error.
 */
export const kvDelete = async (key: string): Promise<void> => {
  try {
    await puter.kv.del(key);
  } catch {
    // puter.kv.del may not exist in all SDK versions — swallow the error
    console.warn(`kvDelete: could not delete key "${key}"`);
  }
};
