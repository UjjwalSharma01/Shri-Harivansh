'use client';

import { useEffect, useState, useCallback } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CACHE_KEY = 'shri-harivansh.dailyQuote';

function buildQuoteUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES[date.getMonth()];
  return `https://radhakelikunj.com/wp-content/uploads/${year}/${month}/Premanand-Ji-Maharaj-Quote-${day}-${monthName}-${year}.webp`;
}

function formatDate(date) {
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function testImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export default function DailyQuote() {
  const [quoteUrl, setQuoteUrl] = useState(null);
  const [quoteDate, setQuoteDate] = useState(null);
  const [isLatest, setIsLatest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState(null);
  const [shareFileName, setShareFileName] = useState('');

  const loadQuote = useCallback(async () => {
    const todayStr = new Date().toDateString();

    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && cached.url) {
        setQuoteUrl(cached.url);
        setQuoteDate(cached.dateLabel);
        setIsLatest(cached.dateKey === todayStr);
        if (cached.dateKey === todayStr) {
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    const today = new Date();
    for (let offset = 0; offset <= 5; offset++) {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      const url = buildQuoteUrl(d);
      const ok = await testImage(url);
      if (ok) {
        const dateLabel = formatDate(d);
        const dateKey = d.toDateString();
        setQuoteUrl(url);
        setQuoteDate(dateLabel);
        setIsLatest(offset === 0);
        setLoading(false);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ url, dateLabel, dateKey }));
        return;
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen]);

  const handleShareQuote = async () => {
    setSharing(true);
    try {
      const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(quoteUrl)}`);
      if (!response.ok) throw new Error('Proxy fetch failed');
      const blob = await response.blob();

      const fileName = `DailyQuote_${quoteDate.replace(/ /g, '_')}.png`;
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });

      // Try native share (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Divine Guru Quote',
            text: `Pujya Shri Hit Premanand Govind Sharan Ji Maharaj \u2014 ${quoteDate}\nShared from Shri Harivansh \u2728`
          });
          setSharing(false);
          return;
        } catch (e) {
          console.error('Share aborted', e);
        }
      }

      // Fallback: show preview modal with download
      const previewUrl = URL.createObjectURL(blob);
      setSharePreviewUrl(previewUrl);
      setShareFileName(fileName);
    } catch (e) {
      console.error('Fetch failed', e);
      window.open(quoteUrl, '_blank');
    }
    setSharing(false);
  };

  const handleDownloadQuoteImage = () => {
    if (!sharePreviewUrl) return;
    const a = document.createElement('a');
    a.href = sharePreviewUrl;
    a.download = shareFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const closeSharePreview = () => {
    if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
    setSharePreviewUrl(null);
    setShareFileName('');
  };

  if (!quoteUrl) {
    if (loading) {
      return (
        <section className="daily-quote-section panel">
          <div className="daily-quote-loading">
            <div className="quote-shimmer" />
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <>
      <section className="daily-quote-section panel">
        <div className="daily-quote-header">
          <div>
            <p className="eyebrow">{'\u0917\u0941\u0930\u0941 \u0935\u091A\u0928'}</p>
            <h3 className="daily-quote-title">Quote of the Day</h3>
          </div>
          <div className="daily-quote-meta">
            <span className="daily-quote-date">{quoteDate}</span>
            {isLatest && <span className="daily-quote-badge">Today</span>}
            {!isLatest && !loading && (
              <span className="daily-quote-badge stale">Latest available</span>
            )}
          </div>
        </div>

        <div
          className="daily-quote-frame"
          onClick={() => setFullscreen(true)}
          role="button"
          tabIndex={0}
          aria-label="View quote fullscreen"
          onKeyDown={(e) => e.key === 'Enter' && setFullscreen(true)}
        >
          <div className="daily-quote-glow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={quoteUrl}
            alt={`Pujya Maharaj Ji's Quote \u2014 ${quoteDate}`}
            className="daily-quote-img"
            loading="eager"
          />
          <div className="daily-quote-overlay">
            <span>Click to enlarge</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
          <p className="daily-quote-credit" style={{ margin: 0 }}>
            {'\u2014'} Pujya Shri Hit Premanand Govind Sharan Ji Maharaj
          </p>
          <button
            className="ghost-btn icon-btn"
            style={{ fontSize: '0.85rem', padding: '6px 12px', borderRadius: '24px' }}
            disabled={sharing}
            onClick={handleShareQuote}
          >
            {sharing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinning" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            )}
            {sharing ? 'Generating...' : 'Share image'}
          </button>
        </div>
      </section>

      {/* Fullscreen lightbox */}
      {fullscreen && (
        <div
          className="quote-lightbox"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-label="Quote fullscreen view"
        >
          <button
            className="quote-lightbox-close"
            onClick={() => setFullscreen(false)}
            aria-label="Close"
          >
            {'\u2715'}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={quoteUrl}
            alt={`Pujya Maharaj Ji's Quote \u2014 ${quoteDate}`}
            className="quote-lightbox-img"
          />
        </div>
      )}

      {/* Share Preview Modal */}
      {sharePreviewUrl && (
        <div className="quote-lightbox" onClick={closeSharePreview} role="dialog" aria-label="Share preview">
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }} onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sharePreviewUrl}
              alt="Share preview"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="primary-btn"
                onClick={handleDownloadQuoteImage}
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                {'\u2B07'} Download Image
              </button>
              <button
                className="secondary-btn"
                onClick={closeSharePreview}
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                {'\u2715'} Close
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textAlign: 'center' }}>
              Long-press the image to share directly on mobile
            </p>
          </div>
        </div>
      )}
    </>
  );
}
