import React from 'react';

interface ScoreHistoryItem {
  id: string;
  songTitle: string;
  artist: string;
  score: number;
  date: string;
  duration: number;
}

interface ScoreHistoryProps {
  history: ScoreHistoryItem[];
}

export const ScoreHistory: React.FC<ScoreHistoryProps> = ({ history }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLevel = (score: number): string => {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  return (
    <div className="score-history">
      <div className="section-header">
        <h3>🏆 我的记录</h3>
        <span className="history-count">{history.length} 次演唱</span>
      </div>
      
      {history.length === 0 ? (
        <div className="empty-history">
          <span className="empty-icon">🎵</span>
          <p>还没有演唱记录</p>
          <p className="empty-hint">快去唱歌吧！</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-score">
                <span className="score-level" style={{ background: getScoreColor(item.score) }}>
                  {getScoreLevel(item.score)}
                </span>
                <span className="score-value" style={{ color: getScoreColor(item.score) }}>
                  {item.score}
                </span>
              </div>
              <div className="history-info">
                <div className="history-song">{item.songTitle}</div>
                <div className="history-artist">{item.artist}</div>
                <div className="history-meta">
                  <span>{item.date}</span>
                  <span>·</span>
                  <span>{Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
              <div className="history-rank">🎤</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
