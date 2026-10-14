const PROJECT_PREFIX = 'roomify_project_';

const jsonError = (status, message, extra = {}) => {
    return new Response(JSON.stringify({  error: message, ...extra }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

const getUserId = async (userPuter) => {
    try {
        const user = await userPuter.auth.getUser();

        return user?.uuid || null;
    } catch {
        return null;
    }
}

router.post('/api/projects/save', async ({ request, user }) => {
    try {
        const userPuter = user.puter;

        if(!userPuter) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const project = body?.project;

        if(!project?.id || !project?.sourceImage) return jsonError(400, 'Project ID and source image are required');

        const payload = {
            ...project,
            updatedAt: new Date().toISOString(),
        }

        const userId = await getUserId(userPuter);
        if(!userId) return jsonError(401, 'Authentication failed');

        const key = `${PROJECT_PREFIX}${project.id}`;
        await userPuter.kv.set(key, payload);

        return { saved: true, id: project.id, project: payload }
    } catch (e) {
        return jsonError(500, 'Failed to save project', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/list', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const projects = (await userPuter.kv.list(PROJECT_PREFIX, true))
            .map(({value}) => ({ ...value, isPublic: true }))

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list projects', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/get', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${id}`;
        const project = await userPuter.kv.get(key);

        if (!project) return jsonError(404, 'Project not found');

        return { project };
    } catch (e) {
        return jsonError(500, 'Failed to get project', { message: e.message || 'Unknown error' });
    }
})

router.post('/api/projects/update', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const projectId = body?.projectId || body?.id;
        const updates = body?.updates || {};

        if (!projectId) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${projectId}`;
        const existing = await userPuter.kv.get(key);
        if (!existing) return jsonError(404, 'Project not found');

        const updatedProject = {
            ...existing,
            ...updates,
            id: projectId,
            updatedAt: new Date().toISOString(),
        };

        await userPuter.kv.set(key, updatedProject);

        return { updated: true, id: projectId, project: updatedProject };
    } catch (e) {
        return jsonError(500, 'Failed to update project', { message: e.message || 'Unknown error' });
    }
})

router.post('/api/projects/delete', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const projectId = body?.projectId || body?.id;

        if (!projectId) return jsonError(400, 'Project ID is required');

        const key = `${PROJECT_PREFIX}${projectId}`;
        await userPuter.kv.del(key);

        return { deleted: true, id: projectId };
    } catch (e) {
        return jsonError(500, 'Failed to delete project', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/projects/user', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const authUserId = await getUserId(userPuter);
        if (!authUserId) return jsonError(401, 'Authentication failed');

        const url = new URL(request.url);
        const targetUserId = url.searchParams.get('userId') || authUserId;

        const allEntries = await userPuter.kv.list(PROJECT_PREFIX, true);
        const projects = (allEntries || [])
            .map(({ value }) => value)
            .filter((p) => p && (!targetUserId || p.ownerId === targetUserId))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to query user projects', { message: e.message || 'Unknown error' });
    }
})

router.post('/api/projects/visibility', async ({ request, user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const userId = await getUserId(userPuter);
        if (!userId) return jsonError(401, 'Authentication failed');

        const body = await request.json();
        const { projectId, visibility } = body || {};

        if (!projectId || !visibility) return jsonError(400, 'Project ID and visibility are required');

        const key = `${PROJECT_PREFIX}${projectId}`;
        const existing = await userPuter.kv.get(key);
        if (!existing) return jsonError(404, 'Project not found');

        const updatedProject = {
            ...existing,
            isPublic: visibility === 'public',
            updatedAt: new Date().toISOString(),
        };

        await userPuter.kv.set(key, updatedProject);

        return { success: true, project: updatedProject };
    } catch (e) {
        return jsonError(500, 'Failed to update visibility', { message: e.message || 'Unknown error' });
    }
})

router.get('/api/community/list', async ({ user }) => {
    try {
        const userPuter = user.puter;
        if (!userPuter) return jsonError(401, 'Authentication failed');

        const allEntries = await userPuter.kv.list(PROJECT_PREFIX, true);
        const projects = (allEntries || [])
            .map(({ value }) => value)
            .filter((p) => p && p.isPublic);

        return { projects };
    } catch (e) {
        return jsonError(500, 'Failed to list community projects', { message: e.message || 'Unknown error' });
    }
})

