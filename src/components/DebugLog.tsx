import { useState, useEffect, useRef } from 'react';
import { LogEntry } from '../hooks/useWebSocket';
import './DebugLog.css';

export const DebugLog = ({ logs, maxLogs = 100 }: { logs: LogEntry[]; maxLogs?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState<LogEntry['type'] | 'all'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current && isVisible) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isVisible]);

  // 过滤日志
  const filteredLogs = filter === 'all' 
    ? logs.slice(-maxLogs)
    : logs.filter(log => log.type === filter).slice(-maxLogs);

  // 获取日志类型颜色
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'audio': return '#3498db';
      case 'pitch': return '#9b59b6';
      case 'score': return '#2ecc71';
      case 'lyric': return '#e67e22';
      case 'system': return '#34495e';
      case 'warning': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  // 获取日志类型图标
  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'audio': return '🎙️';
      case 'pitch': return '📈';
      case 'score': return '⭐';
      case 'lyric': return '📜';
      case 'system': return '⚙️';
      case 'warning': return '⚠️';
      default: return '📋';
    }
  };

  // 格式化时间戳
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="debug-log-container">
      <button 
        className="debug-log-toggle"
        onClick={() => setIsVisible(!isVisible)}
      >
        📊 调试日志 {logs.length > 0 && <span className="log-count">{logs.length}</span>}
      </button>
      
      {isVisible && (
        <div className="debug-log-panel" ref={containerRef}>
          <div className="debug-log-header">
            <span>实时日志监控</span>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as LogEntry['type'] | 'all')}
            >
              <option value="all">全部</option>
              <option value="audio">音频</option>
              <option value="pitch">音高</option>
              <option value="score">评分</option>
              <option value="lyric">歌词</option>
              <option value="system">系统</option>
              <option value="warning">警告</option>
            </select>
          </div>
          
          <div className="debug-log-content">
            {filteredLogs.length === 0 ? (
              <div className="debug-log-empty">暂无日志数据</div>
            ) : (
              filteredLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`debug-log-entry ${log.type}`}
                  style={{ borderLeftColor: getLogColor(log.type) }}
                >
                  <span className="log-time">{formatTime(log.timestamp)}</span>
                  <span className="log-icon">{getLogIcon(log.type)}</span>
                  <span className="log-type" style={{ color: getLogColor(log.type) }}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="log-message">{log.message}</span>
                  {log.data && (
                    <div className="log-data">
                      {Object.entries(log.data).map(([key, value]) => (
                        <span key={key} className="log-data-item">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
