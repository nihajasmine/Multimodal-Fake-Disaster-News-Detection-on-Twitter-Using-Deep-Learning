import React, { useState, useRef } from 'react';
import axios from 'axios';

function ResultCard({ title, value, color, icon }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: '44px', height: '44px',
        borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{value}</div>
      </div>
    </div>
  );
}

export default function Test() {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (file) => {
    if (!file) return;
    if (!file.type.match('image/.*')) {
      setError('Please upload an image file (JPG, PNG, GIF).');
      return;
    }
    setError(null);
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleImageChange(file);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image) {
      setError('Please provide tweet text or an image to analyze.');
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);

    const formData = new FormData();
    formData.append('tweet_text', text || ' ');
    if (image) formData.append('image', image);

    try {
      const response = await axios.post('http://localhost:8000/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please check that the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px',
      background: '#F5F6F7',
      minHeight: 'calc(100vh - 56px - 45px)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px', maxWidth: '620px' }}>
        <div style={{
          width: '48px', height: '48px',
          borderRadius: '50%',
          background: '#EFF6FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
          border: '1px solid #DBEAFE',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          Manual Tweet Diagnostic
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.7', margin: 0 }}>
          Enter tweet content or upload images to run the AI classification engine. Our system will
          analyze coordinates, visual markers, and linguistic urgency to provide a real-time risk
          assessment.
        </p>
      </div>

      {/* Main Card */}
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        border: '1px solid #E5E7EB',
        width: '100%',
        maxWidth: '860px',
        padding: '32px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Two Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '28px' }}>
          {/* Left: Tweet Text */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              marginBottom: '12px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Tweet Text
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Enter the tweet content here... e.g., 'Huge flood starting on Oak Street, water levels rising rapidly! #Emergency'`}
              style={{
                flex: 1,
                minHeight: '170px',
                padding: '14px',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#374151',
                resize: 'none',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                lineHeight: '1.6',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#3B82F6'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
            <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
              Note: Multi-line text analysis is supported for detailed descriptions.
            </p>
          </div>

          {/* Right: Upload */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              marginBottom: '12px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Upload Image Evidence
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                flex: 1,
                minHeight: '170px',
                border: `2px dashed ${dragOver ? '#3B82F6' : '#D1D5DB'}`,
                borderRadius: '10px',
                background: dragOver ? '#EFF6FF' : '#FAFAFA',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, borderRadius: '8px' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    borderRadius: '8px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>Click to Change</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: '44px', height: '44px',
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '13px', color: '#374151', margin: '0 0 4px' }}>Upload Image Evidence</p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>Supports JPG, PNG, and GIF. Max file size: 5MB</p>
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageChange(e.target.files[0])}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            <div style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              background: '#F9FAFB',
              border: '1px solid #F3F4F6',
              borderRadius: '8px',
              padding: '10px 12px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{ fontSize: '11px', color: '#6B7280', margin: 0, lineHeight: '1.5' }}>
                Visual evidence significantly improves the accuracy of urgency and location detection.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#F3F4F6', marginBottom: '28px' }} />

        {/* Submit */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? '#93C5FD' : '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0 36px',
              height: '44px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '220px',
              justifyContent: 'center',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2563EB'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#3B82F6'; }}
          >
            {loading ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Analyze Content
              </>
            )}
          </button>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
            Process typically takes 1.2s using the BERT-DisasterV2 model.
          </p>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontSize: '12px', fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div style={{ width: '100%', maxWidth: '860px', marginTop: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Diagnostic Results</h2>
          {(() => {
            const isRealDisaster = results.is_disaster === 'Disaster' && results.real_or_fake === 'Real';
            return (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isRealDisaster ? 'repeat(5, 1fr)' : 'repeat(2, 1fr)', 
                gap: '12px' 
              }}>
                <ResultCard
                  title="Disaster Classification"
                  value={results.is_disaster}
                  color={results.is_disaster === 'Disaster' ? '#EF4444' : '#22C55E'}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                />
                
                {isRealDisaster && (
                  <ResultCard
                    title="Incident Type"
                    value={results.disaster_type || 'N/A'}
                    color="#F97316"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                  />
                )}

                <ResultCard
                  title="Authenticity"
                  value={results.real_or_fake || 'N/A'}
                  color={results.real_or_fake === 'Real' ? '#3B82F6' : '#6B7280'}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                />

                {isRealDisaster && (
                  <>
                    <ResultCard
                      title="Detected Location"
                      value={results.location || 'Unknown'}
                      color="#14B8A6"
                      icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                    />
                    <ResultCard
                      title="Priority Level"
                      value={results.urgency || 'N/A'}
                      color={results.urgency === 'High' ? '#DC2626' : results.urgency === 'Medium' ? '#EAB308' : '#22C55E'}
                      icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                    />
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
