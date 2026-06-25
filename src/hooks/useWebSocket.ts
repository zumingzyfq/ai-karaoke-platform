import { useEffect, useRef, useCallback } from 'react';
import { RealTimeScore, LyricLine } from '../types';

export interface LogEntry {
  timestamp: number;
  type: 'audio' | 'pitch' | 'score' | 'lyric' | 'system' | 'warning' | 'recording' | 'error' | 'karaoke';
  message: string;
  data?: Record<string, any>;
}

interface UseWebSocketProps {
  songId: string | null;
  onPitchData: (data: RealTimeScore) => void;
  onLyricUpdate: (lyric: LyricLine) => void;
  onError?: (error: Error) => void;
  onLog?: (log: LogEntry) => void;
  onReferenceReady?: (data: { duration: number; frames: number; validFrames: number }) => void;
  onRecordingStatus?: (data: { frames: number; voiceActive: boolean; audioLevel: number; pitch?: number; timestamp?: number }) => void;
}

export const useWebSocket = ({ songId, onPitchData, onLyricUpdate, onError, onLog, onReferenceReady, onRecordingStatus }: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);
  const messageCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);  // 新增：追踪连接状态
  
  // 使用 refs 存储回调，避免依赖变化导致的重新连接
  const onPitchDataRef = useRef(onPitchData);
  const onLyricUpdateRef = useRef(onLyricUpdate);
  const onErrorRef = useRef(onError);
  const onLogRef = useRef(onLog);
  const onReferenceReadyRef = useRef(onReferenceReady);
  const onRecordingStatusRef = useRef(onRecordingStatus);

  // 更新 refs
  useEffect(() => {
    onPitchDataRef.current = onPitchData;
    onLyricUpdateRef.current = onLyricUpdate;
    onErrorRef.current = onError;
    onLogRef.current = onLog;
    onReferenceReadyRef.current = onReferenceReady;
    onRecordingStatusRef.current = onRecordingStatus;
  }, [onPitchData, onLyricUpdate, onError, onLog, onReferenceReady, onRecordingStatus]);

  // 添加日志（不依赖外部回调）
  const addLog = useCallback((type: LogEntry['type'], message: string, data?: Record<string, any>) => {
    const log: LogEntry = {
      timestamp: Date.now(),
      type,
      message,
      data,
    };
    onLogRef.current?.(log);
    console.log(`[${type.toUpperCase()}] ${message}`, data || '');
  }, []);

  // 连接函数（只依赖 songId）
  const connect = useCallback(() => {
    if (!songId) {
      addLog('warning', 'Cannot connect: songId is null');
      return;
    }

    // 如果正在连接中，先取消之前的连接尝试
    if (isConnectingRef.current) {
      addLog('warning', 'Already connecting, cancelling previous attempt');
      if (wsRef.current) {
        wsRef.current.close(1000, 'Connection replaced');
        wsRef.current = null;
      }
    }

    // 关闭已有连接
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      addLog('system', 'Closing existing WebSocket connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    addLog('system', `Connecting to WebSocket for song: ${songId}`);
    isConnectingRef.current = true;
    
    try {
      // 使用正确的端口（与后端服务端口一致）
      const wsUrl = window.location.hostname === 'localhost' 
        ? `ws://localhost:8000/ws/${songId}` 
        : `ws://${window.location.host}/ws/${songId}`;
      const ws = new WebSocket(wsUrl);
      startTimeRef.current = Date.now();

      ws.onopen = () => {
        isConnectingRef.current = false;
        addLog('system', 'WebSocket connection established');
        reconnectRef.current = 0;
      };

      ws.onmessage = (event) => {
        messageCountRef.current++;
        const latency = Date.now() - startTimeRef.current;
        
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'score':
              const scoreData = message.data;
              console.log('[WS-RECV] 📊 收到评分数据:', {
                数据序号: messageCountRef.current,
                时间戳: scoreData.timestamp,
                用户音高: scoreData.userPitch,
                参考音高: scoreData.refPitch,
                音高得分: scoreData.pitchScore,
                综合得分: scoreData.overallScore,
              });
              addLog('score', `Received score #${messageCountRef.current}`, {
                timestamp: scoreData.timestamp,
                pitchScore: scoreData.pitchScore,
                rhythmScore: scoreData.rhythmScore,
                overallScore: scoreData.overallScore,
                userPitch: scoreData.userPitch,
                refPitch: scoreData.refPitch,
                voiceActive: scoreData.voiceActive,
                audioLevel: scoreData.audioLevel,
                latency: `${latency}ms`,
              });
              
              const centsDiff = scoreData.userPitch > 0 && scoreData.refPitch > 0
                ? Math.round(1200 * Math.log2(scoreData.userPitch / scoreData.refPitch))
                : 0;
              addLog('pitch', `音高对比: 用户 ${scoreData.userPitch.toFixed(1)}Hz vs 参考 ${scoreData.refPitch.toFixed(1)}Hz (偏差: ${centsDiff} 音分)`, {
                  userPitch: scoreData.userPitch,
                  refPitch: scoreData.refPitch,
                  centsDiff,
                });
              
              onPitchDataRef.current(scoreData);
              break;
            case 'lyric':
              addLog('lyric', `Lyric update: "${message.data.text}" at ${message.data.time.toFixed(2)}s`, message.data);
              onLyricUpdateRef.current(message.data);
              break;
            case 'reference_ready':
              addLog('recording', '参考音高录制完成！', message.data);
              onReferenceReadyRef.current?.(message.data);
              break;
            case 'recording_status':
              addLog('recording', `录制中: ${message.data.frames} 帧, 音量: ${message.data.audioLevel.toFixed(4)}`);
              onRecordingStatusRef.current?.(message.data);
              break;
            case 'end':
              addLog('system', 'Song ended');
              break;
          }
        } catch (error) {
          addLog('warning', `Failed to parse WebSocket message: ${error}`);
          onErrorRef.current?.(error as Error);
        }
      };

      ws.onerror = (event) => {
        isConnectingRef.current = false;
        addLog('warning', `WebSocket error: ${event.type}`);
        onErrorRef.current?.(new Error(`WebSocket error: ${event.type}`));
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        const code = event.code;
        const reason = event.reason || 'no reason';
        const wasClean = event.wasClean;
        
        addLog('system', `WebSocket closed (code: ${code}, reason: "${reason}", clean: ${wasClean})`);
        
        // 只有非正常关闭才尝试重连
        if (!wasClean || code !== 1000) {
          addLog('system', `WebSocket closed (reconnect attempt ${reconnectRef.current + 1}/5)`);
          if (reconnectRef.current < 5) {
            const delay = Math.pow(2, reconnectRef.current) * 1000;
            addLog('system', `Reconnecting in ${delay}ms...`);
            setTimeout(() => {
              if (wsRef.current === null) {
                connect();
              }
            }, delay);
            reconnectRef.current++;
          } else {
            addLog('warning', 'Max reconnect attempts reached, stopping');
            onErrorRef.current?.(new Error('WebSocket connection failed after 5 attempts'));
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      isConnectingRef.current = false;
      addLog('warning', `Failed to create WebSocket: ${error}`);
      onErrorRef.current?.(error as Error);
    }
  }, [songId, addLog]);

  // 使用 ref 追踪是否应该保持连接（避免 StrictMode 双重调用问题）
  const shouldConnectRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);

  // 只在 songId 变化时连接
  useEffect(() => {
    isMountedRef.current = true;
    
    if (songId) {
      shouldConnectRef.current = true;
      connect();
    }
    
    return () => {
      isMountedRef.current = false;
      // 只有在组件真正卸载时才关闭连接
      // StrictMode 双重调用时，第二次调用会立即重新连接，所以不需要关闭
      if (!shouldConnectRef.current) {
        addLog('system', 'Closing WebSocket connection');
        wsRef.current?.close();
        wsRef.current = null;
      }
    };
  }, [songId, connect, addLog]);
  
  // 组件卸载时关闭连接
  useEffect(() => {
    return () => {
      shouldConnectRef.current = false;
      addLog('system', 'Component unmounted, closing WebSocket');
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  // 等待 WebSocket 连接建立
  const waitForConnection = useCallback((timeout: number = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('WebSocket connection timeout'));
        } else {
          setTimeout(checkConnection, 50);
        }
      };
      
      checkConnection();
    });
  }, []);
  
  const sendAudioData = useCallback(async (audioData: Float32Array, currentTime: number) => {
    console.log('[WS-SEND] 步骤1: 开始发送音频数据');
    
    // 如果 WebSocket 没有连接，等待连接建立
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.log('[WS-SEND] ❌ 步骤2: WebSocket未连接, 状态:', wsRef.current?.readyState);
      addLog('warning', 'WebSocket not open, waiting for connection...');
      try {
        console.log('[WS-SEND] 步骤3: 等待连接建立...');
        await waitForConnection(5000);
        console.log('[WS-SEND] ✅ 步骤3: 连接建立成功');
      } catch (error) {
        console.log('[WS-SEND] ❌ 步骤3: 连接超时');
        addLog('error', 'Failed to connect to WebSocket');
        return;
      }
    } else {
      console.log('[WS-SEND] ✅ 步骤2: WebSocket已连接');
    }
    
    const maxAmplitude = Math.max(...audioData);
    const minAmplitude = Math.min(...audioData);
    const rms = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);
    const avgAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
    
    console.log('[WS-SEND] 步骤4: 音频数据分析完成');
    console.log('[WS-SEND]   - 样本数:', audioData.length);
    console.log('[WS-SEND]   - 当前时间:', currentTime.toFixed(3), 's');
    console.log('[WS-SEND]   - 最大振幅:', maxAmplitude.toExponential(4));
    console.log('[WS-SEND]   - 最小振幅:', minAmplitude.toExponential(4));
    console.log('[WS-SEND]   - RMS:', rms.toExponential(4));
    console.log('[WS-SEND]   - 平均振幅:', avgAmplitude.toExponential(4));
    console.log('[WS-SEND]   - 是否有声音:', rms > 0.001 ? '是' : '否');
    
    addLog('audio', `Sending audio data: ${audioData.length} samples at time ${currentTime.toFixed(3)}s`, {
      maxAmplitude: maxAmplitude.toFixed(4),
      minAmplitude: minAmplitude.toFixed(4),
      rms: rms.toFixed(4),
      isActive: rms > 0.01,
      currentTime: currentTime,
    });
    
    // 发送包含时间戳的音频数据
    const message = {
      type: 'audio',
      timestamp: currentTime,
      data: Array.from(audioData),
    };
    
    console.log('[WS-SEND] 步骤5: 准备发送消息, 消息大小:', JSON.stringify(message).length, 'bytes');
    try {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify(message));
        console.log('[WS-SEND] ✅ 步骤6: 消息发送成功');
      } else {
        console.log('[WS-SEND] ❌ 步骤6: wsRef.current 为 null');
      }
    } catch (error) {
      console.log('[WS-SEND] ❌ 步骤6: 消息发送失败:', error);
    }
  }, [addLog, waitForConnection]);

  // 发送停止录制消息
  const stopRecording = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      addLog('recording', '发送停止录制消息');
      const message = {
        type: 'stop_recording',
        timestamp: Date.now(),
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [addLog]);

  // 发送开始参考音高录制消息（确保WebSocket连接建立后再发送）
  const startReferenceRecording = useCallback(async () => {
    console.log('🎤 startReferenceRecording 被调用');
    console.log('🎤 当前WebSocket状态:', wsRef.current?.readyState, '(OPEN=', WebSocket.OPEN, ')');
    
    // 如果WebSocket还没连接，等待连接建立
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.log('🎤 WebSocket未连接，等待连接建立...');
      try {
        await waitForConnection(3000);
        console.log('🎤 WebSocket连接建立成功');
      } catch (error) {
        console.error('🎤 等待WebSocket连接超时:', error);
        addLog('error', 'Failed to start reference recording: WebSocket connection timeout');
        return;
      }
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      addLog('recording', '开始参考音高录制');
      const message = {
        type: 'start_reference_recording',
        timestamp: Date.now(),
      };
      console.log('🎤 发送 start_reference_recording 消息');
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('🎤 Cannot start reference recording: WebSocket still not open');
      addLog('warning', 'Cannot start reference recording: WebSocket not open');
    }
  }, [addLog, waitForConnection]);

  // 发送开始K歌消息（确保WebSocket连接建立后再发送）
  const sendStartKaraoke = useCallback(async () => {
    console.log('🎤 sendStartKaraoke 被调用');
    console.log('🎤 当前WebSocket状态:', wsRef.current?.readyState, '(OPEN=', WebSocket.OPEN, ')');
    
    // 如果WebSocket还没连接，等待连接建立
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.log('🎤 WebSocket未连接，等待连接建立...');
      try {
        await waitForConnection(3000);
        console.log('🎤 WebSocket连接建立成功');
      } catch (error) {
        console.error('🎤 等待WebSocket连接超时:', error);
        addLog('error', 'Failed to start karaoke: WebSocket connection timeout');
        return;
      }
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      addLog('karaoke', '开始K歌');
      const message = {
        type: 'start_karaoke',
        timestamp: Date.now(),
      };
      console.log('🎤 发送 start_karaoke 消息');
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('🎤 Cannot start karaoke: WebSocket still not open');
      addLog('warning', 'Cannot start karaoke: WebSocket not open');
    }
  }, [addLog, waitForConnection]);

  return { sendAudioData, stopRecording, startReferenceRecording, sendStartKaraoke };
};