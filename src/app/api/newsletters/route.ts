import { NextResponse } from 'next/server';
import { fetchNewsletterEmails, extractYouTubeUrls } from '@/lib/gmail';
import { fetchVideoMetadata, formatDuration, getDurationGroup } from '@/lib/youtube';
import fs from 'fs';
import path from 'path';

export interface Video {
  id: string;
  url: string;
  title: string;
  channel: string;
  channelId?: string;
  durationSec: number;
  durationFormatted: string;
  thumbnail: string;
  group: string;
  source?: string; // Which newsletter it came from
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
}

export interface Group {
  name: string;
  videoIds: string[];
  count: number;
}

function extractYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\s?]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}


export async function GET() {
  try {
    // First try to load from cache
    const cachePath = path.join(process.cwd(), 'sample.json');
    let fallbackData = null;
    
    try {
      const cacheContent = fs.readFileSync(cachePath, 'utf8');
      fallbackData = JSON.parse(cacheContent);
    } catch (error) {
      console.log('No cache file found, will fetch from Gmail');
    }

    // Try to fetch from Gmail (7 days for new content, merge with cached data)
    try {
      const emails = await fetchNewsletterEmails(7);
      
      if (emails.length === 0) {
        console.log('No new newsletter emails found, using cached data');
        return NextResponse.json(fallbackData || { videos: [], groups: [] });
      }

      // Extract all YouTube URLs from NEW emails
      const newUrls: { url: string; source: string }[] = [];
      const newSeenIds = new Set<string>();

      emails.forEach(email => {
        email.youtubeUrls.forEach(url => {
          const id = extractYouTubeId(url);
          if (id && !newSeenIds.has(id)) {
            newSeenIds.add(id);
            newUrls.push({
              url,
              source: email.sender
            });
          }
        });
      });

      console.log(`Found ${newUrls.length} NEW YouTube URLs from ${emails.length} recent emails`);

      // Merge with existing cached videos to avoid duplicates
      const existingVideoIds = new Set(fallbackData?.videos?.map(v => v.id) || []);
      const uniqueNewUrls = newUrls.filter(item => {
        const id = extractYouTubeId(item.url);
        return id && !existingVideoIds.has(id);
      });

      console.log(`${uniqueNewUrls.length} are truly new (not in cache)`);

      const allUrls = [...(fallbackData?.videos?.map(v => ({ url: v.url, source: v.source || 'cached' })) || []), ...uniqueNewUrls];

      // Only fetch YouTube metadata for NEW videos to save API quota
      const newVideoIds = uniqueNewUrls.map(item => extractYouTubeId(item.url)).filter(Boolean) as string[];
      
      console.log(`Fetching YouTube metadata for ${newVideoIds.length} NEW videos...`);
      const newYoutubeData = await fetchVideoMetadata(newVideoIds);
      
      // Note: We now use cached data + new YouTube data directly in video creation
      
      // Create video objects with real YouTube data or fallbacks
      const videos: Video[] = allUrls.map((item) => {
        const id = extractYouTubeId(item.url);
        if (!id) return null;

        // First check if it's existing cached data
        const existingVideo = fallbackData?.videos?.find(v => v.id === id);
        if (existingVideo) {
          return existingVideo; // Use existing cached video data
        }

        // Otherwise, find matching NEW YouTube data
        const ytData = newYoutubeData.find(yt => yt.id === id);
        
        if (ytData) {
          // Use real YouTube data for new videos
          return {
            id,
            url: item.url,
            title: ytData.title,
            channel: ytData.channelTitle,
            channelId: ytData.channelId,
            durationSec: ytData.durationSec,
            durationFormatted: formatDuration(ytData.durationSec),
            thumbnail: ytData.thumbnail,
            group: getDurationGroup(ytData.durationSec),
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
            thumbnails: ytData.thumbnails
          };
        } else {
          // Fallback for videos that couldn't be fetched
          const estimatedDuration = 300; // 5 minutes default
          return {
            id,
            url: item.url,
            title: `AI Video ${id}`,
            channel: 'Unknown Channel',
            durationSec: estimatedDuration,
            durationFormatted: formatDuration(estimatedDuration),
            thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
            group: getDurationGroup(estimatedDuration),
            source: item.source
          };
        }
      }).filter(Boolean) as Video[];

      // Generate groups
      const groups: { [key: string]: string[] } = {
        'Short': [],
        'Medium': [],
        'Long': []
      };

      videos.forEach(video => {
        if (groups[video.group]) {
          groups[video.group].push(video.id);
        }
      });

      const groupArray: Group[] = Object.entries(groups).map(([name, videoIds]) => ({
        name,
        videoIds,
        count: videoIds.length
      })).filter(group => group.count > 0);

      const result = {
        videos,
        groups: groupArray,
        metadata: {
          emailsProcessed: emails.length,
          newEmailsProcessed: emails.length,
          uniqueVideos: videos.length,
          newVideosAdded: newYoutubeData.length,
          cachedVideos: (fallbackData?.videos?.length || 0),
          youtubeApiCalls: newYoutubeData.length,
          lastUpdated: new Date().toISOString(),
          sources: [...new Set([...(fallbackData?.metadata?.sources || []), ...emails.map(e => e.sender)])]
        }
      };

      // Cache the result
      try {
        fs.writeFileSync(cachePath, JSON.stringify(result, null, 2));
      } catch (error) {
        console.log('Could not write cache file:', error);
      }

      return NextResponse.json(result);

    } catch (gmailError) {
      console.error('Gmail API error, falling back to cache:', gmailError);
      
      if (fallbackData) {
        return NextResponse.json({
          ...fallbackData,
          metadata: {
            emailsProcessed: 0,
            uniqueVideos: fallbackData.videos?.length || 0,
            lastUpdated: new Date().toISOString(),
            sources: ['cache'],
            error: 'Gmail API unavailable, using cached data'
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Gmail API unavailable and no cache data found' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Error in newsletters API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}