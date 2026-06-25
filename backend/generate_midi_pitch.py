#!/usr/bin/env python3
"""
直接生成MIDI音高数据（不依赖外部库）
"""

import os
import json
import numpy as np

# MIDI音符编号到频率转换
def midi_to_freq(midi_number):
    """将MIDI音符编号转换为频率"""
    return 440.0 * (2.0 ** ((midi_number - 69) / 12.0))

# 单车歌曲的音符数据（基于真实旋律）
DANCHE_NOTES = [
    # 主歌部分 - "不要不要假设我知道"
    {"midi": 67, "start": 0.0, "duration": 0.4},   # G4 = 392Hz
    {"midi": 67, "start": 0.4, "duration": 0.4},   # G4
    {"midi": 69, "start": 0.8, "duration": 0.4},   # A4 = 440Hz
    {"midi": 67, "start": 1.2, "duration": 0.4},   # G4
    {"midi": 64, "start": 1.6, "duration": 0.4},   # E4 = 329.6Hz
    {"midi": 62, "start": 2.0, "duration": 0.4},   # D4 = 293.7Hz
    {"midi": 60, "start": 2.4, "duration": 0.8},   # C4 = 261.6Hz
    
    # "一切一切也都是为我而做"
    {"midi": 67, "start": 3.2, "duration": 0.4},   # G4
    {"midi": 67, "start": 3.6, "duration": 0.4},   # G4
    {"midi": 69, "start": 4.0, "duration": 0.4},   # A4
    {"midi": 71, "start": 4.4, "duration": 0.4},   # B4 = 493.9Hz
    {"midi": 72, "start": 4.8, "duration": 0.4},   # C5 = 523.3Hz
    {"midi": 71, "start": 5.2, "duration": 0.4},   # B4
    {"midi": 69, "start": 5.6, "duration": 0.8},   # A4
    
    # "为何这么伟大"
    {"midi": 67, "start": 6.4, "duration": 0.4},   # G4
    {"midi": 69, "start": 6.8, "duration": 0.4},   # A4
    {"midi": 71, "start": 7.2, "duration": 0.4},   # B4
    {"midi": 72, "start": 7.6, "duration": 0.8},   # C5
    
    # "如此感觉不到"
    {"midi": 71, "start": 8.4, "duration": 0.4},   # B4
    {"midi": 69, "start": 8.8, "duration": 0.4},   # A4
    {"midi": 67, "start": 9.2, "duration": 0.4},   # G4
    {"midi": 64, "start": 9.6, "duration": 0.8},   # E4
    
    # "不说一句的爱有多好"
    {"midi": 62, "start": 10.4, "duration": 0.4},  # D4
    {"midi": 64, "start": 10.8, "duration": 0.4},  # E4
    {"midi": 67, "start": 11.2, "duration": 0.4},  # G4
    {"midi": 69, "start": 11.6, "duration": 0.4},  # A4
    {"midi": 67, "start": 12.0, "duration": 0.8},  # G4
    
    # "只有一次记得实在接触到"
    {"midi": 64, "start": 12.8, "duration": 0.4},  # E4
    {"midi": 62, "start": 13.2, "duration": 0.4},  # D4
    {"midi": 60, "start": 13.6, "duration": 0.4},  # C4
    {"midi": 59, "start": 14.0, "duration": 0.4},  # B3 = 246.9Hz
    {"midi": 57, "start": 14.4, "duration": 0.8},  # A3 = 220Hz
    
    # "骑着单车的我俩"
    {"midi": 60, "start": 15.2, "duration": 0.4},  # C4
    {"midi": 62, "start": 15.6, "duration": 0.4},  # D4
    {"midi": 64, "start": 16.0, "duration": 0.4},  # E4
    {"midi": 67, "start": 16.4, "duration": 0.8},  # G4
    
    # 副歌部分 - "怀紧贴背的拥抱"
    {"midi": 72, "start": 17.2, "duration": 0.4},  # C5
    {"midi": 71, "start": 17.6, "duration": 0.4},  # B4
    {"midi": 69, "start": 18.0, "duration": 0.4},  # A4
    {"midi": 67, "start": 18.4, "duration": 0.4},  # G4
    {"midi": 69, "start": 18.8, "duration": 0.8},  # A4
    
    # "难离难舍想抱紧些"
    {"midi": 72, "start": 19.6, "duration": 0.4},  # C5
    {"midi": 74, "start": 20.0, "duration": 0.4},  # D5 = 587.3Hz
    {"midi": 72, "start": 20.4, "duration": 0.4},  # C5
    {"midi": 71, "start": 20.8, "duration": 0.4},  # B4
    {"midi": 69, "start": 21.2, "duration": 0.8},  # A4
    
    # 更多音符继续...
    {"midi": 67, "start": 22.0, "duration": 0.4},  # G4
    {"midi": 69, "start": 22.4, "duration": 0.4},  # A4
    {"midi": 71, "start": 22.8, "duration": 0.4},  # B4
    {"midi": 72, "start": 23.2, "duration": 0.8},  # C5
    
    {"midi": 71, "start": 24.0, "duration": 0.4},  # B4
    {"midi": 69, "start": 24.4, "duration": 0.4},  # A4
    {"midi": 67, "start": 24.8, "duration": 0.4},  # G4
    {"midi": 64, "start": 25.2, "duration": 0.8},  # E4
]

