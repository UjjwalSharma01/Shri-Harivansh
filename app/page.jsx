'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collections } from './content';
import AuthButton from '../components/AuthButton';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getBookmarks } from '../lib/db';
import DailyQuote from '../components/DailyQuote';
import ActivityCalendar from '../components/ActivityCalendar';

const storageKeys = {
  collectionId: 'shri-harivansh.collectionId',
  darkMode: 'shri-harivansh.darkMode'
};

export default function HomePage() {
  const [isReady, setIsReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lastCollectionId, setLastCollectionId] = useState(null);
  const [user, setUser] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    setIsDarkMode(
      localStorage.getItem(storageKeys.darkMode) === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    const savedCollection = localStorage.getItem(storageKeys.collectionId);
    if (savedCollection && collections.some(c => c.id === savedCollection)) {
      setLastCollectionId(savedCollection);
    }
    setIsReady(true);

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const bms = await getBookmarks(currentUser);
        setBookmarks(bms);
      } else {
        setBookmarks([]);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem(storageKeys.darkMode, String(isDarkMode));
  }, [isDarkMode, isReady]);

  if (!isReady) return null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-title">Shri Harivansh</span>
          <span className="topbar-divider" />
          <span className="topbar-subtitle">Devotional Reader</span>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn icon-btn" onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
            <span className="hide-on-mobile">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
          <AuthButton />
        </div>
      </header>

      <main className="layout">
        {/* Daily Quote — hero position */}
        <DailyQuote />

        <ActivityCalendar />

        <section className="panel hero">
          <div className="hero-content">
            <p className="eyebrow">Sacred Texts</p>
            <h2>Begin your reading</h2>
            <p className="subtitle">
              Explore Shri Hit Chaurasi Ji — 84 divine padas by Shri Hit
              Harivansh Mahaprabhu Ji. More granthas coming soon.
            </p>
          </div>
          <div className="hero-actions">
            {lastCollectionId && (
              <Link href={`/${lastCollectionId}`} className="primary-btn">
                Continue reading
              </Link>
            )}
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                localStorage.clear();
                setLastCollectionId(null);
                localStorage.setItem(storageKeys.darkMode, String(isDarkMode));
              }}
            >
              Reset progress
            </button>
          </div>
        </section>

        {bookmarks.length > 0 && (
          <>
            <div className="section-divider">
              <span>Meditate</span>
            </div>
            <section className="panel grid-panel">
              <div className="panel-header">
                <p className="eyebrow">My Favorites</p>
                <h3>Saved Verses</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {bookmarks.map((bm, idx) => {
                  const coll = collections.find(c => c.id === bm.collectionId);
                  const sec = coll?.sections.find(s => s.id === bm.sectionId);
                  const verse = sec?.verses.find(v => v.number === bm.verseNumber);
                  
                  if (!verse) return null;

                  return (
                    <div 
                      key={`${bm.collectionId}_${bm.sectionId}_${bm.verseNumber}_${idx}`} 
                      className="collection-card" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        localStorage.setItem(storageKeys.collectionId, bm.collectionId);
                        localStorage.setItem('shri-harivansh.sectionId', bm.sectionId);
                        localStorage.setItem('shri-harivansh.verseNumber', String(bm.verseNumber));
                        window.location.href = `/${bm.collectionId}`;
                      }}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: 'var(--accent)' }}>★ {coll?.title}</strong>
                        <span style={{ margin: '0 8px', color: 'var(--text-tertiary)' }}>•</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Section {bm.sectionId}, Verse {bm.verseNumber}</span>
                      </div>
                      <p style={{ fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '4px' }}>
                        {verse.hindiShloka ? verse.hindiShloka.slice(0, 80) + '...' : verse.text.slice(0, 80) + '...'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <div className="section-divider">
          <span>Collections</span>
        </div>

        <section className="panel grid-panel">
          <div className="panel-header">
            <p className="eyebrow">Library</p>
            <h3>Available Granthas</h3>
            <p className="panel-header-subtitle">Select a text to open the reader.</p>
          </div>

          <div className="collection-grid">
            {collections.map((item) => {
              const verseCount = item.sections.reduce(
                (sum, sec) => sum + sec.verses.length, 0
              );

              return (
                <Link key={item.id} href={`/${item.id}`} className="collection-card">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <div className="card-footer">
                    <span className="card-stat">
                      <span className="card-stat-dot" />
                      {verseCount} verses
                    </span>
                    <span className="card-stat">
                      <span className="card-stat-dot" />
                      {item.sections.length} sections
                    </span>
                  </div>
                  <small>{item.description}</small>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p className="footer-sanskrit">॥ राधे राधे ॥</p>
        <p className="footer-credit">Shri Harivansh</p>
      </footer>
    </div>
  );
}
