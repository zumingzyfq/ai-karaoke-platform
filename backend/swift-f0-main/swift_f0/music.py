import numpy as np
from dataclasses import dataclass
from typing import List, Optional, Tuple
from .core import PitchResult


@dataclass
class NoteSegment:
    """Represents a musical note segment with timing and pitch information.

    Attributes:
        start: Start time in seconds
        end: End time in seconds
        pitch_median: Median pitch frequency in Hz
        pitch_midi: Quantized MIDI note number (0-127)
    """

    start: float  # start time in seconds
    end: float  # end time in seconds
    pitch_median: float  # median pitch in Hz
    pitch_midi: int  # quantized MIDI note number


def segment_notes(
    result: PitchResult,
    split_semitone_threshold: float = 0.8,
    min_note_duration: float = 0.05,
    unvoiced_grace_period: float = 0.02,
) -> List[NoteSegment]:
    """
    Segments a pitch contour into discrete musical notes.

    This function analyzes the pitch and voicing information from a PitchResult
    object and groups consecutive frames into note segments. It splits segments
    when pitch deviates significantly or when there are extended unvoiced periods.

    Args:
        result: PitchResult object containing timestamps, pitch_hz, confidence, and voicing
        split_semitone_threshold: Pitch difference in semitones to trigger a new
            note segment. Higher values create longer notes. Recommended: 0.6-1.2
        min_note_duration: Minimum duration in seconds for a valid note segment.
            Shorter segments are filtered out. Recommended: 0.02-0.1
        unvoiced_grace_period: Maximum duration in seconds of unvoiced segments
            that are still considered part of the current note. Helps avoid
            splitting notes due to brief gaps. Recommended: 0.01-0.05

    Returns:
        List of NoteSegment objects, each representing a distinct musical note
        with start/end times, median pitch, and MIDI note number. Adjacent
        segments with identical MIDI pitch are automatically merged.

    Algorithm:
        1. Convert valid pitch values to MIDI semitones
        2. Iterate through frames, tracking voicing state
        3. For voiced frames: start new segment or continue existing based on pitch deviation
        4. For unvoiced frames: apply grace period before terminating segments
        5. Filter segments by minimum duration
        6. Merge adjacent segments with identical MIDI pitch

    Example:
        >>> result = swiftf0.detect_from_file("audio.wav")
        >>> notes = segment_notes(result, split_semitone_threshold=0.8, min_note_duration=0.1)
        >>> print(f"Found {len(notes)} note segments")
        >>> for note in notes[:3]:
        ...     print(f"Note: {note.pitch_midi} ({note.pitch_median:.1f} Hz) "
        ...           f"from {note.start:.2f}s to {note.end:.2f}s")
    """
    if len(result.timestamps) == 0:
        return []

    # Calculate frame period from timestamps
    if len(result.timestamps) > 1:
        frame_period = result.timestamps[1] - result.timestamps[0]
    else:
        frame_period = 0.016  # Default ~16ms frame period for 16kHz audio

    notes = []
    current_note_segment = None
    unvoiced_frames_count = 0

    # Pre-compute valid voiced frames mask using the voicing from PitchResult
    valid_voiced_frames = result.voicing.copy()

    # Convert valid pitch values to MIDI semitones (vectorized operation)
    midi_contour = np.full_like(result.pitch_hz, np.nan)
    valid_indices = np.where(valid_voiced_frames)[0]
    if len(valid_indices) > 0:
        # Avoid log of zero or negative values
        valid_pitches = result.pitch_hz[valid_indices]
        valid_pitches = np.maximum(valid_pitches, 1e-6)  # Ensure positive values
        midi_contour[valid_indices] = 69 + 12 * np.log2(valid_pitches / 440.0)

    for i, is_voiced in enumerate(valid_voiced_frames):
        t = result.timestamps[i]

        if is_voiced and not np.isnan(midi_contour[i]):
            unvoiced_frames_count = 0
            midi_pitch = midi_contour[i]

            if current_note_segment is None:
                # Start new note segment
                current_note_segment = {
                    "start": t,
                    "end": t + frame_period,
                    "samples": [midi_pitch],
                }
            else:
                # Check if pitch deviation exceeds threshold
                current_median = np.median(current_note_segment["samples"])
                pitch_deviation = abs(midi_pitch - current_median)

                if pitch_deviation >= split_semitone_threshold:
                    # Finalize current note and start new one
                    notes.append(current_note_segment)
                    current_note_segment = {
                        "start": t,
                        "end": t + frame_period,
                        "samples": [midi_pitch],
                    }
                else:
                    # Continue current note
                    current_note_segment["samples"].append(midi_pitch)
                    current_note_segment["end"] = t + frame_period

        else:  # Unvoiced frame
            if current_note_segment is not None:
                unvoiced_frames_count += 1
                unvoiced_duration = unvoiced_frames_count * frame_period

                if unvoiced_duration >= unvoiced_grace_period:
                    # Grace period exceeded - finalize current note
                    notes.append(current_note_segment)
                    current_note_segment = None
                    unvoiced_frames_count = 0
                else:
                    # Within grace period - extend note duration
                    current_note_segment["end"] = t + frame_period

    # Finalize last note segment if it exists
    if current_note_segment is not None:
        notes.append(current_note_segment)

    if not notes:
        return []

    # Filter by duration and compute final MIDI pitches
    processed_notes = []
    for segment in notes:
        duration = segment["end"] - segment["start"]
        if duration >= min_note_duration and segment["samples"]:
            median_pitch_midi = np.median(segment["samples"])
            # Convert back to Hz for the median pitch
            median_pitch_hz = 440.0 * (2 ** ((median_pitch_midi - 69) / 12))

            processed_notes.append(
                {
                    "start": segment["start"],
                    "end": segment["end"],
                    "pitch_median": median_pitch_hz,
                    "midi_pitch": round(median_pitch_midi),
                }
            )

    if not processed_notes:
        return []

    # Merge adjacent notes with identical MIDI pitch
    final_notes = [processed_notes[0]]
    epsilon = 1e-9  # For floating-point precision

    for current_note in processed_notes[1:]:
        previous_note = final_notes[-1]
        gap = current_note["start"] - previous_note["end"]

        # Merge if notes are adjacent and have same pitch
        if (
            gap <= frame_period + epsilon
            and previous_note["midi_pitch"] == current_note["midi_pitch"]
        ):
            # Update end time and recalculate median pitch
            previous_note["end"] = current_note["end"]
        else:
            final_notes.append(current_note)

    # Convert to NoteSegment objects
    note_segments = []
    for note in final_notes:
        note_segments.append(
            NoteSegment(
                start=note["start"],
                end=note["end"],
                pitch_median=note["pitch_median"],
                pitch_midi=note["midi_pitch"],
            )
        )

    return note_segments


