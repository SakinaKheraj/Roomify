/**
 * Shop the Room — small curated sample catalog (prices in INR).
 * Every category has 3 tiers. "standard" is the default pick; when the user
 * sets a budget we step the biggest items down to "budget" until it fits.
 */

export type Tier = 'budget' | 'standard' | 'premium';
const TIERS: Tier[] = ['budget', 'standard', 'premium'];

type CategoryDef = {
    key: string;
    label: string;
    emoji: string;
    keywords: string[]; // used to match the AI's description of the render
    base: Record<Tier, { name: string; price: number }>;
};

export const CATEGORIES: CategoryDef[] = [
    {
        key: 'sofa', label: 'Sofa', emoji: '🛋️', keywords: ['sofa', 'couch', 'sectional'],
        base: {
            budget: { name: '2-Seater Sofa', price: 14999 },
            standard: { name: '3-Seater Sofa', price: 32999 },
            premium: { name: 'L-Shape Sectional Sofa', price: 74999 },
        },
    },
    {
        key: 'rug', label: 'Rug', emoji: '🟫', keywords: ['rug', 'carpet'],
        base: {
            budget: { name: 'Flat-Weave Rug 5x7', price: 2499 },
            standard: { name: 'Woven Rug 6x9', price: 6999 },
            premium: { name: 'Hand-Knotted Rug 8x10', price: 24999 },
        },
    },
    {
        key: 'lighting', label: 'Lighting', emoji: '💡', keywords: ['lamp', 'light', 'chandelier', 'pendant'],
        base: {
            budget: { name: 'Table Lamp', price: 1299 },
            standard: { name: 'Pendant Light', price: 4499 },
            premium: { name: 'Designer Chandelier', price: 18999 },
        },
    },
    {
        key: 'flooring', label: 'Flooring', emoji: '🪵', keywords: ['floor', 'tile', 'wood', 'parquet'],
        base: {
            budget: { name: 'Vinyl Plank Flooring (per room)', price: 18000 },
            standard: { name: 'Laminate Flooring (per room)', price: 36000 },
            premium: { name: 'Engineered Wood Flooring (per room)', price: 85000 },
        },
    },
    {
        key: 'bed', label: 'Bed', emoji: '🛏️', keywords: ['bed', 'mattress', 'pillow'],
        base: {
            budget: { name: 'Queen Bed Frame', price: 12999 },
            standard: { name: 'Queen Bed with Storage', price: 28999 },
            premium: { name: 'King Upholstered Bed', price: 59999 },
        },
    },
    {
        key: 'dining', label: 'Dining Set', emoji: '🍽️', keywords: ['dining', 'table', 'chairs'],
        base: {
            budget: { name: '4-Seater Dining Set', price: 15999 },
            standard: { name: '6-Seater Dining Set', price: 38999 },
            premium: { name: '8-Seater Solid Wood Dining Set', price: 89999 },
        },
    },
    {
        key: 'plant', label: 'Plants & Decor', emoji: '🪴', keywords: ['plant', 'vase', 'decor'],
        base: {
            budget: { name: 'Faux Plant Set', price: 899 },
            standard: { name: 'Large Indoor Plant + Planter', price: 2499 },
            premium: { name: 'Designer Planter Collection', price: 7999 },
        },
    },
];

// Always offered, even if the AI could not describe the render.
export const DEFAULT_KEYS = ['sofa', 'rug', 'lighting', 'flooring'];

// Material prefix per vibe so the catalog "feels" matched to the chosen style.
const VIBE_PREFIX: Record<string, string> = {
    'modern-minimalist': 'Matte',
    scandinavian: 'Birch',
    'industrial-loft': 'Iron & Walnut',
    'cozy-rustic': 'Reclaimed Oak',
    mediterranean: 'Terracotta',
};

/** Turn free text ("a grey sofa and a lamp") into catalog category keys. */
export function matchCategories(text: string): string[] {
    const t = text.toLowerCase();
    return CATEGORIES.filter((c) => c.keywords.some((k) => t.includes(k))).map((c) => c.key);
}

export type ShopItem = {
    category: string;
    label: string;
    emoji: string;
    name: string;
    price: number;
    tier: Tier;
};

export type ShopResult = {
    items: ShopItem[];
    total: number;
    budget: number | null;
    withinBudget: boolean;
    swaps: { category: string; from: string; to: string; saved: number }[];
};

function pick(cat: CategoryDef, tier: Tier, styleId?: string | null): ShopItem {
    const entry = cat.base[tier];
    const prefix = styleId ? VIBE_PREFIX[styleId] : undefined;
    return {
        category: cat.key,
        label: cat.label,
        emoji: cat.emoji,
        name: prefix ? `${prefix} ${entry.name}` : entry.name,
        price: entry.price,
        tier,
    };
}

export function buildShoppingList(keys: string[], styleId: string | null, budget: number | null): ShopResult {
    const cats = keys
        .map((k) => CATEGORIES.find((c) => c.key === k))
        .filter((c): c is CategoryDef => !!c);

    let items = cats.map((c) => pick(c, 'standard', styleId));
    const sum = () => items.reduce((s, i) => s + i.price, 0);
    const swaps: ShopResult['swaps'] = [];

    if (budget && budget > 0) {
        // Keep stepping down the item that saves the most until we fit the budget.
        while (sum() > budget) {
            let best = -1;
            let bestSaving = 0;
            items.forEach((item, idx) => {
                const tierIdx = TIERS.indexOf(item.tier);
                if (tierIdx === 0) return;
                const cat = cats[idx];
                const saving = item.price - cat.base[TIERS[tierIdx - 1]].price;
                if (saving > bestSaving) {
                    bestSaving = saving;
                    best = idx;
                }
            });
            if (best === -1) break; // nothing cheaper left
            const before = items[best];
            const after = pick(cats[best], TIERS[TIERS.indexOf(before.tier) - 1], styleId);
            swaps.push({ category: before.label, from: before.name, to: after.name, saved: before.price - after.price });
            items = items.map((it, i) => (i === best ? after : it));
        }
    }

    const total = sum();
    return {
        items,
        total,
        budget: budget && budget > 0 ? budget : null,
        withinBudget: !budget || total <= budget,
        swaps,
    };
}
