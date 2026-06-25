import { useState, useRef, useCallback } from 'react';
import { LyricLine } from '../types';

interface LyricAlignerProps {
  audioUrl: string;
  rawLyrics: string[];
  onComplete: (alignedLyrics: LyricLine[]) => void;
  onClose: () => void;
}

export function LyricAligner({ audioUrl, rawLyrics, onComplete, onClose }: LyricAlignerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [alignedLyrics, setAlignedLyrics] = useState<LyricLine[]>([]);
  const [showResult, setShowResult] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentLyricIndex(0);
    setAlignedLyrics([]);
    setShowResult(false);
  }, []);

  const handleMarkLyric = useCallback(() => {
    if (currentLyricIndex >= rawLyrics.length) {
      return;
    }

    const lyric: LyricLine = {
      time: currentTime,
      text: rawLyrics[currentLyricIndex],
    };

    setAlignedLyrics((prev) => [...prev, lyric]);
    setCurrentLyricIndex((prev) => prev + 1);

    // 如果已经完成所有歌词的标记，显示结果
    if (currentLyricIndex + 1 >= rawLyrics.length) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setShowResult(true);
    }
  }, [currentTime, currentLyricIndex, rawLyrics]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleExport = useCallback(() => {
    const result = JSON.stringify(alignedLyrics, null, 2);
    const blob = new Blob([result], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lyrics_aligned.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [alignedLyrics]);

  return (
    <div className="lyric-aligner">
      <div className="aligner-header">
        <h2>🎯 歌词对齐校准工具</h2>
        <p>播放音乐，每当唱完一句歌词时点击"标记这句"按钮</p>
        <button className="close-btn" onClick={onClose}>✕ 返回</button>
      </div>

      <div className="aligner-content">
        {/* 音频播放器 */}
        <div className="audio-section">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handlePause}
            crossOrigin="anonymous"
          />
          
          <div className="time-display">
            <span className="time-label">当前时间:</span>
            <span className="time-value">{formatTime(currentTime)}</span>
            <span className="progress-label">
              进度: {currentLyricIndex} / {rawLyrics.length} 句
            </span>
          </div>

          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentLyricIndex / rawLyrics.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 歌词显示区域 */}
        <div className="lyrics-section">
          <div className="current-lyric-box">
            {currentLyricIndex < rawLyrics.length ? (
              <>
                <div className="lyric-label">第 {currentLyricIndex + 1} 句 (即将开始):</div>
                <div className="current-lyric-text">{rawLyrics[currentLyricIndex]}</div>
              </>
            ) : (
              <>
                <div className="lyric-label">🎉 所有歌词已标记完成!</div>
                <div className="current-lyric-text">点击下方"查看结果"按钮</div>
              </>
            )}
          </div>

          <div className="lyrics-history">
            <h3>已标记的歌词:</h3>
            <div className="lyrics-list">
              {alignedLyrics.map((lyric, index) => (
                <div key={index} className="lyric-item done">
                  <span className="lyric-time">[{formatTime(lyric.time)}]</span>
                  <span className="lyric-text">{lyric.text}</span>
                </div>
              ))}
              {rawLyrics.slice(currentLyricIndex).map((text, index) => (
                <div key={`pending-${index}`} className="lyric-item pending">
                  <span className="lyric-time">[待标记]</span>
                  <span className="lyric-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="controls-section">
          {!showResult && (
            <>
              <button className="btn btn-primary btn-large" onClick={handleMarkLyric}>
                🎵 标记这句歌词唱完了
              </button>
              <div className="play-controls">
                <button className="btn" onClick={isPlaying ? handlePause : handlePlay}>
                  {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
                </button>
                <button className="btn btn-secondary" onClick={handleReset}>
                  🔄 重新开始
                </button>
              </div>
            </>
          )}

          {showResult && (
            <div className="result-section">
              <h3>✅ 对齐完成! 以下是记录的歌词时间戳:</h3>
              <div className="result-list">
                {alignedLyrics.map((lyric, index) => (
                  <div key={index} className="result-item">
                    <code>{`{ time: ${lyric.time.toFixed(2)}, text: '${lyric.text}' },`}</code>
                  </div>
                ))}
              </div>
              
              <div className="result-actions">
                <button className="btn btn-primary" onClick={() => onComplete(alignedLyrics)}>
                  ✅ 应用到主程序
                </button>
                <button className="btn" onClick={handleExport}>
                  📥 导出为JSON文件
                </button>
                <button className="btn btn-secondary" onClick={handleReset}>
                  🔄 重新校准
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .lyric-aligner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: 1000;
          padding: 20px;
          overflow-y: auto;
        }

        .aligner-header {
          text-align: center;
          color: white;
          margin-bottom: 30px;
          position: relative;
        }

        .aligner-header h2 {
          font-size: 2.5rem;
          margin: 0 0 10px 0;
        }

        .aligner-header p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0;
        }

        .close-btn {
          position: absolute;
          top: 10px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .close-btn:hover {
          background: white;
          color: #667eea;
        }

        .aligner-content {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .audio-section {
          margin-bottom: 30px;
        }

        .time-display {
          display: flex;
          justify-content: center;
          gap: 30px;
          align-items: center;
          margin-bottom: 20px;
          font-size: 1.3rem;
        }

        .time-label, .progress-label {
          color: #666;
        }

        .time-value {
          font-family: 'Courier New', monospace;
          font-size: 2rem;
          font-weight: bold;
          color: #667eea;
          background: #f0f4ff;
          padding: 10px 20px;
          border-radius: 10px;
        }

        .progress-bar {
          height: 10px;
          background: #e0e0e0;
          border-radius: 5px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s;
        }

        .lyrics-section {
          margin-bottom: 30px;
        }

        .current-lyric-box {
          background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%);
          border: 3px solid #ff6b6b;
          border-radius: 15px;
          padding: 30px;
          text-align: center;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .lyric-label {
          font-size: 1rem;
          color: #666;
          margin-bottom: 10px;
        }

        .current-lyric-text {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
          line-height: 1.4;
        }

        .lyrics-history {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          max-height: 300px;
          overflow-y: auto;
        }

        .lyrics-history h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 1.1rem;
        }

        .lyrics-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .lyric-item {
          display: flex;
          gap: 15px;
          padding: 10px 15px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .lyric-item.done {
          background: #e8f5e9;
        }

        .lyric-item.pending {
          background: white;
          opacity: 0.5;
        }

        .lyric-time {
          font-family: 'Courier New', monospace;
          color: #667eea;
          font-weight: bold;
          min-width: 100px;
        }

        .lyric-text {
          color: #333;
        }

        .controls-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .btn {
          padding: 15px 30px;
          font-size: 1.2rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 600;
        }

        .btn-large {
          font-size: 1.5rem;
          padding: 20px 50px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(102, 126, 234, 0.5);
        }

        .btn-secondary {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #d0d0d0;
        }

        .play-controls {
          display: flex;
          gap: 15px;
        }

        .result-section {
          width: 100%;
          text-align: center;
        }

        .result-section h3 {
          color: #4caf50;
          font-size: 1.5rem;
          margin-bottom: 20px;
        }

        .result-list {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 20px;
          border-radius: 10px;
          text-align: left;
          margin-bottom: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .result-item {
          margin-bottom: 5px;
          font-family: 'Courier New', monospace;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .result-actions {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}