# AI K歌声乐训练平台

## 基于深度学习的智能K歌系统

---

# 📋 项目简介

本项目是一个基于AI的智能K歌声乐训练平台，通过结合先进的深度学习算法和现代Web技术，为用户提供高精度音高检测、实时可视化反馈、AI智能点评和个性化改进建议。

**核心功能**：
- 🎵 **实时音高检测**：基于Swift-F0深度学习模型，精度达到专业级水平
- 📊 **音高曲线对比**：实时显示参考音高与用户演唱音高对比曲线
- 🎤 **AI声乐导师**：多维度专业演唱评估与个性化改进建议
- 🌐 **跨平台支持**：基于Web技术，支持所有主流浏览器

**技术亮点**：
- 使用Swift-F0深度学习模型实现高精度音高提取（误差<5音分）
- WebSocket实现毫秒级延迟的实时反馈（端到端延迟<50ms）
- 前后端统一使用Swift-F0算法，消除算法差异导致的偏差

---

# 🛠️ 技术栈

## 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI框架 |
| TypeScript | 5.x | 开发语言 |
| Vite | 5.x | 构建工具 |
| Chart.js | 4.x | 数据可视化 |
| React-ChartJS-2 | 5.x | React图表组件 |
| Axios | 1.x | HTTP客户端 |
| Ant Design | 5.x | UI组件库 |
| Web Audio API | - | 音频处理 |

## 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.104.x | Web框架 |
| Python | 3.11 | 开发语言 |
| Uvicorn | 0.24.x | ASGI服务器 |
| WebSockets | 12.x | 实时通信 |
| NumPy | 1.26.x | 科学计算 |
| PyTorch | 2.1.x | 深度学习框架 |
| Swift-F0 | - | 音高检测模型 |
| SQLAlchemy | 2.0.x | ORM |
| Pydantic | 2.x | 数据验证 |

---

# 📁 项目结构

```
ai-karaoke-platform/
├── audio/                      # 音频文件
│   └── songs/                  # 歌曲文件
│       ├── 单车伴奏.mp3
│       ├── 单车原曲.mp3
│       ├── 人间伴奏.mp3
│       ├── 人间原版.mp3
│       ├── 十年伴奏.mp3
│       └── 十年原曲.mp3
│
├── backend/                    # 后端代码
│   ├── main.py                 # 主入口
│   ├── requirements.txt        # Python依赖
│   ├── vocal_critic.py         # AI声乐导师
│   ├── vocal_separator.py      # 人声分离
│   ├── lyric_transcriber.py    # 歌词转写
│   ├── swift-f0-main/          # Swift-F0模型
│   │   └── swift_f0/           # 模型代码
│   └── cache/                  # 缓存目录
│
├── frontend/                   # 前端代码
│   ├── src/                    # 源代码
│   │   ├── components/         # 组件
│   │   │   ├── PitchChart.tsx     # 音高图表
│   │   │   ├── PlayerControls.tsx  # 播放器控制
│   │   │   ├── VocalCritic.tsx     # AI导师
│   │   │   ├── SongSelector.tsx    # 歌曲选择
│   │   │   └── ReferenceRecorder.tsx # 参考录音
│   │   ├── hooks/              # 自定义hooks
│   │   │   ├── useWebSocket.ts     # WebSocket通信
│   │   │   ├── useAudioEffects.ts  # 音频效果
│   │   │   └── useAudioRecorder.ts # 音频录制
│   │   ├── types/              # 类型定义
│   │   ├── App.tsx             # 主应用
│   │   └── main.tsx            # 入口文件
│   ├── dist/                   # 构建产物
│   ├── package.json            # Node依赖
│   └── vite.config.ts          # Vite配置
│
├── database/                   # 数据库
│   └── karaoke.db              # SQLite数据库
│
├── 深度学习与神经网络大作业报告.md   # 项目报告
├── 项目开发历程与AI协作记录.md       # 开发历程
└── pitch_alignment_test.html   # 测试页面
```

---

# 🚀 快速开始

## 环境要求

### 前端
- Node.js >= 18.0.0
- npm >= 9.0.0

### 后端
- Python >= 3.10
- pip >= 23.0

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd ai-karaoke-platform
```

### 2. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

> **注意**：某些依赖可能需要额外安装系统库：
> - Linux: `sudo apt-get install portaudio19-dev python3-dev`
> - macOS: `brew install portaudio`
> - Windows: 安装 [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### 3. 安装前端依赖

```bash
cd ../frontend
npm install
```

---

# ▶️ 运行方式

## 开发模式

### 启动后端服务

```bash
cd backend
python main.py
```

后端服务将运行在 `http://localhost:8000`

### 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端应用将运行在 `http://localhost:5173`

### 访问应用

打开浏览器访问 `http://localhost:5173`

## 生产模式

### 构建前端

```bash
cd frontend
npm run build
```

