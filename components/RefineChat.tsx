import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import Button from "./ui/Button";

type Props = {
    messages: ChatMessage[];
    disabled: boolean;
    onSend: (want: string, avoid: string) => void;
};

/** Simple "tell me what you want / don't want" box that re-renders the image. */
const RefineChat = ({ messages, disabled, onSend }: Props) => {
    const [want, setWant] = useState("");
    const [avoid, setAvoid] = useState("");

    const submit = () => {
        if (!want.trim() && !avoid.trim()) return;
        onSend(want.trim(), avoid.trim());
        setWant("");
        setAvoid("");
    };

    return (
        <div className="refine-box">
            <div className="refine-title">
                <MessageSquare className="w-3.5 h-3.5" /> Refine with AI chat
            </div>

            {messages.length > 0 && (
                <div className="refine-log">
                    {messages.map((m) => (
                        <div key={m.id} className={`refine-msg ${m.role}`}>
                            {m.content}
                        </div>
                    ))}
                </div>
            )}

            <input
                className="refine-input"
                placeholder="I want… (e.g. a green sofa, wooden floor)"
                value={want}
                disabled={disabled}
                onChange={(e) => setWant(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <input
                className="refine-input"
                placeholder="I don't want… (e.g. dark colours, clutter)"
                value={avoid}
                disabled={disabled}
                onChange={(e) => setAvoid(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button size="sm" onClick={submit} disabled={disabled || (!want.trim() && !avoid.trim())}>
                <Send className="w-3.5 h-3.5 mr-1.5" /> Update render
            </Button>
        </div>
    );
};

export default RefineChat;
