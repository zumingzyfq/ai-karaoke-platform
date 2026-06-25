#!/usr/bin/env python
"""
歌曲预处理脚本 - 在系统启动时自动提取人声和音高数据
"""

import os
import json
import time
from pathlib import Path

# 设置路径
BASE_DIR = Path(__file__).parent
AUDIO_DIR = BASE_DIR / "audio" / "songs"
CACHE_DIR = BASE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

def preprocess_song(song_id: str, audio_path: str):
    """预处理单首歌曲"""
    print(f"Processing: {song_id}")
    start_time = time.time()
    
    # 检查缓存是否已存在
    pitch_cache_path = CACHE_DIR / f"{song_id}_pitches.json"
    vocal_cache_path = CACHE_DIR / f"{song_id}_vocal.npy"
    
    if pitch_cache_path.exists():
        print(f"  [SKIP] {song_id} already cached")
        return
    
    try:
        # 延迟导入以加快启动速度
        from vocal_separator import VocalSeparator
        from pitch_detector import PitchDetector
        
        # 初始化模型
        separator = VocalSeparator()
        pitch_detector = PitchDetector()
        
        # 1. 人声分离
        print("  Step 1: Separating vocals...")
        vocal_audio = separator.separate(audio_path)
        
        # 保存分离后的人声
        import numpy as np
        np.save(vocal_cache_path, vocal_audio)
        
        # 2. 音高检测
        print("  Step 2: Extracting pitch...")
        pitches = pitch_detector.detect(vocal_audio)
        
        # 3. 保存音高数据
        with open(pitch_cache_path, 'w', encoding='utf-8') as f:
            json.dump(pitches, f, ensure_ascii=False, indent=2)
        
        elapsed = time.time() - start_time
        print(f"  [DONE] {song_id} completed in {elapsed:.2f} seconds")
        
    except Exception as e:
        print(f"  [ERROR] {song_id} failed: {str(e)}")

def preprocess_all_songs():
    """预处理所有歌曲"""
    print("=" * 50)
    print("Starting preprocessing for all songs...")
    print("=" * 50)
    
    songs = [
        {"id": "renjian", "file": "人间原版.mp3"},
        {"id": "shinian", "file": "十年原版.mp3"},
        {"id": "danche", "file": "单车原版.mp3"},
    ]
    
    for song in songs:
        audio_path = AUDIO_DIR / song["file"]
        if audio_path.exists():
            preprocess_song(song["id"], str(audio_path))
        else:
            print(f"  [WARN] File not found: {audio_path}")
    
    print("=" * 50)
    print("Preprocessing completed!")
    print("=" * 50)

if __name__ == "__main__":
    preprocess_all_songs()