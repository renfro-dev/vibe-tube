import { NextResponse } from 'next/server';
import { fetchNewsletterEmails } from '@/lib/gmail';
import { fetchVideoMetadata, formatDuration, fetchTranscript } from '@/lib/youtube';
import { classifyVideoAgent } from '@/lib/classifier';
import { supabase } from '@/lib/supabase';

export interface Video {
  id: string;
  url: string;
  title: string;
  channel: string;
  channelId?: string;
  durationSec: number;
  durationFormatted: string;
  thumbnail: string;
  group: string; // "Week of..."
  sharedAt: string;
  vibe: string; // New: "Vibe Coding", "Robots", etc.
  reason?: string; // New: Why was it classified this way?
  source?: string;
  description?: string;
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
  publishedAt?: string;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
  liveBroadcastContent?: string;
  thumbnails?: {
    default: string;
    medium: string;
    high: string;
    standard?: string;
    maxres?: string;
  };
  transcript?: string | null;
}

export interface Group {
  name: string;
  videoIds: string[];
  count: number;
  startDate: string;
}

function extractYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\s?]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

export async function GET() {
  try {
    // 1. Loading Cache from Supabase (Smart Optimization)
    let dbVideos: any[] = [];
    try {
      const { data, error } = await supabase.from('videos').select('*');
      if (error) throw error;
      dbVideos = data || [];
      console.log(`Loaded ${dbVideos.length} videos from Supabase.`);
    } catch (error) {
      console.log('Error loading from Supabase, starting fresh cache:', error);
    }

    // 1.5 Repair Incomplete Videos (Self-Healing)
    const incompleteVideos = dbVideos.filter((v: any) =>
      !v.metadata?.durationSec || v.metadata.durationSec === 0 ||
      v.title.startsWith('AI Video') ||
      v.channel === 'Unknown Channel'
    );

    if (incompleteVideos.length > 0) {
      const idsToFix = incompleteVideos.map((v: any) => v.id);
      console.log(`Self-healing: Refreshing metadata for ${idsToFix.length} incomplete videos...`);
      const fixedData = await fetchVideoMetadata(idsToFix);

      const updates: any[] = [];
      fixedData.forEach(newMeta => {
        const idx = dbVideos.findIndex(v => v.id === newMeta.id);
        if (idx !== -1) {
          // Update in-memory
          dbVideos[idx].title = newMeta.title;
          dbVideos[idx].description = newMeta.description;
          dbVideos[idx].channel = newMeta.channelTitle;
          dbVideos[idx].published_at = newMeta.publishedAt;
          dbVideos[idx].metadata = {
            ...dbVideos[idx].metadata,
            durationSec: newMeta.durationSec,
            formattedDuration: formatDuration(newMeta.durationSec),
            thumbnails: newMeta.thumbnails,
            channelId: newMeta.channelId,
            tags: newMeta.tags,
            viewCount: newMeta.viewCount,
            likeCount: newMeta.likeCount
          };
          updates.push(dbVideos[idx]);
        }
      });

      if (updates.length > 0) {
        await supabase.from('videos').upsert(updates, { onConflict: 'id' });
        console.log(`Healed ${updates.length} videos.`);
      }
    }

    // 2. Build maps for optimization
    const existingClassifications = new Map<string, { vibe: string; reason: string }>();
    const allKnownVideoIds = new Set<string>();

    dbVideos.forEach((v: any) => {
      if (v.id) {
        allKnownVideoIds.add(v.id);
        if (v.vibe) {
          existingClassifications.set(v.id, { vibe: v.vibe, reason: v.reason || '' });
        }
      }
    });

    // Transform DB videos back to UI format
    const allVideosFromSupabase: Video[] = dbVideos.map((v: any) => {
      const weekStart = getWeekStartDate(new Date(v.shared_at));
      return {
        id: v.id,
        url: v.url,
        title: v.title,
        channel: v.channel,
        durationSec: v.metadata?.durationSec || 0,
        durationFormatted: v.metadata?.formattedDuration || '0:00',
        thumbnail: v.metadata?.thumbnails?.medium?.url || v.metadata?.thumbnails?.default?.url || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        group: weekStart,
        sharedAt: v.shared_at,
        vibe: v.vibe,
        reason: v.reason,
        source: v.source,
        description: v.description,
        viewCount: v.metadata?.viewCount,
        likeCount: v.metadata?.likeCount,
        publishedAt: v.published_at,
        tags: v.metadata?.tags,
        transcript: v.metadata?.transcript
      };
    });

    try {
      let emails: any[] = [];
      const now = new Date();
      // Only fetch last 12 week for testing cost/speed
      const weeksToFetch = 12;

      console.log(`Starting batched fetch for ${weeksToFetch} weeks...`);

      for (let i = 0; i < weeksToFetch; i++) {
        const toDate = new Date(now);
        toDate.setDate(now.getDate() - (i * 7));

        const fromDate = new Date(toDate);
        fromDate.setDate(toDate.getDate() - 7);

        try {
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          const batchEmails = await fetchNewsletterEmails(fromDate, toDate);
          emails = [...emails, ...batchEmails];
        } catch (err) {
          console.error(`  -> Error fetching batch ${i + 1}:`, err);
        }
      }

      console.log(`Total emails found: ${emails.length}`);

      // Extract all YouTube URLs logic
      const newUrls: { url: string; source: string; date: Date }[] = [];
      const newSeenIds = new Set<string>(); // Tracks new IDs found in emails for this run

      emails.forEach(email => {
        email.youtubeUrls.forEach((url: string) => {
          const id = extractYouTubeId(url);
          // Only add to newUrls if it's not already known from Supabase AND not already added in this run
          if (id && !allKnownVideoIds.has(id) && !newSeenIds.has(id)) {
            newSeenIds.add(id);
            newUrls.push({
              url,
              source: email.sender,
              date: email.date
            });
          }
        });
      });

      console.log(`Found ${newUrls.length} unique NEW videos from emails`);

      const allVideoIdsToFetchMetadata = newUrls.map(item => extractYouTubeId(item.url)).filter(Boolean) as string[];

      let newVideos: Video[] = [];

      if (allVideoIdsToFetchMetadata.length > 0) {
        console.log(`Fetching metadata for ${allVideoIdsToFetchMetadata.length} NEW videos...`);
        const youtubeData = await fetchVideoMetadata(allVideoIdsToFetchMetadata);

        // Use Promise.all to handle async classification concurrently
        const videoPromises = newUrls.map(async (item) => {
          const id = extractYouTubeId(item.url);
          if (!id) return null;

          const ytData = youtubeData.find(yt => yt.id === id);
          const weekStart = getWeekStartDate(new Date(item.date));

          if (ytData) {
            let vibe = 'Random';
            let reason = 'Auto-classified';
            let transcript: string | null = null;

            // SMART CHECK (Redundant mostly due to `allKnownVideoIds` check but good safety)
            const cached = existingClassifications.get(id);

            if (cached) {
              vibe = cached.vibe;
              reason = cached.reason;
              // If cached, we probably don't have transcript yet if this is a backfill, but for now we assume we do or don't.
              // To enable "Summary of Week" later, we might need to backfill transcripts for everything.
              // For new videos:
            } else {
              // BURN TOKENS (New or unclassified)
              console.log(`[Transcript] Fetching for: "${ytData.title.slice(0, 30)}..."`);
              transcript = await fetchTranscript(id);

              console.log(`[Agent] Classifying: "${ytData.title.slice(0, 30)}..."`);
              const classification = await classifyVideoAgent(
                ytData.title,
                ytData.description,
                ytData.tags,
                transcript
              );
              vibe = classification.category;
              reason = classification.reason;
            }

            return {
              id,
              url: item.url,
              title: ytData.title,
              channel: ytData.channelTitle,
              channelId: ytData.channelId,
              durationSec: ytData.durationSec,
              durationFormatted: formatDuration(ytData.durationSec),
              thumbnail: ytData.thumbnail,
              group: weekStart,
              sharedAt: item.date instanceof Date ? item.date.toISOString() : new Date(item.date).toISOString(),
              vibe,
              reason,
              source: item.source,
              description: ytData.description,
              viewCount: ytData.viewCount,
              likeCount: ytData.likeCount,
              commentCount: ytData.commentCount,
              publishedAt: ytData.publishedAt,
              tags: ytData.tags,
              categoryId: ytData.categoryId,
              defaultLanguage: ytData.defaultLanguage,
              liveBroadcastContent: ytData.liveBroadcastContent,
              thumbnails: ytData.thumbnails,
              transcript: transcript // Pass it through
            };
          } else {
            return {
              id,
              url: item.url,
              title: `AI Video ${id}`,
              channel: 'Unknown Channel',
              durationSec: 300,
              durationFormatted: '5:00',
              thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
              group: weekStart,
              sharedAt: item.date instanceof Date ? item.date.toISOString() : new Date(item.date).toISOString(),
              vibe: 'Random',
              reason: 'Metadata check failed',
              source: item.source,
              tags: []
            };
          }
        });

        newVideos = (await Promise.all(videoPromises)).filter(Boolean) as Video[];

        // Upsert to Supabase
        const records = newVideos.map(v => ({
          id: v.id,
          title: v.title,
          description: v.description || '',
          channel: v.channel,
          url: v.url,
          published_at: v.publishedAt ? new Date(v.publishedAt).toISOString() : null,
          shared_at: v.sharedAt,
          vibe: v.vibe,
          reason: v.reason,
          source: v.source,
          metadata: {
            channelId: v.channelId,
            thumbnails: v.thumbnails,
            tags: v.tags,
            durationSec: v.durationSec,
            viewCount: v.viewCount,
            likeCount: v.likeCount,
            commentCount: v.commentCount,
            categoryId: v.categoryId,
            defaultLanguage: v.defaultLanguage,
            liveBroadcastContent: v.liveBroadcastContent,
            formattedDuration: v.durationFormatted,
            transcript: v.transcript
          }
        }));

        if (records.length > 0) {
          const { error: upsertError } = await supabase.from('videos').upsert(records, { onConflict: 'id' });
          if (upsertError) console.error('Supabase Upsert Error:', upsertError);
          else console.log(`Successfully upserted ${records.length} new videos to Supabase.`);
        }
      } else {
        console.log('No new videos found to process or upsert.');
      }

      // Combine all videos (existing from Supabase + newly processed)
      const allProcessedVideos = [...allVideosFromSupabase, ...newVideos];

      // Generate groups from the combined list
      const uniqueGroups = Array.from(new Set(allProcessedVideos.map(v => v.group)));

      uniqueGroups.sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      });

      const groupArray: Group[] = uniqueGroups.map(groupName => {
        const groupVideos = allProcessedVideos.filter(v => v.group === groupName);
        return {
          name: `Week of ${groupName}`,
          startDate: groupName,
          videoIds: groupVideos.map(v => v.id),
          count: groupVideos.length
        };
      });

      const result = {
        videos: allProcessedVideos,
        groups: groupArray,
        metadata: {
          emailsProcessed: emails.length,
          uniqueVideos: allProcessedVideos.length,
          lastUpdated: new Date().toISOString(),
          sources: [...new Set(emails.map(e => e.sender))]
        }
      };

      return NextResponse.json(result);

    } catch (gmailError) {
      console.error('API error:', gmailError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

  } catch (error) {
    console.error('Internal Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}