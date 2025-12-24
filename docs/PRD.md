VibeTube PRD
4. Core Features (MVP)
4.1 Input

Textarea for multiple lines of text/URLs
Regex filter → extract only YouTube IDs (v= param or youtu.be)
Deduplicate IDs
Minimum 10 videos for meaningful organization

4.2 Processing

Batching:

Group IDs into chunks of 50 (YouTube API max)
One call = 1 quota unit for up to 50 videos


Caching:

Cache results in local JSON file (sample.json)
Primary data source during demos to avoid quota issues
If API fails → immediate fallback to cached data



4.3 Metadata
Use videos.list only (1 unit per request). Fetch fields:

id, title, channelTitle, duration, thumbnails

4.4 Organization (Simplified "Vibes")
Option A: Duration-based (Recommended for MVP)

Short (< 5 min)
Medium (5-15 min)
Long (15+ min)

Option B: Channel-based

Group by channel name
Only show if 2+ videos from same channel

4.5 Output (UI)

Clean grid of video cards: thumbnail, title, channel, duration chip
Click card → modal with YouTube iframe player
Simple filter tabs for organization
Loading skeleton during fetch

5. Stretch Features (If Time Permits)

ML Clustering (Hour 5-6 only if core is done):

OpenAI embeddings on title + channelTitle
K-means clustering into 3-4 groups
Auto-generate cluster names with GPT-3.5


Export URL list (copy-to-clipboard)
Shareable link with video IDs in querystring

6. Non-Goals

YouTube search functionality
Hover video previews (too complex)
Playlist creation via YouTube API
Authentication/OAuth
Mobile optimization
Bulletproof error handling

7. Technical Architecture
7.1 Frontend

Next.js App Router (TypeScript)
Tailwind + shadcn/ui
YouTube iframe API for modal player only

7.2 API Route
/api/ingest

Input: { urls: string[] }
Flow:

Extract YouTube IDs via regex
Check cache for existing data
Batch new IDs → call videos.list
Update cache
Organize by duration/channel
Return { videos: Video[], groups: Group[] }



7.3 Data Shapes
typescripttype Video = {
  id: string;
  url: string;
  title: string;
  channel: string;
  durationSec: number;
  durationFormatted: string; // "3:45"
  thumbnail: string; // medium or high res
  group?: string;
};

type Group = {
  name: string;
  videoIds: string[];
  count: number;
};
8. Demo Script (90 seconds)

Pre-load with cached dataset of 20-30 videos
Paste 15 YouTube links from different channels
Click Organize → loading state → organized grid appears
Show duration/channel grouping tabs
Click video → modal with working playback
(If time) Show export button → copy URLs

9. Timeline (6 Hours)
Pre-Hackathon Setup (Do Thursday)

Scaffold Next.js + dependencies
Create sample.json with 30 diverse videos
Test YouTube iframe player component

Hackathon Day

Hour 0-1: Input UI + regex extraction + deduplication
Hour 1-3: YouTube API integration + batching + caching logic
Hour 3-4: Grid UI + video cards + basic filtering
Hour 4-5: Modal player + polish loading states
Hour 5-5.5: Test with multiple datasets + fix bugs
Hour 5.5-6: Prep demo + ensure cache fallback works

10. Risks & Mitigations
Critical Risks

YouTube Quota (500 units/day):

Cache aggressively
Demo from cache only
Have backup demo.json ready


YouTube Player Issues:

Test iframe implementation early (Hour 3)
Fallback: link out to YouTube if player fails


Time Crunch:

Core loop must work by Hour 4
Skip ML features if behind schedule
Polish can be minimal - focus on functionality



Medium Risks

API Keys:

Use environment variables
Have backup keys ready
Don't commit keys to repo


CORS/CSP:

YouTube thumbnails generally work
Test iframe embedding early
Have fallback thumbnail URLs



Low Risks

ML Clustering Quality:

Only attempt if core is solid
Random grouping as fallback
Not critical for demo success



11. Success Criteria
✅ Can paste YouTube URLs and see organized videos
✅ Can play at least one video in modal
✅ Clean, responsive UI that doesn't break
✅ Demo runs entirely from cache (no live API calls)
✅ 90-second demo tells clear story
12. Code Snippets to Have Ready
typescript// YouTube ID Regex
const extractYouTubeId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Duration formatter
const formatDuration = (iso8601: string): string => {
  // PT3M45S → "3:45"
  // Have this ready to go
};