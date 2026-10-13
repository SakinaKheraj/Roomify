export type ProjectVisibility = "private" | "public";

export interface Project {
    id: string;
    name?: string | null;
    sourceImage: string;
    sourcePath?: string | null;
    renderedImage?: string | null;
    renderedPath?: string | null;
    publicPath?: string | null;
    timestamp: number;
    ownerId?: string | null;
    sharedBy?: string | null;
    sharedAt?: string | null;
    isPublic?: boolean;
}

export type DesignItem = Project;

export interface CreateProjectParams {
    item: Project;
    visibility?: ProjectVisibility;
}

export interface GetProjectByIdParams {
    id: string;
}

export interface UpdateVisibilityParams {
    id: string;
    visibility: ProjectVisibility;
}

export interface UpdateProjectParams {
    id: string;
    updates: Partial<Omit<Project, "id">>;
}

export interface DeleteProjectParams {
    id: string;
}

export interface GetUserProjectsParams {
    userId?: string | null;
}
