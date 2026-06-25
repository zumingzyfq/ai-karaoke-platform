import { useState, useEffect, useRef } from 'react';
import { LyricLine } from '../types';

interface LyricDisplayProps {
  lyrics: LyricLine[];
  currentTime: number;
}

export const LyricDisplay = ({ lyrics, currentTime }: LyricDisplayProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const lyricRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = lyrics.findIndex((lyric) => lyric.time > currentTime);
    setCurrentIndex(index > 0 ? index - 1 : 0);
  }, [currentTime, lyrics]);

  useEffect(() => {
    if (lyricRef.current && currentIndex > 0) {
      const activeElement = lyricRef.current.querySelector('.active');
      activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  return (
    <div className="lyric-container" ref={lyricRef}>
      <div className="lyric-scroll">
        {lyrics.map((lyric, index) => (
          <div
            key={index}
            className={`lyric-line ${index === currentIndex ? 'active' : ''}`}
          >
            {lyric.text}
          </div>
        ))}
      </div>
    </div>
  );
};