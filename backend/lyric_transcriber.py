#!/usr/bin/env python3
"""
歌词转录模块 - 使用WhisperX进行歌词识别和时间戳对齐
"""
import os
import whisperx
import torch
import json
from pathlib import Path

class LyricTranscriber:
    """使用WhisperX进行歌词转录"""
    
    def __init__(self, model_size="base"):
        """
        初始化歌词转录器
        
        Args:
            model_size: Whisper模型大小，可选: 'tiny', 'base', 'small', 'medium', 'large'
        """
        self.model_size = model_size
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.alignment_model = None
        self.metadata = None
        
        print(f"🎵 歌词转录器初始化中...")
        print(f"   设备: {self.device}")
        print(f"   模型: {model_size}")
    
    def _load_model(self):
        """延迟加载模型"""
        if self.model is None:
            print(f"   正在加载Whisper模型...")
            self.model = whisperx.load_model(self.model_size, self.device)
            print(f"   正在加载对齐模型...")
            self.alignment_model, self.metadata = whisperx.load_align_model(language_code="zh", device=self.device)
            print(f"   模型加载完成!")
    
    def transcribe(self, audio_path, output_dir=None, language="zh"):
        """
        转录音频并生成带时间戳的歌词
        
        Args:
            audio_path: 输入音频文件路径
            output_dir: 输出目录，None则使用临时目录
            language: 音频语言，默认为中文
            
        Returns:
            dict: 包含歌词和时间戳的字典
        """
        self._load_model()
        
        print(f"🎵 正在转录音频...")
        print(f"   输入: {audio_path}")
        
        # 加载音频
        audio = whisperx.load_audio(audio_path)
        
        # 转录
        print(f"   正在识别歌词...")
        result = self.model.transcribe(audio, language=language)
        
        # 对齐（添加时间戳）
        if self.alignment_model is not None:
            print(f"   正在对齐时间戳...")
            result = whisperx.align(result["segments"], self.alignment_model, self.metadata, audio, self.device)
        
        # 转换为歌词格式
        lyrics = []
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                lyrics.append({
                    "time": word.get("start", segment.get("start", 0)),
                    "text": word.get("word", segment.get("text", "")),
                    "confidence": word.get("probability", segment.get("avg_logprob", 0))
                })
        
        # 如果没有words字段，使用segments
        if not lyrics and "segments" in result:
            for segment in result["segments"]:
                lyrics.append({
                    "time": segment.get("start", 0),
                    "text": segment.get("text", ""),
                    "confidence": segment.get("avg_logprob", 0)
                })
        
        print(f"   转录完成! 共 {len(lyrics)} 条歌词")
        
        # 保存LRC文件
        if output_dir:
            self._save_lrc(lyrics, audio_path, output_dir)
        
        return {
            "lyrics": lyrics,
            "language": result.get("language", language),
            "duration": result.get("duration", 0)
        }
    
    def _save_lrc(self, lyrics, audio_path, output_dir):
        """保存为LRC格式"""
        base_name = Path(audio_path).stem
        lrc_path = os.path.join(output_dir, f"{base_name}.lrc")
        
        with open(lrc_path, 'w', encoding='utf-8') as f:
            # LRC头
            f.write("[ti:歌词]\n")
            f.write("[ar:歌手]\n")
            f.write("[al:专辑]\n\n")
            
            # 歌词内容
            for lyric in lyrics:
                minutes = int(lyric['time'] // 60)
                seconds = lyric['time'] % 60
                time_str = f"{minutes:02d}:{seconds:05.2f}"
                f.write(f"[{time_str}]{lyric['text']}\n")
        
        print(f"   LRC文件已保存: {lrc_path}")
    
    def transcribe_fast(self, audio_path, output_dir=None):
        """
        快速转录（使用更轻量的模型）
        
        Args:
            audio_path: 输入音频文件路径
            output_dir: 输出目录
            
        Returns:
            dict: 包含歌词和时间戳的字典
        """
        # 临时切换到轻量模型
        original_model = self.model_size
        self.model_size = "tiny"
        self.model = None  # 强制重新加载
        result = self.transcribe(audio_path, output_dir)
        self.model_size = original_model
        return result
    
    def load_lrc(self, lrc_path):
        """
        从LRC文件加载歌词
        
        Args:
            lrc_path: LRC文件路径
            
        Returns:
            list: 歌词列表
        """
        lyrics = []
        
        try:
            with open(lrc_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or not line.startswith('['):
                        continue
                    
                    # 解析时间戳 [mm:ss.xx]
                    if line[1:3].isdigit():
                        try:
                            parts = line[1:].split(']', 1)
                            if len(parts) == 2:
                                time_str = parts[0]
                                text = parts[1].strip()
                                
                                # 解析时间
                                time_parts = time_str.split(':')
                                if len(time_parts) == 2:
                                    minutes = int(time_parts[0])
                                    seconds = float(time_parts[1])
                                    timestamp = minutes * 60 + seconds
                                    
                                    lyrics.append({
                                        "time": timestamp,
                                        "text": text
                                    })
                        except (ValueError, IndexError):
                            continue
        
        except FileNotFoundError:
            print(f"错误: LRC文件不存在 {lrc_path}")
        
        return lyrics

def main():
    """测试歌词转录功能"""
    import sys
    
    if len(sys.argv) < 2:
        print("用法: python lyric_transcriber.py <音频文件路径>")
        return
    
    audio_path = sys.argv[1]
    
    if not os.path.exists(audio_path):
        print(f"错误: 文件不存在 {audio_path}")
        return
    
    # 初始化转录器
    transcriber = LyricTranscriber(model_size="base")
    
    # 执行转录
    result = transcriber.transcribe(audio_path, output_dir="..")
    
    print(f"\n✅ 歌词转录完成!")
    print(f"语言: {result['language']}")
    print(f"时长: {result['duration']:.1f}秒")
    print(f"歌词数量: {len(result['lyrics'])}")
    print("\n前5句歌词:")
    for i, lyric in enumerate(result['lyrics'][:5]):
        print(f"  {lyric['time']:.2f}s: {lyric['text']}")

if __name__ == "__main__":
    main()