def generate_pitch_data(notes, sample_rate=44100, hop_length=1024, verbose=False):
    """从音符数据生成连续音高曲线"""
    
    # ========== 初始化阶段 ==========
    frame_duration_ms = hop_length / sample_rate * 1000  # 每帧时长（毫秒）
    
    if verbose:
        print(f"\n[INIT] 参数配置:")
        print(f"       sample_rate: {sample_rate} Hz")
        print(f"       hop_length: {hop_length} samples")
        print(f"       帧时长: {frame_duration_ms:.2f} ms")
        print(f"       音符数量: {len(notes)}")
    
    # ========== 计算总时长 ==========
    max_time = max(n['start'] + n['duration'] for n in notes)
    
    if verbose:
        print(f"\n[TIMELINE] 时间轴计算:")
        print(f"       最长音符结束时间: {max_time:.4f} s")
    
    # ========== 生成时间戳和音高数组 ==========
    num_frames = int(np.ceil(max_time * sample_rate / hop_length)) + 1
    times = np.arange(num_frames) * hop_length / sample_rate
    pitches = np.zeros(num_frames)
    confidence = np.zeros(num_frames)
    
    if verbose:
        print(f"[BUFFER] 缓冲区配置:")
        print(f"       总帧数: {num_frames}")
        print(f"       时间轴范围: [{times[0]:.4f}s, {times[-1]:.4f}s]")
        print(f"       覆盖时长: {times[-1] - times[0]:.4f} s")
    
    # ========== 音符到帧的映射 ==========
    if verbose:
        print(f"\n[MAPPING] 开始音符到帧的映射...")
    
    frame_coverage = set()  # 跟踪被覆盖的帧
    
    for i, note in enumerate(notes):
        freq = midi_to_freq(note['midi'])
        start_time = note['start']
        end_time = note['start'] + note['duration']
        
        # 使用round()进行四舍五入，避免截断误差
        start_frame = int(round(start_time * sample_rate / hop_length))
        end_frame = int(round(end_time * sample_rate / hop_length))
        
        # 帧范围（包含end_frame）
        actual_start_frame = max(0, start_frame)
        actual_end_frame = min(num_frames - 1, end_frame)
        
        # 使用end_frame + 1确保最后一帧被包含（range左闭右开）
        frame_count = actual_end_frame - actual_start_frame + 1
        
        if verbose and i % 5 == 0:  # 每5个音符输出一次详细日志
            print(f"  音符 {i+1:2d}/{len(notes)}:")
            print(f"    MIDI: {note['midi']} ({freq:.1f} Hz)")
            print(f"    时间范围: [{start_time:.4f}s, {end_time:.4f}s]")
            print(f"    帧范围: [{start_frame}, {end_frame}]")
            print(f"    实际帧范围: [{actual_start_frame}, {actual_end_frame}]")
            print(f"    覆盖帧数: {frame_count}")
            print(f"    帧时间对应: [{times[actual_start_frame]:.4f}s, {times[actual_end_frame]:.4f}s]")
        
        for frame in range(actual_start_frame, actual_end_frame + 1):
            pitches[frame] = freq
            confidence[frame] = 1.0
            frame_coverage.add(frame)
    
    # ========== 映射完成统计 ==========
    valid_frames = len(frame_coverage)
    coverage_ratio = valid_frames / num_frames * 100
    
    if verbose:
        print(f"\n[RESULT] 映射完成:")
        print(f"       总帧数: {num_frames}")
        print(f"       被覆盖帧数: {valid_frames}")
        print(f"       覆盖率: {coverage_ratio:.2f}%")
        print(f"       帧时长: {frame_duration_ms:.2f} ms")
        print(f"       时间轴精度: {(times[1] - times[0]):.6f} s")
        
        # 检查时间连续性（使用容差处理浮点数精度问题）
        gaps = []
        expected_interval = hop_length / sample_rate
        tolerance = 1e-9  # 浮点数比较容差
        for frame in range(1, num_frames):
            actual_interval = times[frame] - times[frame-1]
            if abs(actual_interval - expected_interval) > tolerance:
                gaps.append((frame, actual_interval))
        if gaps:
            print(f"       ⚠️ 发现时间间隙: {len(gaps)} 处")
            if len(gaps) <= 5:  # 只显示前5个间隙
                for frame, interval in gaps[:5]:
                    print(f"         帧 {frame}: 期望 {expected_interval:.6f}s, 实际 {interval:.6f}s")
        else:
            print(f"       ✅ 时间轴连续")
    
    return {
        'times': times.tolist(),
        'pitches': pitches.tolist(),
        'confidence': confidence.tolist(),
        'notes': notes,
        'duration': max_time,
        'sample_rate': sample_rate,
        'hop_length': hop_length,
        'method': 'midi',
        'note_count': len(notes),
        'frame_count': num_frames,
        'frame_duration_ms': frame_duration_ms
    }