def export_to_midi(
    notes: List[NoteSegment],
    output_path: str,
    tempo: int = 120,
    velocity: int = 80,
    track_name: str = "SwiftF0 Notes",
) -> None:
    """
    Export note segments to MIDI file.

    Args:
        notes: List of NoteSegment objects containing note information
        output_path: Path to save the MIDI file
        tempo: MIDI tempo in BPM (default 120)
        velocity: MIDI note velocity 0-127 (default 80)
        track_name: Name for the MIDI track (default "SwiftF0 Notes")

    Raises:
        ImportError: If mido is not installed
        ValueError: For empty notes list or invalid parameters
    """
    # Import check
    try:
        import mido
    except ImportError:
        raise ImportError(
            "mido required for MIDI export. Install with: pip install mido"
        )

    # Validate input
    if not notes:
        raise ValueError("Cannot export empty notes list")
    if not 1 <= tempo <= 300:
        raise ValueError("Tempo must be between 1 and 300 BPM")
    if not 0 <= velocity <= 127:
        raise ValueError("Velocity must be between 0 and 127")

    # Create MIDI file with one track
    mid = mido.MidiFile()
    track = mido.MidiTrack()
    mid.tracks.append(track)

    # Add track name
    track.append(mido.MetaMessage("track_name", name=track_name, time=0))

    # Set tempo (microseconds per beat)
    tempo_msg = mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(tempo), time=0)
    track.append(tempo_msg)

    # Convert notes to MIDI events
    # Sort notes by start time to ensure proper ordering
    sorted_notes = sorted(notes, key=lambda n: n.start)

    # Track current time in MIDI ticks (480 ticks per beat is standard)
    ticks_per_beat = 480
    current_time_ticks = 0

    # Convert seconds to MIDI ticks: ticks = seconds * (ticks_per_beat * tempo / 60)
    def seconds_to_ticks(seconds: float) -> int:
        return int(seconds * (ticks_per_beat * tempo / 60))

    for note in sorted_notes:
        # Calculate timing
        note_start_ticks = seconds_to_ticks(note.start)
        note_duration_ticks = seconds_to_ticks(note.end - note.start)

        # Time delta from current position to note start
        time_to_start = max(0, note_start_ticks - current_time_ticks)

        # Ensure MIDI note is in valid range (0-127)
        midi_note = max(0, min(127, note.pitch_midi))

        # Add note_on message
        track.append(
            mido.Message(
                "note_on",
                channel=0,
                note=midi_note,
                velocity=velocity,
                time=time_to_start,
            )
        )

        # Add note_off message
        track.append(
            mido.Message(
                "note_off",
                channel=0,
                note=midi_note,
                velocity=velocity,
                time=note_duration_ticks,
            )
        )

        # Update current time
        current_time_ticks = note_start_ticks + note_duration_ticks

    # Save MIDI file
    mid.save(output_path)


