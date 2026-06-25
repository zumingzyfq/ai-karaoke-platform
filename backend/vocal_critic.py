#!/usr/bin/env python3
"""
AI声乐导师模块 - 使用AI模型或规则引擎生成演唱点评
"""
import os
import json
from pathlib import Path

class VocalCritic:
    """AI声乐导师 - 演唱点评生成"""
    
    def __init__(self, model_name="Qwen/Qwen2-0.5B-Instruct", use_local_mode=True):
        """
        初始化AI声乐导师
        
        Args:
            model_name: HuggingFace模型名称
            use_local_mode: 是否使用本地规则引擎模式（不依赖远程AI模型）
        """
        self.model_name = model_name
        self.use_local_mode = use_local_mode
        self.device = "cpu"
        self.model = None
        self.tokenizer = None
        
        print("AI Vocal Critic initializing...")
        print(f"   模式: {'本地规则引擎' if use_local_mode else 'AI模型'}")
        print(f"   模型: {model_name}")
    
    def _load_model(self):
        """加载AI模型（如果不使用本地模式）"""
        if self.use_local_mode:
            print("   使用本地规则引擎模式，跳过模型加载")
            return
        
        if self.model is None:
            print(f"   正在加载模型...")
            try:
                import torch
                from transformers import AutoTokenizer, AutoModelForCausalLM
                
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name,
                    torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                    device_map="auto"
                )
                print(f"   模型加载成功! 设备: {self.device}")
            except Exception as e:
                print(f"   模型加载失败: {e}")
                print(f"   自动切换到本地规则引擎模式")
                self.use_local_mode = True
    
    def generate_critique(self, recording_path, scores, lyrics=None):
        """
        生成演唱点评
        
        Args:
            recording_path: 录音文件路径（可选）
            scores: 演唱评分字典，包含音准、节奏、颤音等分数
            lyrics: 歌词列表（可选）
            
        Returns:
            dict: 包含多维度点评的字典
        """
        if not recording_path or not os.path.exists(recording_path):
            print("   注意：未提供录音文件，将使用评分生成点评")
        
        # 确保模型已加载（或切换到本地模式）
        self._load_model()
        
        # 根据模式生成点评
        if self.use_local_mode:
            return self._generate_local_critique(scores, lyrics)
        else:
            return self._generate_ai_critique(scores, lyrics)
    
    def _generate_local_critique(self, scores, lyrics=None):
        """使用本地规则引擎生成点评"""
        print("Generating critique using local rule engine...")
        
        # 提取分数
        pitch_score = scores.get('pitch', scores.get('avg_pitch_score', 0))
        rhythm_score = scores.get('rhythm', scores.get('avg_rhythm_score', 0))
        vibrato_score = scores.get('vibrato', scores.get('avg_vibrato_score', 0))
        overall_score = scores.get('overall', scores.get('avg_overall_score', 0))
        
        critique = {
            "overall": self._generate_overall_comment(overall_score),
            "breathing": self._generate_breathing_comment(pitch_score, overall_score),
            "pitch_accuracy": self._generate_pitch_comment(pitch_score),
            "rhythm": self._generate_rhythm_comment(rhythm_score),
            "timbre": self._generate_timbre_comment(overall_score),
            "emotion": self._generate_emotion_comment(overall_score),
            "technique": self._generate_technique_comment(pitch_score, rhythm_score),
            "suggestions": self._generate_suggestions(pitch_score, rhythm_score, overall_score),
            "exercises": self._generate_exercises(pitch_score, rhythm_score)
        }
        
        print(f"   本地点评生成完成!")
        return critique
    
    def _generate_overall_comment(self, score):
        """生成整体评价"""
        if score >= 90:
            return f"太棒了！你的演唱水平非常高，综合得分达到了 {score:.1f} 分。音准、节奏和情感表达都表现出色，继续保持！"
        elif score >= 80:
            return f"表现优秀！你的演唱综合得分 {score:.1f} 分，已经具备了良好的演唱基础。继续努力可以达到更高水平。"
        elif score >= 70:
            return f"表现良好！你的演唱综合得分 {score:.1f} 分，有一定的演唱能力，但还有提升空间。关注音准和节奏的稳定性会帮助你进步。"
        elif score >= 60:
            return f"及格水平，综合得分 {score:.1f} 分。你的演唱有一定基础，但需要在音准、节奏等方面多加练习。"
        else:
            return f"需要多加练习，综合得分 {score:.1f} 分。建议从基础开始，重点练习音准和节奏，逐步提升演唱能力。"
    
    def _generate_breathing_comment(self, pitch_score, overall_score):
        """生成呼吸控制评价"""
        if overall_score >= 85:
            return "呼吸控制非常稳定，气息运用得当，能够很好地支撑长时间演唱。这是你演唱的一大优势。"
        elif overall_score >= 70:
            if pitch_score >= 80:
                return "呼吸控制尚可，但在高音区可能需要更好的气息支持。建议练习腹式呼吸，增强气息的稳定性。"
            else:
                return "呼吸控制需要加强，气息不够稳定影响了音准表现。建议进行专门的呼吸训练，增强肺活量和气息控制能力。"
        else:
            return "呼吸控制是需要重点提升的方面。不稳定的气息会影响音准和音色。建议从基础的呼吸练习开始，逐步建立良好的呼吸习惯。"
    
    def _generate_pitch_comment(self, score):
        """生成音准评价"""
        if score >= 90:
            return f"音准非常准确！得分 {score:.1f} 分，几乎没有偏差。你对音高的感知能力很强。"
        elif score >= 80:
            return f"音准良好！得分 {score:.1f} 分，大部分音高都比较准确。个别音可能存在微小偏差，但整体表现不错。"
        elif score >= 70:
            return f"音准一般，得分 {score:.1f} 分。存在一些音高偏差，建议多听原唱并进行跟唱练习，培养音准感。"
        elif score >= 60:
            return f"音准需要提高，得分 {score:.1f} 分。部分音高偏差较大，建议使用钢琴等乐器辅助练习，逐个音进行校准。"
        else:
            return f"音准是需要重点练习的方面，得分 {score:.1f} 分。建议从基础的音阶练习开始，建立准确的音高概念。"
    
    def _generate_rhythm_comment(self, score):
        """生成节奏评价"""
        if score >= 90:
            return f"节奏把握非常精准！得分 {score:.1f} 分，节拍感很强，与伴奏配合默契。"
        elif score >= 80:
            return f"节奏表现良好！得分 {score:.1f} 分，整体节拍稳定，偶尔会有微小的时间偏差。"
        elif score >= 70:
            return f"节奏一般，得分 {score:.1f} 分。存在一些节拍不准的情况，建议多听伴奏，用手打拍子来培养节奏感。"
        elif score >= 60:
            return f"节奏需要加强，得分 {score:.1f} 分。节拍不够稳定，有时会抢拍或拖拍。建议先从慢速练习开始，逐步提高速度。"
        else:
            return f"节奏是需要重点练习的方面，得分 {score:.1f} 分。建议使用节拍器辅助练习，培养稳定的节奏感。"
    
    def _generate_timbre_comment(self, score):
        """生成音色评价"""
        if score >= 85:
            return "音色优美，富有表现力。你的声音具有独特的魅力，能够很好地传达歌曲的情感。"
        elif score >= 70:
            return "音色不错，有一定的个人特色。可以尝试在不同音区探索声音的变化，让演唱更具层次感。"
        else:
            return "音色还可以进一步打磨。建议尝试不同的发声方式，找到最适合自己的声音位置，让音色更加饱满动听。"
    
    def _generate_emotion_comment(self, score):
        """生成情感表达评价"""
        if score >= 85:
            return "情感表达非常到位！你能够很好地理解歌曲内涵，并通过歌声传达出来，让听众产生共鸣。"
        elif score >= 70:
            return "情感表达尚可，能够传达基本的歌曲情感。可以尝试更深入地理解歌词含义，让演唱更有感染力。"
        else:
            return "情感表达需要加强。建议在演唱前先理解歌词的含义和情感基调，用声音来演绎歌曲的情感。"
    
    def _generate_technique_comment(self, pitch_score, rhythm_score):
        """生成演唱技巧评价"""
        comments = []
        
        if pitch_score >= 85:
            comments.append("音准控制优秀")
        elif pitch_score >= 70:
            comments.append("音准基本稳定")
        else:
            comments.append("音准需要加强")
        
        if rhythm_score >= 85:
            comments.append("节奏把握精准")
        elif rhythm_score >= 70:
            comments.append("节奏基本准确")
        else:
            comments.append("节奏需要练习")
        
        if pitch_score >= 80 and rhythm_score >= 80:
            comments.append("整体技巧扎实")
        
        return "、".join(comments) + "。继续练习将帮助你巩固和提升演唱技巧。"
    
    def _generate_suggestions(self, pitch_score, rhythm_score, overall_score):
        """生成改进建议"""
        suggestions = []
        
        # 音准建议
        if pitch_score < 80:
            suggestions.append("建议每天进行10-15分钟的音阶练习，使用钢琴或手机App辅助校准音高")
            suggestions.append("多听原唱并进行跟唱，培养对音高的敏感度")
        
        # 节奏建议
        if rhythm_score < 80:
            suggestions.append("使用节拍器练习，从慢速开始，逐步提高速度")
            suggestions.append("尝试用手打拍子或跺脚的方式增强节奏感")
        
        # 综合建议
        if overall_score < 75:
            suggestions.append("建议分段练习歌曲，先掌握每一段的音准和节奏，再整合起来")
            suggestions.append("录制自己的演唱并回放，找出需要改进的地方")
        
        if overall_score >= 85:
            suggestions.append("尝试挑战更高难度的歌曲，进一步提升演唱水平")
            suggestions.append("可以尝试不同风格的歌曲，拓展演唱能力")
        
        return suggestions[:5]
    
    def _generate_exercises(self, pitch_score, rhythm_score):
        """生成练习推荐"""
        exercises = []
        
        if pitch_score < 80:
            exercises.append("半音爬音练习：从中央C开始，每次升高半音，保持声音稳定")
            exercises.append("五声音阶练习：do-re-mi-fa-sol-fa-mi-re-do，注意每个音的准确性")
        
        if rhythm_score < 80:
            exercises.append("四分音符、八分音符、十六分音符混合练习，用节拍器打基础")
            exercises.append("附点节奏和切分节奏专项练习")
        
        exercises.append("腹式呼吸练习：吸气时腹部鼓起，呼气时慢慢收紧，练习气息控制")
        exercises.append("唇颤音练习：用嘴唇发出'brrr'的声音，放松喉咙")
        exercises.append("元音练习：a-e-i-o-u，每个元音保持3-5秒，注意发音饱满")
        
        return exercises[:5]
    
    def _generate_ai_critique(self, scores, lyrics=None):
        """使用AI模型生成点评（需要网络连接）"""
        import torch
        
        # 构建输入提示
        prompt = self._build_prompt(scores, lyrics)
        
        print("Generating AI critique...")
        
        # 生成文本
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=500,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
        
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # 解析生成的结果
        critique = self._parse_generated_critique(generated_text)
        
        print(f"   AI点评生成完成!")
        return critique
    
    def _build_prompt(self, scores, lyrics=None):
        """构建输入提示"""
        lyrics_text = ""
        if lyrics:
            lyrics_text = "\n歌词:\n" + "\n".join([f"{l.get('time', 0):.2f}s: {l.get('text', '')}" for l in lyrics[:10]])
        
        prompt = f"""你是一位专业的声乐导师，请根据以下演唱评分提供详细的点评和改进建议。

## 演唱评分
音准评分: {scores.get('pitch', 0):.1f}/100
节奏评分: {scores.get('rhythm', 0):.1f}/100
颤音评分: {scores.get('vibrato', 0):.1f}/100
综合评分: {scores.get('overall', 0):.1f}/100{lyrics_text}

请从以下几个方面给出专业点评：
1. 呼吸控制：评价气息运用和呼吸稳定性
2. 音色表现：评价声音品质和音色特点
3. 情感表达：评价情感传达能力
4. 演唱技巧：评价音准、节奏、颤音等技术能力
5. 具体改进建议：给出可操作的练习建议

请用中文回复，格式清晰，内容专业但易懂。
"""
        return prompt
    
    def _parse_generated_critique(self, text):
        """解析生成的点评文本"""
        critique = {
            "breathing": "",
            "timbre": "",
            "emotion": "",
            "technique": "",
            "suggestions": []
        }
        
        lines = text.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if '呼吸控制' in line or '气息' in line:
                current_section = 'breathing'
                continue
            elif '音色表现' in line or '音色' in line:
                current_section = 'timbre'
                continue
            elif '情感表达' in line or '情感' in line:
                current_section = 'emotion'
                continue
            elif '演唱技巧' in line or '技巧' in line:
                current_section = 'technique'
                continue
            elif '改进建议' in line or '建议' in line:
                current_section = 'suggestions'
                continue
                
            if current_section == 'suggestions':
                if line.startswith(('-', '•', '*', '1.', '2.', '3.', '4.', '5.')):
                    suggestion = line.lstrip('-•*12345. ').strip()
                    if suggestion:
                        critique["suggestions"].append(suggestion)
            elif current_section and line:
                if critique[current_section]:
                    critique[current_section] += " " + line
                else:
                    critique[current_section] = line
        
        if not any(critique.values()):
            critique["breathing"] = text[:200]
            critique["timbre"] = text[200:400] if len(text) > 200 else ""
            critique["emotion"] = text[400:600] if len(text) > 400 else ""
            critique["technique"] = text[600:800] if len(text) > 600 else ""
        
        return critique

