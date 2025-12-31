'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import YouTube, { YouTubeProps } from 'react-youtube';

interface YouTubePlayerProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onEnded?: () => void;
}

export function YouTubePlayer({ videoId, isOpen, onClose, title, onEnded }: YouTubePlayerProps) {
  if (!videoId) return null;

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1, // Enable autoplay for seamless playlist experience
      playsinline: 1,
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/90 border-none">
        <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <DialogTitle className="text-white text-shadow">{title || 'YouTube Video'}</DialogTitle>
          <DialogDescription className="text-gray-300">
            Playing video
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full">
          <YouTube
            key={videoId}
            videoId={videoId}
            opts={opts}
            className="w-full h-full"
            iframeClassName="w-full h-full"
            onEnd={onEnded}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}