interface AuthState {
    isSignedIn: boolean;
    userName: string | null;
    userId: string | null;
}

interface Material {
    id: string;
    name: string;
    thumbnail: string;
    type: "color" | "texture";
    category: "floor" | "wall" | "furniture";
}

// ── Feature 1 types ──────────────────────────────────────────────────────────
type RoomStyleId =
  | "modern-minimalist"
  | "scandinavian"
  | "industrial-loft"
  | "cozy-rustic"
  | "mediterranean";

interface RoomStyle {
  id: RoomStyleId;
  label: string;
  emoji: string;
  promptSuffix: string;
}

// ── Feature 4 types ──────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface DesignItem {
    id: string;
    name?: string | null;
    sourceImage: string;
    sourcePath?: string | null;
    renderedImage?: string | null;
    renderedPath?: string | null;
    publicPath?: string | null;
    timestamp: number;
    ownerId?: string | null;
    sharedBy?: string | null;
    sharedAt?: string | null;
    isPublic?: boolean;
    // Feature 1 — persisted style choice
    style?: RoomStyle | null;
    // Feature 4 — persisted chat history
    chatHistory?: ChatMessage[];
}

interface DesignConfig {
    floor: string;
    walls: string;
    style: string;
}

enum AppStatus {
    IDLE = "IDLE",
    UPLOADING = "UPLOADING",
    PROCESSING = "PROCESSING",
    READY = "READY",
}

type RenderCompletePayload = {
    renderedImage: string;
    renderedPath?: string;
};

type VisualizerLocationState = {
    initialImage?: string;
    initialRender?: string | null;
    ownerId?: string | null;
    name?: string | null;
    sharedBy?: string | null;
};

interface VisualizerProps {
    onBack: () => void;
    initialImage: string | null;
    onRenderComplete?: (payload: RenderCompletePayload) => void;
    onShare?: (image: string) => Promise<void> | void;
    onUnshare?: (image: string) => Promise<void> | void;
    projectName?: string;
    projectId?: string;
    initialRender?: string | null;
    isPublic?: boolean;
    sharedBy?: string | null;
    canUnshare?: boolean;
}

interface UploadProps {
    onComplete: (base64File: string) => Promise<boolean | void> | boolean | void;
    className?: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
}

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

type AuthContext = {
    isSignedIn: boolean;
    userName: string | null;
    userId: string | null;
    refreshAuth: () => Promise<boolean>;
    signIn: () => Promise<boolean>;
    signOut: () => Promise<boolean>;
};

type AuthRequiredModalProps = {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
};

type ShareAction = "share" | "unshare";
type ShareStatus = "idle" | "saving" | "done";

type HostingConfig = { subdomain: string };
type HostedAsset = { url: string };

interface StoreHostedImageParams {
    hosting: HostingConfig | null;
    url: string;
    projectId: string;
    label: "source" | "rendered";
}

interface CreateProjectParams {
    item: DesignItem;
    visibility?: "private" | "public";
}

interface UpdateProjectParams {
    id: string;
    updates: Partial<Omit<DesignItem, "id">>;
}

interface DeleteProjectParams {
    id: string;
}

interface GetUserProjectsParams {
    userId?: string | null;
}

interface Generate3DViewParams {
    sourceImage?: string | null;   // floor plan (omit for text-to-3D)
    textPrompt?: string | null;    // text-to-3D description
    projectId?: string | null;
    style?: RoomStyle | null;      // vibe
    wants?: string[];              // chat refinement: what the user wants
    avoid?: string[];              // chat refinement: what the user does not want
}
