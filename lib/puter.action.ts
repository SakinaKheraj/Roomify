import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import {
    projectKey,
    communityKey,
    kvGet,
    kvSet,
    kvDelete,
    kvList,
    PROJECT_PREFIX,
    COMMUNITY_PREFIX,
} from "./kv";
import type { CreateProjectParams } from "./models/project";

export { signIn, signOut, getCurrentUser } from "./auth";

/**
 * Creates or updates a project in Puter KV storage and optionally syncs images to hosting CDN.
 */
export const createProject = async ({
    item,
    visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null> => {
    try {
        const projectId = item.id;
        let hostedSource = item.sourceImage;
        let hostedRender = item.renderedImage;

        try {
            const hosting = await getOrCreateHostingConfig();
            if (hosting && projectId) {
                if (item.sourceImage && !item.sourceImage.startsWith("http")) {
                    const uploadedSource = await uploadImageToHosting({
                        hosting,
                        url: item.sourceImage,
                        projectId,
                        label: "source",
                    });
                    if (uploadedSource?.url) hostedSource = uploadedSource.url;
                }
                if (item.renderedImage && !item.renderedImage.startsWith("http")) {
                    const uploadedRender = await uploadImageToHosting({
                        hosting,
                        url: item.renderedImage,
                        projectId,
                        label: "rendered",
                    });
                    if (uploadedRender?.url) hostedRender = uploadedRender.url;
                }
            }
        } catch (e) {
            console.warn("Hosting upload skipped, saving direct payload:", e);
        }

        const projectPayload: DesignItem = {
            ...item,
            sourceImage: hostedSource,
            renderedImage: hostedRender,
            isPublic: visibility === "public",
            timestamp: item.timestamp || Date.now(),
        };

        const key = projectKey(projectId);
        await kvSet(key, projectPayload);

        if (visibility === "public") {
            await kvSet(communityKey(projectId), projectPayload);
        }

        return projectPayload;
    } catch (e) {
        console.error("Failed to create/save project:", e);
        return null;
    }
};

/**
 * Fetches a single project by its ID from Puter KV.
 */
export const getProjectById = async ({ id }: { id: string }): Promise<DesignItem | null> => {
    try {
        const key = projectKey(id);
        const project = await kvGet<DesignItem>(key);
        return project;
    } catch (e) {
        console.error(`Failed to get project with id: ${id}`, e);
        return null;
    }
};

/**
 * Lists all user projects from Puter KV.
 */
export const getProjects = async (): Promise<DesignItem[]> => {
    try {
        const list = await kvList<DesignItem>(PROJECT_PREFIX);
        return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
        console.error("Failed to fetch projects list:", e);
        return [];
    }
};

/**
 * Toggles a project's visibility between private and public community feed.
 */
export const updateProjectVisibility = async (
    id: string,
    visibility: "private" | "public"
): Promise<boolean> => {
    try {
        const project = await getProjectById({ id });
        if (!project) return false;

        const updated: DesignItem = {
            ...project,
            isPublic: visibility === "public",
        };

        await kvSet(projectKey(id), updated);

        if (visibility === "public") {
            await kvSet(communityKey(id), updated);
        } else {
            await kvDelete(communityKey(id));
        }

        return true;
    } catch (e) {
        console.error("Failed to update project visibility:", e);
        return false;
    }
};

/**
 * Deletes a project from Puter KV.
 */
export const deleteProject = async (id: string): Promise<boolean> => {
    try {
        await kvDelete(projectKey(id));
        await kvDelete(communityKey(id));
        return true;
    } catch (e) {
        console.error("Failed to delete project:", e);
        return false;
    }
};

/**
 * Fetches all public community projects.
 */
export const getCommunityProjects = async (): Promise<DesignItem[]> => {
    try {
        const list = await kvList<DesignItem>(COMMUNITY_PREFIX);
        return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
        console.error("Failed to fetch community projects:", e);
        return [];
    }
};
