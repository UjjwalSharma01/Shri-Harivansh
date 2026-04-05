'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collections } from '../content';
import AuthButton from '../../components/AuthButton';

const storageKeys = {
  collectionId: 'shri-harivansh.collectionId',
  sectionId: 'shri-harivansh.sectionId',
  verseNumber: 'shri-harivansh.verseNumber',
  fontSize: 'shri-harivansh.fontSize',
  darkMode: 'shri-harivansh.darkMode'
};

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = params?.collectionId;

  const collection = useMemo(
    () => collections.find((item) => item.id === collectionId) || collections[0],
    [collectionId]
  );

  const allVerses = useMemo(
    () => collection.sections.flatMap(sec => sec.verses),
    [collection]
  );

  const [isReady, setIsReady] = useState(false);
  const [sectionId, setSectionId] = useState(null);
  const [verseNumber, setVerseNumber] = useState(1);
  const [fontSize, setFontSize] = useState(20);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    let initialSectionId = collection.sections[0].id;
    let initialVerse = collection.sections[0].verses[0].number;

    const savedCollectionId = localStorage.getItem(storageKeys.collectionId);
    if (savedCollectionId === collection.id) {
      initialSectionId = localStorage.getItem(storageKeys.sectionId) || initialSectionId;
      initialVerse = Number(localStorage.getItem(storageKeys.verseNumber)) || initialVerse;
    }

    setSectionId(initialSectionId);
    setVerseNumber(initialVerse);
    setFontSize(Number(localStorage.getItem(storageKeys.fontSize) || 20));
    setIsDarkMode(
      localStorage.getItem(storageKeys.darkMode) === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    setIsReady(true);
  }, [collection]);

  useEffect(() => {
    if (!isReady) return;

    document.documentElement.style.setProperty('--reader-font-size', `${fontSize}px`);
    document.documentElement.classList.toggle('dark', isDarkMode);

    localStorage.setItem(storageKeys.collectionId, collection.id);
    localStorage.setItem(storageKeys.sectionId, sectionId);
    localStorage.setItem(storageKeys.verseNumber, String(verseNumber));
    localStorage.setItem(storageKeys.fontSize, String(fontSize));
    localStorage.setItem(storageKeys.darkMode, String(isDarkMode));
  }, [collectionId, fontSize, isDarkMode, isReady, sectionId, verseNumber, collection.id]);

  const section = useMemo(
    () => collection.sections.find((item) => item.id === sectionId) || collection.sections[0],
    [collection, sectionId]
  );

  const verseIndex = Math.max(
    0,
    section.verses.findIndex((verse) => verse.number === verseNumber)
  );
  const verse = section.verses[verseIndex] || section.verses[0];

  const isFirstVerse = sectionId === collection.sections[0].id && verseIndex === 0;
  const isLastVerse =
    sectionId === collection.sections[collection.sections.length - 1].id &&
    verseIndex === section.verses.length - 1;

  function moveVerse(direction) {
    const nextIndex = verseIndex + direction;
    if (nextIndex >= 0 && nextIndex < section.verses.length) {
      setVerseNumber(section.verses[nextIndex].number);
      return;
    }

    const currentSectionIndex = collection.sections.findIndex(s => s.id === sectionId);
    if (direction > 0 && currentSectionIndex < collection.sections.length - 1) {
      const nextSection = collection.sections[currentSectionIndex + 1];
      setSectionId(nextSection.id);
      setVerseNumber(nextSection.verses[0].number);
    } else if (direction < 0 && currentSectionIndex > 0) {
      const prevSection = collection.sections[currentSectionIndex - 1];
      setSectionId(prevSection.id);
      setVerseNumber(prevSection.verses[prevSection.verses.length - 1].number);
    }
  }

  function jumpToVerse(targetNum) {
    const targetSection = collection.sections.find(sec =>
      sec.verses.some(v => v.number === targetNum)
    );
    if (targetSection) {
      setSectionId(targetSection.id);
      setVerseNumber(targetNum);
    }
  }

  if (!isReady) return null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <Link href="/" className="topbar-title">Shri Harivansh</Link>
          <span className="topbar-divider" />
          <span className="topbar-subtitle">{collection.title}</span>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          <AuthButton />
          <Link href="/" className="ghost-btn">
            Library
          </Link>
        </div>
      </header>

      <main className="layout">
        <section className="panel reader-panel">
          <div className="panel-header reader-header">
            <div>
              <p className="eyebrow">{section.title}</p>
              <h3>Verse {verse.number}</h3>
            </div>

            <div className="reader-tools">
              <select
                value={verseNumber}
                onChange={(e) => jumpToVerse(Number(e.target.value))}
                className="verse-select"
                aria-label="Jump to verse"
              >
                {allVerses.map(v => (
                  <option key={v.number} value={v.number}>
                    Verse {v.number}
                  </option>
                ))}
              </select>

              <button
                className="ghost-btn"
                type="button"
                onClick={() => setFontSize(v => Math.max(16, v - 2))}
              >
                A−
              </button>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => setFontSize(v => Math.min(30, v + 2))}
              >
                A+
              </button>
            </div>
          </div>

          <div className="reader-meta">
            <span>Section {section.id}</span>
            <span>{verse.number} of {collection.totalVerses}</span>
          </div>

          <div className="audio-wrap">
            <audio controls preload="none" src={section.audioUrl} key={section.audioUrl} />
          </div>

          <article className="verse-card">
            <p className="verse-number">Verse {verse.number}</p>
            <div className="verse-text">{verse.text}</div>
          </article>

          <div className="reader-navigation">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => moveVerse(-1)}
              disabled={isFirstVerse}
            >
              Previous
            </button>
            <button
              className="primary-btn"
              type="button"
              onClick={() => moveVerse(1)}
              disabled={isLastVerse}
            >
              Next verse
            </button>
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
