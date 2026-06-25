import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { Song, LyricLine, RealTimeScore } from './types';
import { PitchChart } from './components/PitchChart';
import { LyricDisplay } from './components/LyricDisplay';
import { ScorePanel } from './components/ScorePanel';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SongSelector } from './components/SongSelector';
import { PlayerControls } from './components/PlayerControls';
import { VocalCritic } from './components/VocalCritic';
import { LyricAligner } from './components/LyricAligner';
import { ReferenceRecorder } from './components/ReferenceRecorder';
import { DebugLog } from './components/DebugLog';
import { LogEntry, useWebSocket } from './hooks/useWebSocket';
import { useAudioEffects } from './hooks/useAudioEffects';
import { ScoreHistory } from './components/ScoreHistory';
import { AudioEffectsComponent } from './components/AudioEffects';
import { PracticeMode } from './components/PracticeMode';
import { ProgressBar } from './components/ProgressBar';
import './App.css';

// 播放模式类型
export type PlayMode = 'preview' | 'karaoke';

// 页面类型
export type PageView = 'main' | 'tools';

// 当前工具类型
export type ToolType = 'lyric-align' | 'reference-record';

// 真实歌曲数据（包含原曲和伴奏路径）
const REAL_SONGS: Song[] = [
  { 
    id: 'test', 
    title: '测试歌曲', 
    artist: '测试', 
    duration: 5,
    audioUrl: '/audio/songs/test_song.wav',
    instrumentalUrl: '/audio/songs/test_song.wav',
  },
  { 
    id: 'renjian', 
    title: '人间', 
    artist: '王菲', 
    duration: 260,
    audioUrl: '/audio/songs/人间原版.mp3',
    instrumentalUrl: '/audio/songs/人间伴奏.mp3',
  },
  { 
    id: 'shinian', 
    title: '十年', 
    artist: '陈奕迅', 
    duration: 260,
    audioUrl: '/audio/songs/十年原曲.mp3',
    instrumentalUrl: '/audio/songs/十年伴奏.mp3',
  },
  { 
    id: 'danche', 
    title: '单车', 
    artist: '陈奕迅', 
    duration: 260,
    audioUrl: '/audio/songs/单车原曲.mp3',
    instrumentalUrl: '/audio/songs/单车伴奏.mp3',
  },
];

// 《人间》歌词文本
const RAW_LYRICS: Record<string, string[]> = {
  renjian: [
    '风雨过后不一定有美好的天空',
    '不是天晴就会有彩虹',
    '所以你一脸无辜不代表你懵懂',
    '不是所有感情都会有始有终',
    '孤独尽头不一定惶恐',
    '可生命总免不了最初的一阵痛',
    '但愿你的眼睛只看得到笑容',
    '但愿你流下每一滴泪都让人感动',
    '但愿你以后每一个梦不会一场空',
    '天上人间如果真值得歌颂',
    '也是因为有你才会变得闹哄哄',
    '天大地大世界比你想象中朦胧',
    '我不忍心再欺哄但愿你听得懂',
    '风雨过后不一定有美好的天空',
    '不是天晴就会有彩虹',
    '所以你一脸无辜不代表你懵懂',
    '不是所有感情都会有始有终',
    '孤独尽头不一定惶恐',
    '可生命总免不了最初的一阵痛',
    '但愿你的眼睛只看得到笑容',
    '但愿你流下每一滴泪都让人感动',
    '但愿你以后每一个梦不会一场空',
    '天上人间如果真值得歌颂',
    '也是因为有你才会变得闹哄哄',
    '天大地大世界比你想象中朦胧',
    '我不忍心再欺哄但愿你听得懂',
    '天上人间如果真值得歌颂',
    '也是因为有你才会变得闹哄哄',
    '天大地大世界比你想象中朦胧',
    '我不忍心再欺哄但愿你听得懂',
    '但愿你会懂该何去何从',
  ],
  shinian: [
    '如果那两个字没有颤抖',
    '我不会发现我难受',
    '怎么说出口',
    '也不过是分手',
    '如果对于明天没有要求',
    '牵牵手就像旅游',
    '成千上万个门口',
    '总有一个人要先走',
    '怀抱既然不能逗留',
    '何不在离开的时候',
    '一边享受，一边泪流',
    '十年之前',
    '我不认识你，你不属于我',
    '我们还是一样',
    '陪在一个陌生人左右',
    '走过渐渐熟悉的街头',
    '十年之后',
    '我们是朋友，还可以问候',
    '只是那种温柔',
    '再也找不到拥抱的理由',
    '情人最后难免沦为朋友',
    '怀抱既然不能逗留',
    '何不在离开的时候',
    '一边享受，一边泪流',
    '十年之前',
    '我不认识你，你不属于我',
    '我们还是一样',
    '陪在一个陌生人左右',
    '走过渐渐熟悉的街头',
    '十年之后',
    '我们是朋友，还可以问候',
    '只是那种温柔',
    '再也找不到拥抱的理由',
    '情人最后难免沦为朋友',
    '直到和你做了多年朋友',
    '才明白我的眼泪',
    '不是为你而流',
    '也为别人而流',
  ],
  danche: [
    '不要不要假设我知道',
    '一切一切也都是为我而做',
    '为何这么伟大',
    '如此感觉不到',
    '不说一句的爱有多好',
    '只有一次记得实在接触到',
    '骑着单车的我俩',
    '怀紧贴背的拥抱',
    '难离难舍想抱紧些',
    '茫茫人生好像荒野',
    '如孩儿能伏于爸爸的肩膊',
    '谁要下车',
    '难离难舍总有一些',
    '常情如此不可推卸',
    '任世间再冷酷',
    '想起这单车 还有幸福可借',
    '经已给我怎会看不到',
    '虽说演你角色实在有难度',
    '从来虚位以待',
    '何不给个拥抱',
    '想我怎去相信这一套',
    '多痛惜我却不便让我知道',
    '怀念单车给你我',
    '唯一有过的拥抱',
    '难离难舍想抱紧些',
    '茫茫人生好像荒野',
    '如孩儿能伏于爸爸的肩膊',
    '哪怕遥遥长路多斜',
    '你爱我爱多些',
    '让我他朝走得坚壮些',
    '你介意来爱护',
    '又靠谁施舍',
    '难离难舍想抱紧些',
    '茫茫人生好像荒野',
    '如孩儿能伏于爸爸的肩膊',
    '谁要下车',
    '难离难舍总有一些',
    '常情如此不可推卸',
    '任世间怨我坏',
    '可知我只得你 承受我的狂或野',
  ],
};