def plot_notes(
    notes: List[NoteSegment],
    output_path: Optional[str] = None,
    show: bool = True,
    dpi: int = 300,
    figsize: Tuple[float, float] = (12, 6),
    style: str = "seaborn-v0_8",
) -> None:
    """
    Plot note segments as a piano roll visualization, optionally saving and/or showing.

    Args:
        notes: List of NoteSegment objects containing note information
        output_path: Path to save the plot (optional)
        show: Whether to display the plot interactively (default True)
        dpi: Image resolution for saving (default 300)
        figsize: Figure size in inches (width, height) (default (12, 6))
        style: Matplotlib style to use (default "seaborn-v0_8")

    Raises:
        ImportError: If matplotlib is not installed
        ValueError: For empty notes list
    """
    # Import check
    try:
        import matplotlib.pyplot as plt
        import matplotlib.patches as patches
    except ImportError:
        raise ImportError(
            "matplotlib required for plotting. Install with: pip install matplotlib"
        )

    # Validate input
    if not notes:
        raise ValueError("Cannot plot empty notes list")

    # Style selection with fallback
    available_styles = plt.style.available
    if style in available_styles:
        plt.style.use(style)
    else:
        plt.style.use("default")

    # Calculate plot dimensions
    start_times = [note.start for note in notes]
    end_times = [note.end for note in notes]
    midi_notes = [note.pitch_midi for note in notes]

    time_min = min(start_times)
    time_max = max(end_times)
    midi_min = min(midi_notes) - 2  # Add padding
    midi_max = max(midi_notes) + 2

    # Create figure and axis
    fig, ax = plt.subplots(figsize=figsize)

    # Color mapping for visual variety
    import matplotlib.cm as cm
    import matplotlib.colors as colors

    # Use a colormap based on pitch height
    norm = colors.Normalize(vmin=midi_min, vmax=midi_max)
    colormap = cm.viridis

    # Plot each note as a rectangle
    for note in notes:
        duration = note.end - note.start

        # Create rectangle for note
        rect = patches.Rectangle(
            (
                note.start,
                note.pitch_midi - 0.4,
            ),  # (x, y) - center vertically on MIDI note
            duration,  # width (duration)
            0.8,  # height (slightly less than 1 semitone)
            linewidth=1,
            edgecolor="black",
            facecolor=colormap(norm(note.pitch_midi)),
            alpha=0.8,
        )
        ax.add_patch(rect)

        # Add MIDI note number as text if rectangle is wide enough
        if duration > (time_max - time_min) * 0.02:  # Only if >2% of total time
            ax.text(
                note.start + duration / 2,
                note.pitch_midi,
                str(note.pitch_midi),
                ha="center",
                va="center",
                fontsize=8,
                fontweight="bold",
                color="white"
                if note.pitch_midi < (midi_min + midi_max) / 2
                else "black",
            )

    # Configure plot appearance
    ax.set_xlim(time_min - 0.1, time_max + 0.1)
    ax.set_ylim(midi_min, midi_max)
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("MIDI Note Number")
    ax.set_title("Note Segments (Piano Roll View)")
    ax.grid(True, alpha=0.3)

    # Add note names on y-axis for reference
    note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    # Show note names for a reasonable range
    if midi_max - midi_min <= 24:  # Only if showing 2 octaves or less
        y_ticks = list(range(int(midi_min), int(midi_max) + 1))
        y_labels = [f"{note_names[midi % 12]}{midi // 12 - 1}" for midi in y_ticks]
        ax.set_yticks(y_ticks)
        ax.set_yticklabels(y_labels)

    fig.tight_layout()

    # Save to file if requested
    if output_path:
        fig.savefig(output_path, dpi=dpi, bbox_inches="tight")

    # Show interactively if requested
    if show:
        plt.show()

    # Close figure to free memory
    plt.close(fig)


