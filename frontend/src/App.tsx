import { useState, useEffect } from 'react';
import { Search, Loader2, Thermometer, Wind, Droplets, Eye, Download, History, X, MapPin, Sparkles } from 'lucide-react';
import axios from 'axios';

interface WeatherData {
  _id: string;
  location: string;
  resolvedLocation: string;
  temperature: number;
  condition: string;
  conditionIcon: string;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  aiInsight?: string;
  mapUrl?: string;
  videoIds?: string[];
  forecast: Array<{
    day: string;
    temp: number;
    condition: string;
    icon: string;
  }>;
}

const API_BASE = 'http://localhost:5001/api';

function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // History Sidebar State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<WeatherData[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/weather?limit=10`);
      setHistory(res.data.data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getBgClass = () => {
    if (!weather) return 'bg-default';
    const cond = weather.condition.toLowerCase();
    if (cond.includes('rain') || cond.includes('drizzle')) return 'bg-rain';
    if (cond.includes('snow')) return 'bg-snow';
    if (cond.includes('cloud')) return 'bg-cloudy';
    if (cond.includes('clear') || cond.includes('sun')) return 'bg-clear';
    return 'bg-default';
  };

  const searchWeather = async (e?: React.FormEvent, loc?: string) => {
    if (e) e.preventDefault();
    const searchQuery = loc || query;
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError('');
    setHistoryOpen(false); 
    
    try {
      const res = await axios.post(`${API_BASE}/weather`, { location: searchQuery });
      setWeather(res.data.data);
      setQuery('');
      fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: string) => {
    window.open(`${API_BASE}/weather/export?format=${format}`, '_blank');
  };

  return (
    <div className={`app-container ${getBgClass()}`}>
      
      {/* Minimal Sidebar Toggle */}
      <button className="sidebar-toggle" onClick={() => setHistoryOpen(true)}>
        <History size={20} strokeWidth={1.5} />
      </button>

      <div className={`history-sidebar ${historyOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Recent</h3>
          <button onClick={() => setHistoryOpen(false)} className="close-btn">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="no-history">No activity yet.</p>
          ) : (
            history.map((item) => (
              <div 
                key={item._id} 
                className="history-item"
                onClick={() => searchWeather(undefined, item.location)}
              >
                <div className="history-info">
                  <span className="history-loc">{item.resolvedLocation || item.location}</span>
                  <span className="history-cond">{item.condition}</span>
                </div>
                <div className="history-temp">
                  {item.temperature}°
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <main className="main-content">
        <header className="header">
          <h1 className="logo">Atmosphere</h1>
          <form className="search-bar" onSubmit={searchWeather}>
            <Search className="search-icon" size={18} strokeWidth={1.5} />
            <input 
              type="text" 
              placeholder="Search location..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={16} strokeWidth={1.5} /> : 'Search'}
            </button>
          </form>
        </header>

        {error && (
          <div className="error-message glass-panel">
            {error}
          </div>
        )}

        {!weather && !loading && !error && (
          <div className="welcome-state">
            <h2>Clarity in every forecast.</h2>
            <p>Enter a location to receive intelligent weather insights, precise metrics, and curated travel data.</p>
          </div>
        )}

        {weather && (
          <div className="dashboard">
            
            {/* Minimal Weather Card */}
            <section className="current-weather glass-panel">
              <div className="weather-main">
                <div className="location-info">
                  <h2>{weather.resolvedLocation}</h2>
                  <p className="condition-text">{weather.condition}</p>
                </div>
                <div className="temp-display">
                  <span className="temperature">{weather.temperature}°</span>
                  <img src={`https://openweathermap.org/img/wn/${weather.conditionIcon}@4x.png`} alt={weather.condition} className="weather-icon-large" />
                </div>
              </div>
              
              <div className="weather-metrics">
                <div className="metric">
                  <div className="metric-label">
                    <Thermometer className="icon-temp" size={16} strokeWidth={2} />
                    <span>Feels Like</span>
                  </div>
                  <span className="metric-value">{weather.feelsLike}°</span>
                </div>
                <div className="metric">
                  <div className="metric-label">
                    <Wind className="icon-wind" size={16} strokeWidth={2} />
                    <span>Wind</span>
                  </div>
                  <span className="metric-value">{weather.windSpeed} km/h</span>
                </div>
                <div className="metric">
                  <div className="metric-label">
                    <Droplets className="icon-humidity" size={16} strokeWidth={2} />
                    <span>Humidity</span>
                  </div>
                  <span className="metric-value">{weather.humidity}%</span>
                </div>
                <div className="metric">
                  <div className="metric-label">
                    <Eye className="icon-visibility" size={16} strokeWidth={2} />
                    <span>Visibility</span>
                  </div>
                  <span className="metric-value">{weather.visibility / 1000} km</span>
                </div>
              </div>
            </section>

            {/* Subtle AI Insight */}
            {weather.aiInsight && (
              <section className="ai-insight glass-panel">
                <div className="insight-header">
                  <Sparkles className="icon-ai" size={16} strokeWidth={2} />
                  <span>AI Insight</span>
                </div>
                <p className="insight-text">{weather.aiInsight}</p>
              </section>
            )}

            {/* Forecast Grid */}
            <section className="forecast glass-panel">
              <h3 className="section-title">5-Day Forecast</h3>
              <div className="forecast-grid">
                {weather.forecast.map((day, idx) => (
                  <div key={idx} className="forecast-day">
                    <span className="day-name">{day.day.split(',')[0]}</span>
                    <img src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} alt={day.condition} width={64} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }} />
                    <span className="day-temp">{day.temp}°</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Media Section */}
            <section className="media-section">
              {weather.mapUrl && (
                <div className="map-container glass-panel">
                  <h3 className="section-title">Location</h3>
                  <iframe 
                    src={weather.mapUrl} 
                    width="100%" 
                    height="200" 
                    className="map-frame"
                    allowFullScreen 
                    loading="lazy"
                  ></iframe>
                </div>
              )}

              {weather.videoIds && weather.videoIds.length > 0 && (
                <div className="videos-container glass-panel">
                  <h3 className="section-title">Guides</h3>
                  <div className="video-list">
                    {weather.videoIds.slice(0, 1).map((id) => (
                      <iframe 
                        key={id}
                        width="100%" 
                        height="200" 
                        src={`https://www.youtube.com/embed/${id}`} 
                        title="YouTube guide" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="yt-video"
                      ></iframe>
                    ))}
                  </div>
                </div>
              )}
            </section>
            
            {/* Export Section */}
            <section className="export-section glass-panel">
              <div className="export-header">
                <Download size={16} strokeWidth={1.5} />
                <h3>Export</h3>
              </div>
              <div className="export-buttons">
                {['JSON', 'CSV', 'XML', 'PDF', 'MD'].map((fmt) => (
                  <button key={fmt} onClick={() => handleExport(fmt)} className="export-btn">
                    {fmt}
                  </button>
                ))}
              </div>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
