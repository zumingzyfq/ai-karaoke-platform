import { useState, useEffect } from 'react';
import { VocalCriticResult } from '../types';
import axios from 'axios';

interface VocalCriticProps {
  songId: string;
  recordingId: string;
  onClose: () => void;
}

export const VocalCritic = ({ songId, recordingId, onClose }: VocalCriticProps) => {
  const [result, setResult] = useState<VocalCriticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    const createCritic = async () => {
      try {
        await axios.post('/api/vocal-critic', {
          recording_id: recordingId,
          scores: {
            pitch: 85.0,
            rhythm: 80.0,
            vibrato: 75.0,
            overall: 82.0
          }
        });
        setCreated(true);
      } catch (err: any) {
        console.error('Failed to create vocal critic:', err);
        setError(err.response?.data?.detail || '创建点评失败');
        setLoading(false);
      }
    };

    const fetchResult = async () => {
      try {
        const response = await axios.get(`/api/vocal-critic/${songId}/${recordingId}`);
        setResult(response.data);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to get vocal critic result:', err);
        if (err.response?.status === 404 && !created) {
          await createCritic();
        } else if (err.response?.status === 404) {
          setError('正在生成点评，请稍候...');
        } else {
          setError(err.response?.data?.detail || '获取点评失败');
          setLoading(false);
        }
      }
    };

    fetchResult();
    const interval = setInterval(() => {
      if (created && !result && !error) {
        fetchResult();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [songId, recordingId, created, result, error]);

  if (loading) {
    return (
      <div className="vocal-critic-modal">
        <div className="modal-content">
          <h2>AI声乐导师</h2>
          <div className="loading-spinner"></div>
          <p>正在分析您的演唱...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vocal-critic-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>🎤 AI声乐导师点评</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="error-message">
            <p>❌ {error}</p>
            <p>请确保您已经完成过演唱录音，然后再尝试。</p>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vocal-critic-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>🎤 AI声乐导师点评</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {result && (
          <div className="critic-content">
            <div className="critic-section">
              <h3>💨 呼吸控制</h3>
              <p>{result.breathing}</p>
            </div>
            
            <div className="critic-section">
              <h3>🎵 音色表现</h3>
              <p>{result.timbre}</p>
            </div>
            
            <div className="critic-section">
              <h3>❤️ 情感表达</h3>
              <p>{result.emotion}</p>
            </div>
            
            <div className="critic-section">
              <h3>🎯 演唱技巧</h3>
              <p>{result.technique}</p>
            </div>
            
            <div className="critic-section suggestions">
              <h3>📝 改进建议</h3>
              <ul>
                {result.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        <button className="close-modal-btn" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
};