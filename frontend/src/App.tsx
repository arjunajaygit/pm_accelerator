import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Thermometer, Wind, Droplets, Eye, Download, History, X, Sparkles, Sunrise, Sunset, Trash2, Edit2, Check, MapPin, Leaf } from 'lucide-react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import EarthBackground from './components/EarthBackground';

interface WeatherData {
  _id?: string;
  id?: string;
  location: string;
  resolvedLocation: string;
  temperature: number;
  condition: string;
  conditionIcon: string;
  feelsLike: number;
  tempMin?: number;
  tempMax?: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  sunrise?: number;
  sunset?: number;
  timezoneOffset?: number;
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

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';

function App() {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Enforce 5-day limit based on start date
  const maxEndDate = startDate 
    ? new Date(new Date(startDate).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : undefined;

  const formatYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // History Sidebar State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<WeatherData[]>([]);

  // CRUD UPDATE State
  const [editingLocation, setEditingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Lite Mode State
  const [isLiteMode, setIsLiteMode] = useState(false);

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

  const formatTime = (unixSec?: number, offsetSec?: number) => {
    if (!unixSec || offsetSec === undefined) return '--:--';
    const d = new Date((unixSec + offsetSec) * 1000);
    return d.toISOString().substr(11, 5);
  };

  const searchWeather = async (e?: React.FormEvent, historyLocation?: string) => {
    if (e) e.preventDefault();
    const searchQuery = historyLocation || query;
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError('');
    setHistoryOpen(false); 
    
    try {
      const res = await axios.post(`${API_BASE}/weather`, { 
        location: searchQuery,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setWeather(res.data.data);
      setQuery('');
      fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryRecord = async (id: string) => {
    setLoading(true);
    setError('');
    setHistoryOpen(false);
    try {
      const res = await axios.get(`${API_BASE}/weather/${id}`);
      setWeather(res.data.data);
      setEditingLocation(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load historical record.');
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryRecord = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/weather/${id}`);
      fetchHistory();
      if (weather && (weather._id === id || (weather as any).id === id)) {
        setWeather(null);
      }
    } catch (err) {
      console.error('Failed to delete record', err);
    }
  };

  const handleUpdateLocation = async () => {
    if (!weather || !newLocationName.trim()) return;
    try {
      const targetId = weather._id || (weather as any).id;
      await axios.put(`${API_BASE}/weather/${targetId}`, {
        resolvedLocation: newLocationName
      });
      setWeather({ ...weather, resolvedLocation: newLocationName });
      setEditingLocation(false);
      fetchHistory();
    } catch (err) {
      console.error('Failed to update location name', err);
    }
  };

  const fetchLocationByGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    setError('');
    setHistoryOpen(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordsStr = `${position.coords.latitude},${position.coords.longitude}`;
        // Do not display raw coordinates in the search bar
        try {
          const res = await axios.post(`${API_BASE}/weather`, { 
            location: coordsStr,
            startDate: startDate || undefined,
            endDate: endDate || undefined
          });
          setWeather(res.data.data);
          fetchHistory();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to fetch weather for your location.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Unable to retrieve your location. Please check browser permissions.');
        setLoading(false);
      }
    );
  };

  const handleExport = useCallback((format: string) => {
    window.open(`${API_BASE}/weather/export?format=${format}`, '_blank');
  }, []);

  return (
    <>
      {/* Background sits entirely outside the main app flow to guarantee it never scrolls */}
      {!isLiteMode && <EarthBackground targetLocation={weather?.resolvedLocation} />}
      <div className={`app-container ${getBgClass()} ${isLiteMode ? 'lite-mode' : ''}`}>

      {/* Minimal Sidebar Toggle */}
      <button className="sidebar-toggle" onClick={() => setHistoryOpen(true)}>
        <History size={20} strokeWidth={1.5} />
      </button>

      {/* Explicit Lite Mode Toggle */}
      <button 
        className={`mode-toggle-top ${!isLiteMode ? 'active-green' : ''}`} 
        onClick={() => setIsLiteMode(!isLiteMode)}
      >
        <Leaf size={16} strokeWidth={1.5} />
        <span>{isLiteMode ? 'Normal Mode' : 'Lite Mode'}</span>
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
                key={item.id || item._id} 
                className="history-item"
                onClick={() => loadHistoryRecord(item.id || item._id || '')}
              >
                <div className="history-info">
                  <span className="history-loc">{item.resolvedLocation || item.location}</span>
                  <span className="history-cond">{item.condition}</span>
                </div>
                <div className="history-actions">
                  <div className="history-temp">{item.temperature}°</div>
                  <button className="delete-btn" onClick={(e) => deleteHistoryRecord(e, item.id || item._id || '')} title="Delete Record">
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="sidebar-export">
          <div className="export-header">
            <Download size={16} strokeWidth={1.5} />
            <h4>Export All Data</h4>
          </div>
          <div className="export-buttons">
            {['JSON', 'CSV', 'XML', 'PDF', 'MD'].map((fmt) => (
              <button key={fmt} onClick={() => handleExport(fmt)} className="export-btn">
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-about">
          <div className="about-header">
            <Sparkles size={16} strokeWidth={1.5} />
            <h4>About PM Accelerator</h4>
          </div>
          <p className="about-desc">
            Developed by Arjun A for PM Accelerator Technical Assessment. The PM Accelerator Program supports PM professionals through every stage of their careers, helping them master FAANG-level skills, gain real-life AI Product Management experience, and accelerate their career growth.
          </p>
          <div className="about-links">
            <a href="https://www.drnancyli.com/" target="_blank" rel="noreferrer">Website</a>
            <a href="https://www.youtube.com/c/drnancyli" target="_blank" rel="noreferrer">YouTube</a>
            <a href="https://www.linkedin.com/school/pmaccelerator/" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </div>

      <main className="main-content">
        <header className="header">
          <h1 className="logo">Atmosphere</h1>
          <form className="search-bar" onSubmit={searchWeather}>
            <div className="search-inputs">
              <Search className="search-icon" size={18} strokeWidth={1.5} />
              <input 
                type="text" 
                placeholder="Search location..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
              />
              <button type="button" className="gps-btn" onClick={fetchLocationByGPS} title="Use Current Location">
                <MapPin size={18} strokeWidth={2} />
              </button>
              <DatePicker
                selected={startDate ? new Date(startDate + 'T12:00:00Z') : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    const newStartStr = formatYMD(date);
                    setStartDate(newStartStr);
                    if (endDate && endDate < newStartStr) setEndDate('');
                  } else {
                    setStartDate('');
                  }
                }}
                className="date-input"
                placeholderText="Start Date"
                dateFormat="yyyy-MM-dd"
              />
              <DatePicker
                selected={endDate ? new Date(endDate + 'T12:00:00Z') : null}
                onChange={(date: Date | null) => setEndDate(date ? formatYMD(date) : '')}
                minDate={startDate ? new Date(startDate + 'T12:00:00Z') : undefined}
                maxDate={maxEndDate ? new Date(maxEndDate + 'T12:00:00Z') : undefined}
                className="date-input"
                placeholderText="End Date"
                dateFormat="yyyy-MM-dd"
              />
              {(startDate || endDate) && (
                <button 
                  type="button" 
                  className="clear-dates-btn" 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  title="Clear Dates"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
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
            <section className="current-weather glass-panel stagger-1">
              <div className="weather-main">
                <div className="location-info">
                  <div className="location-header">
                    {editingLocation ? (
                      <div className="edit-location-form">
                        <input 
                          type="text" 
                          value={newLocationName} 
                          onChange={(e) => setNewLocationName(e.target.value)} 
                          className="edit-location-input"
                          autoFocus
                        />
                        <button onClick={handleUpdateLocation} className="save-loc-btn" title="Save Name">
                          <Check size={20} strokeWidth={2} />
                        </button>
                        <button onClick={() => setEditingLocation(false)} className="cancel-loc-btn" title="Cancel">
                          <X size={20} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2>{weather.resolvedLocation}</h2>
                        <button 
                          className="edit-loc-btn" 
                          onClick={() => {
                            setNewLocationName(weather.resolvedLocation);
                            setEditingLocation(true);
                          }}
                          title="Edit Location Name"
                        >
                          <Edit2 size={16} strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="condition-line">
                    <p className="condition-text">{weather.condition}</p>
                    <span className="dot-separator">•</span>
                    <div className="temp-hl">
                      <span>H: {weather.tempMax}°</span>
                      <span>L: {weather.tempMin}°</span>
                    </div>
                  </div>
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
                {weather.sunrise && (
                  <div className="metric">
                    <div className="metric-label">
                      <Sunrise className="icon-sunrise" size={16} strokeWidth={2} />
                      <span>Sunrise</span>
                    </div>
                    <span className="metric-value">{formatTime(weather.sunrise, weather.timezoneOffset)}</span>
                  </div>
                )}
                {weather.sunset && (
                  <div className="metric">
                    <div className="metric-label">
                      <Sunset className="icon-sunset" size={16} strokeWidth={2} />
                      <span>Sunset</span>
                    </div>
                    <span className="metric-value">{formatTime(weather.sunset, weather.timezoneOffset)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Subtle AI Insight */}
            {weather.aiInsight && (
              <section className="ai-insight glass-panel stagger-2">
                <div className="insight-header">
                  <Sparkles className="icon-ai" size={16} strokeWidth={2} />
                  <span>AI Insight</span>
                </div>
                <p className="insight-text">{weather.aiInsight}</p>
              </section>
            )}

            {/* Forecast Grid */}
            <section className="forecast glass-panel stagger-3">
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
            <section className="media-section stagger-4">
              {weather.mapUrl && (
                <div className="map-container glass-panel">
                  <h3 className="section-title">Location</h3>
                  <div className="iframe-wrapper">
                    <div className="iframe-skeleton" />
                    <iframe 
                      src={weather.mapUrl} 
                      width="100%" 
                      height="200" 
                      className="map-frame"
                      allowFullScreen 
                      loading="lazy"
                    ></iframe>
                  </div>
                </div>
              )}

              {weather.videoIds && weather.videoIds.length > 0 && (
                <div className="videos-container glass-panel">
                  <h3 className="section-title">Guides</h3>
                  <div className="video-list">
                    {weather.videoIds.slice(0, 3).map((id) => (
                      <div key={id} className="iframe-wrapper">
                        <div className="iframe-skeleton" />
                        <iframe 
                          width="100%" 
                          height="200" 
                          src={`https://www.youtube.com/embed/${id}`} 
                          title="YouTube guide" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                          className="yt-video"
                          loading="lazy"
                        ></iframe>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      </div>
    </>
  );
}

export default App;
