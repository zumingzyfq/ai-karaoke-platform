import { RealTimeScore } from '../types';

interface ScorePanelProps {
  scores: RealTimeScore[];
}

export const ScorePanel = ({ scores }: ScorePanelProps) => {
  const latestScore = scores[scores.length - 1];
  
  const avgPitchScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.pitchScore, 0) / scores.length
    : 0;

  const getGrade = (score: number) => {
    if (score >= 95) return { grade: 'S', color: 'text-yellow-400' };
    if (score >= 85) return { grade: 'A', color: 'text-green-400' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-400' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-400' };
    return { grade: 'D', color: 'text-red-400' };
  };

  const gradeInfo = getGrade(avgPitchScore);

  return (
    <div className="score-panel">
      <div className="score-circle">
        <div className="score-value">
          <span className={gradeInfo.color}>{gradeInfo.grade}</span>
        </div>
        <div className="score-label">评级</div>
      </div>
      
      <div className="score-details">
        <div className="score-item">
          <div className="score-bar">
            <div 
              className="score-bar-fill score-bar-pitch" 
              style={{ width: `${avgPitchScore}%` }}
            ></div>
          </div>
          <div className="score-info">
            <span className="score-label">音准</span>
            <span className="score-value-number">{avgPitchScore.toFixed(1)}</span>
          </div>
        </div>
        
        {latestScore && (
          <>
            <div className="score-item">
              <div className="score-bar">
                <div 
                  className="score-bar-fill score-bar-rhythm" 
                  style={{ width: `${latestScore.rhythmScore}%` }}
                ></div>
              </div>
              <div className="score-info">
                <span className="score-label">节奏</span>
                <span className="score-value-number">{latestScore.rhythmScore.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="score-item">
              <div className="score-bar">
                <div 
                  className="score-bar-fill score-bar-overall" 
                  style={{ width: `${latestScore.overallScore}%` }}
                ></div>
              </div>
              <div className="score-info">
                <span className="score-label">综合</span>
                <span className="score-value-number">{latestScore.overallScore.toFixed(1)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};