// 用户对齐的时间戳（从JSON文件读取）
const ALIGNED_LYRICS: Record<string, LyricLine[]> = {
  test: [
    { time: 0.5, text: '🎵 欢迎来到 AI K歌 声乐导师平台' },
    { time: 2.0, text: '🎤 点击「录制参考音高」开始录制' },
    { time: 4.0, text: '🎶 录制完成后点击「开始K歌」' },
    { time: 6.0, text: '📊 系统将实时评估您的演唱' },
    { time: 8.0, text: '✨ 祝您演唱愉快！' },
  ],
  renjian: [
    { time: 21.72454, text: '风雨过后不一定有美好的天空' },
    { time: 25.709154, text: '不是天晴就会有彩虹' },
    { time: 28.624113, text: '所以你一脸无辜不代表你懵懂' },
    { time: 36.324547, text: '不是所有感情都会有始有终' },
    { time: 40.047637, text: '孤独尽头不一定惶恐' },
    { time: 43.230115, text: '可生命总免不了最初的一阵痛' },
    { time: 52.803772, text: '但愿你的眼睛只看得到笑容' },
    { time: 59.972879, text: '但愿你流下每一滴泪都让人感动' },
    { time: 67.401585, text: '但愿你以后每一个梦不会一场空' },
    { time: 76.733985, text: '天上人间如果真值得歌颂' },
    { time: 83.914261, text: '也是因为有你才会变得闹哄哄' },
    { time: 91.612462, text: '天大地大世界比你想象中朦胧' },
    { time: 98.525737, text: '我不忍心再欺哄但愿你听得懂' },
    { time: 137.846127, text: '风雨过后不一定有美好的天空' },
    { time: 141.561666, text: '不是天晴就会有彩虹' },
    { time: 145.015944, text: '所以你一脸无辜不代表你懵懂' },
    { time: 152.719589, text: '不是所有感情都会有始有终' },
    { time: 156.441596, text: '孤独尽头不一定惶恐' },
    { time: 159.627347, text: '可生命总免不了最初的一阵痛' },
    { time: 167.333457, text: '但愿你的眼睛只看得到笑容' },
    { time: 174.500775, text: '但愿你流下每一滴泪都让人感动' },
    { time: 181.935067, text: '但愿你以后每一个梦不会一场空' },
    { time: 191.23339, text: '天上人间如果真值得歌颂' },
    { time: 198.149472, text: '也是因为有你才会变得闹哄哄' },
    { time: 206.118164, text: '天大地大世界比你想象中朦胧' },
    { time: 213.034444, text: '我不忍心再欺哄但愿你听得懂' },
    { time: 220.739264, text: '天上人间如果真值得歌颂' },
    { time: 227.90706, text: '也是因为有你才会变得闹哄哄' },
    { time: 235.615007, text: '天大地大世界比你想象中朦胧' },
    { time: 242.781786, text: '我不忍心再欺哄但愿你听得懂' },
    { time: 255.0, text: '但愿你会懂该何去何从' },
  ],
  shinian: [
    { time: 14.809733, text: '如果那两个字没有颤抖' },
    { time: 18.785381, text: '我不会发现我难受' },
    { time: 21.973788, text: '怎么说出口' },
    { time: 25.427711, text: '也不过是分手' },
    { time: 30.474216, text: '如果对于明天没有要求' },
    { time: 34.462112, text: '牵牵手就像旅游' },
    { time: 37.390315, text: '成千上万个门口' },
    { time: 41.100072, text: '总有一个人要先走' },
    { time: 46.682215, text: '怀抱既然不能逗留' },
    { time: 50.398638, text: '何不在离开的时候' },
    { time: 53.584469, text: '一边享受，一边泪流' },
    { time: 60.491898, text: '十年之前' },
    { time: 62.885745, text: '我不认识你，你不属于我' },
    { time: 66.595659, text: '我们还是一样' },
    { time: 68.992452, text: '陪在一个陌生人左右' },
    { time: 72.719873, text: '走过渐渐熟悉的街头' },
    { time: 76.164659, text: '十年之后' },
    { time: 78.287718, text: '我们是朋友，还可以问候' },
    { time: 82.015427, text: '只是那种温柔' },
    { time: 84.402941, text: '再也找不到拥抱的理由' },
    { time: 88.380809, text: '情人最后难免沦为朋友' },
    { time: 116.001868, text: '怀抱既然不能逗留' },
    { time: 120.254075, text: '何不在离开的时候' },
    { time: 122.909565, text: '一边享受，一边泪流' },
    { time: 130.090905, text: '十年之前' },
    { time: 132.204816, text: '我不认识你，你不属于我' },
    { time: 136.194655, text: '我们还是一样' },
    { time: 138.846025, text: '陪在一个陌生人左右' },
    { time: 142.309256, text: '走过渐渐熟悉的街头' },
    { time: 145.763398, text: '十年之后' },
    { time: 147.877938, text: '我们是朋友，还可以问候' },
    { time: 151.604873, text: '只是那种温柔' },
    { time: 154.263938, text: '再也找不到拥抱的理由' },
    { time: 157.97398, text: '情人最后难免沦为朋友' },
    { time: 167.804559, text: '直到和你做了多年朋友' },
    { time: 172.053823, text: '才明白我的眼泪' },
    { time: 174.986288, text: '不是为你而流' },
    { time: 178.696045, text: '也为别人而流' },
  ],
  danche: [
    { time: 15.328825, text: '不要不要假设我知道' },
    { time: 19.84332, text: '一切一切也都是为我而做' },
    { time: 24.632582, text: '为何这么伟大' },
    { time: 28.347516, text: '如此感觉不到' },
    { time: 31.001323, text: '不说一句的爱有多好' },
    { time: 34.455076, text: '只有一次记得实在接触到' },
    { time: 39.243763, text: '骑着单车的我俩' },
    { time: 42.948876, text: '怀紧贴背的拥抱' },
    { time: 45.614674, text: '难离难舍想抱紧些' },
    { time: 49.063793, text: '茫茫人生好像荒野' },
    { time: 53.042832, text: '如孩儿能伏于爸爸的肩膊' },
    { time: 56.508134, text: '谁要下车' },
    { time: 60.222877, text: '难离难舍总有一些' },
    { time: 63.940037, text: '常情如此不可推卸' },
    { time: 67.922192, text: '任世间再冷酷' },
    { time: 69.519044, text: '想起这单车 还有幸福可借' },
    { time: 89.440798, text: '经已给我怎会看不到' },
    { time: 93.957077, text: '虽说演你角色实在有难度' },
    { time: 98.470296, text: '从来虚位以待' },
    { time: 102.186952, text: '何不给个拥抱' },
    { time: 104.853305, text: '想我怎去相信这一套' },
    { time: 108.567213, text: '多痛惜我却不便让我知道' },
    { time: 113.607163, text: '怀念单车给你我' },
    { time: 117.06534, text: '唯一有过的拥抱' },
    { time: 119.448237, text: '难离难舍想抱紧些' },
    { time: 123.173611, text: '茫茫人生好像荒野' },
    { time: 126.634252, text: '如孩儿能伏于爸爸的肩膊' },
    { time: 130.351137, text: '哪怕遥遥长路多斜' },
    { time: 134.589009, text: '你爱我爱多些' },
    { time: 137.260374, text: '让我他朝走得坚壮些' },
    { time: 141.761984, text: '你介意来爱护' },
    { time: 144.16509, text: '又靠谁施舍' },
    { time: 157.973645, text: '难离难舍想抱紧些' },
    { time: 161.689299, text: '茫茫人生好像荒野' },
    { time: 165.408702, text: '如孩儿能伏于爸爸的肩膊' },
    { time: 169.126814, text: '谁要下车' },
    { time: 172.580902, text: '难离难舍总有一些' },
    { time: 176.296542, text: '常情如此不可推卸' },
    { time: 180.282046, text: '任世间怨我坏' },
    { time: 182.411831, text: '可知我只得你 承受我的狂或野' },
  ],
};

