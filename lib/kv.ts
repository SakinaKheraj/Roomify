import puter from "@heyputer/puter.js";

export const PROJECT_PREFIX = "roomify_project_";
export const COMMUNITY_PREFIX = "roomify_community_";

export const projectKey = (id: string): string => `${PROJECT_PREFIX}${id}`;
export const communityKey = (id: string): string => `${COMMUNITY_PREFIX}${id}`;

export const kvGet = async <T = any>(key: string): Promise<T | null> => {
    try {
        const data = await puter.kv.get(key);
        return (data as T) ?? null;
    } catch (e) {
        console.warn(`[Puter KV] Failed to get key: ${key}`, e);
        return null;
    }
};

export const kvSet = async <T = any>(key: string, value: T): Promise<boolean> => {
    try {
        await puter.kv.set(key, value);
        return true;
    } catch (e) {
        console.warn(`[Puter KV] Failed to set key: ${key}`, e);
        return false;
    }
};

export const kvDelete = async (key: string): Promise<boolean> => {
    try {
        await puter.kv.del(key);
        return true;
    } catch (e) {
        console.warn(`[Puter KV] Failed to delete key: ${key}`, e);
        return false;
    }
};

export const kvList = async <T = any>(prefix: string): Promise<T[]> => {
    try {
        const items = await puter.kv.list(prefix, true);
        if (!Array.isArray(items)) return [];
        return items.map((item: any) => (item?.value ?? item) as T);
    } catch (e) {
        console.warn(`[Puter KV] Failed to list with prefix: ${prefix}`, e);
        return [];
    }
};
