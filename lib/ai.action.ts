import puter from "@heyputer/puter.js";
import {ROOMIFY_RENDER_PROMPT} from "./constants";

export const fetchAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
    const dataUrl = sourceImage.startsWith('data:')
        ? sourceImage
        : await fetchAsDataUrl(sourceImage);

    const base64Data = dataUrl.split(',')[1];
    const mimeType = dataUrl.split(';')[0].split(':')[1];

    if (!mimeType || !base64Data) throw new Error('Invalid source image payload');

    // List of models to try in order.
    // Note: 'gemini-2.5-flash-image-preview' was deprecated and shut down in early 2026.
    // The active models are 'gemini-3-pro-image-preview' / 'nano-banana-pro' and 'gemini-3.1-flash-image'.
    const modelCandidates: Array<Record<string, any>> = [
        { provider: "gemini", model: "gemini-3-pro-image-preview" },
        { model: "nano-banana-pro" },
        { provider: "gemini", model: "gemini-3.1-flash-image" },
        {}, // Puter default model fallback
    ];

    let response: any = null;
    let lastError: any = null;

    for (const candidate of modelCandidates) {
        try {
            console.log('[Roomify] Requesting AI image generation with options:', candidate);
            response = await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
                ...candidate,
                input_image: base64Data,
                input_image_mime_type: mimeType,
                ratio: { w: 1024, h: 1024 },
            });
            if (response) {
                console.log('[Roomify] Image generation succeeded with candidate:', candidate);
                break;
            }
        } catch (err) {
            console.warn('[Roomify] Image generation failed with candidate:', candidate, err);
            lastError = err;
        }
    }

    if (!response && lastError) {
        throw lastError;
    }

    // Puter can return an HTMLImageElement or a string/object containing the URL
    let rawImageUrl: string | null = null;
    if (typeof response === 'string') {
        rawImageUrl = response;
    } else if (response && typeof response === 'object') {
        rawImageUrl = (response as HTMLImageElement).src || (response as any).url || null;
    }

    if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

    let renderedImage = rawImageUrl;
    if (!rawImageUrl.startsWith('data:')) {
        try {
            renderedImage = await fetchAsDataUrl(rawImageUrl);
        } catch (fetchErr) {
            console.warn('[Roomify] fetchAsDataUrl failed (likely CORS), using raw URL directly:', fetchErr);
            renderedImage = rawImageUrl;
        }
    }

    return { renderedImage, renderedPath: undefined };
};
