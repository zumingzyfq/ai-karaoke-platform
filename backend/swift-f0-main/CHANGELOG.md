# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-07-25

### Added
- **Note Segmentation**: New `segment_notes()` function to convert pitch contours into discrete musical notes
- **MIDI Export**: `export_to_midi()` function to save note segments as standard MIDI files  
- **Note Visualization**: `plot_notes()` for piano roll visualization of segmented notes
- **Combined Analysis**: `plot_pitch_and_notes()` for unified pitch contour + note segment visualization
- **Advanced Note Parameters**: Configurable segmentation thresholds and duration constraints
- **NoteSegment Dataclass**: Structured representation of musical notes with timing and pitch information
- **Full Documentation**: Complete API reference for all new musical analysis features
- **Web Demo:** Interactive, browser-based demo using WebAssembly and ONNX.js.

### Changed
- Updated README with complete workflow examples including musical note analysis

## [0.1.1] - 2025-07-08

### Changed
- Renamed package from `swift_f0` to `swift-f0` for consistency with PyPI naming conventions

## [0.1.0] - 2025-07-08

### Added
- Initial release of SwiftF0 pitch detection library
- Core pitch detection functionality via ONNX model
- `SwiftF0` class with audio file and array processing capabilities
- `PitchResult` dataclass for structured pitch detection results
- Basic visualization with `plot_pitch()` function
- CSV export functionality with `export_to_csv()`
- PyPI packaging and distribution setup
- Comprehensive documentation and installation instructions
- Support for frequencies between 46.875 Hz and 2093.75 Hz (G1 to C7)
- Real-time analysis optimization (132 ms for 5 seconds of audio on CPU)