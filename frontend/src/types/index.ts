export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverUrl?: string;
  audioUrl?: string;      // 原曲音频
  instrumentalUrl?: string;  // 伴奏音频
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface PitchData {
  time: number;
  frequency: number;
  confidence: number;
}

export interface RealTimeScore {
  timestamp: number;
  pitchScore: number;
  rhythmScore: number;
  overallScore: number;
  userPitch: number;
  refPitch: number;
}

export interface VocalCriticResult {
  id: string;
  status: 'pending' | 'processing' | 'completed';
  breathing: string;
  timbre: string;
  emotion: string;
  technique: string;
  suggestions: string[];
}

export interface WebSocketMessage {
  type: 'pitch' | 'score' | 'lyric' | 'end';
  data: RealTimeScore | LyricLine | string;
}