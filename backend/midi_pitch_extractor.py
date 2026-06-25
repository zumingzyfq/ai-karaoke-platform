#!/usr/bin/env python3
"""
MIDI音高模板提取模块
用于从MIDI文件提取标准音高数据作为K歌评分参考

主流K歌软件使用MIDI作为参考模板的原因：
1. MIDI包含精确的音符信息（音高、时间、时长）
2. 不受音频质量影响，是"纯净"的音乐数据
3. 可以精确控制评分标准
"""

import os
import json
import numpy as np
from typing import List, Dict, Tuple, Optional

try:
    import pretty_midi
    HAS_PRETTY_MIDI = True
except ImportError:
    HAS_PRETTY_MIDI = False
    print("⚠️ pretty_midi not available, using basic MIDI parser")

try:
    import mido
    HAS_MIDO = True
except ImportError:
    HAS_MIDO = False
    print("⚠️ mido not available")


class MIDIPitchExtractor:
    """MIDI音高提取器"""
    
    def __init__(self, sample_rate: int = 16000, hop_length: int = 512):
        self.sample_rate = sample_rate
        self.hop_length = hop_length
        self.frame_duration = hop_length / sample_rate  # 每帧时长（秒）
    
    def extract_from_midi_file(self, midi_path: str) -> Dict:
        """
        从MIDI文件提取音高数据
        
        Args:
            midi_path: MIDI文件路径
            
        Returns:
            pitch_data: 包含times, pitches, notes等信息的字典
        """
        print(f"\n🎵 正在从MIDI提取音高: {midi_path}")
        
        if HAS_PRETTY_MIDI:
            return self._extract_with_pretty_midi(midi_path)
        elif HAS_MIDO:
            return self._extract_with_mido(midi_path)
        else:
            raise ImportError("需要安装 pretty_midi 或 mido 库来解析MIDI文件")
    
    def _extract_with_pretty_midi(self, midi_path: str) -> Dict:
        """使用pretty_midi库提取音高"""
        pm = pretty_midi.PrettyMIDI(midi_path)
        
        # 获取主旋律轨道（通常是第一个轨道或标记为melody的轨道）
        melody_track = None
        for instrument in pm.instruments:
            if instrument.name and 'melody' in instrument.name.lower():
                melody_track = instrument
                break
            # 如果没有明确标记，选择音符最多的轨道作为主旋律
            if melody_track is None or len(instrument.notes) > len(melody_track.notes):
                melody_track = instrument
        
        if melody_track is None:
            raise ValueError("MIDI文件中没有找到旋律轨道")
        
        print(f"   找到旋律轨道: {melody_track.name or '默认轨道'}")
        print(f"   音符数量: {len(melody_track.notes)}")
        
        # 提取音符信息
        notes = []
        for note in melody_track.notes:
            notes.append({
                'pitch': note.pitch,           # MIDI音符编号 (0-127)
                'start': note.start,           # 开始时间（秒）
                'end': note.end,               # 结束时间（秒）
                'duration': note.end - note.start,
                'velocity': note.velocity,     # 音量/力度
                'frequency': pretty_midi.note_number_to_hz(note.pitch)  # 转换为Hz
            })
        
        # 生成连续的音高曲线（按帧）
        duration = pm.get_end_time()
        num_frames = int(duration * self.sample_rate / self.hop_length)
        times = np.arange(num_frames) * self.hop_length / self.sample_rate
        pitches = np.zeros(num_frames)
        confidence = np.zeros(num_frames)
        
        # 将音符映射到帧
        for note in notes:
            start_frame = int(note['start'] * self.sample_rate / self.hop_length)
            end_frame = int(note['end'] * self.sample_rate / self.hop_length)
            
            for frame in range(max(0, start_frame), min(num_frames, end_frame)):
                pitches[frame] = note['frequency']
                confidence[frame] = note['velocity'] / 127.0  # 归一化力度
        
        print(f"✅ MIDI音高提取完成")
        print(f"   总时长: {duration:.2f}秒")
        print(f"   总帧数: {num_frames}")
        print(f"   有效音高帧: {np.sum(pitches > 0)} ({np.sum(pitches > 0)/num_frames*100:.1f}%)")
        
        return {
            'times': times.tolist(),
            'pitches': pitches.tolist(),
            'confidence': confidence.tolist(),
            'notes': notes,
            'duration': duration,
            'sample_rate': self.sample_rate,
            'hop_length': self.hop_length,
            'method': 'midi',
            'track_name': melody_track.name or '默认轨道'
        }
    
    def _extract_with_mido(self, midi_path: str) -> Dict:
        """使用mido库提取音高（备选方案）"""
        mid = mido.MidiFile(midi_path)
        
        # 解析MIDI事件
        notes = []
        active_notes = {}  # 跟踪正在播放的音符
        
        current_time = 0
        tempo = 500000  # 默认tempo (微秒/拍)
        
        for track in mid.tracks:
            for msg in track:
                current_time += msg.time
                
                if msg.type == 'set_tempo':
                    tempo = msg.tempo
                
                if msg.type == 'note_on' and msg.velocity > 0:
                    # 音符开始
                    active_notes[msg.note] = {
                        'start': mido.tick2second(current_time, mid.ticks_per_beat, tempo),
                        'velocity': msg.velocity
                    }
                
                elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                    # 音符结束
                    if msg.note in active_notes:
                        start_time = active_notes[msg.note]['start']
                        end_time = mido.tick2second(current_time, mid.ticks_per_beat, tempo)
                        
                        # 转换MIDI音符编号到频率
                        frequency = 440 * (2 ** ((msg.note - 69) / 12))
                        
                        notes.append({
                            'pitch': msg.note,
                            'start': start_time,
                            'end': end_time,
                            'duration': end_time - start_time,
                            'velocity': active_notes[msg.note]['velocity'],
                            'frequency': frequency
                        })
                        del active_notes[msg.note]
        
        # 生成音高曲线
        if notes:
            duration = max(n['end'] for n in notes)
            num_frames = int(duration * self.sample_rate / self.hop_length)
            times = np.arange(num_frames) * self.hop_length / self.sample_rate
            pitches = np.zeros(num_frames)
            confidence = np.zeros(num_frames)
            
            for note in notes:
                start_frame = int(note['start'] * self.sample_rate / self.hop_length)
                end_frame = int(note['end'] * self.sample_rate / self.hop_length)
                
                for frame in range(max(0, start_frame), min(num_frames, end_frame)):
                    pitches[frame] = note['frequency']
                    confidence[frame] = note['velocity'] / 127.0
            
            return {
                'times': times.tolist(),
                'pitches': pitches.tolist(),
                'confidence': confidence.tolist(),
                'notes': notes,
                'duration': duration,
                'sample_rate': self.sample_rate,
                'hop_length': self.hop_length,
                'method': 'midi'
            }
        
        raise ValueError("MIDI文件中没有找到音符")
    
    def create_midi_template(self, song_name: str, notes_data: List[Dict], output_path: str) -> str:
        """
        创建MIDI模板文件
        
        Args:
            song_name: 歌曲名称
            notes_data: 音符数据列表 [{'pitch': 60, 'start': 0.0, 'duration': 1.0}, ...]
            output_path: 输出MIDI文件路径
            
        Returns:
            生成的MIDI文件路径
        """
        if HAS_PRETTY_MIDI:
            pm = pretty_midi.PrettyMIDI()
            instrument = pretty_midi.Instrument(program=0, name='melody')
            
            for note_data in notes_data:
                note = pretty_midi.Note(
                    velocity=100,
                    pitch=note_data['pitch'],
                    start=note_data['start'],
                    end=note_data['start'] + note_data['duration']
                )
                instrument.notes.append(note)
            
            pm.instruments.append(instrument)
            pm.write(output_path)
            print(f"✅ MIDI模板已创建: {output_path}")
            return output_path
        
        elif HAS_MIDO:
            mid = mido.MidiFile()
            track = mido.MidiTrack()
            mid.tracks.append(track)
            
            # 添加音符事件
            for note_data in notes_data:
                # 音符开始
                track.append(mido.Message('note_on', note=note_data['pitch'], velocity=100, time=0))
                # 音符结束
                track.append(mido.Message('note_off', note=note_data['pitch'], velocity=0, 
                                         time=int(note_data['duration'] * mid.ticks_per_beat)))
            
            mid.save(output_path)
            print(f"✅ MIDI模板已创建: {output_path}")
            return output_path
        
        raise ImportError("需要安装 pretty_midi 或 mido 库来创建MIDI文件")