def main():
    """测试AI声乐导师功能"""
    test_scores = {
        'pitch': 78.5,
        'rhythm': 82.3,
        'vibrato': 75.6,
        'overall': 80.2
    }
    
    test_lyrics = [
        {"time": 0, "text": "风雨过后不一定有美好的天空"},
        {"time": 3, "text": "不是天晴就会有彩虹"},
        {"time": 6, "text": "所以你一脸无辜不代表你懵懂"},
    ]
    
    try:
        critic = VocalCritic(use_local_mode=True)
        
        with open("test_recording.wav", "wb") as f:
            f.write(b"test")
        
        critique = critic.generate_critique("test_recording.wav", test_scores, test_lyrics)
        
        print("\n" + "="*60)
        print("AI声乐导师点评")
        print("="*60)
        print(f"\n📊 整体评价:\n{critique.get('overall', '')}")
        print(f"\n💨 呼吸控制:\n{critique.get('breathing', '')}")
        print(f"\n🎵 音高准确度:\n{critique.get('pitch_accuracy', '')}")
        print(f"\n⏰ 节奏把握:\n{critique.get('rhythm', '')}")
        print(f"\n🎙️ 音色表现:\n{critique.get('timbre', '')}")
        print(f"\n❤️ 情感表达:\n{critique.get('emotion', '')}")
        print(f"\n🎯 演唱技巧:\n{critique.get('technique', '')}")
        
        suggestions = critique.get('suggestions', [])
        if suggestions:
            print(f"\n📝 改进建议:")
            for i, suggestion in enumerate(suggestions, 1):
                print(f"  {i}. {suggestion}")
        
        exercises = critique.get('exercises', [])
        if exercises:
            print(f"\n🏋️ 推荐练习:")
            for i, exercise in enumerate(exercises, 1):
                print(f"  {i}. {exercise}")
        
        print("="*60)
        
        os.remove("test_recording.wav")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()