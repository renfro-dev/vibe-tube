import { GoogleGenerativeAI } from '@google/generative-ai';
import { YoutubeTranscript } from 'youtube-transcript';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;

export interface YoutubeFormat {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  durationSec: number;
  thumbnail: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  tags: string[];
  categoryId: string;
  defaultLanguage: string;
  liveBroadcastContent: string;
  thumbnails: any;
}

export async function fetchVideoMetadata(videoIds: string[]): Promise<YoutubeFormat[]> {
  if (!YOUTUBE_API_KEY || videoIds.length === 0) return [];

  // Chunking validation (50 is max for youtube API usually)
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  let allItems: any[] = [];

  for (const chunk of chunks) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.items) {
        allItems = [...allItems, ...data.items];
      }
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
    }
  }

  return allItems.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
    durationSec: parseDuration(item.contentDetails.duration),
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    viewCount: item.statistics?.viewCount || '0',
    likeCount: item.statistics?.likeCount || '0',
    commentCount: item.statistics?.commentCount || '0',
    tags: item.snippet.tags || [],
    categoryId: item.snippet.categoryId,
    defaultLanguage: item.snippet.defaultLanguage,
    liveBroadcastContent: item.snippet.liveBroadcastContent,
    thumbnails: item.snippet.thumbnails
  }));
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = (parseInt(match[1] || '0') || 0);
  const minutes = (parseInt(match[2] || '0') || 0);
  const seconds = (parseInt(match[3] || '0') || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    // Combine into a single string, limiting length if absurdly long
    const fullText = transcriptItems.map(item => item.text).join(' ');

    // Check length. If > 20k chars, maybe just take first 20k for classification to save tokens?
    // Gemini 1.5 Flash has HUGE context (1M tokens), so we can send the whole thing generally.
    return fullText;
  } catch (error) {
    console.log(`No transcript found for ${videoId} (or error fetching):`, error);
    return null;
  }
}