#!/usr/bin/env python3
"""
MIDI模板下载和生成脚本
用于下载或生成歌曲的MIDI参考模板
"""

import os
import sys
import json
import requests
from pathlib import Path

# 添加backend路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from midi_pitch_extractor import MIDIPitchExtractor, note_name_to_midi_number, midi_number_to_frequency
    HAS_MIDI_EXTRACTOR = True
except ImportError:
    HAS_MIDI_EXTRACTOR = False
    print("⚠️ MIDI提取模块不可用")

# MIDI文件下载源
MIDI_SOURCES = {
    "danche": {
        "name": "单车",
        "artist": "陈奕迅",
        "url": "https://www.everyonepiano.cn/Midi-2230.html",
        # 简化的音符数据（用于生成基础模板）
        "notes": [
            # 主旋律简化版 - G调
            # "不要不要假设我知道"
            {"pitch": 67, "start": 0.0, "duration": 0.5},   # G4
            {"pitch": 67, "start": 0.5, "duration": 0.5},   # G4
            {"pitch": 69, "start": 1.0, "duration": 0.5},   # A4
            {"pitch": 67, "start": 1.5, "duration": 0.5},   # G4
            {"pitch": 64, "start": 2.0, "duration": 0.5},   # E4
            {"pitch": 62, "start": 2.5, "duration": 0.5},   # D4
            {"pitch": 60, "start": 3.0, "duration": 1.0},   # C4
            # "一切一切也都是为我而做"
            {"pitch": 67, "start": 4.0, "duration": 0.5},   # G4
            {"pitch": 67, "start": 4.5, "duration": 0.5},   # G4
            {"pitch": 69, "start": 5.0, "duration": 0.5},   # A4
            {"pitch": 71, "start": 5.5, "duration": 0.5},   # B4
            {"pitch": 72, "start": 6.0, "duration": 0.5},   # C5
            {"pitch": 71, "start": 6.5, "duration": 0.5},   # B4
            {"pitch": 69, "start": 7.0, "duration": 1.0},   # A4
            # "为何这么伟大"
            {"pitch": 67, "start": 8.0, "duration": 0.5},   # G4
            {"pitch": 69, "start": 8.5, "duration": 0.5},   # A4
            {"pitch": 71, "start": 9.0, "duration": 0.5},   # B4
            {"pitch": 72, "start": 9.5, "duration": 1.0},   # C5
            # "如此感觉不到"
            {"pitch": 71, "start": 10.5, "duration": 0.5},  # B4
            {"pitch": 69, "start": 11.0, "duration": 0.5},  # A4
            {"pitch": 67, "start": 11.5, "duration": 0.5},  # G4
            {"pitch": 64, "start": 12.0, "duration": 1.0},  # E4
        ]
    },
    "renjian": {
        "name": "人间",
        "artist": "王菲",
        "notes": [
            {"pitch": 64, "start": 0.0, "duration": 0.5},
            {"pitch": 66, "start": 0.5, "duration": 0.5},
            {"pitch": 68, "start": 1.0, "duration": 0.5},
            {"pitch": 69, "start": 1.5, "duration": 0.5},
            {"pitch": 71, "start": 2.0, "duration": 1.0},
        ]
    },
    "shinian": {
        "name": "十年",
        "artist": "陈奕迅",
        "notes": [
            {"pitch": 60, "start": 0.0, "duration": 0.5},
            {"pitch": 62, "start": 0.5, "duration": 0.5},
            {"pitch": 64, "start": 1.0, "duration": 0.5},
            {"pitch": 65, "start": 1.5, "duration": 0.5},
            {"pitch": 67, "start": 2.0, "duration": 1.0},
        ]
    }
}


def download_midi_file(song_id: str, output_dir: str) -> str:
    """下载或生成MIDI文件"""
    song_info = MIDI_SOURCES.get(song_id)
    if not song_info:
        print(f"⚠️ 未找到歌曲 {song_id} 的信息")
        return None
    
    output_path = os.path.join(output_dir, f"{song_id}.mid")
    
    # 使用内置音符数据生成MIDI
    if song_info.get("notes") and HAS_MIDI_EXTRACTOR:
        print(f"🎵 使用内置音符数据生成MIDI模板: {song_info['name']}")
        extractor = MIDIPitchExtractor()
        try:
            extractor.create_midi_template(
                song_info['name'],
                song_info['notes'],
                output_path
            )
            return output_path
        except Exception as e:
            print(f"❌ MIDI生成失败: {e}")
    
    return None


def generate_midi_pitch_cache(song_id: str, midi_path: str, output_dir: str) -> str:
    """从MIDI文件生成音高缓存数据"""
    if not HAS_MIDI_EXTRACTOR:
        print("❌ MIDI提取模块不可用，请安装 pretty_midi 或 mido")
        return None
    
    try:
        extractor = MIDIPitchExtractor()
        pitch_data = extractor.extract_from_midi_file(midi_path)
        
        output_path = os.path.join(output_dir, f"{song_id}_midi_pitches.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(pitch_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ MIDI音高缓存已生成: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"❌ MIDI音高提取失败: {e}")
        import traceback
        traceback.print_exc()
        return None


def prepare_all_midi_templates():
    """为所有歌曲准备MIDI模板"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    midi_dir = os.path.join(base_dir, "audio", "midi")
    cache_dir = os.path.join(base_dir, "cache")
    
    os.makedirs(midi_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)
    
    print("=" * 60)
    print("开始准备MIDI模板...")
    print("=" * 60)
    
    for song_id, song_info in MIDI_SOURCES.items():
        print(f"\n处理歌曲: {song_info['name']} - {song_info['artist']}")
        
        cache_path = os.path.join(cache_dir, f"{song_id}_midi_pitches.json")
        if os.path.exists(cache_path):
            print(f"  [SKIP] 缓存已存在: {cache_path}")
            continue
        
        midi_path = download_midi_file(song_id, midi_dir)
        if midi_path and os.path.exists(midi_path):
            generate_midi_pitch_cache(song_id, midi_path, cache_dir)
        else:
            print(f"  [WARN] 无法获取MIDI文件，跳过")
    
    print("=" * 60)
    print("MIDI模板准备完成!")
    print("=" * 60)


if __name__ == "__main__":
    print("\n依赖库安装:")
    print("  pip install pretty_midi  # 推荐")
    print("  pip install mido         # 备选")
    
    prepare_all_midi_templates()