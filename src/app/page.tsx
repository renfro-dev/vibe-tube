'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouTubePlayer } from "@/components/youtube-player";
import { RefreshCw, Mail } from "lucide-react";

interface Video {
  id: string;
  url: string;
  title: string;
  channel: string;
  durationSec: number;
  durationFormatted: string;
  thumbnail: string;
  group: string;
  source?: string;
}

interface Group {
  name: string;
  videoIds: string[];
  count: number;
}

interface NewsletterData {
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

export default function Home() {
  const [data, setData] = useState<NewsletterData>({ videos: [], groups: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('All');

  const fetchNewsletters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/newsletters');
      const result = await response.json();
      
      if (response.ok) {
        setData(result);
        if (result.groups.length > 0) {
          setActiveGroup(result.groups[0].name);
        }
      } else {
        console.error('Failed to fetch newsletters:', result.error);
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchNewsletters();
  }, []);

  const filteredVideos = activeGroup === 'All' 
    ? data.videos 
    : data.videos.filter(video => video.group === activeGroup);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">VibeTube</h1>
        <p className="text-lg text-muted-foreground mb-8">
          AI Newsletter YouTube Curator - Automatically organize videos from your favorite AI newsletters
        </p>
        
        <div className="flex gap-4 justify-center mb-6">
          <Button 
            onClick={fetchNewsletters}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="w-4 h-4 mr-2" />
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Fetch from Gmail'}
          </Button>
        </div>

        {data.metadata && (
          <Card className="max-w-lg mx-auto mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Emails Processed</p>
                  <p className="text-muted-foreground">{data.metadata.emailsProcessed}</p>
                </div>
                <div>
                  <p className="font-medium">Videos Found</p>
                  <p className="text-muted-foreground">{data.metadata.uniqueVideos}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-medium">Sources</p>
                  <p className="text-muted-foreground text-xs">
                    {data.metadata.sources.join(', ')}
                  </p>
                </div>
                {data.metadata.error && (
                  <div className="col-span-2 text-yellow-600 text-xs">
                    {data.metadata.error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </header>

      <main className="space-y-8">
        {data.videos.length > 0 ? (
          <div>
            <Tabs value={activeGroup} onValueChange={setActiveGroup} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="All">All ({data.videos.length})</TabsTrigger>
                {data.groups.map(group => (
                  <TabsTrigger key={group.name} value={group.name}>
                    {group.name} ({group.count})
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value={activeGroup} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredVideos.map(video => (
                    <Card 
                      key={video.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <CardContent className="p-0">
                        <div className="aspect-video relative">
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {video.durationFormatted}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">
                            {video.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {video.channel}
                          </p>
                          {video.source && (
                            <p className="text-xs text-blue-600">
                              {video.source}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-muted-foreground">
              {isLoading ? 'Loading newsletters...' : 'No videos found. Click "Fetch from Gmail" to load your newsletter videos.'}
            </div>
          </div>
        )}
      </main>

      {selectedVideo && (
        <YouTubePlayer
          videoId={selectedVideo.id}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          title={selectedVideo.title}
        />
      )}
    </div>
  );
}
