/**
 * lib/ai.action.ts
 * Talks to the Cloudflare Worker: render generation, Shop the Room.
 */
import {
    RENDER_PROMPT_SHORT,
    TEXT_RENDER_PROMPT_SHORT,
    VIBE_SHORT_PROMPTS,
} from './constants';
import { getAccessToken } from './auth';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined) ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────

export const fetchAsDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Shrinks an image to at most `max` px (sides rounded to a multiple of 8) on a
 * white background. The AI model fails on big images, so we always do this.
 */
export const shrinkImage = (dataUrl: string, max = 512): Promise<string> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const w = Math.max(64, Math.round((img.width * scale) / 8) * 8);
            const h = Math.max(64, Math.round((img.height * scale) / 8) * 8);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not supported'));
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Could not read the image'));
        img.src = dataUrl;
    });

const postToWorker = async <T>(path: string, body: unknown): Promise<T> => {
    if (!WORKER_URL) throw new Error('VITE_WORKER_URL is not configured in .env');
    const token = await getAccessToken();
    const res = await fetch(`${WORKER_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* not JSON */ }

    if (!res.ok) {
        throw new Error(data?.error || text || `Request failed (${res.status})`);
    }
    return data as T;
};

// ── Prompt builder (kept short on purpose) ────────────────────────────────────

const buildPrompt = ({ style, wants = [], avoid = [], textPrompt }: Generate3DViewParams) => {
    const parts: string[] = [];
    if (textPrompt) parts.push(textPrompt);
    // Latest 3 refinements first so they carry the most weight
    if (wants.length) parts.push(wants.slice(-3).join(', '));
    parts.push(textPrompt ? TEXT_RENDER_PROMPT_SHORT : RENDER_PROMPT_SHORT);
    if (style) parts.push(VIBE_SHORT_PROMPTS[style.id] ?? style.label);
    if (avoid.length) parts.push(`without ${avoid.slice(-3).join(', ')}`);
    return parts.join('. ');
};

// ── Render generation ─────────────────────────────────────────────────────────

export const generate3DView = async (params: Generate3DViewParams) => {
    const { sourceImage, textPrompt, avoid = [] } = params;

    let sourceImageBase64: string | undefined;
    if (!textPrompt && sourceImage) {
        const dataUrl = sourceImage.startsWith('data:') ? sourceImage : await fetchAsDataUrl(sourceImage);
        const small = await shrinkImage(dataUrl, 512);
        sourceImageBase64 = small.split(',')[1];
        if (!sourceImageBase64) throw new Error('Invalid source image payload');
    }
    if (!textPrompt && !sourceImageBase64) throw new Error('No floor plan or description to render');

    console.log('[Roomify] Requesting AI image generation...');
    const data = await postToWorker<{ renderedImage?: string; note?: string }>('/api/ai/generate', {
        sourceImageBase64,
        prompt: buildPrompt(params),
        negativePrompt: avoid.slice(-3).join(', '),
    });

    if (data.note) console.warn('[Roomify]', data.note);
    return { renderedImage: data.renderedImage ?? null, renderedPath: undefined, note: data.note };
};
