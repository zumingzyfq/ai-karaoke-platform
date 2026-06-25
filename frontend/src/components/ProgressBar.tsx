import React, { useRef, useState } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  loopStart?: number | null;
  loopEnd?: number | null;
  lyrics?: Array<{ time: number; text: string }>;
  onSeek: (time: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  loopStart,
  loopEnd,
  lyrics = [],
  onSeek,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopStartPos = loopStart !== undefined && loopStart !== null ? (loopStart / duration) * 100 : null;
  const loopEndPos = loopEnd !== undefined && loopEnd !== null ? (loopEnd / duration) * 100 : null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const time = percentage * duration;
      setHoverTime(time);
      setHoverX(x);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const time = percentage * duration;
      onSeek(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="progress-bar-container">
      <span className="time-display current">{formatTime(currentTime)}</span>
      
      <div
        ref={progressRef}
        className="progress-bar"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTime(null)}
        onClick={handleClick}
      >
        <div className="progress-track">
          {/* 循环区间高亮 */}
          {loopStartPos !== null && loopEndPos !== null && (
            <div
              className="loop-region"
              style={{
                left: `${loopStartPos}%`,
                width: `${loopEndPos - loopStartPos}%`,
              }}
            />
          )}

          {/* 进度条 */}
          <div className="progress-fill" style={{ width: `${progress}%` }}>
            <div className="progress-handle" />
          </div>

          {/* 歌词标记 */}
          {lyrics.map((item, index) => {
            const pos = (item.time / duration) * 100;
            return (
              <div
                key={index}
                className="lyric-marker"
                style={{ left: `${pos}%` }}
                title={item.text}
              />
            );
          })}
        </div>

        {/* 悬停提示 */}
        {hoverTime !== null && (
          <div
            className="hover-tooltip"
            style={{ left: `${hoverX}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      <span className="time-display duration">{formatTime(duration)}</span>

      <style>{`
        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
        }

        .time-display {
          min-width: 50px;
          color: #9ca3af;
          font-size: 0.85rem;
          font-family: monospace;
        }

        .time-display.current {
          color: #f3f4f6;
          text-align: right;
        }

        .progress-bar {
          flex: 1;
          height: 30px;
          position: relative;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          position: relative;
          overflow: visible;
        }

        .loop-region {
          position: absolute;
          top: 0;
          height: 100%;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }

        .progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
          border-radius: 3px;
          transition: width 0.1s linear;
        }

        .progress-handle {
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .progress-bar:hover .progress-handle {
          opacity: 1;
        }

        .lyric-marker {
          position: absolute;
          top: -2px;
          width: 2px;
          height: 10px;
          background: rgba(255, 255, 255, 0.3);
          transform: translateX(-50%);
        }

        .hover-tooltip {
          position: absolute;
          bottom: 100%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-family: monospace;
          pointer-events: none;
          margin-bottom: 5px;
        }

        .hover-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  );
};
