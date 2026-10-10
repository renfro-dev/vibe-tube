# VibeTube

A YouTube feed built from your AI newsletters. VibeTube scans a Gmail inbox for newsletters such as The Neuron, AI Breakfast, and TLDR, pulls out the YouTube videos they recommend, sorts each one into a topic, and shows them in a distraction-free player.

## How it works

1. **Scan:** the Gmail API reads recent emails from a list of newsletter senders.
2. **Extract:** YouTube links are parsed out of each email and validated.
3. **Enrich:** the YouTube Data API adds title, channel, duration, and thumbnails.
4. **Classify:** keyword scoring plus Gemini assigns each video a "vibe": Vibe Coding, Model Upgrades, Robots, Hype, Human in the Loop, Sustainability, Security, AI Fail, or Random.
5. **Store and serve:** videos are saved to Supabase and shown in a filterable feed with an embedded player.

A GitHub Actions workflow calls the update endpoint every Monday at 01:00 UTC, so the feed refreshes without anyone opening the app.

## Tech stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS 4, Radix UI, Lucide icons
- Supabase (Postgres)
- Gmail API, YouTube Data API v3, Gemini

## Run it locally

Requires Node.js 18+, a Supabase project, and a Google Cloud project with the Gmail API and YouTube Data API v3 enabled.

```bash
git clone https://github.com/renfro-dev/vibe-tube.git
cd vibe-tube
npm install
```

Create the `videos` table by running [`schema.sql`](schema.sql) in the Supabase SQL editor, then add a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth (Gmail)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# YouTube metadata and Gemini classification
YOUTUBE_API_KEY=
GOOGLE_API_KEY=

# Protects the admin actions and the cron endpoint
ADMIN_PASSWORD=
CRON_SECRET=
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/app/page.tsx                    Feed and player UI
src/app/api/newsletters/            Gmail fetch and parse
src/app/api/cron/update-videos/     Scheduled refresh endpoint
src/app/api/recategorize/           Re-run classification on stored videos
src/lib/gmail.ts                    Gmail integration and email parsing
src/lib/youtube.ts                  YouTube metadata
src/lib/classifier.ts               Topic classification
src/lib/supabase.ts                 Database client
.github/workflows/update-videos.yml Weekly refresh
```

## More docs

- [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md): configuring the weekly refresh
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md): embedding the feed in another site
- [docs/PRD.md](docs/PRD.md): product requirements

## Status

Personal project. The feed also runs inside [renfro.dev/vibetube](https://renfro.dev/vibetube).
