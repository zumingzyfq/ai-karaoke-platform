import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAudioRecorderProps {
  onData: (data: Float32Array) => void;
  enabled: boolean;
}

export const useAudioRecorder = ({ onData, enabled }: UseAudioRecorderProps) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      // 配置麦克风，启用专业音频处理
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,           // 启用回声消除
          noiseSuppression: true,           // 启用噪声抑制
          autoGainControl: true,            // 自动增益控制
          sampleRate: 16000,                // 采样率
          channelCount: 1,                  // 单声道
        }
      });
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(2048, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (enabled) {
          const inputData = event.inputBuffer.getChannelData(0);
          const float32Data = new Float32Array(inputData);
          onData(float32Data);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onData, enabled]);

  const stopRecording = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    audioBufferRef.current = [];
  }, []);

  useEffect(() => {
    if (enabled && !isRecording) {
      startRecording();
    } else if (!enabled && isRecording) {
      stopRecording();
    }
    return () => {
      stopRecording();
    };
  }, [enabled, isRecording, startRecording, stopRecording]);

  return { isRecording, startRecording, stopRecording };
};