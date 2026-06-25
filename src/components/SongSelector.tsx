import { Song } from '../types';

interface SongSelectorProps {
  songs: Song[];
  selectedSong: Song | null;
  onSelect: (song: Song) => void;
}

// Mock歌曲封面颜色
const getSongColor = (index: number): string => {
  const colors = [
    'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
    'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
    'linear-gradient(135deg, #45b7d1 0%, #2980b9 100%)',
    'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
    'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
    'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  ];
  return colors[index % colors.length];
};

export const SongSelector = ({ songs, selectedSong, onSelect }: SongSelectorProps) => {
  return (
    <div className="song-selector">
      <div className="section-header">
        <h3>🎵 歌曲库</h3>
        <span className="song-count">{songs.length} 首歌曲</span>
      </div>
      <div className="song-grid">
        {songs.map((song, index) => (
          <div
            key={song.id}
            className={`song-card ${selectedSong?.id === song.id ? 'selected' : ''}`}
            onClick={() => onSelect(song)}
          >
            <div 
              className="song-cover" 
              style={{ background: getSongColor(index) }}
            >
              <span className="cover-icon">🎤</span>
              {selectedSong?.id === song.id && (
                <div className="selected-badge">✓</div>
              )}
            </div>
            <div className="song-details">
              <div className="song-title">{song.title}</div>
              <div className="song-artist">{song.artist}</div>
              <div className="song-duration">
                <span className="duration-icon">⏱</span>
                {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};