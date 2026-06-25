import { useRef, useEffect, useState, useCallback } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
}

export const AudioPlayer = ({ audioUrl, isPlaying, onTimeUpdate, onEnded }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener('timeupdate', () => {
      onTimeUpdate(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
      onEnded();
    });

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl, onTimeUpdate, onEnded]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  return { duration, seekTo };
};