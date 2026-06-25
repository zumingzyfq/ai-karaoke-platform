import { useEffect, useRef, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { RealTimeScore } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PitchChartProps {
  scores: RealTimeScore[];
}

export const PitchChart = ({ scores }: PitchChartProps) => {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 🔍 调试：检查数据 - 每次scores变化都打印
  useEffect(() => {
    console.log('🔵 [PitchChart] scores 变化检测到!', {
      当前scores长度: scores.length,
      前3帧内容: scores.slice(0, 3),
    });

    if (scores.length > 0) {
      const firstScore = scores[0];
      const lastScore = scores[scores.length - 1];
      console.log('📊 [PitchChart] 数据详情:', {
        总帧数: scores.length,
        第一帧: {
          timestamp: firstScore.timestamp,
          refPitch: firstScore.refPitch,
          userPitch: firstScore.userPitch,
        },
        最新一帧: {
          timestamp: lastScore.timestamp,
          refPitch: lastScore.refPitch,
          userPitch: lastScore.userPitch,
          overallScore: lastScore.overallScore,
        },
        非零参考音高数量: scores.filter(s => s.refPitch > 0).length,
        非零用户音高数量: scores.filter(s => s.userPitch > 0).length,
      });
    } else {
      console.log('⚠️ [PitchChart] scores 数组为空!');
    }
  }, [scores]);

  // 📐 调试：监控容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const wrapperRect = wrapperRef.current?.getBoundingClientRect();
        const newSize = {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          wrapperWidth: wrapperRect ? Math.round(wrapperRect.width) : 0,
          wrapperHeight: wrapperRect ? Math.round(wrapperRect.height) : 0,
        };
        setContainerSize({
          width: newSize.width,
          height: newSize.height,
        });
        console.log('📐 [PitchChart] 容器尺寸变化:', newSize);
      }
    };

    // 初次检查
    updateSize();

    // 监听尺寸变化
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // 🎨 调试：Chart.js渲染错误捕获
  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current;
      console.log('🎨 [PitchChart] Chart实例已挂载:', {
        canvas尺寸: {
          width: chart.canvas?.width,
          height: chart.canvas?.height,
          clientWidth: chart.canvas?.clientWidth,
          clientHeight: chart.canvas?.clientHeight,
        },
        数据点数: chart.data.datasets[0].data.length,
      });
    } else {
      console.warn('⚠️ [PitchChart] chartRef.current 为空, Chart实例未挂载!');
    }
  }, [scores]);

  // 处理数据：确保音高值在可见范围内
  const processedData = useMemo(() => {
    console.log('🔄 [PitchChart] processedData 重新计算, 输入scores长度:', scores.length);
    if (scores.length === 0) {
      return { labels: [], refPitches: [], userPitches: [] };
    }

    const labels = scores.map((s) => s.timestamp.toFixed(2));
    const refPitches = scores.map((s) => (s.refPitch > 0 ? s.refPitch : null));
    const userPitches = scores.map((s) => (s.userPitch > 0 ? s.userPitch : null));

    console.log('🔄 [PitchChart] processedData 输出:', {
      labels数量: labels.length,
      refPitches非空数: refPitches.filter(v => v !== null).length,
      userPitches非空数: userPitches.filter(v => v !== null).length,
      前3个ref: refPitches.slice(0, 3),
      前3个user: userPitches.slice(0, 3),
    });

    return { labels, refPitches, userPitches };
  }, [scores]);

  const data = {
    labels: processedData.labels,
    datasets: [
      {
        label: '参考音高',
        data: processedData.refPitches,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        borderWidth: 3,
        spanGaps: true,
      },
      {
        label: '用户音高',
        data: processedData.userPitches,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        borderWidth: 3,
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 100 },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#fff', font: { size: 14 } },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (context: { dataset: { label?: string }; dataIndex: number; parsed: { y: number | null } }) => {
            const score = scores[context.dataIndex];
            if (!score) return context.dataset.label || '';
            const label = context.dataset.label || '';
            const yValue = context.parsed.y ?? 0;
            return [
              `${label}: ${yValue.toFixed(1)} Hz`,
              `音准评分: ${score.pitchScore.toFixed(1)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        min: 0,
        max: 1000,
        ticks: {
          color: '#9ca3af',
          font: { size: 12 },
          callback: (value: number | string) => `${value} Hz`,
          maxTicksLimit: 10,
        },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update('none');
      console.log('🔃 [PitchChart] Chart.update() 已调用');
    }
  }, [scores]);

  return (
    <div className="pitch-chart-container" ref={containerRef}>
      <div className="chart-header">
        <h3>🎵 音高对比</h3>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-color legend-color.reference"></span>
            参考音高
          </span>
          <span className="legend-item">
            <span className="legend-color legend-color.user"></span>
            用户音高
          </span>
        </div>
        {scores.length === 0 && (
          <div style={{ color: '#fb923c', fontSize: '12px', marginTop: '5px' }}>
            ⚠️ 等待数据中... (scores: {scores.length})
          </div>
        )}
        {scores.length > 0 && (
          <div style={{ color: '#22c55e', fontSize: '12px', marginTop: '5px' }}>
            ✅ 已收到 {scores.length} 帧数据 | 容器: {containerSize.width}×{containerSize.height}px
          </div>
        )}
      </div>
      <div className="chart-wrapper" ref={wrapperRef}>
        <Line ref={chartRef} data={data} options={options} />
        {/* 调试：如果容器宽高为0则提示 */}
        {containerSize.width === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ef4444',
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            ❌ 容器宽度为0<br/>
            <small>PitchChart容器未正确渲染，请检查CSS</small>
          </div>
        )}
      </div>
    </div>
  );
};