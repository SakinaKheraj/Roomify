/**
 * lib/api.ts
 * All project CRUD + image upload operations routed through the
 * Cloudflare Worker. Replaces lib/puter.action.ts entirely.
 *
 * Every authenticated call attaches the Supabase JWT as a Bearer token.
 */
import { getAccessToken } from './auth';
import { dataUrlToBlob } from './utils';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) ?? '';

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await getAccessToken();
    return fetch(`${WORKER_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {}),
        },
    });
}

// ── Project CRUD ──────────────────────────────────────────────────────────────

export const createProject = async ({
    item,
    visibility = 'private',
}: CreateProjectParams): Promise<DesignItem | null> => {
    if (!WORKER_URL) {
        console.warn('VITE_WORKER_URL is not set; skipping cloud save.');
        return item;
    }
    try {
        const res = await apiFetch('/api/projects/save', {
            method: 'POST',
            body: JSON.stringify({ project: item, visibility }),
        });
        if (!res.ok) {
            console.error('createProject failed:', await res.text());
            return null;
        }
        const data = (await res.json()) as { project: DesignItem };
        return data.project ?? item;
    } catch (e) {
        console.error('createProject error:', e);
        return null;
    }
};

export const getProjects = async (): Promise<DesignItem[]> => {
    if (!WORKER_URL) return [];
    try {
        const res = await apiFetch('/api/projects/list');
        if (!res.ok) return [];
        const data = (await res.json()) as { projects: DesignItem[] };
        return Array.isArray(data.projects) ? data.projects : [];
    } catch (e) {
        console.error('getProjects error:', e);
        return [];
    }
};

export const getProjectById = async ({ id }: { id: string }): Promise<DesignItem | null> => {
    if (!WORKER_URL) return null;
    try {
        const res = await apiFetch(`/api/projects/get?id=${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        const data = (await res.json()) as { project: DesignItem };
        return data.project ?? null;
    } catch (e) {
        console.error('getProjectById error:', e);
        return null;
    }
};

export const updateProject = async (
    projectId: string,
    updates: Partial<Omit<DesignItem, 'id'>>
): Promise<DesignItem | null> => {
    if (!WORKER_URL) return null;
    try {
        const res = await apiFetch('/api/projects/update', {
            method: 'POST',
            body: JSON.stringify({ projectId, updates }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { project: DesignItem };
        return data.project ?? null;
    } catch (e) {
        console.error('updateProject error:', e);
        return null;
    }
};

export const deleteProject = async (projectId: string): Promise<boolean> => {
    if (!WORKER_URL) return false;
    try {
        const res = await apiFetch('/api/projects/delete', {
            method: 'POST',
            body: JSON.stringify({ projectId }),
        });
        return res.ok;
    } catch (e) {
        console.error('deleteProject error:', e);
        return false;
    }
};

export const updateProjectVisibility = async (
    projectId: string,
    visibility: 'private' | 'public'
): Promise<DesignItem | null> => {
    if (!WORKER_URL) return null;
    try {
        const res = await apiFetch('/api/projects/visibility', {
            method: 'POST',
            body: JSON.stringify({ projectId, visibility }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { project: DesignItem };
        return data.project ?? null;
    } catch (e) {
        console.error('updateProjectVisibility error:', e);
        return null;
    }
};

export const getCommunityProjects = async (): Promise<DesignItem[]> => {
    if (!WORKER_URL) return [];
    try {
        // Community feed is public — no auth token needed
        const res = await fetch(`${WORKER_URL}/api/community/list`);
        if (!res.ok) return [];
        const data = (await res.json()) as { projects: DesignItem[] };
        return Array.isArray(data.projects) ? data.projects : [];
    } catch (e) {
        console.error('getCommunityProjects error:', e);
        return [];
    }
};

// ── Image upload to Supabase Storage ──────────────────────────────────────────

export const uploadImage = async (
    blob: Blob,
    projectId: string,
    label: 'source' | 'rendered'
): Promise<string | null> => {
    if (!WORKER_URL) return null;
    try {
        const token = await getAccessToken();
        const formData = new FormData();
        formData.append('file', blob, `${label}.png`);
        formData.append('projectId', projectId);
        formData.append('label', label);

        const res = await fetch(`${WORKER_URL}/api/images/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { url: string };
        return data.url ?? null;
    } catch (e) {
        console.error('uploadImage error:', e);
        return null;
    }
};

// ── Re-exports kept for backwards-compat with any code that imports from puter.action ──
export { signIn, signOut, getCurrentUser } from './auth';
