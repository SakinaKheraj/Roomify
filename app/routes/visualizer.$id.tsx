import { useNavigate, useOutletContext, useParams, useLocation } from "react-router";
import {useEffect, useRef, useState} from "react";
import {generate3DView} from "../../lib/ai.action";
import {Box, Download, RefreshCcw, X, AlertCircle, Palette, Globe, Lock} from "lucide-react";
import Button from "../../components/ui/Button";
import StylePicker from "../../components/StylePicker";
import RefineChat from "../../components/RefineChat";
import ShopTheRoom from "../../components/ShopTheRoom";
import {createProject, getProjectById, persistImage, updateProjectVisibility} from "../../lib/api";
import {ReactCompareSlider, ReactCompareSliderImage} from "react-compare-slider";

const GENERATION_TIMEOUT_MS = 120_000; // 2 minutes
// Text-to-3D projects store their description in the project name: "Text: <description>"
const TEXT_PREFIX = "Text: ";

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
    // Feature 1 — style selector state
    const [selectedStyle, setSelectedStyle] = useState<RoomStyle | null>(null);
    // AI chat refinement state
    const [wants, setWants] = useState<string[]>([]);
    const [avoid, setAvoid] = useState<string[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [shareBusy, setShareBusy] = useState(false);

    const textPrompt = project?.name?.startsWith(TEXT_PREFIX) ? project.name.slice(TEXT_PREFIX.length) : null;

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

    const runGeneration = async (item: DesignItem, refine?: { wants: string[]; avoid: string[] }): Promise<boolean> => {
        if (!id || !item.sourceImage) return false;

        setError(null);
        setIsProcessing(true);

        // 2-minute timeout so spinner never hangs forever
        const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), GENERATION_TIMEOUT_MS)
        );

        try {
            const result = await Promise.race([
                generate3DView({
                    sourceImage: item.sourceImage,
                    textPrompt: item.name?.startsWith(TEXT_PREFIX) ? item.name.slice(TEXT_PREFIX.length) : null,
                    style: selectedStyle,
                    wants: refine?.wants ?? wants,
                    avoid: refine?.avoid ?? avoid,
                }),
                timeoutPromise,
            ]);

            if (!result) {
                setError('Generation timed out after 2 minutes. Make sure you are signed in and try again.');
                return false;
            }

            if (result.renderedImage) {
                setCurrentImage(result.renderedImage);

                // Store the image as a file (not inside the database row)
                const hostedRender = await persistImage(result.renderedImage, id, 'rendered');

                const updatedItem = {
                    ...item,
                    renderedImage: hostedRender,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                    style: selectedStyle,
                };

                // Keep the current public/private choice when re-rendering
                const saved = await createProject({
                    item: updatedItem,
                    visibility: updatedItem.isPublic ? "public" : "private",
                });
                const finalProject = saved || updatedItem;
                setProject(finalProject);
                setCurrentImage(finalProject.renderedImage || hostedRender);

                try {
                    sessionStorage.setItem(`roomify_project_${id}`, JSON.stringify(finalProject));
                } catch {
                    // Ignore storage quota limits
                }
                return true;
            } else {
                setError('AI returned no image. Make sure you are signed in and try again.');
            }
            return false;
        } catch (err) {
            console.error('Generation failed:', err);
            setError(
                `Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure you are signed in.`
            );
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Conversational render refinement loop: retains room geometry while applying wants/avoid directives
    const handleRefine = async (want: string, avoidText: string) => {
        if (!project) return;
        const nextWants = want ? [...wants, want] : wants;
        const nextAvoid = avoidText ? [...avoid, avoidText] : avoid;
        setWants(nextWants);
        setAvoid(nextAvoid);

        const userMsg = [want && `Want: ${want}`, avoidText && `Avoid: ${avoidText}`].filter(Boolean).join(" · ");
        const stamp = Date.now();
        setMessages((m) => [...m, { id: `u${stamp}`, role: "user", content: userMsg, timestamp: stamp }]);

        hasInitialGenerated.current = true;
        const ok = await runGeneration(project, { wants: nextWants, avoid: nextAvoid });
        setMessages((m) => [
            ...m,
            {
                id: `a${Date.now()}`,
                role: "assistant",
                content: ok ? "Done — render updated." : "Could not update the render. Try again.",
                timestamp: Date.now(),
            },
        ]);
    };

    // Publish / unpublish to the community feed
    const handleShareToggle = async () => {
        if (!project || !project.renderedImage) return;
        setShareBusy(true);
        const updated = await updateProjectVisibility(project.id, project.isPublic ? "private" : "public");
        if (updated) {
            setProject({ ...project, isPublic: updated.isPublic });
        } else {
            setError("Could not change visibility. Make sure you are signed in and the render is saved.");
        }
        setShareBusy(false);
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
            // Feature 1 — restore persisted style choice
            if (fetchedProject?.style) {
                setSelectedStyle(fetchedProject.style);
            }
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
                            <Button
                                size="sm"
                                onClick={handleShareToggle}
                                className="share"
                                disabled={!project?.renderedImage || shareBusy}
                            >
                                {project?.isPublic ? <Lock className="w-4 h-4 mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                                {project?.isPublic ? "Unpublish" : "Publish"}
                            </Button>
                        </div>
                    </div>

                    {/* Vibe picker */}
                    <StylePicker
                        selectedStyle={selectedStyle}
                        onSelect={(style) => {
                            setSelectedStyle(style);
                        }}
                        disabled={isProcessing}
                    />

                    {/* Re-render with new style button */}
                    {currentImage && (
                        <div className="style-rerender-bar">
                            <span className="style-rerender-hint">
                                <Palette className="w-3.5 h-3.5" />
                                {selectedStyle
                                    ? `Vibe: ${selectedStyle.emoji} ${selectedStyle.label}`
                                    : "No vibe selected — using default"}
                            </span>
                            <Button
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => {
                                    if (!project) return;
                                    setError(null);
                                    hasInitialGenerated.current = true;
                                    void runGeneration(project);
                                }}
                                className="rerender-btn"
                            >
                                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                                Re-render with vibe
                            </Button>
                        </div>
                    )}

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
                                                Sign In with Google
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
                        {!textPrompt && project?.sourceImage && currentImage ? (
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
                                {!textPrompt && project?.sourceImage && (
                                    <img src={project.sourceImage} alt="Before" className="compare-img" />
                                )}
                                {textPrompt && <p className="shop-note">Text-to-3D project: “{textPrompt}”</p>}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="tools-row">
                <RefineChat messages={messages} disabled={isProcessing || !currentImage} onSend={handleRefine} />
                <ShopTheRoom renderedImage={currentImage} styleId={selectedStyle?.id ?? null} />
            </section>
        </div>
    );
};

export default VisualizerId;
