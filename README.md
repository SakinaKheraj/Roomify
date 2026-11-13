# Roomify 🏠✨
> **AI-Powered Architectural Visualization Platform**  
> *Transform 2D floor plans or text descriptions into photorealistic 3D architectural renders, refine with interactive AI chat, and budget with Shop the Room.*

[![React 19](https://img.shields.io/badge/React-19.2.4-blue.svg)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React_Router-v7.12.0-red.svg)](https://reactrouter.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.1.13-38B2AC.svg)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_%26_D1-F38020.svg)](https://workers.cloudflare.com/)
[![Supabase](https://img.shields.io/badge/Database_%26_Auth-Supabase-3ECF8E.svg)](https://supabase.com/)
[![Cloudflare Workers AI](https://img.shields.io/badge/AI-Workers_AI_(SD_img2img_%7C_FLUX)-purple.svg)](https://developers.cloudflare.com/workers-ai/)

---

## 📖 About Roomify

**Roomify** is a web-based architectural visualization platform designed to eliminate the high costs, complex 3D CAD modeling software, and long turnaround times of traditional architectural rendering. 

Users can upload any **2D architectural floor plan** (PNG, JPG, or WebP) or describe a room via **Text-to-3D** and receive a **photorealistic top-down 3D render** complete with accurate wall layouts, materials, lighting, and furniture arrangements. An interactive before/after split slider allows designers, architects, and clients to inspect structural alignment against the original blueprints.

### Key Highlights
- **Serverless Cloud Architecture:** Powered by **Cloudflare Workers** (Hono framework) for high-performance serverless API routing, **Cloudflare D1** (serverless SQLite) for project records, and **Supabase** for secure authentication and media storage.
- **Dual AI Vision Pipeline (Workers AI):**
  - **Plan-to-3D (img2img):** Runs `@cf/runwayml/stable-diffusion-v1-5-img2img` to preserve architectural wall layouts and spatial boundaries.
  - **Text-to-3D & Intelligent Fallback:** Utilizes `@cf/black-forest-labs/flux-1-schnell` to generate high-fidelity 3D spaces directly from natural text prompts or as an automatic fallback.
- **Refine with AI Chat:** Iteratively update renders by specifying preferences ("I want...", "I don't want...") without starting from scratch.
- **Shop the Room & Cost Estimator:** Uses multimodal vision (`@cf/llava-hf/llava-1.5-7b-hf`) to detect room furniture and decor, matches them to a tiered catalog, estimates total costs (INR), and offers budget swaps.
- **Interactive Inspection:** Built-in before/after comparison slider (`react-compare-slider`) to inspect room geometry side-by-side.
- **Secure Authentication & Permissions:** Supabase Auth (Google OAuth) with JWT verification, supporting private workspaces and public project sharing.
- **1-Click High-Res Export:** Download rendered visualizations as PNGs for presentations, client pitches, or portfolios.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [React Router v7](https://reactrouter.com/) | Component-driven routing, layouts, and hooks in framework mode. |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Zero-config styling via `@tailwindcss/vite` with custom architectural tokens. |
| **Backend API** | [Cloudflare Workers](https://workers.cloudflare.com/) + [Hono](https://hono.dev/) | Edge serverless API handling project CRUD, auth verification, and image processing. |
| **Database** | [Cloudflare D1](https://developers.cloudflare.com/d1/) | Serverless SQLite database for project metadata, styles, and owner records. |
| **Auth & Storage** | [Supabase](https://supabase.com/) | Supabase Auth (OAuth / session JWTs) and Supabase Storage for project image assets. |
| **AI Vision Engine** | [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) | Stable Diffusion v1.5 img2img, FLUX.1-schnell, and LLaVA-1.5-7B vision models. |
| **UI Components** | Lucide React & `react-compare-slider` | Modern icon library and interactive split comparison slider. |
| **Containerization**| Docker | Multi-stage production container build. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Cloudflare Account**: For Cloudflare Workers, D1 database, and Workers AI
- **Supabase Account**: For Supabase Auth and Storage buckets

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sakinakheraj/Roomify.git
   cd Roomify
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install worker dependencies:**
   ```bash
   cd worker
   npm install
   cd ..
   ```

4. **Configure environment variables:**
   Copy the example `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   Fill in your configuration details:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   VITE_WORKER_URL=https://roomify-worker.<your-subdomain>.workers.dev
   ```

5. **Configure Worker Secrets & D1:**
   In `worker/wrangler.toml`, ensure your `database_id` and `SUPABASE_URL` are configured.
   Add your Supabase Service Role Key to Cloudflare secrets:
   ```bash
   cd worker
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   cd ..
   ```

6. **Start local development:**
   Run the frontend development server:
   ```bash
   npm run dev
   ```
   *(Optional) Run the Cloudflare Worker locally:*
   ```bash
   cd worker && npm run dev
   ```

7. **Open your browser:**  
   Navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## 🖥️ How It Works (End-to-End Workflow)

```
[Upload Floor Plan OR Text Prompt] ──> [Save Project to D1] ──> [Navigate to Studio]
                     │                                                   │
                     ▼                                                   ▼
         [Shop the Room & Budget] <── [Refine with AI Chat] <── [Workers AI 3D Render]
                     │
                     ▼
        [Interactive Slider / Export]
```

1. **Authentication:** Sign in via Google OAuth powered by Supabase Auth.
2. **Input:**
   - **Upload Blueprint:** Drag and drop a 2D floor plan image.
   - **Text-to-3D:** Enter a descriptive prompt (e.g., "A modern sunlit living room with oak floors and minimalist sofa").
3. **Studio Workspace:** The app initializes a project record in D1, uploads media to Supabase Storage, and navigates to `/visualizer/:id`.
4. **AI Generation:** The studio calls `generate3DView()` via Cloudflare Workers AI:
   - Blueprint uploads use Stable Diffusion v1.5 img2img to preserve room structure.
   - Text prompts or complex plans automatically leverage FLUX.1-schnell.
5. **Interactive Slider & Style Picker:** Select architectural styles (Modern, Minimalist, Scandinavian, etc.) and inspect the result with the before/after slider.
6. **Refine with AI Chat:** Specify additions or exclusions to tune the render without losing context.
7. **Shop the Room:** Scan the space with LLaVA vision AI to detect furniture, calculate estimated costs in INR, and adjust for target budgets.
8. **Export & Share:** Download the high-res render or toggle visibility to share with the community.

---

## 📁 Project Directory Structure

```
roomify/
├── app/
│   ├── root.tsx                  # Root layout, Google Fonts, and global AuthContext
│   ├── routes.ts                 # Route definitions ("/", "/visualizer/:id", "/auth/callback")
│   ├── app.css                   # Tailwind v4 theme tokens and custom CSS components
│   └── routes/
│       ├── home.tsx              # Landing page (Hero, Upload Dropzone, Text-to-3D, Gallery)
│       ├── visualizer.$id.tsx    # Studio workspace (AI generation, Slider, Chat, Shop)
│       └── auth.callback.tsx     # OAuth callback handler for Supabase authentication
│
├── components/
│   ├── Navbar.tsx                # Responsive top navigation with auth controls
│   ├── Upload.tsx                # Drag-and-drop floor plan ingestion component
│   ├── AuthGate.tsx              # Route protection component for signed-in actions
│   ├── StylePicker.tsx           # Architectural style selector (Modern, Minimalist, etc.)
│   ├── RefineChat.tsx            # AI prompt refinement chat ("wants" / "avoid")
│   ├── ShopTheRoom.tsx           # Furniture detector, pricing summary, and budget swaps
│   └── ui/
│       └── Button.tsx            # Modular button system (primary, ghost, outline)
│
├── lib/
│   ├── api.ts                    # Cloudflare Worker API client for Project CRUD & media persistence
│   ├── auth.ts                   # Supabase authentication and session helpers
│   ├── ai.action.ts              # 3D view generation, image resizing, and Shop the Room calls
│   ├── constants.ts              # Architectural styles, render prompts, and defaults
│   ├── utils.ts                  # Image parsing, blob, and URL utilities
│   └── models/
│       └── project.ts            # Project and parameter TypeScript interfaces
│
├── worker/                       # Cloudflare Worker Backend
│   ├── src/
│   │   ├── index.ts              # Hono REST API (D1 queries, Supabase Storage, Workers AI)
│   │   └── catalog.ts            # Furniture catalog definitions, pricing tiers, and budget logic
│   ├── schema.sql                # D1 database schema
│   ├── wrangler.toml             # Cloudflare Worker configuration & D1 bindings
│   └── package.json              # Worker dependencies and scripts
│
├── public/                       # Static public assets
├── type.d.ts                     # Ambient TypeScript declarations
├── Dockerfile                    # Multi-stage production container build
├── package.json                  # Frontend dependencies and scripts
├── vite.config.ts                # Vite bundler configuration
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 👥 Team & Responsibilities

| Name | Role | Core Ownership |
| :--- | :--- | :--- |
| **Aayushi Shah** | Team Lead / Project Manager | Project scaffolding, routing table, sprint planning, and coordination. |
| **Maitry Parikh** | Auth & Application Shell | Supabase Auth wrapper, AuthGate, root layout (`root.tsx`), and landing page (`home.tsx`). |
| **Sakina Kharej** | Data Security & Media Hosting | Supabase Storage bucket integration, image utilities, and Upload component. |
| **Priya Patel** | Backend & Cloud Infrastructure | Cloudflare D1 database setup, schema design, and project CRUD actions. |
| **Khushi Pal** | Frontend Data Lead | Data models, schemas, and parameter TypeScript interfaces (`lib/models/project.ts`). |
| **Khushi Odedra** | UI/UX & Design System | Design tokens (`app.css`), Button UI, Navbar (`Navbar.tsx`), and visibility queries. |
| **Kalagi Pandya** | AI Integration Engineer | AI pipeline (`ai.action.ts`), Workers AI prompt engineering (SD img2img, FLUX, LLaVA), and worker REST API. |
| **Zalak Thakkar** | QA & DevOps Lead | Docker configuration, test planning, CodeRabbit reviews, and QA audit. |

---

## 🗺️ Roadmap

- [x] **Phase 1: Project Scaffolding & Design System** (React 19, Tailwind v4, Vite 7)
- [x] **Phase 2: Cloud & Auth Infrastructure** (Supabase Auth, Supabase Storage, Cloudflare D1)
- [x] **Phase 3: AI Rendering Pipeline** (Cloudflare Workers AI Stable Diffusion img2img & FLUX.1-schnell)
- [x] **Phase 4: Visualizer & Inspection Studio** (Before/after slider and 1-click export)
- [x] **Phase 5: Interactive Refinement & Shop the Room** (AI chat refinement and LLaVA-based budget estimator)
- [ ] **Phase 6: Automated Testing & Deployment** (Playwright test suite and Docker containerization)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
