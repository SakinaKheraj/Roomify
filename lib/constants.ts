// Worker URL is read in lib/api.ts and lib/ai.action.ts via import.meta.env.VITE_WORKER_URL

// Storage Paths
export const STORAGE_PATHS = {
    ROOT: "roomify",
    SOURCES: "roomify/sources",
    RENDERS: "roomify/renders",
} as const;

// Timing Constants (in milliseconds)
export const SHARE_STATUS_RESET_DELAY_MS = 1500;
export const PROGRESS_INCREMENT = 15;
export const REDIRECT_DELAY_MS = 600;
export const PROGRESS_INTERVAL_MS = 100;
export const PROGRESS_STEP = 5;

// UI Constants
export const GRID_OVERLAY_SIZE = "60px 60px";
export const GRID_COLOR = "#3B82F6";

// HTTP Status Codes
export const UNAUTHORIZED_STATUSES = [401, 403];

// Image Dimensions
export const IMAGE_RENDER_DIMENSION = 1024;

export const ROOMIFY_RENDER_PROMPT = `
TASK: Convert the input 2D floor plan into a **photorealistic, top‑down 3D architectural render**.

STRICT REQUIREMENTS (do not violate):
1) **REMOVE ALL TEXT**: Do not render any letters, numbers, labels, dimensions, or annotations. Floors must be continuous where text used to be.
2) **GEOMETRY MUST MATCH**: Walls, rooms, doors, and windows must follow the exact lines and positions in the plan. Do not shift or resize.
3) **TOP‑DOWN ONLY**: Orthographic top‑down view. No perspective tilt.
4) **CLEAN, REALISTIC OUTPUT**: Crisp edges, balanced lighting, and realistic materials. No sketch/hand‑drawn look.
5) **NO EXTRA CONTENT**: Do not add rooms, furniture, or objects that are not clearly indicated by the plan.

STRUCTURE & DETAILS:
- **Walls**: Extrude precisely from the plan lines. Consistent wall height and thickness.
- **Doors**: Convert door swing arcs into open doors, aligned to the plan.
- **Windows**: Convert thin perimeter lines into realistic glass windows.

FURNITURE & ROOM MAPPING (only where icons/fixtures are clearly shown):
- Bed icon → realistic bed with duvet and pillows.
- Sofa icon → modern sectional or sofa.
- Dining table icon → table with chairs.
- Kitchen icon → counters with sink and stove.
- Bathroom icon → toilet, sink, and tub/shower.
- Office/study icon → desk, chair, and minimal shelving.
- Porch/patio/balcony icon → outdoor seating or simple furniture (keep minimal).
- Utility/laundry icon → washer/dryer and minimal cabinetry.

STYLE & LIGHTING:
- Lighting: bright, neutral daylight. High clarity and balanced contrast.
- Materials: realistic wood/tile floors, clean walls, subtle shadows.
- Finish: professional architectural visualization; no text, no watermarks, no logos.
`.trim();

// ── Feature 1 — Room Style Presets ──────────────────────────────────────────
export const ROOM_STYLES: RoomStyle[] = [
  {
    id: "modern-minimalist",
    label: "Modern Minimalist",
    emoji: "🏛️",
    promptSuffix:
      "STYLE DIRECTIVE: Apply a modern minimalist aesthetic — clean straight lines, neutral palette of whites, warm greys and light oak wood, uncluttered surfaces with deliberate negative space, recessed lighting, and sleek matte materials throughout.",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    emoji: "🌿",
    promptSuffix:
      "STYLE DIRECTIVE: Apply a Scandinavian hygge aesthetic — light birch and whitewashed wood, crisp white walls, cosy linen and wool textiles, soft diffused natural lighting, and functional minimalist furniture with gentle organic curves.",
  },
  {
    id: "industrial-loft",
    label: "Industrial Loft",
    emoji: "🖤",
    promptSuffix:
      "STYLE DIRECTIVE: Apply an industrial loft aesthetic — exposed brick walls, polished concrete floors, dark matte iron fixtures and structural beams, Edison-bulb pendant lighting, and raw metal accents contrasted with reclaimed wood surfaces.",
  },
  {
    id: "cozy-rustic",
    label: "Cozy Rustic",
    emoji: "🏡",
    promptSuffix:
      "STYLE DIRECTIVE: Apply a cosy rustic farmhouse aesthetic — warm chestnut wooden beams and plank floors, rough stone accent walls, earthy terracotta and sage tones, vintage lantern-style fixtures, and plaid and linen textiles.",
  },
  {
    id: "mediterranean",
    label: "Mediterranean",
    emoji: "🌊",
    promptSuffix:
      "STYLE DIRECTIVE: Apply a Mediterranean coastal aesthetic — hand-painted terracotta and encaustic floor tiles, whitewashed stucco walls, arched doorways and niches, mosaic tile accents, and a warm sunlit palette of cobalt blue, ochre, and terracotta.",
  },
];

// ── Short prompts ───────────────────────────────────────────────────────────
// Stable Diffusion only reads ~77 tokens, so long prompts are ignored/rejected.
export const RENDER_PROMPT_SHORT =
  "photorealistic top-down 3D architectural render of this floor plan, furnished rooms, realistic floors and walls, soft daylight, sharp, clean, no text, no labels";

export const TEXT_RENDER_PROMPT_SHORT =
  "photorealistic top-down isometric 3D render of a furnished room, realistic materials, soft daylight, sharp, clean, no text";

export const VIBE_SHORT_PROMPTS: Record<string, string> = {
  "modern-minimalist": "modern minimalist style, white and warm grey, light oak, clean lines",
  scandinavian: "scandinavian style, birch wood, white walls, cosy linen, soft natural light",
  "industrial-loft": "industrial loft style, exposed brick, concrete floor, dark iron, edison bulbs",
  "cozy-rustic": "cozy rustic style, wooden beams, plank floors, stone wall, terracotta and sage",
  mediterranean: "mediterranean style, terracotta tiles, whitewashed walls, arches, cobalt blue accents",
};
