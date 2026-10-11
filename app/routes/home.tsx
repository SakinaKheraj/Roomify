import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { ArrowRight, Sparkles, Layers, Cpu, ShieldCheck } from "lucide-react";
import Upload from "../../components/Upload";
import Button from "../../components/ui/Button";
import { createProject, getProjects } from "../../lib/puter.action";

const Home = () => {
    const navigate = useNavigate();
    const { isSignedIn, userId, signIn } = useOutletContext<AuthContext>();
    const [recentProjects, setRecentProjects] = useState<DesignItem[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    useEffect(() => {
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

    const handleUploadComplete = async (base64Data: string) => {
        const id = crypto.randomUUID();
        const newItem: DesignItem = {
            id,
            name: `Project ${id.slice(0, 8)}`,
            sourceImage: base64Data,
            timestamp: Date.now(),
            ownerId: userId || null,
            isPublic: false,
        };

        await createProject({ item: newItem, visibility: "private" });
        navigate(`/visualizer/${id}`);
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
                    realistic 3D perspectives in seconds using Gemini & Puter Cloud.
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
                            <span>Puter.js Cloud</span>
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
