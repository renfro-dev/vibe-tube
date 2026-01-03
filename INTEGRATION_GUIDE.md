# VibeTube Integration Guide

## Objective
Integrate VibeTube into an existing React + Express site as a new tab/route, keeping the VibeTube backend separate.

## Source Repository
**VibeTube GitHub:** https://github.com/renfro-dev/vibe-tube.git

## Tech Stack Comparison

### VibeTube (Source)
- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL)
- YouTube Data API + Gemini AI

### Target Site
- React 18 + TypeScript
- Vite (build tool)
- Wouter (routing)
- Express backend
- Tailwind CSS + shadcn/ui (already installed)
- TanStack Query
- Framer Motion

## Integration Strategy

1. **Frontend:** Extract and adapt VibeTube components to work with Vite + React
2. **Backend:** Keep VibeTube Next.js API running separately (different port or deployed)
3. **API Communication:** Use environment variables to point to VibeTube API
4. **Routing:** Add VibeTube route in Wouter

---

## Step-by-Step Implementation

### 1. Install Required Dependencies

```bash
npm install react-youtube
```

**Note:** lucide-react and shadcn/ui components should already be installed in the target site.

### 2. Environment Variables Setup

Add to `.env` (or `.env.local`):

```bash
# VibeTube API URL
VITE_VIBETUBE_API_URL=http://localhost:3000
# For production: VITE_VIBETUBE_API_URL=https://vibetube-api.yourdomain.com
```

### 3. Extract VibeTube Components

Create the following directory structure in your main site:

```
src/
├── pages/
│   └── VibeTube.tsx           # Main VibeTube page
├── components/
│   └── vibetube/
│       └── YouTubePlayer.tsx  # Video player component
├── lib/
│   └── vibetube-api.ts        # API client for VibeTube
└── types/
    └── vibetube.ts            # TypeScript types
```

### 4. Create Type Definitions

**File:** `src/types/vibetube.ts`

```typescript
export interface Video {
  id: string;
  url: string;
  title: string;
  channel: string;
  durationSec: number;
  durationFormatted: string;
  thumbnail: string;
  group: string;
  sharedAt: string;
  vibe: string;
  reason?: string;
  tags?: string[];
  source?: string;
}

export interface Group {
  name: string;
  videoIds: string[];
  count: number;
}

export interface NewsletterData {
  videos: Video[];
  groups: Group[];
  metadata?: {
    emailsProcessed: number;
    uniqueVideos: number;
    lastUpdated: string;
    sources: string[];
    error?: string;
  };
}

export const VIBES = [
  { id: 'All', label: 'All Vibes' },
  { id: 'Vibe Coding', label: 'Vibe Coding' },
  { id: 'Model Upgrades', label: 'Model Upgrades' },
  { id: 'Robots', label: 'Robots' },
  { id: 'Hype', label: 'Hype' },
  { id: 'Sustainability', label: 'Sustainability' },
  { id: 'Security', label: 'Security' },
  { id: 'AI Fail', label: 'AI Fail' },
  { id: 'Human in the Loop', label: 'Human in the Loop' },
  { id: 'Random', label: 'Random' },
] as const;
```

### 5. Create API Client

**File:** `src/lib/vibetube-api.ts`

