'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collections } from './content';
import AuthButton from '../components/AuthButton';

const storageKeys = {
  collectionId: 'shri-harivansh.collectionId',
  darkMode: 'shri-harivansh.darkMode'
};

export default function HomePage() {
  const [isReady, setIsReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lastCollectionId, setLastCollectionId] = useState(null);

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
          <button className="ghost-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          <AuthButton />
        </div>
      </header>

      <main className="layout">
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