def plot_pitch_and_notes(
    result: PitchResult,
    segments: List[NoteSegment],
    output_path: Optional[str] = None,
    show: bool = True,
    dpi: int = 300,
    figsize: Tuple[float, float] = (12, 4),
    style: str = "seaborn-v0_8",
) -> None:
    """
    Plot pitch contour with overlaid note segments, optionally saving and/or showing.

    Displays the continuous pitch contour from PitchResult with shaded regions
    showing the segmented notes. Each segment is labeled with its MIDI note number.
    Unvoiced regions appear as gaps in the pitch line.

    Args:
        result: PitchResult object containing pitch detection results
        segments: List of NoteSegment objects from segment_notes()
        output_path: Path to save the plot (optional)
        show: Whether to display the plot interactively (default True)
        dpi: Image resolution for saving (default 300)
        figsize: Figure size in inches (width, height) (default (12, 4))
        style: Matplotlib style to use (default "seaborn-v0_8")

    Raises:
        ImportError: If matplotlib is not installed
        ValueError: For empty results or mismatched array lengths

    Example:
        >>> result = detector.detect_from_file("audio.wav")
        >>> segments = segment_notes(result)
        >>> plot_pitch_with_segments(result, segments, "analysis.png")
    """
    # Import check
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        raise ImportError(
            "matplotlib required for plotting. Install with: pip install matplotlib"
        )

    # Validate input
    n_frames = len(result.timestamps)
    if n_frames == 0:
        raise ValueError("Cannot plot empty results")
    if not (
        len(result.pitch_hz)
        == len(result.confidence)
        == len(result.voicing)
        == n_frames
    ):
        raise ValueError("All result arrays must have the same length")

    # Style selection with fallback
    available_styles = plt.style.available
    if style in available_styles:
        plt.style.use(style)
    else:
        plt.style.use("default")

    # Prepare voiced data (set unvoiced regions to NaN for plotting)
    pitch_voiced = np.where(result.voicing, result.pitch_hz, np.nan)

    # Calculate frequency limits with padding
    voiced_frequencies = result.pitch_hz[result.voicing]
    if len(voiced_frequencies) > 0:
        fmin = max(1, voiced_frequencies.min() * 0.9)  # 10% padding below
        fmax = min(5000, voiced_frequencies.max() * 1.1)  # 10% padding above
    else:
        fmin, fmax = 50, 500  # Default range when no voiced frames

    # Create figure and axis
    fig, ax = plt.subplots(figsize=figsize)

    # Plot unvoiced segments (background) - matches plot_pitch style
    ax.plot(
        result.timestamps,
        result.pitch_hz,
        color="lightgray",
        alpha=0.7,
        linewidth=1.0,
        label="Unvoiced",
        zorder=1,
    )

    # Plot voiced segments (foreground) - matches plot_pitch style
    ax.plot(
        result.timestamps,
        pitch_voiced,
        color="blue",
        linewidth=1.8,
        label="Voiced",
        zorder=2,
    )

    # Add segment overlays
    if segments:
        # Shade segments
        for segment in segments:
            ax.axvspan(
                segment.start,
                segment.end,
                color="orange",
                alpha=0.3,
                zorder=0,
                label="Note Segments" if segment == segments[0] else "",
            )

        # Add MIDI labels for segments
        y_offset = (fmax - fmin) * 0.05  # 5% of frequency range
        for segment in segments:
            mid_time = (segment.start + segment.end) / 2

            # Only add label if segment is wide enough and within time bounds
            segment_duration = segment.end - segment.start
            total_duration = result.timestamps[-1] - result.timestamps[0]

            if segment_duration > total_duration * 0.01:  # Only if >1% of total time
                ax.text(
                    mid_time,
                    segment.pitch_median + y_offset,
                    f"MIDI {segment.pitch_midi}",
                    ha="center",
                    va="bottom",
                    fontsize=9,
                    fontweight="bold",
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.8),
                    zorder=3,
                )

    # Configure plot appearance - matches plot_pitch style
    ax.set_ylim(fmin, fmax)
    ax.set_xlim(result.timestamps[0], result.timestamps[-1])
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Pitch (Hz)")
    ax.set_title("SwiftF0 Pitch Detection with Note Segments")
    ax.legend(loc="upper right")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()

    # Save to file if requested
    if output_path:
        fig.savefig(output_path, dpi=dpi, bbox_inches="tight")

    # Show interactively if requested
    if show:
        plt.show()

    # Close figure to free memory
    plt.close(fig)
