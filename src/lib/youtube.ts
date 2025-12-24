import { google } from 'googleapis';

const API_KEY = process.env.YOUTUBE_API_KEY;

const youtube = google.youtube({ version: 'v3', auth: API_KEY });

export interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  duration: string;
  durationSec: number;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  tags: string[];
  categoryId: string;
  defaultLanguage: string;
  defaultAudioLanguage: string;
  liveBroadcastContent: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    standard?: string;
    maxres?: string;
  };
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration (PT1H2M3S) to seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchVideoMetadata(videoIds: string[]): Promise<YouTubeVideoData[]> {
  if (!API_KEY) {
    console.warn('YouTube API key not found');
    return [];
  }

  if (videoIds.length === 0) return [];

  try {
    console.log(`Fetching metadata for ${videoIds.length} videos...`);
    
    // Batch videos in chunks of 50 (YouTube API limit)
    const allVideoData: YouTubeVideoData[] = [];
    const batchSize = 50;
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(videoIds.length/batchSize)} (${batch.length} videos)...`);
      
      const response = await youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: batch,
        maxResults: 50,
      });

      if (response.data.items) {
        const batchData = response.data.items.map(item => {
          const snippet = item.snippet!;
          const contentDetails = item.contentDetails!;
          const statistics = item.statistics!;
          
          const durationSec = parseDuration(contentDetails.duration || 'PT0S');
          
          return {
            id: item.id!,
            title: snippet.title || 'Untitled',
            description: snippet.description || '',
            channelTitle: snippet.channelTitle || 'Unknown Channel',
            channelId: snippet.channelId || '',
            duration: contentDetails.duration || 'PT0S',
            durationSec,
            thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
            publishedAt: snippet.publishedAt || '',
            viewCount: statistics.viewCount || '0',
            likeCount: statistics.likeCount || '0',
            commentCount: statistics.commentCount || '0',
            tags: snippet.tags || [],
            categoryId: snippet.categoryId || '',
            defaultLanguage: snippet.defaultLanguage || '',
            defaultAudioLanguage: snippet.defaultAudioLanguage || '',
            liveBroadcastContent: snippet.liveBroadcastContent || 'none',
            thumbnails: {
              default: snippet.thumbnails?.default?.url || '',
              medium: snippet.thumbnails?.medium?.url || '',
              high: snippet.thumbnails?.high?.url || '',
              standard: snippet.thumbnails?.standard?.url || undefined,
              maxres: snippet.thumbnails?.maxres?.url || undefined,
            },
          };
        });
        
        allVideoData.push(...batchData);
        console.log(`Batch completed. Total videos processed: ${allVideoData.length}`);
      }
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < videoIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Successfully fetched metadata for ${allVideoData.length} videos`);
    return allVideoData;
    
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return [];
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getDurationGroup(durationSec: number): string {
  if (durationSec < 300) return 'Short';
  if (durationSec < 900) return 'Medium';
  return 'Long';
}