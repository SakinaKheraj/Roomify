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

export const PROJECT_KV_PREFIX = "roomify_project_";

/**
 * Fetch a single project directly from Puter KV.
 */
export const getProjectKV = async (projectId: string): Promise<DesignItem | null> => {
  if (!projectId) return null;
  return await kvGet<DesignItem>(projectKey(projectId));
};

/**
 * Save or overwrite a project directly in Puter KV.
 */
export const saveProjectKV = async (project: DesignItem): Promise<DesignItem> => {
  await kvSet(projectKey(project.id), project);
  if (project.isPublic) {
    await kvSet(communityKey(project.id), project);
  }
  return project;
};

/**
 * Update a project by ID in Puter KV with partial changes.
 * Preserves the project ID, merges updates, and synchronizes community visibility.
 */
export const updateProjectKV = async (
  projectId: string,
  updates: Partial<Omit<DesignItem, "id">>
): Promise<DesignItem | null> => {
  if (!projectId) return null;

  const existing = await getProjectKV(projectId);
  if (!existing) {
    console.warn(`updateProjectKV: project "${projectId}" not found`);
    return null;
  }

  const updated: DesignItem = {
    ...existing,
    ...updates,
    id: projectId,
  };

  await kvSet(projectKey(projectId), updated);

  // Synchronize community index if visibility was affected
  if (updated.isPublic) {
    await kvSet(communityKey(projectId), updated);
  } else {
    await kvDelete(communityKey(projectId));
  }

  return updated;
};

/**
 * Delete a project by ID from Puter KV, removing both user and community records.
 */
export const deleteProjectKV = async (projectId: string): Promise<boolean> => {
  if (!projectId) return false;

  try {
    await kvDelete(projectKey(projectId));
    await kvDelete(communityKey(projectId));
    return true;
  } catch (error) {
    console.error(`deleteProjectKV: failed to delete project "${projectId}"`, error);
    return false;
  }
};

/**
 * Query user projects from Puter KV.
 * If userId is provided, filters projects owned by that user.
 * Returns projects sorted by timestamp in descending order.
 */
export const getUserProjectsKV = async (userId?: string | null): Promise<DesignItem[]> => {
  try {
    const allProjects = await kvList<DesignItem>(PROJECT_KV_PREFIX);
    if (!Array.isArray(allProjects)) return [];

    const filtered = userId
      ? allProjects.filter((p) => p && p.ownerId === userId)
      : allProjects.filter((p) => Boolean(p && p.id));

    return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (error) {
    console.error("getUserProjectsKV: error querying projects from KV", error);
    return [];
  }
};
