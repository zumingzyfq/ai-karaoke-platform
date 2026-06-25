import { useRef, useCallback, useEffect } from 'react';

interface AudioEffects {
  volume: number;
  reverb: number;
  echo: number;
  pitchShift: number;
}

export const useAudioEffects = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const feedbackGainNodeRef = useRef<GainNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const effectsNodeRef = useRef<AudioNode | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const connectAudioElement = useCallback((audioElement: HTMLAudioElement) => {
    let audioContext = initAudioContext();
    
    // 断开之前的连接
    disconnectAudio();
    
    // 创建源节点（添加错误处理）
    try {
      sourceNodeRef.current = audioContext.createMediaElementSource(audioElement);
    } catch (error) {
      console.error('[ERROR] 创建MediaElementSource失败:', error);
      // 如果创建失败，可能是因为音频元素已经被连接了，尝试重新创建AudioContext
      audioContext.close();
      audioContextRef.current = new AudioContext();
      audioContext = audioContextRef.current;
      sourceNodeRef.current = audioContext.createMediaElementSource(audioElement);
    }
    
    // 创建音量控制节点
    gainNodeRef.current = audioContext.createGain();
    gainNodeRef.current.gain.value = 0.8;
    
    // 创建回声效果节点
    delayNodeRef.current = audioContext.createDelay(1.0);
    delayNodeRef.current.delayTime.value = 0;
    
    feedbackGainNodeRef.current = audioContext.createGain();
    feedbackGainNodeRef.current.gain.value = 0;
    
    // 创建混响效果节点
    convolverNodeRef.current = audioContext.createConvolver();
    
    // 连接节点
    sourceNodeRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(delayNodeRef.current);
    delayNodeRef.current.connect(feedbackGainNodeRef.current);
    feedbackGainNodeRef.current.connect(delayNodeRef.current);
    
    // 主路径连接到输出
    gainNodeRef.current.connect(convolverNodeRef.current);
    convolverNodeRef.current.connect(audioContext.destination);
    
    // 回声效果也连接到输出
    delayNodeRef.current.connect(audioContext.destination);
    
    effectsNodeRef.current = gainNodeRef.current;
    
    console.log('🎛️ 音效节点已连接');
  }, [initAudioContext]);

  const disconnectAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
    }
    if (delayNodeRef.current) {
      delayNodeRef.current.disconnect();
    }
    if (feedbackGainNodeRef.current) {
      feedbackGainNodeRef.current.disconnect();
    }
    if (convolverNodeRef.current) {
      convolverNodeRef.current.disconnect();
    }
  }, []);

  const setVolume = useCallback((value: number) => {
    if (gainNodeRef.current) {
      const volumeValue = value / 100;
      gainNodeRef.current.gain.value = volumeValue;
      console.log(`🔊 音量设置为: ${value}%`);
    }
  }, []);

  const setReverb = useCallback((value: number) => {
    if (convolverNodeRef.current && audioContextRef.current) {
      const reverbValue = value / 100;
      
      // 当混响值为0时，清空缓冲区
      if (reverbValue <= 0) {
        convolverNodeRef.current.buffer = null;
        console.log(`🎭 混响已关闭`);
        return;
      }
      
      // 创建模拟混响的脉冲响应
      const sampleRate = audioContextRef.current.sampleRate;
      const duration = 2 * reverbValue; // 混响时长
      const length = Math.max(sampleRate * duration, 1); // 确保至少有1帧
      const impulse = audioContextRef.current.createBuffer(2, length, sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          // 指数衰减的白噪声
          channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.5 * reverbValue));
        }
      }
      
      convolverNodeRef.current.buffer = impulse;
      console.log(`🎭 混响设置为: ${value}%`);
    }
  }, []);

  const setEcho = useCallback((value: number) => {
    if (delayNodeRef.current && feedbackGainNodeRef.current) {
      const echoValue = value / 100;
      
      // 设置延迟时间（500ms - 1s）
      delayNodeRef.current.delayTime.value = 0.5 * echoValue + 0.1;
      
      // 设置反馈增益（0.3 - 0.7）
      feedbackGainNodeRef.current.gain.value = 0.3 * echoValue + 0.1;
      
      console.log(`🔁 回声设置为: ${value}%`);
    }
  }, []);

  const setPitchShift = useCallback((value: number) => {
    // 使用playbackRate实现升降调
    // 半音数转换为速率: 每个半音约为 2^(1/12) ≈ 1.05946
    const semitoneRatio = Math.pow(2, value / 12);
    
    // 如果有连接的音频元素，设置playbackRate
    if (sourceNodeRef.current && sourceNodeRef.current.mediaElement) {
      sourceNodeRef.current.mediaElement.playbackRate = semitoneRatio;
      console.log(`🎵 升降调设置为: ${value > 0 ? '+' : ''}${value} 半音 (速率: ${semitoneRatio.toFixed(3)})`);
    }
  }, []);

  const applyEffects = useCallback((effects: AudioEffects) => {
    setVolume(effects.volume);
    setReverb(effects.reverb);
    setEcho(effects.echo);
    setPitchShift(effects.pitchShift);
  }, [setVolume, setReverb, setEcho, setPitchShift]);

  const resetEffects = useCallback(() => {
    setVolume(80);
    setReverb(0);
    setEcho(0);
    setPitchShift(0);
  }, [setVolume, setReverb, setEcho, setPitchShift]);

  useEffect(() => {
    return () => {
      disconnectAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [disconnectAudio]);

  return {
    connectAudioElement,
    disconnectAudio,
    setVolume,
    setReverb,
    setEcho,
    setPitchShift,
    applyEffects,
    resetEffects,
    initAudioContext,
  };
};