# 🚀 DevScore Visualizer

> **GitHub Profile & Repo Analyzer** — A modern, developer-centric web application that analyzes any GitHub username or repository link, computes a dynamic **DevScore (0–100)** based on activity metrics, and renders customizable SVG/PNG cards for `README.md` profiles and social media sharing.

---

## 🌟 Key Features

- **📊 Dynamic DevScore Algorithm (0–100):** Evaluates commit frequency, PR activity, star ratio, and contribution streaks to assign a developer rating and grade badge (S+, A, B, C, D, E).
- **🏷️ Developer Persona Badges:** Automatically assigns unique badges based on coding patterns (e.g., *"PR Machine"*, *"Night Owl Coder"*, *"Bug Hunter"*).
- **🎨 Custom Card Renderer (`/api/card` & `/api/og`):** Generates embeddable, pixel-perfect SVG cards and PNG social images.
  - **Themes:** GitHub Dark, Dracula, Cyberpunk, Nord, One Dark.
  - **Toggles:** Show/hide language breakdown, DevScore, or persona badges.
- **📈 Interactive Dashboard:** Includes language percentage breakdown charts, commit clock activity, heatmaps, and repository stat breakdowns.
- **🛡️ Graceful Fallback & Security:** Handles GitHub API rate limits cleanly with automated fallback data payloads and full Base64 avatar encoding to prevent canvas clipping and broken images.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14+](https://nextjs.org/) (App Router, TypeScript)
- **UI & Styling:** [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), Lucide Icons, [Framer Motion](https://www.framer.com/motion/)
- **Charts & Visualization:** Recharts
- **Image & SVG Engine:** `@vercel/og` (Satori), Custom Server-side SVG Renderer
- **Data Fetching:** GitHub REST & GraphQL API ([Octokit](https://github.com/octokit/octokit.js))

---

## ⚡ Getting Started

Follow these steps to run the project locally on your machine.

### Prerequisites

- **Node.js:** 18.x or higher
- **npm** or **yarn** / **pnpm**

### 1. Clone the repository

```bash
git clone https://github.com/Egemino07/DevScore-Visualizer-GitHub-Profile-Repo-Analyzer.git
cd DevScore-Visualizer-GitHub-Profile-Repo-Analyzer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Optional: Higher API rate limit (5,000 req/hr) & GraphQL streak data
GITHUB_TOKEN=your_github_personal_access_token
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## 🔌 API Reference

The app provides dynamic endpoints for external integrations:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/analyze/[username]` | `GET` | Returns full computed DevScore analysis and raw metric JSON. |
| `/api/card/[username]` | `GET` | Returns a standalone, embeddable **SVG** card (`Content-Type: image/svg+xml`). |
| `/api/og/[username]` | `GET` | Returns a dynamic **PNG** social image (`Content-Type: image/png`). |

### Embed in your GitHub README

```markdown
![DevScore Card](https://devscore-visualizer.vercel.app/api/card/Egemino07?theme=dracula)
```

#### Query Parameters for `/api/card`:
- `theme`: `github-dark` | `dracula` | `cyberpunk` | `nord` | `one-dark` (Default: `github-dark`)
- `showDevScore`: `true` | `false`
- `showLanguages`: `true` | `false`

---

## 🧱 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── analyze/[username]/   # Analytics calculation API
│   │   ├── card/[username]/      # Dynamic SVG card renderer
│   │   └── og/[username]/        # OpenGraph PNG image renderer
│   ├── layout.tsx                # App root layout
│   └── page.tsx                  # Landing page & search interface
├── components/
│   ├── dashboard.tsx             # Results dashboard & metrics panel
│   ├── search-bar.tsx            # Username/repo search input
│   └── ui/                       # Shadcn UI components
├── lib/
│   ├── devscore.ts               # Scoring algorithm & persona calculation
│   ├── github-service.ts         # Octokit REST & GraphQL data fetcher
│   └── utils.ts                  # Shared helper functions
└── types/
    └── github.ts                 # TypeScript interfaces
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
