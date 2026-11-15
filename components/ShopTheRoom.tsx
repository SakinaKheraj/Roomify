import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import Button from "./ui/Button";
import { detectRoomItems, suggestShopping, type ShopResult } from "../lib/ai.action";

type Props = {
    renderedImage: string | null;
    styleId: string | null;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Finds main items, matches them to the sample catalog, shows total + budget options. */
const ShopTheRoom = ({ renderedImage, styleId }: Props) => {
    const [keys, setKeys] = useState<string[] | null>(null);
    const [result, setResult] = useState<ShopResult | null>(null);
    const [budget, setBudget] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async (budgetValue: number | null) => {
        if (!renderedImage) return;
        setLoading(true);
        setError(null);
        try {
            const itemKeys = keys ?? (await detectRoomItems(renderedImage));
            setKeys(itemKeys);
            setResult(await suggestShopping(itemKeys, styleId, budgetValue));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const budgetNumber = Number(budget.replace(/[^0-9]/g, "")) || null;

    return (
        <div className="shop-box">
            <div className="refine-title">
                <ShoppingBag className="w-3.5 h-3.5" /> Shop the Room
            </div>

            {!result && (
                <Button size="sm" onClick={() => run(null)} disabled={!renderedImage || loading}>
                    {loading ? "Finding items…" : "Find items in this room"}
                </Button>
            )}

            {error && <p className="shop-error">{error}</p>}

            {result && (
                <>
                    <ul className="shop-list">
                        {result.items.map((it) => (
                            <li key={it.category}>
                                <span>{it.emoji}</span>
                                <div className="shop-name">
                                    <strong>{it.name}</strong>
                                    <small>{it.label} · {it.tier}</small>
                                </div>
                                <span className="shop-price">{inr(it.price)}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="shop-total">
                        <span>Rough total</span>
                        <strong>{inr(result.total)}</strong>
                    </div>

                    <div className="shop-budget">
                        <input
                            className="refine-input"
                            inputMode="numeric"
                            placeholder="Your budget in ₹ (e.g. 60000)"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                        />
                        <Button size="sm" onClick={() => run(budgetNumber)} disabled={loading || !budgetNumber}>
                            {loading ? "…" : "Apply budget"}
                        </Button>
                    </div>

                    {result.budget && !result.withinBudget && (
                        <p className="shop-error">
                            Even the cheapest options total {inr(result.total)}, above your {inr(result.budget)} budget.
                        </p>
                    )}
                    {result.budget && result.withinBudget && result.swaps.length > 0 && (
                        <div className="shop-swaps">
                            <p>Cheaper alternatives chosen to fit {inr(result.budget)}:</p>
                            <ul>
                                {result.swaps.map((s, i) => (
                                    <li key={i}>
                                        {s.category}: {s.from} → {s.to} (saves {inr(s.saved)})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="shop-note">Sample catalog prices — for estimation only.</p>
                </>
            )}
        </div>
    );
};

export default ShopTheRoom;
