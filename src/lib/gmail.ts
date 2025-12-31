import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error('Missing Gmail API credentials in environment variables');
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost:3000/auth/callback'
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: any;
  internalDate: string;
}

export interface NewsletterEmail {
  id: string;
  sender: string;
  subject: string;
  date: Date;
  content: string;
  youtubeUrls: string[];
}

const NEWSLETTER_SENDERS = [
  'theneuron.ai',
  'aibreakfast',
  'dan@tldrnewsletter.com',
  'tldrnewsletter.com',
  'therundown.ai',
  'neuron'
];

export async function fetchNewsletterEmails(fromDate: Date, toDate: Date): Promise<NewsletterEmail[]> {
  try {
    const afterDate = fromDate.toISOString().split('T')[0];
    const beforeDate = toDate.toISOString().split('T')[0];

    // Gmail 'before' is exclusive, so we might need to adjust logic if we want exact inclusive ranges,
    // but for weekly chunks, standard YYYY-MM-DD usage is usually sufficient.
    const query = `from:(${NEWSLETTER_SENDERS.join(' OR ')}) after:${afterDate} before:${beforeDate}`;

    console.log(`Fetching Gmail query: ${query}`);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50, // Reduced per-chunk limit to avoid overwhelming
    });

    if (!response.data.messages) {
      return [];
    }

    const emails: NewsletterEmail[] = [];

    for (const message of response.data.messages) {
      if (!message.id) continue;

      const emailDetail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const email = parseEmailMessage(emailDetail.data);
      if (email) {
        emails.push(email);
      }
    }

    return emails;
  } catch (error) {
    console.error('Error fetching newsletter emails:', error);
    throw error;
  }
}

function parseEmailMessage(message: any): NewsletterEmail | null {
  try {
    const headers = message.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const date = new Date(parseInt(message.internalDate));

    // Extract email content
    const content = extractEmailContent(message.payload);

    // Extract YouTube URLs
    const youtubeUrls = extractYouTubeUrls(content);

    return {
      id: message.id,
      sender: from,
      subject,
      date,
      content,
      youtubeUrls,
    };
  } catch (error) {
    console.error('Error parsing email message:', error);
    return null;
  }
}

function extractEmailContent(payload: any): string {
  let content = '';

  if (payload.body?.data) {
    content += Buffer.from(payload.body.data, 'base64').toString();
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
        if (part.body?.data) {
          content += Buffer.from(part.body.data, 'base64').toString();
        }
      }

      // Recursively check nested parts
      if (part.parts) {
        content += extractEmailContent(part);
      }
    }
  }

  return content;
}

export function extractYouTubeUrls(text: string): string[] {
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const urls: string[] = [];
  let match;

  while ((match = youtubeRegex.exec(text)) !== null) {
    const videoId = match[1];
    const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
    if (!urls.includes(fullUrl)) {
      urls.push(fullUrl);
    }
  }

  return urls;
}

export { gmail };