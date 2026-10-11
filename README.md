# Roomify 🏠✨
> **AI-Powered Architectural Visualization Platform**  
> *Transform 2D floor plans into photorealistic, top-down 3D architectural renders in seconds.*

[![React 19](https://img.shields.io/badge/React-19.2.4-blue.svg)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React_Router-v7.12.0-red.svg)](https://reactrouter.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.1.13-38B2AC.svg)](https://tailwindcss.com/)
[![Puter.js](https://img.shields.io/badge/Cloud-Puter.js-orange.svg)](https://puter.com/)
[![AI Model](https://img.shields.io/badge/AI-Gemini_2.5_Flash-purple.svg)](https://deepmind.google/technologies/gemini/)

---

## 📖 About Roomify

**Roomify** is a web-based architectural visualization platform that removes the high cost, complex software, and long turnaround times of traditional 3D rendering. 

Users can upload any **2D architectural floor plan** (PNG, JPG, or WebP) and instantly receive a **photorealistic top-down 3D render** complete with accurate wall extrusions, textures, daylighting, and furniture arrangements. An interactive before/after split slider allows designers, architects, and clients to verify structural alignment against the original blueprints.

### Key Highlights
- **Zero-Server Architecture:** Powered entirely by [Puter.js](https://puter.com). User authentication, cloud key-value database, and file hosting require no custom backend VMs or SQL databases.
- **AI-Powered Vision Pipeline:** Leverages Google Gemini 2.5 Flash via Puter's multimodal API to analyze blueprint lines, erase dimension text, and render realistic materials.
- **Interactive Inspection:** Built-in before/after comparison slider (`ReactCompareSlider`) to inspect room geometry side-by-side.
- **1-Click High-Res Export:** Download rendered visualizations as PNGs for presentations, client pitches, or portfolios.
- **Persistent Personal Workspace:** All renders are saved to Puter's cloud Key-Value store and displayed in a personal gallery.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [React 19](https://react.dev/) + [React Router v7](https://reactrouter.com/) | Modern component-driven routing and layout engine (framework mode). |
| **Build Tool** | [Vite 7](https://vitejs.dev/) | Fast build tool and local development server. |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict type-safety across models, components, and cloud actions. |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | High-performance styling via `@tailwindcss/vite` with custom design tokens. |
| **Cloud & Storage** | [Puter.js](https://puter.com/) | Client-side OAuth 2.0 authentication, Key-Value store, and CDN file hosting. |
| **AI Vision Engine** | [Gemini 2.5 Flash Image](https://deepmind.google/technologies/gemini/) | Multimodal image transformation via `puter.ai.txt2img`. |
| **UI Components** | Lucide React & `react-compare-slider` | Modern icon library and interactive split comparison slider. |
| **Containerization**| Docker | Multi-stage production container build. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Puter Account**: Free account at [puter.com](https://puter.com) (used for 1-click browser login)

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sakinakheraj/Roomify.git
   cd Roomify
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (Optional):**
   ```bash
   cp .env.example .env
   ```
   *(Note: Puter.js handles authentication and storage directly in the browser, so local development works without setting external API keys.)*

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**  
   Navigate to [http://localhost:5173](http://localhost:5173)

---

## 🖥️ How It Works (End-to-End Workflow)

```
[1. Upload Floor Plan] ──> [2. Save Draft in Puter KV] ──> [3. Navigate to Studio]
        │                                                           │
        ▼                                                           ▼
[6. Export / Gallery]  <── [5. Interactive Slider]  <── [4. Gemini 2.5 Flash Render]
```

1. **Sign In:** Click **"Sign In with Puter"** in the top navigation bar to authenticate with Puter OAuth.
2. **Upload:** Drag and drop a 2D floor plan image into the upload dropzone. The client converts the file into a Base64 data string.
3. **Redirect to Studio:** The app generates a project UUID, creates a draft in Puter KV, and navigates to `/visualizer/:id`.
4. **AI Generation:** The studio automatically calls `generate3DView()`, sending the plan and architectural prompt rules to Gemini 2.5 Flash.
5. **Compare & Inspect:** Once rendered, drag the interactive split slider left and right to inspect the 2D-to-3D transformation.
6. **Export:** Click **"Export"** to download the clean 3D render as a PNG file. Return home to view your saved project in **"Your Rendered Spaces"**.

---

## 📁 Project Directory Structure

```
roomify/
├── app/
│   ├── root.tsx                  # Root layout, Google Fonts, and global AuthContext
│   ├── routes.ts                 # Route definitions ("/" and "/visualizer/:id")
│   ├── app.css                   # Tailwind v4 theme tokens and custom CSS components
│   └── routes/
│       ├── home.tsx              # Landing page (Hero, Upload Dropzone, Project Gallery)
│       └── visualizer.$id.tsx    # Studio workspace (AI generation, Slider, Export)
│
├── components/
│   ├── Navbar.tsx                # Responsive top navigation with auth controls
│   ├── Upload.tsx                # Drag-and-drop floor plan ingestion component
│   ├── AuthGate.tsx              # Route protection component for signed-in actions
│   └── ui/
│       └── Button.tsx            # Modular button system (primary, ghost, outline)
│
├── lib/
│   ├── auth.ts                   # Puter.js authentication and session helpers
│   ├── kv.ts                     # Puter Key-Value database CRUD methods
│   ├── puter.action.ts           # Project creation, retrieval, and visibility actions
│   ├── ai.action.ts              # generate3DView() calling Gemini 2.5 Flash
│   ├── constants.ts              # System prompts, storage paths, timing constants
│   ├── puter.hosting.ts          # Subdomain CDN hosting integration (*.puter.site)
│   ├── puter.worker.js           # Serverless Puter REST worker routes
│   ├── utils.ts                  # Image parsing, blob, and URL utilities
│   └── models/
│       └── project.ts            # Project, visibility, and parameter TypeScript schemas
│
├── public/                       # Static public assets
├── type.d.ts                     # Ambient TypeScript interfaces
├── Dockerfile                    # Multi-stage production container build
├── package.json                  # Dependencies and build scripts
├── vite.config.ts                # Vite bundler configuration
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 👥 Team & Responsibilities

| Name | Role | Core Ownership |
| :--- | :--- | :--- |
| **Aayushi Shah** | Team Lead / Project Manager | Project scaffolding, routing table, sprint planning, and coordination. |
| **Maitry Parikh** | Auth & Application Shell | Puter auth wrapper, AuthGate, root layout (`root.tsx`), and landing page (`home.tsx`). |
| **Sakina Kharej** | Data Security & Media Hosting | Puter CDN hosting (`puter.hosting.ts`), image utilities, and Upload component. |
| **Priya Patel** | Backend & Cloud Infrastructure | Puter Key-Value database abstraction (`kv.ts`) and project CRUD actions. |
| **Khushi Pal** | Frontend Data Lead | Data models, schemas, and parameter TypeScript interfaces (`lib/models/project.ts`). |
| **Khushi Odedra** | UI/UX & Design System | Design tokens (`app.css`), Button UI, Navbar (`Navbar.tsx`), and visibility queries. |
| **Kalagi Pandya** | AI Integration Engineer | AI pipeline (`ai.action.ts`), architectural prompt engineering, and worker REST API. |
| **Zalak Thakkar** | QA & DevOps Lead | Docker configuration, test planning, CodeRabbit reviews, and QA audit. |

---

## 📚 Documentation & Guides

For in-depth explanations and code reviews, refer to the following repository guides:
- [Architecture & Full Project Documentation (`ROOMIFY_COMPLETE_DOCUMENTATION.md`)](./ROOMIFY_COMPLETE_DOCUMENTATION.md)
- [Step-by-Step Code Walkthrough (`CODE_WALKTHROUGH.md`)](./CODE_WALKTHROUGH.md)

---

## 🗺️ Roadmap

- [x] **Phase 1: Project Scaffolding & Design System** (React 19, Tailwind v4, Vite 7)
- [x] **Phase 2: Puter Cloud Infrastructure** (Auth, KV database, and media hosting)
- [x] **Phase 3: AI Rendering Pipeline** (Gemini 2.5 Flash 2D-to-3D transformation)
- [x] **Phase 4: Visualizer & Inspection Studio** (Before/after slider and 1-click export)
- [ ] **Phase 5: Community & Discovery** (Public feed, design search, and community sharing)
- [ ] **Phase 6: Automated Testing & Deployment** (Playwright test suite and Docker containerization)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).