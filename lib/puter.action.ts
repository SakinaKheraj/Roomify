import puter from "@heyputer/puter.js";
import {getOrCreateHostingConfig, uploadImageToHosting} from "./puter.hosting";
import {isHostedUrl} from "./utils";
import {PUTER_WORKER_URL} from "./constants";
import type {ProjectVisibility} from "./models/project";

// ─── Auth (re-exported from lib/auth for backward compat) ────────────────────
export { signIn, signOut, getCurrentUser } from "./auth";

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams): Promise<DesignItem | null | undefined> => {
    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; skip history fetch;');
        return null;
    }
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

    const payload = {
        ...rest,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
        visibility,
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
            console.error('failed to save the project', await response.text());
            return null;
        }

        const data = (await response.json()) as { project?: DesignItem | null }

        return data?.project ?? null;
    } catch (e) {
        console.log('Failed to save project', e)
        return null;
    }
}

export const getProjects = async () => {
    if(!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; skip history fetch;');
        return []
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: 'GET' });

        if(!response.ok) {
            console.error('Failed to fetch history', await response.text());
            return [];
        }

        const data = (await response.json()) as { projects?: DesignItem[] | null };

        return Array.isArray(data?.projects) ? data?.projects : [];
    } catch (e) {
        console.error('Failed to get projects', e);
        return [];
    }
}

export const getProjectById = async ({ id }: { id: string }) => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
        return null;
    }

    console.log("Fetching project with ID:", id);

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        console.log("Fetch project response:", response);

        if (!response.ok) {
            console.error("Failed to fetch project:", await response.text());
            return null;
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };

        console.log("Fetched project data:", data);

        return data?.project ?? null;
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return null;
    }
};

// ─── Visibility ───────────────────────────────────────────────────────────────

export const updateProjectVisibility = async (
    projectId: string,
    visibility: ProjectVisibility,
): Promise<DesignItem | null> => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping visibility update.");
        return null;
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
            console.error("Failed to update visibility:", await response.text());
            return null;
        }

        const data = (await response.json()) as { project?: DesignItem | null };
        return data?.project ?? null;
    } catch (e) {
        console.error("Failed to update project visibility:", e);
        return null;
    }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteProject = async (projectId: string): Promise<boolean> => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping delete.");
        return false;
    }

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/delete`,
            {
                method: "POST",
                body: JSON.stringify({ projectId }),
            },
        );

        if (!response.ok) {
            console.error("Failed to delete project:", await response.text());
            return false;
        }

        return true;
    } catch (e) {
        console.error("Failed to delete project:", e);
        return false;
    }
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