构建产物将生成在 `frontend/dist/` 目录

### 启动后端服务

```bash
cd backend
python main.py
```

后端会自动托管前端构建产物，访问 `http://localhost:8000` 即可

---

# 🎮 使用指南

## 基本操作流程

### 1. 选择歌曲

在主页选择想要演唱的歌曲，点击歌曲卡片进入播放器界面。

### 2. 录制参考音高（可选但推荐）

点击"录制参考音高"按钮，对着麦克风演唱一段旋律，系统会记录您的演唱音高作为参考基准。

**步骤**：
1. 点击"录制参考音高"
2. 授予麦克风权限
3. 演唱一段（10-20秒）
4. 点击"停止"完成录制

### 3. 开始演唱

点击"开始演唱"按钮，跟着伴奏演唱，系统会实时显示音高曲线对比。

**界面说明**：
- 🟢 **绿色曲线**：参考音高（录制的或歌曲自带的）
- 🔴 **红色曲线**：用户演唱音高
- **右侧面板**：实时评分和音分偏差

### 4. AI声乐导师点评

演唱结束后，点击"AI导师"按钮，AI会从以下五个维度进行点评：
- 💨 呼吸控制
- 🎵 音色表现
- ❤️ 情感表达
- 🎯 演唱技巧
- 📝 改进建议

---

# 🔧 配置说明

## 后端配置

### 端口配置

在 `backend/main.py` 中修改：

```python
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### 采样率配置

系统默认采样率为16000Hz（与Swift-F0模型输入一致），无需修改。

## 前端配置

### 代理配置

在 `frontend/vite.config.ts` 中配置：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
    '/ws': {
      target: 'ws://localhost:8000',
      ws: true,
    },
    '/audio': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

### 构建配置

```bash
# 开发构建
npm run build

# 生产构建（优化体积）
npm run build -- --mode=production
```

---

# 📡 API接口

## WebSocket接口

### 连接地址

```
ws://localhost:8000/ws/{song_id}
```

### 消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `audio` | 客户端→服务端 | 发送音频数据 |
| `score` | 服务端→客户端 | 返回评分数据 |
| `lyric` | 服务端→客户端 | 返回歌词数据 |
| `start_reference_recording` | 客户端→服务端 | 开始录制参考音高 |
| `stop_recording` | 客户端→服务端 | 停止录制 |
| `start_karaoke` | 客户端→服务端 | 开始K歌模式 |
| `reference_ready` | 服务端→客户端 | 参考音高录制完成 |

## REST API接口

### AI声乐导师

```
POST /api/vocal-critic
创建AI点评

请求参数：
- recording_id: string - 录音ID
- scores: object - 评分数据（可选）

响应：
{
  "id": string,
  "recording_id": string,
  "breathControl": { "score": number, "comment": string, "suggestion": string },
  "timbre": { "score": number, "comment": string, "suggestion": string },
  "emotion": { "score": number, "comment": string, "suggestion": string },
  "technique": { "score": number, "comment": string, "suggestion": string },
  "overall": { "score": number, "summary": string, "improvements": string[] },
  "created_at": string
}
```

```
GET /api/vocal-critic/{id}
获取AI点评
```

### 音高提取

```
POST /api/extract-pitch
提取音高

请求参数：
- audio: file - 音频文件
- sample_rate: int - 采样率（默认16000）

响应：
{
  "pitches": number[],
  "timestamps": number[],
  "duration": number
}
```

### 歌曲列表

```
GET /api/songs
获取歌曲列表

响应：
[
  {
    "id": string,
    "title": string,
    "artist": string,
    "duration": number,
    "cover_url": string,
    "audio_url": string,
    "lyrics_path": string
  }
]
```

---

# 🐛 常见问题

## Q1: 麦克风权限被拒绝

**解决**：在浏览器地址栏点击锁图标，允许麦克风权限。

## Q2: 音高曲线不显示

**检查**：
1. 是否连接了WebSocket（查看控制台日志）
2. 麦克风是否正常工作
3. 是否有声音输入（查看音频电平）

## Q3: WebSocket连接失败

**检查**：
1. 后端服务是否启动
2. 端口是否被占用（默认8000）
3. 网络是否正常

## Q4: 前端构建失败

**解决**：
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Q5: Python依赖安装失败

**解决**：
```bash
# 更新pip
pip install --upgrade pip

# 单独安装失败的包
pip install torch==2.1.2 --index-url https://download.pytorch.org/whl/cpu
```

---

# 📄 许可证

本项目仅供学习和研究使用。

---

# 🙏 致谢

- **Swift-F0**：提供高精度音高检测模型
- **FastAPI**：提供高性能Web框架
- **React**：提供优秀的前端开发体验
- **Chart.js**：提供强大的数据可视化能力

---

**项目版本**：1.0.0

**最后更新**：2026年6月

**开发团队**：深度学习与神经网络课程小组
