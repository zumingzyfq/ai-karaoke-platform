import { useState, useRef, useCallback, useEffect } from 'react';
import { Song } from '../types';

interface ReferenceRecorderProps {
  song: Song;
  onComplete: (audioData: Blob) => void;
  onClose: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  sendAudioData?: (audioData: Float32Array, currentTime: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export function ReferenceRecorder({ song, onComplete, onClose, onStartRecording, onStopRecording, sendAudioData, onRecordingStart, onRecordingStop }: ReferenceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioSaved, setAudioSaved] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handlePlay = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('播放失败:', error);
      }
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
    setRecordingTime(0);
    setIsRecording(false);
    setAudioSaved(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          sampleRate: 16000
        }
      });

      micStreamRef.current = stream;

      if (onStartRecording) {
        console.log('🎤 onStartRecording 函数存在，调用它');
        onStartRecording();
      } else {
        console.error('🎤 onStartRecording 函数不存在');
      }

      if (onRecordingStart) {
        onRecordingStart();
      }

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;
      
      scriptProcessor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        
        // 获取音频数据
        const inputData = inputBuffer.getChannelData(0);
        
        // 发送到后端（实时流式）
        if (sendAudioData && audioRef.current) {
          sendAudioData(inputData, audioRef.current.currentTime);
        }
        
        // 将输入复制到输出（保持流）
        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          const outputData = outputBuffer.getChannelData(channel);
          for (let i = 0; i < outputBuffer.length; i++) {
            outputData[i] = inputData[i];
          }
        }
      };
      
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      // 同时进行本地录制（用于下载）
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // 停止实时音频流
        if (scriptProcessorRef.current) {
          scriptProcessorRef.current.disconnect();
          scriptProcessorRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
        console.log('🎤 参考音高音频录制完成:', audioBlob.size, 'bytes');
        setAudioSaved(true);
        
        if (onComplete) {
          onComplete(audioBlob);
        }
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
      console.log('🎤 开始录制参考音高...');
      
    } catch (error) {
      console.error('麦克风访问失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  }, [onComplete, onStartRecording, onRecordingStart, sendAudioData]);

  const handleStopRecording = useCallback(() => {
    // 通知后端停止录制
    if (onStopRecording) {
      onStopRecording();
    }
    
    // 通知 App.tsx 更新录制状态
    if (onRecordingStop) {
      onRecordingStop();
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    console.log('🎤 停止录制参考音高');
  }, [onStopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="reference-recorder">
      <div className="recorder-header">
        <h2>🎤 参考音高录制工具</h2>
        <p>播放伴奏，同时录制纯净人声作为参考音高</p>
        <button className="close-btn" onClick={onClose}>✕ 返回主页面</button>
      </div>

      <div className="recorder-content">
        {/* 当前歌曲信息 */}
        <div className="song-info">
          <h3>🎵 {song.title}</h3>
          <p>歌手: {song.artist}</p>
        </div>

        {/* 音频播放器 */}
        <div className="audio-section">
          <audio
            ref={audioRef}
            src={song.instrumentalUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handlePause}
            crossOrigin="anonymous"
          />
          
          <div className="time-display">
            <span className="time-label">伴奏时间:</span>
            <span className="time-value">{formatTime(currentTime)}</span>
            <span className="time-separator">/</span>
            <span className="time-value">{formatTime(duration)}</span>
          </div>

          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* 录制状态 */}
        <div className="recording-section">
          <div className={`recording-status ${isRecording ? 'recording' : ''}`}>
            {isRecording ? (
              <>
                <span className="recording-indicator">🔴</span>
                <span className="recording-text">正在录制中...</span>
                <span className="recording-time">{formatTime(recordingTime)}</span>
              </>
            ) : audioSaved ? (
              <>
                <span className="recording-indicator">✅</span>
                <span className="recording-text">参考音高录制完成!</span>
              </>
            ) : (
              <>
                <span className="recording-indicator">⏹️</span>
                <span className="recording-text">点击下方按钮开始录制</span>
              </>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="controls-section">
          {!audioSaved ? (
            <>
              <div className="main-controls">
                {!isRecording ? (
                  <button 
                    className="btn btn-primary btn-large" 
                    onClick={handleStartRecording}
                    disabled={isPlaying}
                  >
                    🎤 开始录制参考音高
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger btn-large" 
                    onClick={handleStopRecording}
                  >
                    ⏹️ 停止录制
                  </button>
                )}
              </div>
              
              <div className="play-controls">
                <button className="btn" onClick={isPlaying ? handlePause : handlePlay}>
                  {isPlaying ? '⏸️ 暂停伴奏' : '▶️ 播放伴奏'}
                </button>
                <button className="btn btn-secondary" onClick={handleReset}>
                  🔄 重新开始
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="success-message">
                🎉 参考音高录制完成！
              </div>
              <button className="btn btn-primary" onClick={handleReset}>
                🔄 重新录制
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                ✅ 返回主页面
              </button>
            </>
          )}
        </div>

        {/* 使用说明 */}
        <div className="instructions">
          <h3>📖 使用说明:</h3>
          <ul>
            <li>1. 点击"播放伴奏"试听歌曲</li>
            <li>2. 准备好后点击"开始录制参考音高"</li>
            <li>3. 播放伴奏的同时，跟着原唱唱歌</li>
            <li>4. 录制完成后点击"停止录制"</li>
            <li>5. 录制的人声将作为参考音高用于评分</li>
          </ul>
        </div>
      </div>
    </div>
  );
}