def note_name_to_midi_number(note_name: str) -> int:
    """
    将音符名称转换为MIDI编号
    
    Args:
        note_name: 音符名称，如 'C4', 'D#5', 'A3'
        
    Returns:
        MIDI音符编号 (0-127)
    """
    note_map = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    
    # 解析音符名称
    note = note_name[0].upper()
    octave = int(note_name[-1])
    
    # 处理升降号
    modifier = 0
    if '#' in note_name:
        modifier = 1
    elif 'b' in note_name:
        modifier = -1
    
    # 计算MIDI编号
    midi_number = 12 * (octave + 1) + note_map[note] + modifier
    return midi_number


def midi_number_to_frequency(midi_number: int) -> float:
    """
    将MIDI音符编号转换为频率
    
    Args:
        midi_number: MIDI音符编号 (0-127)
        
    Returns:
        频率 (Hz)
    """
    return 440.0 * (2.0 ** ((midi_number - 69) / 12.0))


# 测试代码
if __name__ == "__main__":
    # 安装依赖提示
    if not HAS_PRETTY_MIDI:
        print("请安装 pretty_midi: pip install pretty_midi")
    
    # 测试音符转换
    print("\n测试音符转换:")
    for note in ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']:
        midi_num = note_name_to_midi_number(note)
        freq = midi_number_to_frequency(midi_num)
        print(f"  {note} -> MIDI {midi_num} -> {freq:.2f} Hz")