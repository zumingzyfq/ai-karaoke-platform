import onnxruntime
import numpy as np
from typing import Tuple, Optional
from dataclasses import dataclass
import os


@dataclass
class PitchResult:
    """Container for pitch detection results containing:
    - pitch_hz: Estimated fundamental frequency in Hz for each frame
    - confidence: Model confidence score (0-1) for each frame
    - timestamps: Time positions (seconds) for each frame
    - voicing: Boolean voicing decisions for each frame
    """

    pitch_hz: np.ndarray
    confidence: np.ndarray
    timestamps: np.ndarray
    voicing: np.ndarray


class SwiftF0:
    """SwiftF0 - A fast and accurate fundamental frequency (F0) detector using ONNX models.

    The model uses an STFT-based approach with the following parameters:
    - Sample rate: 16kHz
    - STFT frame length: 1024 samples
    - Hop size: 256 samples
    - Padding: 384 samples (symmetrical padding for STFT processing)
    - Center offset: 127.5 samples (for accurate timestamp positioning)

    Note: The model strictly supports frequencies between 46.875 Hz and 2093.75 Hz only.
    """

    # Audio processing constants
    TARGET_SAMPLE_RATE = 16000
    HOP_LENGTH = 256  # STFT hop size (samples between frames)
    FRAME_LENGTH = 1024  # STFT window size (samples per frame)
    STFT_PADDING = (FRAME_LENGTH - HOP_LENGTH) // 2  # 384 samples (symmetrical padding)
    MIN_AUDIO_LENGTH = 256  # Minimum samples needed for 1 frame (1024 - 2*384)

    # STFT center position offset:
    # Center of first frame in original audio is at (FRAME_LENGTH-1)/2 - STFT_PADDING
    CENTER_OFFSET = (FRAME_LENGTH - 1) / 2 - STFT_PADDING  # 127.5 samples

    # Model frequency limits (strict physical constraints)
    MODEL_FMIN = 46.875  # Minimum detectable frequency
    MODEL_FMAX = 2093.75  # Maximum detectable frequency

    # Voicing decision parameters
    DEFAULT_CONFIDENCE_THRESHOLD = 0.9
    DEFAULT_FMIN = MODEL_FMIN  # Minimum frequency for voiced regions
    DEFAULT_FMAX = MODEL_FMAX  # Maximum frequency for voiced regions

    def __init__(
        self,
        confidence_threshold: Optional[float] = None,
        fmin: Optional[float] = None,
        fmax: Optional[float] = None,
    ):
        """
        Initialize SwiftF0 with the bundled ONNX model.

        Args:
            confidence_threshold: Confidence threshold (0-1) for voicing decision
            fmin: Minimum frequency (Hz) to consider voiced
            fmax: Maximum frequency (Hz) to consider voiced

        Raises:
            ValueError: For invalid parameters:
                - confidence_threshold outside [0.0, 1.0]
                - fmin < MODEL_FMIN (46.875 Hz)
                - fmax > MODEL_FMAX (2093.75 Hz)
                - fmin > fmax
                - Frequency range completely outside model capabilities
        """
        # Validate and set confidence threshold
        if confidence_threshold is not None:
            if not 0.0 <= confidence_threshold <= 1.0:
                raise ValueError(
                    f"confidence_threshold ({confidence_threshold}) must be between 0.0 and 1.0"
                )
            self.confidence_threshold = confidence_threshold
        else:
            self.confidence_threshold = self.DEFAULT_CONFIDENCE_THRESHOLD

        # Set frequency limits with defaults
        self.fmin = fmin or self.DEFAULT_FMIN
        self.fmax = fmax or self.DEFAULT_FMAX

        # Validate frequency ranges against model capabilities
        if self.fmin < self.MODEL_FMIN:
            raise ValueError(
                f"fmin ({self.fmin} Hz) is below model minimum ({self.MODEL_FMIN} Hz). "
                f"Minimum allowed frequency is {self.MODEL_FMIN} Hz."
            )

        if self.fmax > self.MODEL_FMAX:
            raise ValueError(
                f"fmax ({self.fmax} Hz) is above model maximum ({self.MODEL_FMAX} Hz). "
                f"Maximum allowed frequency is {self.MODEL_FMAX} Hz."
            )

        if self.fmin > self.fmax:
            raise ValueError(
                f"fmin ({self.fmin} Hz) cannot be greater than fmax ({self.fmax} Hz)"
            )

        if self.fmin > self.MODEL_FMAX or self.fmax < self.MODEL_FMIN:
            raise ValueError(
                f"Frequency range [{self.fmin}, {self.fmax}] Hz is completely outside "
                f"model capabilities [{self.MODEL_FMIN}, {self.MODEL_FMAX}] Hz. "
                "No voiced frames would be detected."
            )

        # Locate and verify the bundled ONNX model
        model_path = os.path.join(os.path.dirname(__file__), "model.onnx")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")

        # Initialize ONNX runtime session
        session_options = onnxruntime.SessionOptions()
        session_options.inter_op_num_threads = 1
        session_options.intra_op_num_threads = 1
        self.pitch_session = onnxruntime.InferenceSession(
            model_path, session_options, providers=["CPUExecutionProvider"]
        )
        self.pitch_input_name = self.pitch_session.get_inputs()[0].name

    def _extract_pitch_and_confidence(
        self, audio_16k: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Run the ONNX model to extract pitch and confidence.

        Args:
            audio_16k: Mono audio at 16kHz sampling rate

        Returns:
            Tuple of (pitch_hz, confidence) arrays

        Notes:
            - Automatically pads short audio to minimum required length
            - Handles model input formatting and output extraction
        """
        # Validate input audio
        if audio_16k.ndim != 1:
            raise ValueError("Input audio must be 1D (mono)")
        if len(audio_16k) == 0:
            raise ValueError("Input audio cannot be empty")

        # Pad audio to minimum required length if needed
        if len(audio_16k) < self.MIN_AUDIO_LENGTH:
            audio_16k = np.pad(
                audio_16k,
                (0, max(0, self.MIN_AUDIO_LENGTH - len(audio_16k))),
                mode="constant",
            )

        # Prepare input and run model
        ort_inputs = {self.pitch_input_name: audio_16k[None, :].astype(np.float32)}
        outputs = self.pitch_session.run(None, ort_inputs)

        # Validate and extract outputs
        if len(outputs) < 2:
            raise RuntimeError("Model returned insufficient outputs (expected 2)")

        return outputs[0][0], outputs[1][0]  # pitch_hz, confidence

    def _compute_voicing(
        self, pitch_hz: np.ndarray, confidence: np.ndarray
    ) -> np.ndarray:
        """Compute voicing mask based on confidence threshold and frequency limits.

        Args:
            pitch_hz: Array of pitch estimates
            confidence: Array of confidence values

        Returns:
            Boolean array indicating voiced frames
        """
        return (
            (confidence > self.confidence_threshold)
            & (pitch_hz >= self.fmin)
            & (pitch_hz <= self.fmax)
        )

    def _calculate_timestamps(self, n_frames: int) -> np.ndarray:
        """Calculate accurate frame timestamps accounting for STFT center positions.

        Args:
            n_frames: Number of pitch frames

        Returns:
            Array of timestamps in seconds

        Formula:
            timestamp = (frame_index * hop_size + center_offset) / sample_rate
        """
        # Calculate frame centers: (frame_index * hop_size) + center_offset
        frame_centers = np.arange(n_frames) * self.HOP_LENGTH + self.CENTER_OFFSET
        return frame_centers / self.TARGET_SAMPLE_RATE

    def detect_from_array(
        self, audio_array: np.ndarray, sample_rate: int
    ) -> PitchResult:
        """
        Detect pitch from numpy array.

        Args:
            audio_array: Input audio as 1D (mono) or 2D (multi-channel) numpy array
            sample_rate: Sample rate of the input audio

        Returns:
            PitchResult with detection results

        Raises:
            ImportError: If librosa is needed for resampling but not installed
            ValueError: For invalid input parameters
        """
        # Validate input
        if audio_array.size == 0:
            raise ValueError("Input audio cannot be empty")
        if sample_rate <= 0:
            raise ValueError("Sample rate must be positive")

        # Convert to mono if needed
        if audio_array.ndim > 1:
            audio_array = np.mean(audio_array, axis=-1)

        # Resample to 16kHz if needed
        if sample_rate != self.TARGET_SAMPLE_RATE:
            # 使用 scipy 替代 librosa 进行重采样（避免 librosa 的 bug）
            from scipy import signal
            import math
            
            # 计算需要的采样点数
            num_samples = int(len(audio_array) * self.TARGET_SAMPLE_RATE / sample_rate)
            
            # 使用 scipy.signal.resample 进行重采样
            audio_16k = signal.resample(audio_array.astype(np.float32), num_samples)
        else:
            audio_16k = audio_array.astype(np.float32)

        # Extract pitch and confidence
        pitch_hz, confidence = self._extract_pitch_and_confidence(audio_16k)

        # Compute voicing decisions
        voicing = self._compute_voicing(pitch_hz, confidence)

        # Generate accurate timestamps based on STFT center positions
        n_frames = len(pitch_hz)
        timestamps = self._calculate_timestamps(n_frames)

        return PitchResult(
            pitch_hz=pitch_hz,
            confidence=confidence,
            timestamps=timestamps,
            voicing=voicing,
        )

    def detect_from_file(self, audio_path: str) -> PitchResult:
        """
        Detect pitch from audio file.

        Args:
            audio_path: Path to audio file (any format supported by librosa)

        Returns:
            PitchResult with detection results

        Raises:
            ImportError: If librosa is not installed
        """
        try:
            import librosa
        except ImportError:
            raise ImportError(
                "librosa required for file loading. Install with: pip install librosa"
            )

        # Load audio as mono
        audio, sr = librosa.load(audio_path, sr=None, mono=True)
        return self.detect_from_array(audio, sr)


def plot_pitch(
    result: PitchResult,
    output_path: Optional[str] = None,
    show: bool = True,
    dpi: int = 300,
    figsize: Tuple[float, float] = (12, 4),
    style: str = "seaborn-v0_8",
) -> None:
    """
    Plot pitch with voicing information, optionally saving and/or showing.

    Args:
        result: PitchResult object containing detection results
        output_path: Path to save the plot (optional)
        show: Whether to display the plot interactively (default True)
        dpi: Image resolution for saving (default 300)
        figsize: Figure size in inches (width, height) (default (12, 4))
        style: Matplotlib style to use (default "seaborn-v0_8")

    Raises:
        ImportError: If matplotlib is not installed
        ValueError: For empty results or mismatched array lengths
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

    # Plot unvoiced segments (background)
    ax.plot(
        result.timestamps,
        result.pitch_hz,
        color="lightgray",
        alpha=0.7,
        linewidth=1.0,
        label="Unvoiced",
        zorder=1,
    )

    # Plot voiced segments (foreground)
    ax.plot(
        result.timestamps,
        pitch_voiced,
        color="blue",
        linewidth=1.8,
        label="Voiced",
        zorder=2,
    )

    # Configure plot appearance
    ax.set_ylim(fmin, fmax)
    ax.set_xlim(result.timestamps[0], result.timestamps[-1])
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Pitch (Hz)")
    ax.set_title("SwiftF0 Pitch Detection")
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


def export_to_csv(result: PitchResult, output_path: str) -> None:
    """
    Export pitch detection results to CSV file.

    Args:
        result: PitchResult object containing detection results
        output_path: Path to save the CSV file

    Raises:
        ValueError: For empty results or mismatched array lengths
    """
    import csv

    # Validate input
    n_frames = len(result.timestamps)
    if n_frames == 0:
        raise ValueError("Cannot export empty results")
    if not (
        len(result.pitch_hz)
        == len(result.confidence)
        == len(result.voicing)
        == n_frames
    ):
        raise ValueError("All result arrays must have the same length")

    # Write CSV with formatted values
    with open(output_path, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["timestamp", "pitch_hz", "confidence", "voiced"])

        for i in range(n_frames):
            writer.writerow(
                [
                    f"{result.timestamps[i]:.4f}",  # 4 decimal places for seconds
                    f"{result.pitch_hz[i]:.2f}",  # 2 decimal places for Hz
                    f"{result.confidence[i]:.4f}",  # 4 decimal places for confidence
                    "true" if result.voicing[i] else "false",  # Boolean as string
                ]
            )
