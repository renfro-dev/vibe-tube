'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { YouTubePlayer } from "@/components/youtube-player";
import { RefreshCw, Activity, Bot, Code2, Sparkles, Shuffle, Video as VideoIcon, UserCircle, Leaf, Shield, AlertTriangle, Trash2, Lock, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface Video {
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

const VIBES = [
  { id: 'All', label: 'All Vibes', icon: VideoIcon },
  { id: 'Vibe Coding', label: 'Vibe Coding', icon: Code2 },
  { id: 'Model Upgrades', label: 'Model Upgrades', icon: Sparkles },
  { id: 'Robots', label: 'Robots', icon: Bot },
  { id: 'Hype', label: 'Hype', icon: Activity },
  { id: 'Sustainability', label: 'Sustainability', icon: Leaf },
  { id: 'Security', label: 'Security', icon: Shield },
  { id: 'AI Fail', label: 'AI Fail', icon: AlertTriangle },
  { id: 'Human in the Loop', label: 'Human in the Loop', icon: UserCircle },
  { id: 'Random', label: 'Random', icon: Shuffle },
];

export default function Home() {
  const [data, setData] = useState<NewsletterData>({ videos: [], groups: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('All');
  const [activeVibe, setActiveVibe] = useState<string>('All');
  const [isUpdating, setIsUpdating] = useState(false);

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');

  const fetchNewsletters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/newsletters');
      const result = await response.json();

      if (response.ok) {
        setData(result);
        if (result.groups.length > 0 && activeGroup === 'All') {
          // Only set default group if we haven't selected one yet (or logic can vary)
          // Actually, let's default to All to show everything, or first group.
          // keeping existing logic roughly:
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

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const { isAdmin } = await res.json();
      setIsAdmin(isAdmin);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNewsletters();
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsAdmin(true);
        setShowLogin(false);
        setPassword('');
      } else {
        alert('Incorrect password');
      }
    } catch (e) {
      alert('Login failed');
    }
  };

  const handleRecategorize = async (videoId: string, newVibe: string) => {
    // 1. Optimistic Update
    const updatedVideos = data.videos.map(v =>
      v.id === videoId ? { ...v, vibe: newVibe, reason: 'Manually Updated' } : v
    );
    setData(prev => ({ ...prev, videos: updatedVideos }));

    // 2. API Call
    try {
      setIsUpdating(true);
      await fetch('/api/recategorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, newVibe })
      });
    } catch (error) {
      console.error('Failed to recategorize:', error);
      // Revert if needed, but for now just log
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    // 1. Optimistic Update
    const updatedVideos = data.videos.filter(v => v.id !== videoId);
    setData(prev => ({ ...prev, videos: updatedVideos }));

    // 2. API Call
    try {
      await fetch(`/api/videos/delete?id=${videoId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Delete failed', error);
      fetchNewsletters(); // Revert on failure
    }
  };

  const filteredVideos = data.videos.filter(video => {
    // 1. Filter by Group (Week)
    const matchesGroup = activeGroup === 'All' ? true : video.group === activeGroup.replace('Week of ', '');

    // 2. Filter by Vibe
    const matchesVibe = activeVibe === 'All' ? true : video.vibe === activeVibe;

    return matchesGroup && matchesVibe;
  });

  const handleVideoEnd = () => {
    if (!selectedVideo) return;
    const currentIndex = filteredVideos.findIndex(v => v.id === selectedVideo.id);

    if (currentIndex >= 0 && currentIndex < filteredVideos.length - 1) {
      const nextVideo = filteredVideos[currentIndex + 1];
      setSelectedVideo(nextVideo);
    } else {
      setSelectedVideo(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl relative min-h-screen pb-24">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">VibeTube</h1>
          <p className="text-muted-foreground">
            Curated AI Newsletters
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Week Selector Dropdown */}
          {data.groups.length > 0 && (
            <div className="w-[200px]">
              <Select value={activeGroup} onValueChange={setActiveGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Weeks</SelectItem>
                  {data.groups.map(group => (
                    <SelectItem key={group.name} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={fetchNewsletters}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </header>

      {/* Vibe Filter Chips */}
      <div className="mb-8 space-y-4">
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {VIBES.map(vibe => {
              const Icon = vibe.icon;
              const isActive = activeVibe === vibe.id;
              return (
                <button
                  key={vibe.id}
                  onClick={() => setActiveVibe(vibe.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                      : "bg-background hover:bg-muted border-input hover:border-primary/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {vibe.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Context Banner for Human in the Loop */}
        {activeVibe === 'Human in the Loop' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-4 text-amber-600 dark:text-amber-400">
            <UserCircle className="w-6 h-6 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm mb-1">Human in the Loop Required</h3>
              <p className="text-sm opacity-90">
                Claude didn't know how to categorize these videos. If videos exist in this section,
                consider recategorizing them manually, <strong>for the culture.</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      <main>
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map(video => (
              <Card
                key={video.id}
                className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 group border-muted"
                onClick={(e) => {
                  // Don't open video if clicking the select (edit)
                  if ((e.target as HTMLElement).closest('.edit-trigger')) return;
                  if ((e.target as HTMLElement).closest('.delete-trigger')) return;
                  setSelectedVideo(video);
                }}
              >
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="aspect-video relative rounded-t-lg overflow-hidden isolate">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-0"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      {video.durationFormatted}
                    </div>

                    {/* EDITABLE VIBE BADGE */}
                    <div className="absolute top-2 left-2 z-20 edit-trigger" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={video.vibe}
                        onValueChange={(val) => handleRecategorize(video.id, val)}
                      >
                        <SelectTrigger className="h-6 text-[10px] gap-1 px-2 pr-1 border-none bg-white/90 backdrop-blur-sm text-black rounded-full shadow-sm hover:bg-white focus:ring-0 focus:ring-offset-0 w-auto min-w-[80px]">
                          <span className="truncate max-w-[100px]">{video.vibe}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {VIBES.filter(v => v.id !== 'All').map(v => (
                            <SelectItem key={v.id} value={v.id} className="text-xs">
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ADMIN DELETE BUTTON */}
                    {isAdmin && (
                      <div
                        className="absolute top-2 right-2 z-20 delete-trigger"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          onClick={() => handleDelete(video.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <h3
                      className="font-semibold text-sm line-clamp-2 mb-2 leading-tight group-hover:text-primary transition-colors"
                      title={video.title}
                    >
                      {video.title}
                    </h3>

                    <div className="mt-auto pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="truncate max-w-[100px] font-medium text-foreground">
                          {video.channel}
                        </span>
                      </div>
                      <span className="shrink-0 opacity-70">
                        {new Date(video.sharedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
            <div className="text-muted-foreground">
              {isLoading ? 'Curating your feed...' : 'No videos found looking like that vibe.'}
            </div>
          </div>
        )}
      </main>

      {/* Stats Footer + Admin Login */}
      <footer className="mt-16 text-center text-xs text-muted-foreground border-t pt-8">
        {data.metadata && (
          <p className="mb-4">Scanned {data.metadata.emailsProcessed} emails • Found {data.metadata.uniqueVideos} videos</p>
        )}

        <div className="flex justify-center items-center gap-2">
          {isAdmin ? (
            <span className="inline-flex items-center gap-2 text-green-600 font-medium cursor-pointer" onClick={() => setIsAdmin(false)}>
              <Lock className="w-3 h-3" /> Admin Active
            </span>
          ) : (
            <>
              {!showLogin ? (
                <button onClick={() => setShowLogin(true)} className="opacity-50 hover:opacity-100 transition-opacity">
                  <Lock className="w-3 h-3" />
                </button>
              ) : (
                <form onSubmit={handleLogin} className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="Admin Password"
                    className="h-6 w-32 text-xs"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button type="submit" size="sm" variant="ghost" className="h-6 w-6 p-0">
                    →
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </footer>

      {selectedVideo && (
        <YouTubePlayer
          videoId={selectedVideo.id}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          title={selectedVideo.title}
          onEnded={handleVideoEnd}
        />
      )}
    </div>
  );
}
