import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_KEYS, buildShoppingList, matchCategories } from './catalog';

// ── Env bindings (declared in wrangler.toml) ──────────────────────────────────
type Env = {
    DB: D1Database;
    AI: Ai;                           // Cloudflare Workers AI
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
};

type Variables = {
    userId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(
    '*',
    cors({
        origin: (origin) => {
            // Allow localhost in dev + any subdomain of your production domain
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return origin ?? '*';
            }
            // TODO: tighten this to your production domain before go-live
            return origin;
        },
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        maxAge: 600,
    })
);

// ── Auth middleware ────────────────────────────────────────────────────────────
const auth = async (c: any, next: () => Promise<void>) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = header.slice(7);
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return c.json({ error: 'Unauthorized' }, 401);
    c.set('userId', user.id);
    await next();
};

// ── Helper: Supabase Storage client ───────────────────────────────────────────
const STORAGE_BUCKET = 'project-images';

function getSupabaseAdmin(env: Env) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

function getPublicImageUrl(env: Env, path: string): string {
    return `${env.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

// ── Helper: D1 row → DesignItem ───────────────────────────────────────────────
function rowToProject(row: Record<string, unknown>) {
    return {
        id: row['id'],
        name: row['name'] ?? null,
        ownerId: row['owner_id'],
        sourceImage: row['source_image_url'] ?? null,
        renderedImage: row['rendered_image_url'] ?? null,
        isPublic: row['is_public'] === 1,
        timestamp: row['timestamp'],
        sharedBy: row['shared_by'] ?? null,
        sharedAt: row['shared_at'] ?? null,
        style: row['style_id']
            ? {
                  id: row['style_id'],
                  label: row['style_label'],
                  emoji: row['style_emoji'],
                  promptSuffix: row['style_prompt_suffix'],
              }
            : null,
    };
}

// ── Projects: Save / Upsert ───────────────────────────────────────────────────
app.post('/api/projects/save', auth, async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json<{ project: Record<string, any>; visibility?: string }>();
    const { project, visibility = 'private' } = body;

    if (!project?.id || !project?.sourceImage) {
        return c.json({ error: 'Project ID and source image are required' }, 400);
    }

    const isPublic = visibility === 'public' ? 1 : 0;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
        `INSERT INTO projects
           (id, owner_id, name, source_image_url, rendered_image_url, is_public,
            style_id, style_label, style_emoji, style_prompt_suffix, timestamp, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           rendered_image_url  = excluded.rendered_image_url,
           is_public           = excluded.is_public,
           style_id            = excluded.style_id,
           style_label         = excluded.style_label,
           style_emoji         = excluded.style_emoji,
           style_prompt_suffix = excluded.style_prompt_suffix,
           updated_at          = excluded.updated_at`
    )
        .bind(
            project.id,
            userId,
            project.name ?? null,
            project.sourceImage ?? null,
            project.renderedImage ?? null,
            isPublic,
            project.style?.id ?? null,
            project.style?.label ?? null,
            project.style?.emoji ?? null,
            project.style?.promptSuffix ?? null,
            project.timestamp ?? Date.now(),
            now
        )
        .run();

    const saved = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?')
        .bind(project.id)
        .first<Record<string, unknown>>();

    return c.json({ saved: true, id: project.id, project: rowToProject(saved!) });
});

// ── Projects: List (current user) ─────────────────────────────────────────────
app.get('/api/projects/list', auth, async (c) => {
    const userId = c.get('userId');
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM projects WHERE owner_id = ? ORDER BY timestamp DESC'
    )
        .bind(userId)
        .all<Record<string, unknown>>();

    return c.json({ projects: results.map(rowToProject) });
});

// ── Projects: Get by ID ────────────────────────────────────────────────────────
app.get('/api/projects/get', auth, async (c) => {
    const userId = c.get('userId');
    const id = c.req.query('id');
    if (!id) return c.json({ error: 'Project ID is required' }, 400);

    const row = await c.env.DB.prepare(
        'SELECT * FROM projects WHERE id = ? AND owner_id = ?'
    )
        .bind(id, userId)
        .first<Record<string, unknown>>();

    if (!row) return c.json({ error: 'Project not found' }, 404);
    return c.json({ project: rowToProject(row) });
});

// ── Projects: Update ───────────────────────────────────────────────────────────
app.post('/api/projects/update', auth, async (c) => {
    const userId = c.get('userId');
    const { projectId, updates } = await c.req.json<{
        projectId: string;
        updates: Record<string, any>;
    }>();

    if (!projectId) return c.json({ error: 'Project ID is required' }, 400);

    const existing = await c.env.DB.prepare(
        'SELECT id FROM projects WHERE id = ? AND owner_id = ?'
    )
        .bind(projectId, userId)
        .first();

    if (!existing) return c.json({ error: 'Project not found' }, 404);

    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [new Date().toISOString()];

    if ('renderedImage' in updates) {
        setClauses.push('rendered_image_url = ?');
        values.push(updates['renderedImage']);
    }
    if ('name' in updates) {
        setClauses.push('name = ?');
        values.push(updates['name']);
    }
    if ('isPublic' in updates) {
        setClauses.push('is_public = ?');
        values.push(updates['isPublic'] ? 1 : 0);
    }
    if (updates['style']) {
        setClauses.push('style_id = ?, style_label = ?, style_emoji = ?, style_prompt_suffix = ?');
        values.push(
            updates['style'].id,
            updates['style'].label,
            updates['style'].emoji,
            updates['style'].promptSuffix
        );
    }

    values.push(projectId, userId);

    await c.env.DB.prepare(
        `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ? AND owner_id = ?`
    )
        .bind(...values)
        .run();

    const updated = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?')
        .bind(projectId)
        .first<Record<string, unknown>>();

    return c.json({ updated: true, project: rowToProject(updated!) });
});

// ── Projects: Delete ───────────────────────────────────────────────────────────
app.post('/api/projects/delete', auth, async (c) => {
    const userId = c.get('userId');
    const { projectId } = await c.req.json<{ projectId: string }>();
    if (!projectId) return c.json({ error: 'Project ID is required' }, 400);

    // Also delete images from Supabase Storage
    const supabaseAdmin = getSupabaseAdmin(c.env);
    const folder = `projects/${projectId}`;
    const { data: files } = await supabaseAdmin.storage.from(STORAGE_BUCKET).list(folder);
    if (files && files.length > 0) {
        const paths = files.map((f) => `${folder}/${f.name}`);
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(paths);
    }

    await c.env.DB.prepare('DELETE FROM projects WHERE id = ? AND owner_id = ?')
        .bind(projectId, userId)
        .run();

    return c.json({ deleted: true, id: projectId });
});

// ── Projects: Visibility ───────────────────────────────────────────────────────
app.post('/api/projects/visibility', auth, async (c) => {
    const userId = c.get('userId');
    const { projectId, visibility } = await c.req.json<{
        projectId: string;
        visibility: 'public' | 'private';
    }>();

    if (!projectId || !visibility) {
        return c.json({ error: 'Project ID and visibility are required' }, 400);
    }

    await c.env.DB.prepare(
        'UPDATE projects SET is_public = ?, updated_at = ? WHERE id = ? AND owner_id = ?'
    )
        .bind(visibility === 'public' ? 1 : 0, new Date().toISOString(), projectId, userId)
        .run();

    const updated = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?')
        .bind(projectId)
        .first<Record<string, unknown>>();

    return c.json({ success: true, project: rowToProject(updated!) });
});

// ── Community Feed (public — no auth) ─────────────────────────────────────────
app.get('/api/community/list', async (c) => {
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM projects WHERE is_public = 1 ORDER BY timestamp DESC LIMIT 100'
    ).all<Record<string, unknown>>();

    return c.json({ projects: results.map(rowToProject) });
});

// ── Images: Upload to Supabase Storage ────────────────────────────────────────
app.post('/api/images/upload', auth, async (c) => {
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const label = formData.get('label') as 'source' | 'rendered' | null;

    if (!file || !projectId || !label) {
        return c.json({ error: 'Missing file, projectId, or label' }, 400);
    }

    const ext =
        file.type === 'image/png'
            ? 'png'
            : file.type === 'image/webp'
              ? 'webp'
              : 'jpg';
    const key = `projects/${projectId}/${label}.${ext}`;

    const supabaseAdmin = getSupabaseAdmin(c.env);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(key, arrayBuffer, {
            contentType: file.type,
            upsert: true,
        });

    if (error) {
        console.error('Supabase Storage upload error:', error);
        return c.json({ error: 'Image upload failed' }, 500);
    }

    const url = getPublicImageUrl(c.env, key);
    return c.json({ url, key });
});

// ── AI helpers ────────────────────────────────────────────────────────────────
const NEGATIVE_PROMPT =
    'text, letters, numbers, labels, watermark, logo, blurry, low quality, sketch, hand-drawn, distorted, deformed';

function bytesToBase64(bytes: Uint8Array): string {
    let bin = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ── AI: Generate render via Cloudflare Workers AI ─────────────────────────────
// mode "image": floor plan → 3D render (img2img). Falls back to text-to-image.
// mode "text":  no floor plan, build a 3D room from the description only.
app.post('/api/ai/generate', auth, async (c) => {
    try {
        const body = await c.req.json<{
            sourceImageBase64?: string;
            prompt: string;
            negativePrompt?: string;
        }>();

        if (!body.prompt) return c.json({ error: 'Missing prompt' }, 400);

        const ai = c.env.AI as any;
        const prompt = body.prompt.slice(0, 1500);
        let image: string | null = null;
        let note: string | undefined;

        // 1) Preferred path: keep the floor-plan layout with img2img
        if (body.sourceImageBase64) {
            try {
                const out = await ai.run('@cf/runwayml/stable-diffusion-v1-5-img2img', {
                    prompt,
                    negative_prompt: [NEGATIVE_PROMPT, body.negativePrompt].filter(Boolean).join(', '),
                    image_b64: body.sourceImageBase64,
                    strength: 0.7,
                    num_steps: 20,
                    guidance: 7.5,
                });
                const bytes = new Uint8Array(await new Response(out as ReadableStream).arrayBuffer());
                if (bytes.length > 0) image = `data:image/png;base64,${bytesToBase64(bytes)}`;
            } catch (e) {
                console.error('img2img failed:', errMsg(e));
                note = `Floor-plan model failed (${errMsg(e)}); used text-to-image instead.`;
            }
        }

        // 2) Fallback / text-to-3D: FLUX text-to-image (returns JSON with base64 image)
        if (!image) {
            const out = await ai.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 4 });
            if (!out?.image) throw new Error('Image model returned no image');
            image = `data:image/jpeg;base64,${out.image}`;
        }

        return c.json({ renderedImage: image, note });
    } catch (e) {
        console.error('Generate failed:', errMsg(e));
        // Return the real reason instead of a bare "Internal Server Error"
        return c.json({ error: errMsg(e) }, 500);
    }
});

// ── Shop the Room: detect main items in a render ──────────────────────────────
app.post('/api/shop/detect', auth, async (c) => {
    let found: string[] = [];
    try {
        const { imageBase64 } = await c.req.json<{ imageBase64?: string }>();
        if (imageBase64) {
            const bytes = Uint8Array.from(atob(imageBase64), (ch) => ch.charCodeAt(0));
            const out = await (c.env.AI as any).run('@cf/llava-hf/llava-1.5-7b-hf', {
                image: Array.from(bytes),
                prompt: 'List the main furniture and decor items visible in this room, comma separated.',
                max_tokens: 100,
            });
            found = matchCategories(String(out?.description ?? out?.response ?? ''));
        }
    } catch (e) {
        // Vision model is optional — we fall back to the default item list.
        console.error('Item detection failed:', errMsg(e));
    }
    const keys = Array.from(new Set([...DEFAULT_KEYS, ...found]));
    return c.json({ items: keys, detected: found.length > 0 });
});

// ── Shop the Room: catalog match, total cost, budget-based cheaper options ────
app.post('/api/shop/suggest', auth, async (c) => {
    const { items, styleId, budget } = await c.req.json<{
        items?: string[];
        styleId?: string | null;
        budget?: number | null;
    }>();
    const keys = items && items.length ? items : DEFAULT_KEYS;
    return c.json(buildShoppingList(keys, styleId ?? null, budget ?? null));
});

// ── User projects (by userId) ─────────────────────────────────────────────────
app.get('/api/projects/user', auth, async (c) => {
    const authUserId = c.get('userId');
    const targetUserId = c.req.query('userId') ?? authUserId;

    const { results } = await c.env.DB.prepare(
        'SELECT * FROM projects WHERE owner_id = ? ORDER BY timestamp DESC'
    )
        .bind(targetUserId)
        .all<Record<string, unknown>>();

    return c.json({ projects: results.map(rowToProject) });
});

export default app;
