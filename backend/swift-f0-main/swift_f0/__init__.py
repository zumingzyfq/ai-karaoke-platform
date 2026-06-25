"""
SwiftF0 - A fast and accurate fundamental frequency (F0) detector

SwiftF0 is a Python library for pitch detection using ONNX.
It provides a simple API for detecting pitch from audio files or numpy arrays.
"""

from .core import SwiftF0, PitchResult, plot_pitch, export_to_csv
from .music import (
    NoteSegment,
    segment_notes,
    export_to_midi,
    plot_notes,
    plot_pitch_and_notes,
)

__all__ = [
    # Core pitch detection
    "SwiftF0",
    "PitchResult",
    "plot_pitch",
    "export_to_csv",
    # Musical analysis
    "NoteSegment",
    "segment_notes",
    "export_to_midi",
    "plot_notes",
    "plot_pitch_and_notes",
]
__version__ = "0.1.2"
__author__ = "Lars Nieradzik"
__description__ = "SwiftF0 - A fast and accurate fundamental frequency (F0) detector"
