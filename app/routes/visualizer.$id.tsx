import { useNavigate, useOutletContext, useParams, useLocation } from "react-router";
import {useEffect, useRef, useState} from "react";
import {generate3DView} from "../../lib/ai.action";
import {Box, Download, RefreshCcw, Share2, X, AlertCircle} from "lucide-react";
import Button from "../../components/ui/Button";
import {createProject, getProjectById} from "../../lib/puter.action";
import {ReactCompareSlider, ReactCompareSliderImage} from "react-compare-slider";

const GENERATION_TIMEOUT_MS = 120_000; // 2 minutes

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { userId, isSignedIn, signIn } = useOutletContext<AuthContext>();

    const hasInitialGenerated = useRef(false);

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleBack = () => navigate('/');

    const handleExport = () => {
        if (!currentImage) return;
        const link = document.createElement('a');
        link.href = currentImage;
        link.download = `roomify-${id || 'design'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const runGeneration = async (item: DesignItem) => {
        if (!id || !item.sourceImage) return;

        setError(null);
        setIsProcessing(true);

        // 2-minute timeout so spinner never hangs forever
        const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), GENERATION_TIMEOUT_MS)
        );

        try {
            const result = await Promise.race([
                generate3DView({ sourceImage: item.sourceImage }),
                timeoutPromise,
            ]);

            if (!result) {
                setError('Generation timed out after 2 minutes. Make sure you are signed in to Puter and try again.');
                return;
            }

            if (result.renderedImage) {
                setCurrentImage(result.renderedImage);

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                };

                const saved = await createProject({ item: updatedItem, visibility: "private" });
                const finalProject = saved || updatedItem;
                setProject(finalProject);
                setCurrentImage(finalProject.renderedImage || result.renderedImage);

                try {
                    sessionStorage.setItem(`roomify_project_${id}`, JSON.stringify(finalProject));
                } catch {
                    // Ignore storage quota limits
                }
            } else {
                setError('AI returned no image. Make sure you are signed in to Puter and try again.');
            }
        } catch (err) {
            console.error('Generation failed:', err);
            setError(
                `Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure you are signed in to Puter.`
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRetry = () => {
        if (!project) return;
        setError(null);
        hasInitialGenerated.current = true;
        void runGeneration(project);
    };

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);

            // Try cloud first; fall back to navigation state when no Worker URL
            let fetchedProject = await getProjectById({ id });

            if (!fetchedProject && location.state?.project?.id === id) {
                fetchedProject = location.state.project as DesignItem;
            }

            // Fallback to sessionStorage in case of page reload
            if (!fetchedProject) {
                try {
                    const cached = sessionStorage.getItem(`roomify_project_${id}`);
                    if (cached) {
                        fetchedProject = JSON.parse(cached) as DesignItem;
                    }
                } catch {
                    // Ignore
                }
            }

            if (!isMounted) return;

            setProject(fetchedProject);
            setCurrentImage(fetchedProject?.renderedImage || null);
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        loadProject();
        return () => { isMounted = false; };
    }, [id]);

    useEffect(() => {
        if (isProjectLoading || hasInitialGenerated.current || !project?.sourceImage) return;

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />
                    <span className="name">Roomify</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                    <X className="icon" /> Exit Editor
                </Button>
            </nav>

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                            <p className="note">Created by You</p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage}
                            >
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                            <Button size="sm" onClick={() => {}} className="share">
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? 'is-processing' : ''}`}>
                        {currentImage ? (
                            <img src={currentImage} alt="AI Render" className="render-img" />
                        ) : (
                            <div className="render-placeholder">
                                {project?.sourceImage && (
                                    <img src={project.sourceImage} alt="Original" className="render-fallback" />
                                )}
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">Rendering...</span>
                                    <span className="subtitle">Generating your 3D visualization (up to 2 min)</span>
                                </div>
                            </div>
                        )}

                        {error && !isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card" style={{ gap: '12px' }}>
                                    <AlertCircle style={{ color: '#f87171', width: 32, height: 32 }} />
                                    <span className="title" style={{ color: '#f87171' }}>Generation Failed</span>
                                    <span className="subtitle" style={{ maxWidth: 300, textAlign: 'center' }}>{error}</span>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: 8 }}>
                                        {!isSignedIn && (
                                            <Button size="sm" onClick={signIn} variant="primary">
                                                Sign In with Puter
                                            </Button>
                                        )}
                                        <Button size="sm" onClick={handleRetry} variant={!isSignedIn ? "ghost" : "primary"}>
                                            <RefreshCcw className="w-4 h-4 mr-2" /> Retry
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Comparison</p>
                            <h3>Before and After</h3>
                        </div>
                        <div className="hint">Drag to compare</div>
                    </div>

                    <div className="compare-stage">
                        {project?.sourceImage && currentImage ? (
                            <ReactCompareSlider
                                defaultValue={50}
                                style={{ width: '100%', height: 'auto' }}
                                itemOne={
                                    <ReactCompareSliderImage src={project.sourceImage} alt="before" className="compare-img" />
                                }
                                itemTwo={
                                    <ReactCompareSliderImage src={currentImage || project.renderedImage || ""} alt="after" className="compare-img" />
                                }
                            />
                        ) : (
                            <div className="compare-fallback">
                                {project?.sourceImage && (
                                    <img src={project.sourceImage} alt="Before" className="compare-img" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VisualizerId;
