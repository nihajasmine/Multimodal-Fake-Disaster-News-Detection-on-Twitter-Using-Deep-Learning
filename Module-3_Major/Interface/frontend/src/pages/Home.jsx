import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './Home.css';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Home() {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  const loadTweets = async () => {
    setLoading(true);
    try {
      const resp = await axios.get('http://localhost:8000/api/tweets');
      setTweets(resp.data.data || []);
      setError(null);
    } catch {
      setError('Backend offline — showing local data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTweets(); }, []);

  const handleFetch = async () => {
    setFetching(true);
    try {
      await axios.get('http://localhost:8000/api/fetch-tweets');
      await loadTweets();
    } catch {
      setError('Could not fetch new tweets.');
    } finally {
      setFetching(false);
    }
  };

  const urgencyColor = (u) => u === 'High' ? '#EF4444' : u === 'Medium' ? '#EAB308' : '#22C55E';

  return (
    <div className="home-root">
      {/* ── LEFT PANEL ── */}
      <div className="left-panel">
        {/* Panel header */}
        <div className="left-header">
          <div className="left-header-title">
            <span className="section-label">Intelligence Feed</span>
            <span className="live-badge">● LIVE</span>
          </div>
          <button
            className="fetch-btn"
            onClick={handleFetch}
            disabled={fetching}
          >
            <svg
              className={fetching ? 'spin' : ''}
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {fetching ? 'Fetching…' : 'Fetch Latest Tweets'}
          </button>
        </div>

        <div className="reports-subheader">
          <span className="reports-label">RECENT REPORTS</span>
          <span className="mark-read">Mark all read</span>
        </div>

        {/* Tweet list */}
        <div className="tweet-list">
          {loading ? (
            <div className="empty-state">
              <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ color: '#EF4444', fontSize: '12px' }}>{error}</div>
          ) : tweets.length === 0 ? (
            <div className="empty-state">No reports found.<br />Click "Fetch Latest Tweets" to poll Twitter.</div>
          ) : (
            tweets.map((t, i) => (
              <TweetCard key={i} tweet={t} urgencyColor={urgencyColor} />
            ))
          )}
        </div>

        <div className="load-more-row">
          <button className="load-more-btn">Load more reports</button>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="right-panel">
        {/* Tableau map — expanded to fill space */}
        <div className="map-trend-row" style={{ flex: 1 }}>
          <div className="map-box" style={{ flex: 1 }}>
            <div className="box-header">
              <span className="box-title">Incident Density Heatmap</span>
              <div className="box-meta-row">
                <span className="box-meta">Layers: Satellite</span>
                <span className="box-meta">Data: Twitter Core</span>
              </div>
            </div>
            <div className="iframe-wrap" style={{ position: 'relative' }}>
              <MapContainer 
                center={[39.8283, -98.5795]} 
                zoom={4} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {tweets.filter(t => t.latitude && t.longitude).map((t, idx) => {
                  const markerColor = t.urgency === 'High' ? '#EF4444' : t.urgency === 'Medium' ? '#EAB308' : '#22C55E';
                  const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                  });
                  return (
                    <Marker key={idx} position={[parseFloat(t.latitude), parseFloat(t.longitude)]} icon={customIcon}>
                      <Popup>
                        <strong>{t.location}</strong><br/>
                        Urgency: {t.urgency}<br/>
                        Type: {t.disaster_type}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Incident Type Breakdown — live from CSV */}
        <div className="breakdown-box">
          <div className="box-header" style={{ marginBottom: '16px' }}>
            <span className="box-title">Incident Type Breakdown</span>
          </div>
          <div className="breakdown-row">
            {(() => {
              // Count disaster_type occurrences from tweets
              const typeColors = {
                'Earthquake': '#3B82F6',
                'Fire': '#EF4444',
                'Flood': '#6366F1',
                'Hurricane': '#F97316',
                'General Disaster': '#6B7280',
              };
              const defaultColor = '#9CA3AF';

              const counts = {};
              tweets.forEach(t => {
                const dtype = t.disaster_type;
                if (dtype && dtype !== 'None' && dtype !== '') {
                  counts[dtype] = (counts[dtype] || 0) + 1;
                }
              });

              const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
              const maxCount = entries.length ? Math.max(...entries.map(e => e[1])) : 1;

              if (entries.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#9CA3AF', fontSize: '12px', padding: '12px 0' }}>
                    No incident data available yet.
                  </div>
                );
              }

              return entries.map(([label, count]) => (
                <div key={label} className="breakdown-item">
                  <div className="breakdown-bar-bg">
                    <div style={{
                      width: `${Math.max((count / maxCount) * 100, 8)}%`,
                      height: '6px',
                      background: typeColors[label] || defaultColor,
                      borderRadius: '4px',
                    }} />
                  </div>
                  <span className="breakdown-count" style={{ color: typeColors[label] || defaultColor }}>{count}</span>
                  <span className="breakdown-label">{label.toUpperCase()}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, icon, iconColor }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span className="stat-label">{label}</span>
        <span style={{ fontSize: '16px', color: iconColor }}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-delta">{delta}</div>
    </div>
  );
}

function TweetCard({ tweet: t, urgencyColor }) {
  const avatarColors = ['#DBEAFE', '#D1FAE5', '#FEE2E2', '#FEF3C7', '#EDE9FE'];
  const avatarText = ['SJ', 'MT', 'OC', 'AR', 'KL'];
  const idx = Math.abs((t.tweet_text || '').charCodeAt(0)) % 5;

  return (
    <div className="tweet-card">
      <div className="tweet-urgency-bar" style={{ background: urgencyColor(t.urgency) }} />
      <div className="tweet-inner">
        <div className="tweet-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="tweet-avatar" style={{ background: avatarColors[idx] }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>{avatarText[idx]}</span>
            </div>
            <div>
              <div className="tweet-name">Social Report</div>
              <div className="tweet-time">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                {t.timestamp}
              </div>
            </div>
          </div>
          <span className={`tweet-badge ${t.is_disaster === 'Disaster' ? 'badge-disaster' : 'badge-ok'}`}>
            {t.is_disaster === 'Disaster' ? 'Critical' : 'Observation'}
          </span>
        </div>

        <p className="tweet-text">{t.tweet_text}</p>

        {t.image_path && (
          <div className="tweet-img-wrap">
            <img
              src={`http://localhost:8000/static/${t.image_path}`}
              alt="evidence"
              className="tweet-img"
              onError={e => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="tweet-tags">
          {t.location && t.location !== 'Unknown' && (
            <span className="tag tag-gray">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {t.location}
            </span>
          )}
          {t.disaster_type && t.disaster_type !== 'None' && (
            <span className="tag tag-blue">{t.disaster_type}</span>
          )}
          {t.real_or_fake === 'Real' && <span className="tag tag-green">✓ Verified Legend</span>}
          {t.real_or_fake === 'Fake' && <span className="tag tag-red">⚠ Flagged Fake</span>}
        </div>
      </div>
    </div>
  );
}
