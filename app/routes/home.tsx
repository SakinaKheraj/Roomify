import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { ArrowRight, Sparkles, Layers, Cpu, ShieldCheck } from "lucide-react";
import Upload from "../../components/Upload";
import Button from "../../components/ui/Button";
import { createProject, getProjects, persistImage } from "../../lib/api";
import { Wand2 } from "lucide-react";

const Home = () => {
    const navigate = useNavigate();
    const { isSignedIn, userId, signIn } = useOutletContext<AuthContext>();
    const [recentProjects, setRecentProjects] = useState<DesignItem[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [roomText, setRoomText] = useState("");

    useEffect(() => {
        if (!isSignedIn) {
            setRecentProjects([]);
            setIsLoadingProjects(false);
            return;
        }

        const fetchProjects = async () => {
            try {
                const list = await getProjects();
                setRecentProjects(list);
            } catch (e) {
                console.warn("Failed to load projects:", e);
            } finally {
                setIsLoadingProjects(false);
            }
        };

        fetchProjects();
    }, [isSignedIn]);

    const openProject = async (item: DesignItem) => {
        // Try to save to cloud (only if signed in)
        if (isSignedIn) {
            const saved = await createProject({ item, visibility: "private" });
            if (saved) item = { ...item, sourceImage: saved.sourceImage || item.sourceImage };
        }

        // Cache in sessionStorage for persistence across page refreshes
        try {
            sessionStorage.setItem(`roomify_project_${item.id}`, JSON.stringify(item));
        } catch {
            // Ignore storage limits
        }

        // Pass project via navigation state as a fallback when cloud save is unavailable
        navigate(`/visualizer/${item.id}`, { state: { project: item } });
    };

    const handleUploadComplete = async (base64Data: string) => {
        const id = crypto.randomUUID();
        // Upload the plan as a file so the database only stores a small URL
        const sourceImage = isSignedIn ? await persistImage(base64Data, id, "source") : base64Data;
        await openProject({
            id,
            name: `Project ${id.slice(0, 8)}`,
            sourceImage,
            timestamp: Date.now(),
            ownerId: userId || null,
            isPublic: false,
        });
    };

    // Text-to-3D: no floor plan needed. The description is kept in the project name.
    const handleTextToRoom = async () => {
        const text = roomText.trim();
        if (!text || !isSignedIn) return;
        const id = crypto.randomUUID();
        const blank =
            "data:image/svg+xml;utf8," +
            encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='white'/></svg>");
        await openProject({
            id,
            name: `Text: ${text.slice(0, 200)}`,
            sourceImage: blank,
            timestamp: Date.now(),
            ownerId: userId || null,
            isPublic: false,
        });
    };

    return (
        <div className="home">
            {/* Hero Section */}
            <section className="hero">
                <div className="announce">
                    <span className="dot">
                        <span className="pulse" />
                    </span>
                    <p>AI Architectural Visualization Platform</p>
                </div>

                <h1>Transform 2D Floor Plans into Photorealistic 3D Renders</h1>

                <p className="subtitle">
                    Upload your CAD or architectural floor plan and convert it into
                    realistic 3D perspectives in seconds using AI & Cloudflare.
                </p>

                <div className="actions">
                    {!isSignedIn ? (
                        <Button variant="primary" size="lg" onClick={signIn} className="cta">
                            Get Started Free <ArrowRight className="icon" />
                        </Button>
                    ) : (
                        <a href="#upload-section" className="cta">
                            Start Visualizing <Sparkles className="icon" />
                        </a>
                    )}
                </div>

                {/* Upload Shell */}
                <div id="upload-section" className="upload-shell">
                    <div className="grid-overlay" />
                    <div className="upload-card">
                        <div className="upload-head">
                            <div className="upload-icon">
                                <Sparkles className="icon" />
                            </div>
                            <h3>Upload Architectural Plan</h3>
                            <p>Support for PNG, JPG & WebP floor plan diagrams</p>
                        </div>

                        <Upload onComplete={handleUploadComplete} />

                        <div className="text-room">
                            <p>No floor plan? Describe a room and we will build it in 3D.</p>
                            <textarea
                                className="refine-input"
                                rows={2}
                                placeholder="e.g. a 12x14 ft living room with a grey sofa, big window and wooden floor"
                                value={roomText}
                                onChange={(e) => setRoomText(e.target.value)}
                            />
                            <Button size="sm" onClick={handleTextToRoom} disabled={!isSignedIn || !roomText.trim()}>
                                <Wand2 className="w-4 h-4 mr-2" /> {isSignedIn ? "Generate from text" : "Sign in to generate"}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Visualizations Section */}
            <section className="projects">
                <div className="section-inner">
                    <div className="section-head">
                        <div className="copy">
                            <h2>Your Rendered Spaces</h2>
                            <p>Browse previously generated 3D architectural transformations.</p>
                        </div>
                    </div>

                    {isLoadingProjects ? (
                        <div className="loading">Loading your design gallery...</div>
                    ) : recentProjects.length > 0 ? (
                        <div className="projects-grid">
                            {recentProjects.map((proj) => (
                                <div
                                    key={proj.id}
                                    className="project-card group"
                                    onClick={() => navigate(`/visualizer/${proj.id}`)}
                                >
                                    <div className="preview">
                                        <img
                                            src={proj.renderedImage || proj.sourceImage}
                                            alt={proj.name || "Floor plan"}
                                        />
                                        <div className="badge">
                                            <span>{proj.renderedImage ? "Rendered 3D" : "2D Original"}</span>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div>
                                            <h3>{proj.name || `Residence ${proj.id.slice(0, 6)}`}</h3>
                                            <div className="meta">
                                                <span>{new Date(proj.timestamp).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>{proj.isPublic ? "Public" : "Private"}</span>
                                            </div>
                                        </div>
                                        <div className="arrow">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="projects-grid">
                            <div className="empty">
                                No projects yet. Upload your first 2D floor plan above to generate an architectural render!
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Architecture Stack / Highlights */}
            <section className="partners">
                <div className="section-inner">
                    <div className="logos">
                        <div className="logo-item">
                            <Layers className="w-5 h-5 text-orange-500 mr-2" />
                            <span>React 19</span>
                        </div>
                        <div className="logo-item">
                            <Cpu className="w-5 h-5 text-blue-500 mr-2" />
                            <span>Gemini 2.5 Flash</span>
                        </div>
                        <div className="logo-item">
                            <ShieldCheck className="w-5 h-5 text-green-500 mr-2" />
                            <span>Cloudflare</span>
                        </div>
                        <div className="logo-item">
                            <Sparkles className="w-5 h-5 text-purple-500 mr-2" />
                            <span>Tailwind v4</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