```typescript
const VIBETUBE_API_URL = import.meta.env.VITE_VIBETUBE_API_URL || 'http://localhost:3000';

export const vibetubeApi = {
  async getNewsletters() {
    const response = await fetch(`${VIBETUBE_API_URL}/api/newsletters`);
    if (!response.ok) throw new Error('Failed to fetch newsletters');
    return response.json();
  },

  async checkAuth() {
    const response = await fetch(`${VIBETUBE_API_URL}/api/auth/check`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Auth check failed');
    return response.json();
  },

  async login(password: string) {
    const response = await fetch(`${VIBETUBE_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password })
    });
    return response;
  },

  async recategorize(videoId: string, newVibe: string) {
    const response = await fetch(`${VIBETUBE_API_URL}/api/recategorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ videoId, newVibe })
    });
    if (!response.ok) throw new Error('Failed to recategorize');
    return response.json();
  },

  async deleteVideo(videoId: string) {
    const response = await fetch(`${VIBETUBE_API_URL}/api/videos/delete?id=${videoId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete video');
    return response.json();
  }
};
```

### 6. Create YouTube Player Component

**File:** `src/components/vibetube/YouTubePlayer.tsx`

**Instructions:** Copy the component from the VibeTube repo at `src/components/youtube-player.tsx` and adapt it:
- Keep the same structure
- Ensure imports work with your project structure
- The component should already be compatible since both use React + shadcn/ui

**Source location in VibeTube repo:** `src/components/youtube-player.tsx`

### 7. Create Main VibeTube Page

**File:** `src/pages/VibeTube.tsx`

**Instructions:**
1. Clone the VibeTube repository to reference: `git clone https://github.com/renfro-dev/vibe-tube.git`
2. Adapt `src/app/page.tsx` from VibeTube repo with these changes:
   - Remove `'use client'` directive (not needed in Vite)
   - Replace API calls with imports from `@/lib/vibetube-api`
   - Replace icon imports with the ones available in your project
   - Keep the same UI structure and logic
   - Use your existing shadcn/ui components

**Key adaptations:**
```typescript
// Instead of direct fetch calls:
const response = await fetch('/api/newsletters');

// Use the API client:
import { vibetubeApi } from '@/lib/vibetube-api';
const result = await vibetubeApi.getNewsletters();
```

### 8. Add Route to Your App

In your main app router (using Wouter):

```typescript
import { Route } from 'wouter';
import VibeTube from '@/pages/VibeTube';

// Add to your routes
<Route path="/vibetube" component={VibeTube} />

// Or if you want it in a tab layout:
<Route path="/app/vibetube" component={VibeTube} />
```

### 9. Add Navigation Link

Add a link to VibeTube in your navigation:

```typescript
<Link href="/vibetube">VibeTube</Link>
```

### 10. Setup VibeTube Backend

#### Option A: Run VibeTube API Locally (Development)

```bash
# In VibeTube directory
cd /path/to/vibetube
npm install
cp .env.local.example .env.local
# Configure environment variables (Supabase, YouTube API, Gemini API)
npm run dev
# This runs on http://localhost:3000
```

#### Option B: Deploy VibeTube API Separately (Production)

Deploy VibeTube Next.js app to Vercel/Railway/etc., then update:
```bash
VITE_VIBETUBE_API_URL=https://your-vibetube-api.vercel.app
```

### 11. Handle CORS (if needed)

If running VibeTube API separately, ensure CORS is enabled in VibeTube's Next.js config:

**File:** `vibetube/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.ALLOWED_ORIGIN || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
};
```

---

## Files to Reference from VibeTube Repo

| VibeTube Source | Target Destination | Notes |
|----------------|-------------------|-------|
| `src/app/page.tsx` | `src/pages/VibeTube.tsx` | Adapt to remove Next.js specifics |
| `src/components/youtube-player.tsx` | `src/components/vibetube/YouTubePlayer.tsx` | Should work as-is |
| `src/components/ui/*` | Already in target site | No copy needed |
| `src/lib/utils.ts` | Already in target site | No copy needed |

---

## Testing Checklist

- [ ] VibeTube backend is running (locally or deployed)
- [ ] Environment variable `VITE_VIBETUBE_API_URL` is set correctly
- [ ] VibeTube route is accessible (e.g., `/vibetube`)
- [ ] Videos load and display correctly
- [ ] Video player opens and plays videos
- [ ] Vibe filters work
- [ ] Week selector works
- [ ] Admin login works (if needed)
- [ ] Recategorization works (if admin)
- [ ] No console errors related to CORS or API calls

---

## Optional: Express Proxy Setup

If you prefer to proxy VibeTube API through your Express backend instead of direct calls:

**In your Express server:**

```typescript
import { createProxyMiddleware } from 'http-proxy-middleware';

app.use('/api/vibetube', createProxyMiddleware({
  target: process.env.VIBETUBE_API_URL || 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/vibetube': '/api'
  }
}));
```

**Then update API client:**

```typescript
// src/lib/vibetube-api.ts
const VIBETUBE_API_URL = '/api/vibetube'; // Now proxied through your backend
```

---

## Summary

This integration keeps VibeTube as a separate microservice while embedding its UI into your main site. The VibeTube Next.js API continues to handle all business logic, database access, and AI features, while your React app simply consumes the API and displays the UI.

**Key Points:**
- VibeTube backend remains unchanged (Next.js + Supabase)
- Frontend components are adapted to work with Vite + React
- API calls go to separate VibeTube service via env variable
- Styling is compatible (both use Tailwind + shadcn/ui)
- Authentication works via cookies (credentials: 'include')

---

## Quick Start Command for Claude/Cursor

```
I need to integrate VibeTube into my React + Vite site as a new tab.

VibeTube repo: https://github.com/renfro-dev/vibe-tube.git

Please follow the integration guide at INTEGRATION_GUIDE.md in the VibeTube repo to:
1. Extract and adapt VibeTube components for my React + Vite setup
2. Create an API client that points to the VibeTube backend via VITE_VIBETUBE_API_URL
3. Add a /vibetube route
4. Ensure all components work with my existing shadcn/ui setup

The VibeTube backend will run separately. My site uses Wouter for routing and TanStack Query for data fetching.
```
