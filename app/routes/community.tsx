import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getCommunityProjects } from "../../lib/api";

/** Public feed of renders that users chose to publish. */
const Community = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<DesignItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCommunityProjects()
            .then((list) => setPosts(list.filter((p) => p.renderedImage)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="community">
            <h1>Community</h1>
            <p className="community-sub">Renders published by Roomify users.</p>

            {loading ? (
                <p className="shop-note">Loading the feed…</p>
            ) : posts.length === 0 ? (
                <p className="shop-note">
                    Nothing published yet. Open one of your renders and press <b>Publish</b>.
                </p>
            ) : (
                <div className="community-grid">
                    {posts.map((p) => (
                        <article key={p.id} className="community-card">
                            <img src={p.renderedImage as string} alt={p.name || "Render"} />
                            <div>
                                <h3>{p.name?.startsWith("Text: ") ? p.name.slice(6) : p.name || "Untitled"}</h3>
                                <small>
                                    {p.style ? `${p.style.emoji} ${p.style.label} · ` : ""}
                                    {new Date(p.timestamp).toLocaleDateString()}
                                </small>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <button className="community-back" onClick={() => navigate("/")}>← Back home</button>
        </div>
    );
};

export default Community;
