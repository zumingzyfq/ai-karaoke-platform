import React, { useState } from 'react';

interface PracticeModeProps {
  lyrics: string[];
  onSelectSection: (startTime: number, endTime: number) => void;
  currentTime: number;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  lyrics,
  onSelectSection,
  currentTime,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isSettingLoop, setIsSettingLoop] = useState<'start' | 'end' | null>(null);

  const handleStartLoop = () => {
    setLoopStart(currentTime);
    setIsSettingLoop('start');
    console.log('设置循环起点:', currentTime);
  };

  const handleEndLoop = () => {
    setLoopEnd(currentTime);
    setIsSettingLoop('end');
    console.log('设置循环终点:', currentTime);
  };

  const handleCompleteLoop = () => {
    if (loopStart !== null && loopEnd !== null && loopStart < loopEnd) {
      onSelectSection(loopStart, loopEnd);
      setIsActive(true);
      setIsSettingLoop(null);
      console.log('完成循环设置:', loopStart, '->', loopEnd);
    } else {
      alert('请先设置循环起点和终点，确保起点时间早于终点时间');
    }
  };

  const handleClearLoop = () => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsActive(false);
    console.log('清除循环设置');
  };

  return (
    <div className="practice-mode">
      <div className="practice-header">
        <h3>🎯 练习模式</h3>
        {isActive && (
          <span className="loop-badge">🔄 循环播放中</span>
        )}
      </div>

      <div className="practice-controls">
        <button
          className={`practice-btn ${loopStart !== null && isSettingLoop === 'start' ? 'active' : ''}`}
          onClick={handleStartLoop}
          disabled={isActive}
        >
          📍 设置起点
        </button>

        <button
          className={`practice-btn ${loopEnd !== null && isSettingLoop === 'end' ? 'active' : ''}`}
          onClick={handleEndLoop}
          disabled={isActive}
        >
          🏁 设置终点
        </button>

        <button
          className="practice-btn complete"
          onClick={handleCompleteLoop}
          disabled={loopStart === null || loopEnd === null || isActive}
        >
          ✅ 完成设置
        </button>

        <button
          className="practice-btn clear"
          onClick={handleClearLoop}
          disabled={loopStart === null && loopEnd === null}
        >
          🗑️ 清除
        </button>
      </div>

      {loopStart !== null && (
        <div className="loop-info">
          <div className="loop-point">
            <span className="point-label">起点:</span>
            <span className="point-value">{formatTime(loopStart)}</span>
          </div>
          <div className="loop-point">
            <span className="point-label">终点:</span>
            <span className="point-value">
              {loopEnd !== null ? formatTime(loopEnd) : '--:--'}
            </span>
          </div>
          {loopStart !== null && loopEnd !== null && (
            <div className="loop-duration">
              时长: {formatTime(loopEnd - loopStart)}
            </div>
          )}
        </div>
      )}

      <div className="quick-sections">
        <h4>快速练习段落</h4>
        <div className="section-list">
          {lyrics.slice(0, 4).map((line, index) => (
            <button
              key={index}
              className="section-btn"
              onClick={() => {
                const start = index * 30;
                const end = (index + 1) * 30;
                setLoopStart(start);
                setLoopEnd(end);
                onSelectSection(start, end);
                setIsActive(true);
              }}
            >
              <span className="section-index">{index + 1}</span>
              <span className="section-preview">{line.slice(0, 10)}...</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .practice-mode {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .practice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .practice-header h3 {
          margin: 0;
          color: #f3f4f6;
          font-size: 1rem;
        }

        .loop-badge {
          padding: 4px 12px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          font-size: 0.8rem;
          color: #3b82f6;
        }

        .practice-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }

        .practice-btn {
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #f3f4f6;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .practice-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .practice-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .practice-btn.active {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }

        .practice-btn.complete:not(:disabled) {
          background: rgba(34, 197, 94, 0.2);
          border-color: #22c55e;
        }

        .practice-btn.clear {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
        }

        .loop-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
        }

        .loop-point {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }

        .point-label {
          color: #9ca3af;
          font-size: 0.85rem;
        }

        .point-value {
          color: #f3f4f6;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .loop-duration {
          text-align: center;
          color: #3b82f6;
          font-size: 0.85rem;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .quick-sections h4 {
          margin: 0 0 10px 0;
          color: #9ca3af;
          font-size: 0.85rem;
        }

        .section-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .section-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .section-index {
          width: 24px;
          height: 24px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: #3b82f6;
          font-weight: bold;
        }

        .section-preview {
          flex: 1;
          color: #9ca3af;
          font-size: 0.85rem;
          text-align: left;
        }
      `}</style>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
