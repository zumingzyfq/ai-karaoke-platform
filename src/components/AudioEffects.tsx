import React, { useState } from 'react';

interface AudioEffectsProps {
  volume: number;
  reverb: number;
  echo: number;
  pitchShift: number;
  onVolumeChange: (value: number) => void;
  onReverbChange: (value: number) => void;
  onEchoChange: (value: number) => void;
  onPitchShiftChange: (value: number) => void;
  onReset: () => void;
}

export const AudioEffectsComponent: React.FC<AudioEffectsProps> = ({
  volume,
  reverb,
  echo,
  pitchShift,
  onVolumeChange,
  onReverbChange,
  onEchoChange,
  onPitchShiftChange,
  onReset,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`audio-effects ${isExpanded ? 'expanded' : ''}`}>
      <div className="effects-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>🎛️ 音效控制</h3>
        <span className="expand-icon">{isExpanded ? '▼' : '▲'}</span>
      </div>
      
      <div className="effects-content">
        <div className="effect-item">
          <label>
            <span className="effect-icon">🔊</span>
            <span className="effect-name">音量</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
          />
          <span className="effect-value">{volume}%</span>
        </div>

        <div className="effect-item">
          <label>
            <span className="effect-icon">🎭</span>
            <span className="effect-name">混响</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={reverb}
            onChange={(e) => onReverbChange(Number(e.target.value))}
          />
          <span className="effect-value">{reverb}%</span>
        </div>

        <div className="effect-item">
          <label>
            <span className="effect-icon">🔁</span>
            <span className="effect-name">回声</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={echo}
            onChange={(e) => onEchoChange(Number(e.target.value))}
          />
          <span className="effect-value">{echo}%</span>
        </div>

        <div className="effect-item">
          <label>
            <span className="effect-icon">🎵</span>
            <span className="effect-name">升降调</span>
          </label>
          <input
            type="range"
            min="-12"
            max="12"
            value={pitchShift}
            onChange={(e) => onPitchShiftChange(Number(e.target.value))}
          />
          <span className="effect-value">
            {pitchShift > 0 ? `+${pitchShift}` : pitchShift} 半音
          </span>
        </div>

        <button className="reset-btn" onClick={onReset}>
          🔄 重置音效
        </button>
      </div>
    </div>
  );
};

export { AudioEffectsComponent as AudioEffects };