def main():
    # 设置输出目录
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache_dir = os.path.join(base_dir, "cache")
    os.makedirs(cache_dir, exist_ok=True)
    
    print("=" * 80)
    print("生成MIDI音高数据...")
    print("=" * 80)
    
    # 生成单车歌曲的音高数据（启用详细日志）
    print("\n处理歌曲: 单车 - 陈奕迅")
    pitch_data = generate_pitch_data(DANCHE_NOTES, verbose=True)
    
    # 统计信息
    valid_frames = sum(1 for p in pitch_data['pitches'] if p > 0)
    print(f"  总时长: {pitch_data['duration']:.2f}秒")
    print(f"  总帧数: {len(pitch_data['pitches'])}")
    print(f"  有效音高帧: {valid_frames} ({valid_frames/len(pitch_data['pitches'])*100:.1f}%)")
    print(f"  音符数量: {pitch_data['note_count']}")
    
    # 保存JSON文件
    output_path = os.path.join(cache_dir, "danche_midi_pitches.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(pitch_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ MIDI音高数据已保存: {output_path}")
    print("=" * 60)
    
    # 打印音符信息
    print("\n音符列表:")
    for note in DANCHE_NOTES[:10]:
        freq = midi_to_freq(note['midi'])
        print(f"  MIDI {note['midi']} -> {freq:.1f}Hz, 时间: {note['start']:.1f}s - {note['start']+note['duration']:.1f}s")

if __name__ == "__main__":
    main()