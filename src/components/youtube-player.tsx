'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface YouTubePlayerProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function YouTubePlayer({ videoId, isOpen, onClose, title }: YouTubePlayerProps) {
  if (!videoId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title || 'YouTube Video'}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={title || 'YouTube Video'}
            className="w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}