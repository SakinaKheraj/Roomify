import puter from "@heyputer/puter.js";
import {getOrCreateHostingConfig, uploadImageToHosting} from "./puter.hosting";
import {isHostedUrl} from "./utils";
import {PUTER_WORKER_URL} from "./constants";
import type {
    ProjectVisibility,
    UpdateProjectParams,
    DeleteProjectParams,
    GetUserProjectsParams,
} from "./models/project";
import {
    updateProjectKV,
    deleteProjectKV,
    getUserProjectsKV,
    getProjectKV,
    saveProjectKV,
} from "./kv";

// ─── Auth (re-exported from lib/auth for backward compat) ────────────────────
export { signIn, signOut, getCurrentUser } from "./auth";

// ─── Models & KV re-exports (Khushi Pal - Oct 14) ───────────────────────────
export { updateProjectKV, deleteProjectKV, getUserProjectsKV, getProjectKV, saveProjectKV } from "./kv";
export type { UpdateProjectParams, DeleteProjectParams, GetUserProjectsParams } from "./models/project";

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams): Promise<DesignItem | null | undefined> => {
    const projectId = item.id;

    const hosting = await getOrCreateHostingConfig();

    const hostedSource = projectId ?
        await uploadImageToHosting({ hosting, url: item.sourceImage, projectId, label: 'source', }) : null;

    const hostedRender = projectId && item.renderedImage ?
        await uploadImageToHosting({ hosting, url: item.renderedImage, projectId, label: 'rendered', }) : null;

    const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage)
        ? item.sourceImage
        : ''
    );

    if(!resolvedSource) {
        console.warn('Failed to host source image, skipping save.')
        return null;
    }

    const resolvedRender = hostedRender?.url
        ? hostedRender?.url
        : item.renderedImage && isHostedUrl(item.renderedImage)
            ? item.renderedImage
            : undefined;

    const {
        sourcePath: _sourcePath,
        renderedPath: _renderedPath,
        publicPath: _publicPath,
        ...rest
    } = item;

    const payload: DesignItem = {
        ...rest,
        id: projectId,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
        isPublic: visibility === "public",
    };

    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; persisting directly to Puter KV;');
        return await saveProjectKV(payload);
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
            method: 'POST',
            body: JSON.stringify({
                project: payload,
                visibility
            })
        });

        if(!response.ok) {
            console.error('failed to save the project via worker, falling back to KV', await response.text());
            return await saveProjectKV(payload);
        }

        const data = (await response.json()) as { project?: DesignItem | null }

        return data?.project ?? payload;
    } catch (e) {
        console.log('Failed to save project via worker, falling back to KV', e);
        return await saveProjectKV(payload);
    }
}

export const getProjects = async (): Promise<DesignItem[]> => {
    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; fetching from direct KV;');
        return await getUserProjectsKV();
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

        if(!response.ok) {
            console.error('Failed to fetch history from worker, falling back to KV', await response.text());
            return await getUserProjectsKV();
        }

        const data = (await response.json()) as { projects?: DesignItem[] | null };

        return Array.isArray(data?.projects) ? data?.projects : await getUserProjectsKV();
    } catch (e) {
        console.error('Failed to get projects from worker, falling back to KV', e);
        return await getUserProjectsKV();
    }
}

export const getProjectById = async ({ id }: { id: string }): Promise<DesignItem | null> => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; fetching project from direct KV.");
        return await getProjectKV(id);
    }

    console.log("Fetching project with ID:", id);

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        if (!response.ok) {
            console.error("Failed to fetch project from worker, falling back to KV:", await response.text());
            return await getProjectKV(id);
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };

        return data?.project ?? await getProjectKV(id);
    } catch (error) {
        console.error("Failed to fetch project from worker, falling back to KV:", error);
        return await getProjectKV(id);
    }
};

// ─── Update (Khushi Pal - Oct 14) ──────────────────────────────────────────