function App() {
  const [songs] = useState<Song[]>(REAL_SONGS);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingReference, setIsRecordingReference] = useState(false);  // 录制参考音高模式
  const [referenceReady, setReferenceReady] = useState(false);  // 参考音高是否已准备好
  const [currentTime, setCurrentTime] = useState(0);
  const [scores, setScores] = useState<RealTimeScore[]>([]);
  const [showVocalCritic, setShowVocalCritic] = useState(false);
  const [recordingId, setRecordingId] = useState('');
  const [audioVisualizerData, setAudioVisualizerData] = useState<Uint8Array | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [audioDuration, setAudioDuration] = useState(260);
  const [alignedLyrics, setAlignedLyrics] = useState<Record<string, LyricLine[]>>(ALIGNED_LYRICS);
  const [showAligner, setShowAligner] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('main');  // 当前页面
  const [currentTool, setCurrentTool] = useState<ToolType>('lyric-align');  // 当前工具
  const [playMode, setPlayMode] = useState<PlayMode>('preview');  // 'preview'=原唱模式, 'karaoke'=伴唱模式
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);  // 调试日志状态
  const [recordingFrames, setRecordingFrames] = useState(0);  // 录制帧数
  const [/* referenceInfo */, setReferenceInfo] = useState<{ duration: number; frames: number; validFrames: number } | null>(null);  // 参考音高信息
  // 评分历史
  const [scoreHistory] = useState([
    { id: '1', songTitle: '十年', artist: '陈奕迅', score: 78, date: '2024-01-15', duration: 245 },
    { id: '2', songTitle: '人间', artist: '王菲', score: 85, date: '2024-01-14', duration: 260 },
    { id: '3', songTitle: '单车', artist: '陈奕迅', score: 92, date: '2024-01-13', duration: 230 },
  ]);

  // 音量控制
  const [volume, setVolume] = useState(80);
  const [reverb, setReverb] = useState(0);
  const [echo, setEcho] = useState(0);
  const [pitchShift, setPitchShift] = useState(0);

  // 音效控制hook
  const { connectAudioElement, setVolume: setAudioVolume, setReverb: setAudioReverb, setEcho: setAudioEcho, setPitchShift: setAudioPitchShift, resetEffects } = useAudioEffects();

  // 练习模式
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  
  const animationRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // 音效控制 - 监听音效参数变化
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      setAudioVolume(volume);
    }
  }, [volume, isPlaying, setAudioVolume]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      setAudioReverb(reverb);
    }
  }, [reverb, isPlaying, setAudioReverb]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      setAudioEcho(echo);
    }
  }, [echo, isPlaying, setAudioEcho]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      setAudioPitchShift(pitchShift);
    }
  }, [pitchShift, isPlaying, setAudioPitchShift]);

  // 音频元素挂载后连接音效处理（播放模式下都应连接音效）
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      // 仅在非录制模式下连接音效处理器（避免在K歌模式下创建MediaElementSourceNode中断伴奏）
      if (!isRecording && !isRecordingReference) {
        connectAudioElement(audioRef.current);
        console.log('🎛️ 音效处理器已连接（非录制模式）');
      }
    }
  }, [isPlaying, isRecording, isRecordingReference, connectAudioElement]);

  // 音频播放时的音量控制
  useEffect(() => {
    if (audioRef.current && (isPlaying || isRecording || isRecordingReference)) {
      audioRef.current.volume = volume / 100;
      console.log(`🔊 音量设置为: ${volume}%`);
    }
  }, [volume, isPlaying, isRecording, isRecordingReference]);

  // WebSocket连接用于实时音高检测（选择歌曲后立即建立连接）
  const { sendAudioData, stopRecording, startReferenceRecording, sendStartKaraoke } = useWebSocket({
    songId: selectedSong?.id || null,
    onPitchData: (data) => {
      // 打印详细的评分数据
      console.log('🎯🎯🎯 [App.tsx] 收到评分数据 (每帧都打印):', {
        时间戳: data.timestamp,
        用户音高: data.userPitch,
        参考音高: data.refPitch,
        音高得分: data.pitchScore,
        综合得分: data.overallScore,
      });
      
      const score: RealTimeScore = {
        timestamp: data.timestamp,
        pitchScore: data.pitchScore,
        rhythmScore: data.rhythmScore,
        overallScore: data.overallScore,
        userPitch: data.userPitch,
        refPitch: data.refPitch,
      };
      
      // 更新 scores 状态
      setScores((prev) => {
        const newScores = [...prev.slice(-100), score];
        console.log(`📊 [App.tsx] scores 状态更新: ${prev.length} -> ${newScores.length}`);
        return newScores;
      });
      
      const centsDiff = Math.round(1200 * Math.log2(data.userPitch / data.refPitch));
      const log: LogEntry = {
        timestamp: Date.now(),
        type: 'score',
        message: `实时评分 #${scores.length + 1}`,
        data: {
          时间: `${currentTime.toFixed(1)}s`,
          用户音高: `${data.userPitch.toFixed(1)}Hz`,
          参考音高: `${data.refPitch.toFixed(1)}Hz`,
          音高偏差: `${centsDiff}音分`,
          音高得分: data.pitchScore.toFixed(1),
          综合得分: data.overallScore.toFixed(1),
        },
      };
      setDebugLogs((prev) => [...prev.slice(-199), log]);
    },
    onLyricUpdate: (lyric) => {
      const log: LogEntry = {
        timestamp: Date.now(),
        type: 'lyric',
        message: `歌词: ${lyric.text}`,
        data: lyric,
      };
      setDebugLogs((prev) => [...prev.slice(-199), log]);
    },
    onLog: (log) => {
      setDebugLogs((prev) => [...prev.slice(-199), log]);
    },
    onReferenceReady: (data) => {
      // 参考音高录制完成
      setReferenceInfo(data);
      setReferenceReady(true);
      setIsRecordingReference(false);
      setIsRecording(false);
      
      // 停止麦克风和音频
      cleanupAudio();
      
      // 显示完成提示
      const log: LogEntry = {
        timestamp: Date.now(),
        type: 'recording',
        message: '🎉 参考音高录制完成！可以开始演唱了',
        data: data,
      };
      setDebugLogs((prev) => [...prev.slice(-199), log]);
    },
    onRecordingStatus: (data) => {
      setRecordingFrames(data.frames);
      if (isRecordingRef.current && data.pitch !== undefined) {
        const recordingScore: RealTimeScore = {
          timestamp: data.timestamp || 0,
          pitchScore: 0,
          rhythmScore: 0,
          overallScore: 0,
          userPitch: data.pitch,
          refPitch: 0,
        };
        setScores((prev) => [...prev.slice(-50), recordingScore]);
      }
    },
  });

  // 获取当前歌曲的歌词
  const currentLyrics = selectedSong 
    ? (alignedLyrics[selectedSong.id] || [])
    : [];

  // 获取当前应该播放的音频URL（根据模式选择原曲或伴奏）
  const currentAudioUrl = selectedSong 
    ? (playMode === 'karaoke' && selectedSong.instrumentalUrl 
        ? selectedSong.instrumentalUrl 
        : selectedSong.audioUrl)
    : undefined;

  // 清理音频资源的函数
  const cleanupAudio = useCallback(() => {
    isRecordingRef.current = false;
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setMicEnabled(false);
  }, []);

  // 录制参考音高（播放伴奏，录制麦克风）
  const handleRecordReference = useCallback(async () => {
    try {
      // 检查是否已选择歌曲
      if (!selectedSong) {
        alert('请先选择一首歌曲');
        return;
      }
      
      // ⚡ 立即设置录制状态，让UI快速响应
      setIsRecordingReference(true);
      
      // 重置状态
      setReferenceReady(false);
      setReferenceInfo(null);
      setScores([]);
      setRecordingFrames(0);
      recordedChunksRef.current = [];
      
      // 获取麦克风权限
      console.log('[MIC] 正在请求麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          sampleRate: 16000
        } 
      });
      console.log('[MIC] 麦克风权限获取成功');
      console.log('[MIC] 流信息:', stream);
      
      // 检查麦克风设备
      const tracks = stream.getAudioTracks();
      console.log('[MIC] 音频轨道数量:', tracks.length);
      if (tracks.length > 0) {
        console.log('[MIC] 设备名称:', tracks[0].label);
        console.log('[MIC] 设备状态:', tracks[0].readyState);
      }
      
      setMicEnabled(true);
      micStreamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      // 创建分析器（用于可视化）
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.0;
      analyserRef.current = analyser;
      
      // 创建ScriptProcessorNode（用于实时音高检测）
      const scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);
      scriptProcessorRef.current = scriptProcessor;
      
      // 将麦克风连接到分析器和ScriptProcessor
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      source.connect(scriptProcessor);
      // 重要：ScriptProcessorNode必须连接到destination才能触发onaudioprocess回调
      // 但我们不希望麦克风声音直接输出到扬声器，所以创建一个静音的GainNode
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;  // 静音
      scriptProcessor.connect(silentGain);
      silentGain.connect(audioContext.destination);
      
      // 设置录音（保存为webm格式）
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100);
      
      // 立即标记为录制状态
      isRecordingRef.current = true;
      console.log('[FLOW] ✅ 步骤6: 录制状态已设置为true');
      
      // 立即通知后端开始录制参考音高
      console.log('[FLOW] ✅ 步骤7: 立即通知后端开始录制');
      startReferenceRecording();
      
      // 处理音频数据（发送到WebSocket用于实时显示）
      let audioFrameCount = 0;
      let firstFrame = true;
      
      scriptProcessor.onaudioprocess = (event) => {
        audioFrameCount++;
        
        if (!isRecordingRef.current) {
          console.log('[FLOW] 步骤8: 录制已停止，跳过音频帧');
          return;
        }
        
        const inputBuffer = event.inputBuffer;
        const channelData = inputBuffer.getChannelData(0);
        const currentTime = audioRef.current?.currentTime || 0;
        
        // 调试：检查音频数据
        const avgValue = channelData.reduce((a, b) => Math.abs(a) + Math.abs(b), 0) / channelData.length;
        const maxValue = Math.max(...channelData.map(v => Math.abs(v)));
        
        if (audioFrameCount % 5 === 0 || firstFrame) {
          console.log(`[FLOW] 步骤8: 音频帧#${audioFrameCount}, 时间: ${currentTime.toFixed(3)}s, 平均振幅: ${avgValue.toExponential(4)}, 最大振幅: ${maxValue.toExponential(4)}`);
          firstFrame = false;
        }
        
        if (avgValue < 0.0001 && maxValue < 0.0001) {
          console.warn('[FLOW] ⚠️ 步骤8警告: 音频数据几乎为0，麦克风可能未正常工作');
        }
        
        // 使用相对时间计算，不受audio.currentTime影响
        const relativeTime = audioFrameCount * 1024 / 16000;
        
        console.log(`[FLOW] 步骤9: 调用sendAudioData, 样本数: ${channelData.length}, 相对时间: ${relativeTime.toFixed(3)}s`);
        sendAudioData(new Float32Array(channelData), relativeTime);
      };
      
      // 播放伴奏（使用HTML5 audio，独立于AudioContext）
      if (audioRef.current) {
        const audioUrl = selectedSong?.instrumentalUrl || selectedSong?.audioUrl || '';
        console.log('[DEBUG] 播放伴奏:', audioUrl);
        
        if (!audioUrl) {
          console.error('[ERROR] 伴奏URL为空');
          alert('找不到伴奏文件，请检查歌曲配置');
          return;
        }
        
        // 等待音频元素准备就绪
      const waitForAudioReady = (): Promise<void> => {
        return new Promise((resolve) => {
          const audio = audioRef.current;
          if (audio && audio.readyState >= 2) {
            resolve();
          } else if (audio) {
            audio.addEventListener('canplay', () => resolve(), { once: true });
          }
        });
      };
        
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = 0;
        
        // 修复：在播放前直接设置音量，确保伴奏能听到
        audioRef.current.volume = volume / 100;
        console.log(`[DEBUG] 音量预设为: ${volume}% (修复首次录制无伴奏问题)`);
        
        // 重新加载音频
        audioRef.current.load();
        
        try {
          await waitForAudioReady();
          console.log('[DEBUG] 音频加载完成');
          
          const playPromise = audioRef.current?.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('[SUCCESS] 伴奏播放成功，当前时间:', audioRef.current?.currentTime);
              console.log('[DEBUG] 音频元素状态:', {
                paused: audioRef.current?.paused,
                muted: audioRef.current?.muted,
                volume: audioRef.current?.volume,
                readyState: audioRef.current?.readyState,
                duration: audioRef.current?.duration,
                currentTime: audioRef.current?.currentTime,
              });
              // 注意：startReferenceRecording已在初始化时立即调用，这里不再重复调用
            }).catch((error) => {
              console.error('[ERROR] 伴奏播放失败:', error);
              // 如果是自动播放策略导致的错误，提示用户交互
              if (error.name === 'NotAllowedError') {
                console.error('[ERROR] 浏览器自动播放策略阻止了播放');
                // 尝试通过用户交互触发播放
                const handleFirstInteraction = () => {
                  audioRef.current?.play().then(() => {
                    console.log('[SUCCESS] 用户交互后伴奏播放成功');
                  }).catch(err => {
                    console.error('[ERROR] 用户交互后播放仍失败:', err);
                  });
                  document.removeEventListener('click', handleFirstInteraction);
                  document.removeEventListener('touchstart', handleFirstInteraction);
                };
                document.addEventListener('click', handleFirstInteraction);
                document.addEventListener('touchstart', handleFirstInteraction);
                alert('浏览器自动播放策略阻止了伴奏播放，请点击页面任意位置继续');
              }
            });
          }
        } catch (error) {
          console.error('[ERROR] 等待音频准备失败:', error);
        }
        
        // 监听播放错误
        audioRef.current.onerror = (e) => {
          console.error('[ERROR] 音频加载错误:', e);
          console.error('[ERROR] audio.error:', audioRef.current?.error);
        };
        
        // 监听播放开始
      audioRef.current.onplay = () => {
        console.log('[EVENT] audio.onplay 触发');
        console.log('[FLOW] ✅ 步骤7: 伴奏已开始播放，开始记录参考音高数据');
        // 通知后端开始录制
        startReferenceRecording();
      };
      } else {
        console.error('[ERROR] audioRef.current 为 null，audio元素可能未渲染');
        alert('音频元素未就绪，请先选择歌曲并确保页面完全加载');
      }
      
      // 启动录制
      isRecordingRef.current = true;
      setIsRecordingReference(true);
      setIsPlaying(true);
      setRecordingId(`ref_${Date.now()}`);
      setPlayMode('karaoke');
      
    } catch (error) {
      console.error('录制参考音高失败:', error);
      alert('无法访问麦克风，请检查权限设置');
      // 重置录制状态
      setIsRecordingReference(false);
      setMicEnabled(false);
    }
  }, [selectedSong, sendAudioData, startReferenceRecording]);

  // 完成参考音高录制并保存音频
  const handleFinishRecording = useCallback(() => {
    // 检查录制时长是否太短（少于1秒）
    const MIN_RECORDING_SECONDS = 1;
    const recordingDuration = recordingFrames * 1024 / 16000;
    
    if (recordingDuration < MIN_RECORDING_SECONDS) {
      alert('录制太短，请重试！建议录制至少1秒的音频。');
      setIsRecordingReference(false);
      setMicEnabled(false);
      stopRecording();
      cleanupAudio();
      return;
    }
    
    // 保存录音
    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      
      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = `reference_${selectedSong?.title || 'audio'}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('参考音高音频已保存:', blob.size, 'bytes');
    }
    
    stopRecording();  // 发送停止录制消息
    cleanupAudio();
    setIsRecordingReference(false);
    setMicEnabled(false);
  }, [stopRecording, cleanupAudio, selectedSong, recordingFrames]);

  // 重新录制参考音高
  const handleReRecordReference = useCallback(() => {
    setReferenceReady(false);
    setReferenceInfo(null);
    handleRecordReference();
  }, [handleRecordReference]);

  // 处理歌词对齐完成
  const handleLyricsAligned = useCallback((lyrics: LyricLine[]) => {
    if (selectedSong) {
      setAlignedLyrics((prev) => ({
        ...prev,
        [selectedSong.id]: lyrics,
      }));
    }
    setShowAligner(false);
  }, [selectedSong]);

  // 处理时间更新（包含练习模式循环）
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    
    // 练习模式循环播放逻辑
    if (loopStart !== null && loopEnd !== null && loopStart < loopEnd) {
      // 检查是否到达循环终点（允许0.5秒的误差）
      if (time >= loopEnd - 0.5 && time <= loopEnd + 0.5) {
        // 自动跳转到循环起点
        if (audioRef.current) {
          audioRef.current.currentTime = loopStart;
          console.log(`🔄 练习模式循环: 从 ${loopEnd.toFixed(1)}s 跳转到 ${loopStart.toFixed(1)}s`);
        }
      }
    }
  }, [loopStart, loopEnd]);

  // 处理播放结束
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (isRecording) {
      // K歌结束时自动停止录音
      handleStopRecording();
    }
  }, [isRecording]);

  // 停止录音并保存
  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setMicEnabled(false);
    
    // 保存录音数据
    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      console.log('录音已保存:', blob.size, 'bytes');
      recordedChunksRef.current = [];
    }
  }, []);

  // 原唱预览模式 - 播放原曲
  const handlePlay = useCallback(() => {
    if (!selectedSong) return;
    
    // 切换到原唱模式
    setPlayMode('preview');
    setIsPlaying(true);
    
    if (audioRef.current) {
      audioRef.current.src = currentAudioUrl || '';
      audioRef.current.play().catch((error) => {
        console.error('播放失败:', error);
      });
    }
  }, [selectedSong, currentAudioUrl]);

  // 暂停
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // K歌模式 - 开始录音+播放伴奏+WebSocket音频处理
  const handleRecord = useCallback(async () => {
    try {
      // 创建Recording记录
      const recordingId = `rec_${Date.now()}`;
      setRecordingId(recordingId);
      
      try {
        await axios.post('/api/recordings', null, {
          params: { song_id: selectedSong?.id || 'unknown' }
        });
        console.log('✅ Recording记录已创建:', recordingId);
      } catch (error) {
        console.warn('⚠️ 创建Recording记录失败，继续录制:', error);
      }
      
      // 先播放伴奏，再获取麦克风权限（防止浏览器静音音频）
      if (audioRef.current && selectedSong?.instrumentalUrl) {
        audioRef.current.src = selectedSong.instrumentalUrl;
        audioRef.current.currentTime = 0;
        audioRef.current.load(); // 确保音频重新加载
        
        // 等待音频加载完成
        await new Promise((resolve) => {
          audioRef.current?.addEventListener('canplaythrough', resolve, { once: true });
          // 超时处理
          setTimeout(resolve, 5000);
        });
        
        await audioRef.current.play().catch((error) => {
          console.error('伴奏播放失败:', error);
        });
        console.log('[DEBUG] K歌模式 - 伴奏播放成功');
      }
      
      // 获取麦克风权限（禁用自动增益控制，避免影响伴奏音量）
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          sampleRate: 16000
        } 
      });
      console.log('麦克风流获取成功:', stream);
      console.log('麦克风轨道:', stream.getAudioTracks());
      
      // 显示麦克风设备信息
      const tracks = stream.getAudioTracks();
      if (tracks.length > 0) {
        const track = tracks[0];
        console.log('麦克风设备信息:', {
          label: track.label,
          deviceId: track.getSettings().deviceId,
          sampleRate: track.getSettings().sampleRate,
          channelCount: track.getSettings().channelCount
        });
      }
      
      setMicEnabled(true);
      micStreamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      console.log('AudioContext创建成功:', audioContext);
      console.log('AudioContext采样率:', audioContext.sampleRate);
      audioContextRef.current = audioContext;
      
      // 创建分析器用于可视化和音频数据获取
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.0;  // 关闭平滑，获取原始数据
      console.log('Analyser创建成功:', analyser);
      analyserRef.current = analyser;
      
      // 创建ScriptProcessorNode用于直接获取音频数据
      const scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);
      console.log('ScriptProcessorNode创建成功:', scriptProcessor);
      
      // 将麦克风连接到分析器和ScriptProcessor
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      source.connect(scriptProcessor);
      
      // 重要：ScriptProcessorNode必须连接到destination才能触发onaudioprocess回调
      // 创建静音的GainNode，避免麦克风声音直接输出到扬声器
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;  // 静音
      scriptProcessor.connect(silentGain);
      silentGain.connect(audioContext.destination);
      
      // 添加耳机监听（让用户能听到自己的声音）- 可选功能
      const enableHeadphoneMonitoring = false;  // 禁用耳机监听，避免干扰伴奏
      if (enableHeadphoneMonitoring) {
        const monitorGain = audioContext.createGain();
        monitorGain.gain.value = 0.3;  // 降低监听音量
        analyser.connect(monitorGain);
        monitorGain.connect(audioContext.destination);
        console.log('麦克风耳机监听已启用');
      } else {
        console.log('麦克风耳机监听已禁用（避免干扰伴奏）');
      }
      
      // 存储脚本处理器引用
      scriptProcessorRef.current = scriptProcessor;
      
      // 立即测试麦克风数据
      setTimeout(() => {
        const testData = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatTimeDomainData(testData);
        const maxVal = Math.max(...testData);
        console.log('🔊 麦克风数据测试:', {
          maxValue: maxVal,
          hasData: maxVal > 0.001,
          firstValues: testData.slice(0, 5)
        });
      }, 500);
      
      // 设置录音
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100);  // 每100ms录制一块
      
      // 使用 ScriptProcessorNode 获取音频数据
      let sampleBuffer: Float32Array[] = [];
      const targetSamplesPerChunk = 1024;
      
      scriptProcessor.onaudioprocess = (event) => {
        if (!isRecordingRef.current) return;
        
        // 从麦克风获取音频数据
        const inputBuffer = event.inputBuffer;
        const channelData = inputBuffer.getChannelData(0);
        
        // 详细的音频数据分析
        const maxVal = Math.max(...channelData);
        const minVal = Math.min(...channelData);
        const rms = Math.sqrt(channelData.reduce((sum, val) => sum + val * val, 0) / channelData.length);
        const avgAbs = channelData.reduce((sum, val) => sum + Math.abs(val), 0) / channelData.length;
        const hasData = maxVal > 0.001 || Math.abs(minVal) > 0.001;
        
        // 打印详细音频数据（每10帧打印一次）
        if (!hasData) {
          console.log('⚠️ [MIC-DEBUG] 麦克风数据接近零:');
          console.log('   maxVal:', maxVal.toExponential(6));
          console.log('   minVal:', minVal.toExponential(6));
          console.log('   rms:', rms.toExponential(6));
          console.log('   avgAbs:', avgAbs.toExponential(6));
          console.log('   前10个样本:', Array.from(channelData.slice(0, 10)).map(v => v.toExponential(6)));
        } else if (Math.random() < 0.1) {  // 10%的概率打印有数据的帧
          console.log('✅ [MIC-DEBUG] 麦克风数据正常:');
          console.log('   maxVal:', maxVal.toFixed(6));
          console.log('   minVal:', minVal.toFixed(6));
          console.log('   rms:', rms.toFixed(6));
          console.log('   avgAbs:', avgAbs.toFixed(6));
          console.log('   前10个样本:', Array.from(channelData.slice(0, 10)).map(v => v.toFixed(6)));
        }
        
        // 累积样本
        sampleBuffer.push(new Float32Array(channelData));
        
        // 当累积足够样本时发送
        const totalSamples = sampleBuffer.reduce((sum, buf) => sum + buf.length, 0);
        if (totalSamples >= targetSamplesPerChunk) {
          // 合并缓冲区
          const mergedBuffer = new Float32Array(totalSamples);
          let offset = 0;
          for (const buf of sampleBuffer) {
            mergedBuffer.set(buf, offset);
            offset += buf.length;
          }
          
          // 获取当前播放时间
          const currentTime = audioRef.current?.currentTime || 0;
          
          // 打印发送的音频数据统计
          const mergedMax = Math.max(...mergedBuffer.slice(0, targetSamplesPerChunk));
          const mergedMin = Math.min(...mergedBuffer.slice(0, targetSamplesPerChunk));
          const mergedRms = Math.sqrt(mergedBuffer.slice(0, targetSamplesPerChunk).reduce((sum, val) => sum + val * val, 0) / targetSamplesPerChunk);
          
          console.log('📤 [SEND-AUDIO] 发送音频帧:');
          console.log('   样本数:', targetSamplesPerChunk);
          console.log('   时间戳:', currentTime.toFixed(3) + 's');
          console.log('   maxVal:', mergedMax.toFixed(6));
          console.log('   minVal:', mergedMin.toFixed(6));
          console.log('   rms:', mergedRms.toFixed(6));
          
          // 发送到WebSocket
          sendAudioData(mergedBuffer.slice(0, targetSamplesPerChunk), currentTime);
          
          // 更新音频可视化数据
          const frequencyData = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(frequencyData);
          setAudioVisualizerData(frequencyData);
          
          // 保留剩余样本
          sampleBuffer = totalSamples > targetSamplesPerChunk 
            ? [mergedBuffer.slice(targetSamplesPerChunk)]
            : [];
        }
      };
      
      // 启动录音
      isRecordingRef.current = true;
      
      // 通知后端开始K歌模式（使用专门的K歌消息类型）
      console.log('[K歌模式] 通知后端开始K歌');
      sendStartKaraoke();
      
      // 切换到伴唱模式
      setPlayMode('karaoke');
      setIsRecording(true);
      setRecordingId(`rec_${Date.now()}`);
      setScores([]);
      setIsPlaying(true);
      
    } catch (error) {
      console.error('麦克风访问失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  }, [selectedSong, sendAudioData, sendStartKaraoke]);

  // 停止
  const handleStop = useCallback(() => {
    // 停止音频处理循环
    isRecordingRef.current = false;
    
    // 停止音频处理器
    if ((window as any).__audioProcessor) {
      (window as any).__audioProcessor.disconnect();
      (window as any).__audioProcessor = null;
    }
    
    // 停止interval（备用）
    if ((window as any).__audioInterval) {
      clearInterval((window as any).__audioInterval);
      (window as any).__audioInterval = null;
    }
    
    // 停止录音
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // 停止所有媒体轨道
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    // 关闭AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    
    setIsRecording(false);
    setIsPlaying(false);
    setMicEnabled(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // 保存录音并上传到服务器
    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      console.log('🎤 录音已保存:', blob.size, 'bytes');
      
      // 上传录音到服务器
      if (recordingId) {
        const formData = new FormData();
        formData.append('file', blob, `${recordingId}.webm`);
        
        axios.post(`/api/recordings/${recordingId}/audio`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        .then(() => {
          console.log('✅ 录音已上传到服务器');
        })
        .catch((error) => {
          console.error('❌ 录音上传失败:', error);
        });
        
        // 保存评分数据到服务器
        if (scores.length > 0) {
          axios.post(`/api/recordings/${recordingId}/scores`, {
            scores: scores,
            songId: selectedSong?.id || 'unknown',
            recordedAt: new Date().toISOString(),
          })
          .then(() => {
            console.log('✅ 评分数据已保存到服务器');
          })
          .catch((error) => {
            console.error('❌ 评分数据保存失败:', error);
          });
        }
      }
      
      recordedChunksRef.current = [];
    }
  }, [recordingId, scores, selectedSong]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const handleVocalCritic = useCallback(() => {
    setShowVocalCritic(true);
    if (!recordingId) {
      setRecordingId(`rec_${Date.now()}`);
    }
  }, [recordingId]);

  // 加载音频时获取时长
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 260);
    }
  }, []);

  return (
    <div className="app-container">
      {/* 隐藏的音频元素 */}
      {selectedSong?.audioUrl && (
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          onTimeUpdate={() => handleTimeUpdate(audioRef.current?.currentTime || 0)}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
          crossOrigin="anonymous"
        />
      )}

      <header className="app-header">
        <h1>🎤 AI K歌 - 声乐导师平台</h1>
        <p>实时K歌体验 + 智能声乐点评</p>
        {micEnabled && <span className="mic-status">🎙️ 麦克风已开启</span>}
        <span className={`mode-indicator ${playMode}`}>
          {playMode === 'preview' ? '🎵 原唱模式' : '🎤 伴唱模式'}
        </span>
        <div className="header-actions">
          <button 
            className={`page-btn ${currentPage === 'main' ? 'active' : ''}`}
            onClick={() => setCurrentPage('main')}
          >
            🎶 主页面
          </button>
          <button 
            className={`page-btn ${currentPage === 'tools' ? 'active' : ''}`}
            onClick={() => setCurrentPage('tools')}
          >
            ⚙️ 工具
          </button>
        </div>
      </header>

      <main className="main-content">
        {currentPage === 'main' ? (
          <>
            <aside className="sidebar">
              <SongSelector
                songs={songs}
                selectedSong={selectedSong}
                onSelect={setSelectedSong}
              />
              <ScoreHistory history={scoreHistory} />
            </aside>

            <section className="main-panel">
          {selectedSong ? (
            <>
              <div className="song-info-bar">
                <div className="song-title-section">
                  <h2>{selectedSong.title}</h2>
                  <span className="artist">{selectedSong.artist}</span>
                </div>
                <div className="song-actions">
                  <button className="action-btn">
                    ❤️ 收藏
                  </button>
                  <button className="action-btn">
                    📤 分享
                  </button>
                  <span className="audio-source">
                    {playMode === 'preview' ? '📀 原曲' : '🎶 伴奏'}
                  </span>
                </div>
              </div>

              <ProgressBar
                currentTime={currentTime}
                duration={audioDuration}
                loopStart={loopStart}
                loopEnd={loopEnd}
                onSeek={handleSeek}
              />

              <div className="content-grid">
                <div className="left-panel">
                  <LyricDisplay lyrics={currentLyrics} currentTime={currentTime} />
                  <AudioVisualizer audioData={audioVisualizerData} />
                  <PracticeMode
                    lyrics={currentLyrics.map(l => l.text)}
                    onSelectSection={(start, end) => {
                      setLoopStart(start);
                      setLoopEnd(end);
                      handleSeek(start);
                    }}
                    currentTime={currentTime}
                  />
                </div>

                <div className="right-panel">
                  <PitchChart scores={scores} />
                  <ScorePanel scores={scores} />
                  <AudioEffectsComponent
                    volume={volume}
                    reverb={reverb}
                    echo={echo}
                    pitchShift={pitchShift}
                    onVolumeChange={setVolume}
                    onReverbChange={setReverb}
                    onEchoChange={setEcho}
                    onPitchShiftChange={setPitchShift}
                    onReset={() => {
                      setVolume(80);
                      setReverb(0);
                      setEcho(0);
                      setPitchShift(0);
                      resetEffects();
                    }}
                  />
                </div>
              </div>

              <PlayerControls
                isPlaying={isPlaying}
                isRecording={isRecording}
                isRecordingReference={isRecordingReference}
                referenceReady={referenceReady}
                recordingFrames={recordingFrames}
                currentTime={currentTime}
                duration={audioDuration}
                onPlay={handlePlay}
                onPause={handlePause}
                onRecord={handleRecord}
                onStop={handleStop}
                onSeek={handleSeek}
                onVocalCritic={handleVocalCritic}
                onRecordReference={handleRecordReference}
                onFinishRecording={handleFinishRecording}
                onReRecordReference={handleReRecordReference}
              />
            </>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-icon">🎤</div>
              <h2>欢迎使用 AI K歌 声乐导师平台</h2>
              <p className="welcome-highlight">👈 请从左侧歌曲库选择一首歌曲</p>
              <p className="welcome-subtitle">选择歌曲后即可开始演唱评分</p>
              <div className="welcome-steps">
                <div className="step">
                  <span className="step-num">1</span>
                  <span className="step-text">选择歌曲</span>
                </div>
                <div className="step">
                  <span className="step-num">2</span>
                  <span className="step-text">点击"演唱"按钮</span>
                </div>
                <div className="step">
                  <span className="step-num">3</span>
                  <span className="step-text">查看实时音高曲线</span>
                </div>
              </div>
              <div className="features">
                <div className="feature">
                  <span className="feature-icon">🎯</span>
                  <span className="feature-text">实时音高检测</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">📊</span>
                  <span className="feature-text">AI智能评分</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">💡</span>
                  <span className="feature-text">专业声乐点评</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">🎛️</span>
                  <span className="feature-text">音效控制</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">🎯</span>
                  <span className="feature-text">分段练习</span>
                </div>
              </div>
            </div>
          )}
            </section>
          </>
        ) : (
          // 工具页面
            <section className="tools-panel">
              <div className="tools-header">
                <h2>⚙️ 工具中心</h2>
                <p>选择一个工具来使用</p>
              </div>
              
              <div className="tools-list">
                <div 
                  className={`tool-card ${currentTool === 'lyric-align' ? 'selected' : ''}`}
                  onClick={() => setCurrentTool('lyric-align')}
                >
                  <div className="tool-icon">🎯</div>
                  <div className="tool-info">
                    <h3>歌词对齐校准</h3>
                    <p>播放原曲，标记每句歌词的开始时间</p>
                  </div>
                </div>
                
                <div 
                  className={`tool-card ${currentTool === 'reference-record' ? 'selected' : ''}`}
                  onClick={() => setCurrentTool('reference-record')}
                >
                  <div className="tool-icon">🎤</div>
                  <div className="tool-info">
                    <h3>参考音高录制</h3>
                    <p>录制纯净人声作为参考音高用于评分</p>
                  </div>
                </div>
              </div>

              <div className="tool-content">
                {currentTool === 'lyric-align' && selectedSong?.audioUrl && (
                  <LyricAligner
                    audioUrl={selectedSong.audioUrl}
                    rawLyrics={RAW_LYRICS[selectedSong.id] || []}
                    onComplete={handleLyricsAligned}
                    onClose={() => setCurrentPage('main')}
                  />
                )}
                
                {currentTool === 'reference-record' && selectedSong && (
                  <ReferenceRecorder
                    song={selectedSong}
                    onComplete={(audioData) => {
                      console.log('🎤 参考音高录制完成，音频数据:', audioData.size, 'bytes');
                      // 保存音频数据到本地
                      const url = URL.createObjectURL(audioData);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `reference_${selectedSong.id}.wav`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    onStartRecording={startReferenceRecording}
                    onStopRecording={stopRecording}
                    sendAudioData={sendAudioData}
                    onRecordingStart={() => setIsRecordingReference(true)}
                    onRecordingStop={() => setIsRecordingReference(false)}
                    onClose={() => setCurrentPage('main')}
                  />
                )}
                
                {!selectedSong && (
                  <div className="no-song-warning">
                    <span className="warning-icon">⚠️</span>
                    <p>请先在主页面选择一首歌曲</p>
                    <button className="btn btn-primary" onClick={() => setCurrentPage('main')}>
                      🎶 返回主页面选择歌曲
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

      {showVocalCritic && (
        <VocalCritic
          songId={selectedSong?.id || ''}
          recordingId={recordingId}
          onClose={() => setShowVocalCritic(false)}
        />
      )}

      {showAligner && selectedSong?.audioUrl && (
        <LyricAligner
          audioUrl={selectedSong.audioUrl}  // 对齐工具使用原曲
          rawLyrics={RAW_LYRICS[selectedSong.id] || []}
          onComplete={handleLyricsAligned}
          onClose={() => setShowAligner(false)}
        />
      )}

      {/* 调试日志面板 */}
      <DebugLog logs={debugLogs} maxLogs={200} />

      {/* 🎯 实时数据监控面板（调试用） */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.85)',
        color: '#00ffcc',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #00ffcc',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '280px',
        boxShadow: '0 0 20px rgba(0, 255, 204, 0.3)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#fbbf24' }}>
          🎯 PitchChart 数据监控
        </div>
        <div>scores 数量: <span style={{ color: scores.length > 0 ? '#22c55e' : '#ef4444' }}>{scores.length}</span></div>
        {scores.length > 0 && (
          <>
            <div>最新时间戳: {scores[scores.length - 1].timestamp.toFixed(3)}s</div>
            <div>参考音高: <span style={{ color: scores[scores.length - 1].refPitch > 0 ? '#22c55e' : '#888' }}>
              {scores[scores.length - 1].refPitch > 0 ? scores[scores.length - 1].refPitch.toFixed(1) + ' Hz' : '0 (无)'}
            </span></div>
            <div>用户音高: <span style={{ color: scores[scores.length - 1].userPitch > 0 ? '#ef4444' : '#888' }}>
              {scores[scores.length - 1].userPitch > 0 ? scores[scores.length - 1].userPitch.toFixed(1) + ' Hz' : '0 (无)'}
            </span></div>
            <div>综合评分: {scores[scores.length - 1].overallScore.toFixed(1)}</div>
            <div>非零 ref: {scores.filter(s => s.refPitch > 0).length} / {scores.length}</div>
            <div>非零 user: {scores.filter(s => s.userPitch > 0).length} / {scores.length}</div>
          </>
        )}
        {scores.length === 0 && (
          <div style={{ color: '#ef4444', marginTop: '4px' }}>
            ⚠️ scores 为空，检查后端 WebSocket 是否返回 score 类型消息
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
