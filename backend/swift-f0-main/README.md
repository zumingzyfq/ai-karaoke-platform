# SwiftF0

[![PyPI version](https://img.shields.io/pypi/v/swift-f0.svg)](https://pypi.org/project/swift-f0/)
[![License](https://img.shields.io/github/license/lars76/swift_f0.svg)](https://github.com/lars76/swift_f0/blob/main/LICENSE)
[![Demo](https://img.shields.io/badge/demo-online-blue.svg)](https://swift-f0.github.io/)
[![Pitch Benchmark](https://img.shields.io/badge/benchmark-pitch--benchmark-green.svg)](https://github.com/lars76/pitch-benchmark/)

**SwiftF0** is a fast and accurate F0 detector that works by first converting audio into a spectrogram using an STFT, then applying a 2D convolutional neural network to estimate pitch. It’s optimized for:

* ⚡ Real-time analysis (132 ms for 5 seconds of audio on CPU)
* 🎵 Music Information Retrieval
* 🗣️ Speech Analysis

In the [Pitch Detection Benchmark](https://github.com/lars76/pitch-benchmark/), SwiftF0 outperforms algorithms like CREPE in both speed and accuracy. It supports frequencies between **46.875 Hz and 2093.75 Hz** (G1 to C7).

## 🧪 Live Demo

The demo runs entirely client-side using WebAssembly and ONNX.js, so your audio stays private.

👉 [**swift-f0.github.io**](https://swift-f0.github.io/)

## 🚀 Installation

```bash
pip install swift-f0
```

**Optional dependencies**:

```bash
pip install librosa     # audio loading & resampling
pip install matplotlib  # plotting utilities
pip install mido        # MIDI export functionality
```

## ⚡ Quick Start

```python
from swift_f0 import *

# Initialize the detector
# For speech analysis, consider setting fmin=65 and fmax=400
detector = SwiftF0(fmin=46.875, fmax=2093.75, confidence_threshold=0.9)

# Run pitch detection from an audio file
result = detector.detect_from_file("audio.wav")

# For raw audio arrays (e.g., loaded via librosa or scipy)
# result = detector.detect_from_array(audio_data, sample_rate)

# Visualize and export results
plot_pitch(result, show=False, output_path="pitch.jpg")
export_to_csv(result, "pitch_data.csv")

# Segment pitch contour into musical notes
notes = segment_notes(
    result,
    split_semitone_threshold=0.8,
    min_note_duration=0.05
)
plot_notes(notes, output_path="note_segments.jpg")
plot_pitch_and_notes(result, notes, output_path="combined_analysis.jpg")
export_to_midi(notes, "notes.mid")
```

## 📖 API Reference

### Core

#### `SwiftF0(...)`
```python
SwiftF0(
    confidence_threshold: Optional[float] = 0.9,
    fmin: Optional[float] = 46.875,
    fmax: Optional[float] = 2093.75,
)
```
Initialize the pitch detector. Processes audio at 16kHz with 256-sample hop size. The model always detects pitch across its full range (46.875-2093.75 Hz), but these parameters control which detections are marked as "voiced" in the results.

#### `SwiftF0.detect_from_array(...)`
```python
detect_from_array(
    audio_array: np.ndarray,
    sample_rate: int
) -> PitchResult
```
Detect pitch from numpy array. Automatically handles resampling to 16kHz (requires librosa) and converts multi-channel audio to mono by averaging.

#### `SwiftF0.detect_from_file(...)`
```python
detect_from_file(
    audio_path: str
) -> PitchResult
```
Detect pitch from audio file. Requires librosa for file loading. Supports any audio format that librosa can read (WAV, MP3, FLAC, etc.).

#### `class PitchResult`
```python
@dataclass
class PitchResult:
    pitch_hz: np.ndarray      # F0 estimates (Hz) for each frame
    confidence: np.ndarray    # Model confidence [0.0–1.0] for each frame
    timestamps: np.ndarray    # Frame centers in seconds for each frame
    voicing: np.ndarray       # Boolean voicing decisions for each frame
```
Container for pitch detection results. All arrays have the same length. Timestamps are calculated accounting for STFT windowing for accurate frame positioning.

#### `export_to_csv(...)`
```python
export_to_csv(
    result: PitchResult,
    output_path: str
) -> None
```
Export pitch detection results to CSV file with columns: timestamp, pitch_hz, confidence, voiced. Timestamps are formatted to 4 decimal places, pitch to 2 decimal places, confidence to 4 decimal places.

### Musical Note Analysis

#### `segment_notes(...)`
```python
segment_notes(
    result: PitchResult,
    split_semitone_threshold: float = 0.8,
    min_note_duration: float = 0.05,
    unvoiced_grace_period: float = 0.02,
) -> List[NoteSegment]
```
Segments a pitch contour into discrete musical notes. Groups consecutive frames into note segments, splitting when pitch deviates significantly or during extended unvoiced periods. The `split_semitone_threshold` controls pitch sensitivity (higher values create longer notes), while `min_note_duration` filters out brief segments. The `unvoiced_grace_period` allows brief gaps without splitting notes. Returns a list of NoteSegment objects with timing, pitch, and MIDI information, automatically merging adjacent segments with identical MIDI pitch.

#### `class NoteSegment`
```python
@dataclass
class NoteSegment:
    start: float         # Start time in seconds
    end: float           # End time in seconds  
    pitch_median: float  # Median pitch frequency in Hz
    pitch_midi: int      # Quantized MIDI note number (0-127)
```
Represents a musical note segment with timing and pitch information.

#### `export_to_midi(...)`
```python
export_to_midi(
    notes: List[NoteSegment],
    output_path: str,
    tempo: int = 120,
    velocity: int = 80,
    track_name: str = "SwiftF0 Notes",
) -> None
```
Export note segments to MIDI file. The tempo parameter controls playback speed in beats per minute (120 = moderate speed), while velocity controls how loud each note sounds (0 = silent, 127 = maximum volume, 80 = comfortably loud). The track_name labels the MIDI track. Requires the `mido` package.

### Visualization

#### `plot_pitch(...)`
```python
plot_pitch(
    result: PitchResult,
    output_path: Optional[str] = None,
    show: bool = True,
    dpi: int = 300,
    figsize: Tuple[float, float] = (12, 4),
    style: str = "seaborn-v0_8",
) -> None
```
Plot pitch detection results with voicing information. Voiced regions are shown in blue, unvoiced in light gray. Automatically scales y-axis based on detected pitch range. Requires matplotlib.

#### `plot_notes(...)`
```python
plot_notes(
    notes: List[NoteSegment],
    output_path: Optional[str] = None,
    show: bool = True,
    dpi: int = 300,
    figsize: Tuple[float, float] = (12, 6),
    style: str = "seaborn-v0_8",
) -> None
```
Plot note segments as a piano roll visualization. Each note is displayed as a colored rectangle with MIDI note number labels. Colors are mapped to pitch height for visual clarity.

#### `plot_pitch_and_notes(...)`
```python
plot_pitch_and_notes(
    result: PitchResult,
    segments: List[NoteSegment],
    output_path: Optional[str] = None,
    show: bool = True,
    dpi: int = 300,
    figsize: Tuple[float, float] = (12, 4),
    style: str = "seaborn-v0_8",
) -> None
```
Plot pitch contour with overlaid note segments. Displays continuous pitch contour with shaded regions showing segmented notes. Each segment is labeled with its MIDI note number. Ideal for analyzing segmentation quality.

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and updates.

## 📄 Citation

If you use SwiftF0 in your research, please cite:

```bibtex
@misc{nieradzik2025swiftf0,
      title={SwiftF0: Fast and Accurate Monophonic Pitch Detection},
      author={Lars Nieradzik},
      year={2025},
      eprint={2508.18440},
      archivePrefix={arXiv},
      primaryClass={cs.SD},
      url={https://arxiv.org/abs/2508.18440},
}
```