export const updateProject = async (
    idOrParams: string | UpdateProjectParams,
    maybeUpdates?: Partial<Omit<DesignItem, "id">>
): Promise<DesignItem | null> => {
    const projectId = typeof idOrParams === "string" ? idOrParams : idOrParams.id;
    const updates = typeof idOrParams === "string" ? (maybeUpdates || {}) : (idOrParams.updates || {});

    if (!projectId) {
        console.warn("updateProject: missing projectId");
        return null;
    }

    if (PUTER_WORKER_URL) {
        try {
            const response = await puter.workers.exec(
                `${PUTER_WORKER_URL}/api/projects/update`,
                {
                    method: "POST",
                    body: JSON.stringify({ projectId, updates }),
                }
            );

            if (response.ok) {
                const data = (await response.json()) as { project?: DesignItem | null };
                if (data?.project) return data.project;
            } else {
                console.warn("Worker update failed; falling back to direct KV:", await response.text());
            }
        } catch (e) {
            console.warn("Worker error during update; falling back to direct KV:", e);
        }
    }

    return await updateProjectKV(projectId, updates);
};

// ─── User Projects Query (Khushi Pal - Oct 14) ─────────────────────────────

export const getUserProjects = async (
    params?: string | GetUserProjectsParams
): Promise<DesignItem[]> => {
    const userId = typeof params === "string" ? params : params?.userId;

    if (PUTER_WORKER_URL) {
        try {
            const endpoint = userId
                ? `${PUTER_WORKER_URL}/api/projects/user?userId=${encodeURIComponent(userId)}`
                : `${PUTER_WORKER_URL}/api/projects/list`;

            const response = await puter.workers.exec(endpoint, { method: "GET" });

            if (response.ok) {
                const data = (await response.json()) as { projects?: DesignItem[] | null };
                if (Array.isArray(data?.projects)) {
                    return data.projects;
                }
            } else {
                console.warn("Worker failed to fetch user projects; falling back to KV:", await response.text());
            }
        } catch (e) {
            console.warn("Worker error fetching user projects; falling back to KV:", e);
        }
    }

    return await getUserProjectsKV(userId);
};

// ─── Visibility ───────────────────────────────────────────────────────────────

export const updateProjectVisibility = async (
    projectId: string,
    visibility: ProjectVisibility,
): Promise<DesignItem | null> => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; updating visibility in KV.");
        return await updateProjectKV(projectId, { isPublic: visibility === "public" });
    }

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/visibility`,
            {
                method: "POST",
                body: JSON.stringify({ projectId, visibility }),
            },
        );

        if (!response.ok) {
            console.error("Failed to update visibility via worker, falling back to KV:", await response.text());
            return await updateProjectKV(projectId, { isPublic: visibility === "public" });
        }

        const data = (await response.json()) as { project?: DesignItem | null };
        return data?.project ?? await updateProjectKV(projectId, { isPublic: visibility === "public" });
    } catch (e) {
        console.error("Failed to update project visibility via worker, falling back to KV:", e);
        return await updateProjectKV(projectId, { isPublic: visibility === "public" });
    }
};

// ─── Delete (Khushi Pal - Oct 14) ──────────────────────────────────────────

export const deleteProject = async (
    projectIdOrParams: string | DeleteProjectParams
): Promise<boolean> => {
    const projectId = typeof projectIdOrParams === "string" ? projectIdOrParams : projectIdOrParams.id;

    if (!projectId) return false;

    let workerDeleted = false;

    if (PUTER_WORKER_URL) {
        try {
            const response = await puter.workers.exec(
                `${PUTER_WORKER_URL}/api/projects/delete`,
                {
                    method: "POST",
                    body: JSON.stringify({ projectId }),
                },
            );

            if (response.ok) {
                workerDeleted = true;
            } else {
                console.warn("Worker delete failed; attempting direct KV delete:", await response.text());
            }
        } catch (e) {
            console.warn("Worker delete error; attempting direct KV delete:", e);
        }
    }

    const kvDeleted = await deleteProjectKV(projectId);
    return workerDeleted || kvDeleted;
};

// ─── Community feed ───────────────────────────────────────────────────────────

export const getCommunityProjects = async (): Promise<DesignItem[]> => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping community fetch.");
        return [];
    }

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/community/list`,
            { method: "GET" },
        );

        if (!response.ok) {
            console.error("Failed to fetch community projects:", await response.text());
            return [];
        }

        const data = (await response.json()) as { projects?: DesignItem[] | null };
        return Array.isArray(data?.projects) ? data.projects : [];
    } catch (e) {
        console.error("Failed to get community projects:", e);
        return [];
    }
};

