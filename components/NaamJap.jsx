'use client';

import { useState, useEffect } from 'react';

const names = [
  { eng: 'Radha', hin: 'राधा' },
  { eng: 'Harivansh', hin: 'हरिवंश' },
  { eng: 'Radhavallabh Shri Harivansh', hin: 'राधावल्लभ श्री हरिवंश' }
];

export default function NaamJap() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);
  const [scale, setScale] = useState(1);
  const [langPreference, setLangPreference] = useState('both'); // 'both', 'hin', 'eng'
  const [isWriting, setIsWriting] = useState(false);
  const [writeSpeed, setWriteSpeed] = useState(4); // seconds per word

  useEffect(() => {
    if (isImmersive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isImmersive]);

  if (isImmersive) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'var(--bg-body, #121212)', zIndex: 99999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.5s ease'
      }}>
        <button 
          onClick={() => setIsImmersive(false)}
          className="ghost-btn"
          style={{ position: 'absolute', top: '2rem', right: '2rem', fontSize: '1.2rem' }}
        >
          ✕ Close
        </button>
        
        <div style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 100 }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-primary)', opacity: 0.8 }}>
            <button onClick={() => setScale(s => Math.max(0.4, Number((s - 0.2).toFixed(1))))} className="ghost-btn" style={{ padding: '4px 16px', fontSize: '1.2rem' }}>A-</button>
            <span style={{ display: 'flex', alignItems: 'center', margin: '0 8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, Number((s + 0.2).toFixed(1))))} className="ghost-btn" style={{ padding: '4px 16px', fontSize: '1.2rem' }}>A+</button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-primary)', opacity: 0.8 }}>
            <button onClick={() => setLangPreference('hin')} className={langPreference === 'hin' ? 'primary-btn' : 'ghost-btn'} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>Hindi</button>
            <button onClick={() => setLangPreference('eng')} className={langPreference === 'eng' ? 'primary-btn' : 'ghost-btn'} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>English</button>
            <button onClick={() => setLangPreference('both')} className={langPreference === 'both' ? 'primary-btn' : 'ghost-btn'} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>Both</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-primary)', opacity: 0.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Animate Writing</span>
              <button 
                onClick={() => setIsWriting(!isWriting)} 
                className={isWriting ? 'primary-btn' : 'ghost-btn'} 
                style={{ padding: '2px 8px', fontSize: '0.8rem' }}
              >
                {isWriting ? 'On' : 'Off'}
              </button>
            </div>
            {isWriting && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Speed</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => setWriteSpeed(s => Math.min(10, s + 1))} className="ghost-btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Slower</button>
                  <button onClick={() => setWriteSpeed(s => Math.max(1, s - 1))} className="ghost-btn" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Faster</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', animation: isWriting ? 'none' : 'breathe 8s infinite ease-in-out', display: 'flex', flexDirection: 'column', gap: `${scale * 0.5}rem`, alignItems: 'center', justifyContent: 'center', maxWidth: '90vw', maxHeight: '80vh' }}>
          {(langPreference === 'both' || langPreference === 'hin') && (
            <h2 style={{ 
              fontSize: `calc(${scale} * ${langPreference === 'both' ? 'clamp(4rem, 12vw, 10rem)' : 'clamp(5rem, 15vw, 12rem)'})`, 
              color: 'var(--accent)', margin: 0, fontWeight: 'bold', lineHeight: 1.1, transition: 'font-size 0.2s ease',
              display: 'inline-block'
            }}>
              {!isWriting ? names[currentIndex].hin : (
                <span 
                  key={`hin-${currentIndex}`}
                  style={{ 
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    animation: `revealText ${writeSpeed}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`
                  }}
                >
                  {names[currentIndex].hin}
                </span>
              )}
            </h2>
          )}
          {(langPreference === 'both' || langPreference === 'eng') && (
            <p style={{ 
              fontSize: `calc(${scale} * ${langPreference === 'both' ? 'clamp(1.5rem, 4vw, 3rem)' : 'clamp(2rem, 5vw, 4rem)'})`, 
              color: 'var(--text-secondary)', margin: 0, transition: 'font-size 0.2s ease', lineHeight: 1.2,
              display: 'inline-block'
            }}>
              {!isWriting ? names[currentIndex].eng : (
                <span 
                  key={`eng-${currentIndex}`}
                  style={{ 
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    animation: `revealText ${writeSpeed}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`,
                    animationDelay: langPreference === 'both' ? `${writeSpeed * 0.2}s` : '0s',
                    opacity: langPreference === 'both' ? 0 : 1,
                    animationFillMode: 'forwards'
                  }}
                >
                  {names[currentIndex].eng}
                </span>
              )}
            </p>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: '3rem', opacity: scale > 1.8 ? 0 : 0.5, transition: 'opacity 0.3s ease', zIndex: 10, background: 'var(--bg-body)', padding: '8px 24px', borderRadius: '30px' }}>
          <p style={{ margin: 0 }}>Breathe in... Breathe out... Focus on the Holy Name</p>
        </div>

        <style jsx>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes revealText {
            0% { width: 0; opacity: 1; border-right: 4px solid var(--accent, #f39c12); }
            40% { width: 100%; opacity: 1; border-right: 4px solid transparent; }
            80% { width: 100%; opacity: 1; }
            100% { width: 100%; opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <section className="panel grid-panel" style={{ textAlign: 'center' }}>
      <div className="panel-header" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow">Practice</p>
          <h3>Naam Jap Enhancer</h3>
          <p className="panel-header-subtitle">Fix your gaze on the Holy Name and chant, or trace it in your mind.</p>
        </div>
        <button onClick={() => setIsImmersive(true)} className="primary-btn">
          Enter Fullscreen Focus
        </button>
      </div>
      
      <div style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--surface-sunken)', borderRadius: '12px', marginTop: '1rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
            <button onClick={() => setScale(s => Math.max(0.4, Number((s - 0.2).toFixed(1))))} className="ghost-btn" style={{ padding: '2px 8px', fontSize: '1rem', minWidth: 'auto', minHeight: 'auto' }}>A-</button>
            <span style={{ display: 'flex', alignItems: 'center', margin: '0 4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, Number((s + 0.2).toFixed(1))))} className="ghost-btn" style={{ padding: '2px 8px', fontSize: '1rem', minWidth: 'auto', minHeight: 'auto' }}>A+</button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-primary)', justifyContent: 'center' }}>
            <button onClick={() => setLangPreference('hin')} className={langPreference === 'hin' ? 'primary-btn' : 'ghost-btn'} style={{ padding: '2px 6px', fontSize: '0.7rem', minWidth: 'auto', minHeight: 'auto' }}>Hindi</button>
            <button onClick={() => setLangPreference('eng')} className={langPreference === 'eng' ? 'primary-btn' : 'ghost-btn'} style={{ padding: '2px 6px', fontSize: '0.7rem', minWidth: 'auto', minHeight: 'auto' }}>English</button>
            <button onClick={() => setLangPreference('both')} className={langPreference === 'both' ? 'primary-btn' : 'ghost-btn'} style={{ padding: '2px 6px', fontSize: '0.7rem', minWidth: 'auto', minHeight: 'auto' }}>Both</button>
          </div>
        </div>

        <div style={{ marginBottom: '2.5rem', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {(langPreference === 'both' || langPreference === 'hin') && (
            <h2 style={{ fontSize: `calc(${scale} * 3.5rem)`, color: 'var(--accent)', marginBottom: '0.5rem', fontWeight: 'bold', transition: 'font-size 0.2s ease', lineHeight: 1.1 }}>
              {names[currentIndex].hin}
            </h2>
          )}
          {(langPreference === 'both' || langPreference === 'eng') && (
            <p style={{ fontSize: `calc(${scale} * 1.5rem)`, color: 'var(--text-secondary)', transition: 'font-size 0.2s ease', margin: 0 }}>
              {names[currentIndex].eng}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {names.map((name, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={idx === currentIndex ? 'primary-btn' : 'secondary-btn'}
            >
              {name.eng}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
