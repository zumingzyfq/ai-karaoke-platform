import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioData: Uint8Array | null;
}

export const AudioVisualizer = ({ audioData }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');

    ctx.fillStyle = gradient;

    const barWidth = width / audioData.length;
    const centerY = height / 2;

    audioData.forEach((value, index) => {
      const barHeight = (value / 255) * height * 0.8;
      const x = index * barWidth;
      
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    });
  }, [audioData]);

  return (
    <div className="visualizer-container">
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className="visualizer-canvas"
      />
    </div>
  );
};