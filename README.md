# VibeTube 📺

VibeTube is an AI-powered newsletter YouTube curator. It automatically scans your Gmail for newsletters from your favorite AI creators (like The Neuron, AI Breakfast, TLDR), extracts the YouTube videos they recommend, and organizes them into a clean, distraction-free viewing interface.

![VibeTube Interface](https://placehold.co/800x400?text=VibeTube+Interface)

## ✨ Features

-   **Gmail Integration**: Automatically authenticates and scans your inbox for specific newsletter senders.
-   **Smart Extraction**: Parses email content to find and validate YouTube links.
-   **Rich Metadata**: Fetches video details (thumbnails, duration, channel) using the YouTube Data API.
-   **Organized Feed**:
    -   Groups videos by their newsletter source (e.g., "The Neuron", "TLDR").
    -   "All" view for a combined feed.
-   **Embedded Player**: Watch videos directly within the app without navigating away.
-   **Dashboard Metrics**: Tracks processed emails and found videos.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
-   **APIs**:
    -   Gmail API (for reading newsletters)
    -   YouTube Data API v3 (for video metadata)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   A Google Cloud Console project with **Gmail API** and **YouTube Data API v3** enabled.
-   OAuth 2.0 Credentials configured in Google Cloud.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/vibetube.git
    cd vibetube
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Setup

Create a `.env.local` file in the root directory and add the following keys:

```env
# Google OAuth Credentials (for Gmail)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# YouTube API (for Metadata)
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📂 Project Structure

-   `src/app/api/newsletters`: API route that handles Gmail fetching and parsing.
-   `src/lib/gmail.ts`: Gmail API integration and email parsing logic.
-   `src/lib/youtube.ts`: YouTube Data API integration for fetching video stats.
-   `src/components`: UI components including the video player and video cards.
