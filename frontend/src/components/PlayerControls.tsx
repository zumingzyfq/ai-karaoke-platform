interface PlayerControlsProps {
  isPlaying: boolean;
  isRecording: boolean;
  isRecordingReference: boolean;  // 是否正在录制参考音高
  referenceReady: boolean;  // 参考音高是否已准备好
  recordingFrames: number;  // 录制帧数
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onRecord: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onVocalCritic: () => void;
  onRecordReference: () => void;  // 录制参考音高
  onFinishRecording: () => void;  // 完成参考音高录制
  onReRecordReference: () => void;  // 重新录制参考音高
}

export const PlayerControls = ({
  isPlaying,
  isRecording,
  isRecordingReference,
  referenceReady,
  recordingFrames,
  currentTime,
  duration,
  onPlay,
  onPause,
  onRecord,
  onStop,
  onSeek,
  onVocalCritic,
  onRecordReference,
  onFinishRecording,
  onReRecordReference,
}: PlayerControlsProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player-controls">
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${progress}%` }}
          onClick={(e) => {
            const rect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (rect) {
              const x = e.clientX - rect.left;
              const percent = x / rect.width;
              onSeek(percent * duration);
            }
          }}
        ></div>
        <div className="progress-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="control-buttons">
        {/* 录制参考音高模式 */}
        {!referenceReady && !isRecordingReference && (
          <button className="control-btn record-ref-btn" onClick={onRecordReference}>
            🎙️ 录制参考音高
          </button>
        )}
        
        {/* 正在录制参考音高 */}
        {isRecordingReference && (
          <div className="recording-status">
            <span className="recording-indicator">●</span>
            <span>录制中... {recordingFrames}帧</span>
            <button className="control-btn finish-record-btn" onClick={onFinishRecording}>
              ✅ 完成录制
            </button>
          </div>
        )}
        
        {/* 参考音高已准备好 */}
        {referenceReady && (
          <div className="reference-ready">
            <span className="ready-badge">✓</span>
            <span>参考音高已就绪</span>
            <button className="control-btn re-record-btn" onClick={onReRecordReference}>
              🔄 重新录制
            </button>
          </div>
        )}
        
        {/* 常规控制按钮 */}
        {isPlaying ? (
          <button className="control-btn pause-btn" onClick={onPause}>
            ⏸
          </button>
        ) : (
          <button className="control-btn play-btn" onClick={onPlay}>
            ▶
          </button>
        )}
        
        {isRecording ? (
          <button className="control-btn stop-btn" onClick={onStop}>
            ⏹
          </button>
        ) : (
          <button className="control-btn record-btn" onClick={onRecord}>
            ⏺ 演唱
          </button>
        )}
        
        <button className="control-btn critic-btn" onClick={onVocalCritic}>
          🎤 AI导师
        </button>
      </div>
      
      {/* 状态说明 */}
      <div className="mode-guide">
        {!referenceReady && !isRecordingReference && (
          <p className="guide-text">💡 提示：先录制原唱作为参考音高，可获得更准确的评分</p>
        )}
        {isRecordingReference && (
          <p className="guide-text recording">🎤 正在录制：请跟着原唱演唱，让麦克风录下你的声音</p>
        )}
        {referenceReady && !isRecording && (
          <p className="guide-text ready">✅ 参考音高已准备！点击"演唱"开始K歌评分</p>
        )}
        {isRecording && (
          <p className="guide-text singing">🎤 演唱中：实时评分中...</p>
        )}
      </div>
    </div>
  );
};
