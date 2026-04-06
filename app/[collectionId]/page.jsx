'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collections } from '../content';
import AuthButton from '../../components/AuthButton';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { syncProgressToFirebase, getProgressFromFirebase, toggleBookmark, getBookmarks } from '../../lib/db';
import { useDrag } from '@use-gesture/react';

const storageKeys = {
  collectionId: 'shri-harivansh.collectionId',
  sectionId: 'shri-harivansh.sectionId',
  verseNumber: 'shri-harivansh.verseNumber',
  fontSize: 'shri-harivansh.fontSize',
  darkMode: 'shri-harivansh.darkMode',
  textAlign: 'shri-harivansh.textAlign'
};

const ALIGN_OPTIONS = ['left', 'center', 'right'];
const ALIGN_LABELS = { left: '⫷', center: '⫿', right: '⫸' };

function Expandable({ label, defaultOpen = false, storageKey, children }) {
  const [open, setOpen] = useState(() => {
    if (typeof window !== 'undefined' && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved === 'true';
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(open));
    }
  }, [open, storageKey]);

  return (
    <div className={`expandable ${open ? 'expanded' : ''}`}>
      <button
        type="button"
        className="expandable-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="expandable-label">{label}</span>
        <span className="expandable-icon">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="expandable-body">{children}</div>}
    </div>
  );
}

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
  const [user, setUser] = useState(null);
  const [sectionId, setSectionId] = useState(null);
  const [verseNumber, setVerseNumber] = useState(1);
  const [fontSize, setFontSize] = useState(20);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  const [bookmarkedKeys, setBookmarkedKeys] = useState(new Set());

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
    setTextAlign(localStorage.getItem(storageKeys.textAlign) || 'left');
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
    localStorage.setItem(storageKeys.textAlign, textAlign);
    localStorage.setItem(storageKeys.darkMode, String(isDarkMode));
  }, [collectionId, fontSize, textAlign, isDarkMode, isReady, sectionId, verseNumber, collection.id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && isReady) {
        const fbData = await getProgressFromFirebase(currentUser, collection.id);
        if (fbData && fbData.sectionId && fbData.verseNumber) {
          setSectionId(fbData.sectionId);
          setVerseNumber(fbData.verseNumber);
        }
        const bms = await getBookmarks(currentUser);
        setBookmarkedKeys(new Set(bms.map(b => `${b.collectionId}_${b.sectionId}_${b.verseNumber}`)));
      }
    });
    return () => unsubscribe();
  }, [isReady, collection.id]);

  // Sync to Firebase
  useEffect(() => {
    if (!isReady || !user || !sectionId) return;
    const timeoutMsg = setTimeout(() => {
      syncProgressToFirebase(user, collection.id, sectionId, verseNumber);
    }, 1500); // 1.5s debounce
    return () => clearTimeout(timeoutMsg);
  }, [user, collection.id, sectionId, verseNumber, isReady]);

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

  const currentBookmarkKey = `${collection.id}_${sectionId}_${verseNumber}`;

  const handleToggleBookmark = async () => {
    if (!user) return;
    const newState = !bookmarkedKeys.has(currentBookmarkKey);
    
    setBookmarkedKeys(prev => {
      const next = new Set(prev);
      if (newState) next.add(currentBookmarkKey);
      else next.delete(currentBookmarkKey);
      return next;
    });

    await toggleBookmark(user, collection.id, sectionId, verseNumber, newState);
  };

  const bindGestures = useDrag(({ swipe: [swipeX] }) => {
    if (swipeX === -1) {
      if (!isLastVerse) moveVerse(1);
    } else if (swipeX === 1) {
      if (!isFirstVerse) moveVerse(-1);
    }
  }, { axis: 'x' });

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

  const hasYouTube = collection.youtubeIds && collection.youtubeIds.length > 0;
  const hasAudio = section.audioUrl && section.audioUrl.length > 0;

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
          <button className="ghost-btn icon-btn" onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
            <span className="hide-on-mobile">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
          <AuthButton />
          <Link href="/" className="ghost-btn icon-btn" title="Library">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span className="hide-on-mobile">Library</span>
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

              <div className="align-toggle" role="group" aria-label="Text alignment">
                {ALIGN_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`align-btn${textAlign === opt ? ' active' : ''}`}
                    onClick={() => setTextAlign(opt)}
                    title={`Align ${opt}`}
                    aria-pressed={textAlign === opt}
                  >
                    {ALIGN_LABELS[opt]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="reader-meta">
            <span>Section {section.id}</span>
            <span>{verse.number} of {collection.totalVerses}</span>
          </div>

          {/* YouTube Video — expandable */}
          {hasYouTube && (
            <Expandable label="▶  Watch Video" defaultOpen={false} storageKey="shri-harivansh.youtubeOpen">
              <div className="youtube-wrap">
                {collection.youtubeIds.map(id => (
                  <iframe
                    key={id}
                    src={`https://www.youtube.com/embed/${id}`}
                    title={collection.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ))}
              </div>
            </Expandable>
          )}

          {/* Audio player — expandable if video present, always shown otherwise */}
          {hasAudio && hasYouTube && (
            <Expandable label="🔊  Listen Audio" defaultOpen={false} storageKey="shri-harivansh.audioOpen">
              <div className="audio-wrap">
                <audio controls preload="none" src={encodeURI(section.audioUrl)} key={section.audioUrl} />
              </div>
            </Expandable>
          )}
          {hasAudio && !hasYouTube && (
            <div className="audio-wrap">
              <audio controls preload="none" src={encodeURI(section.audioUrl)} key={section.audioUrl} />
            </div>
          )}

          <article className="verse-card" {...bindGestures()} style={{ touchAction: 'pan-y' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p className="verse-number" style={{ margin: 0 }}>Verse {verse.number}</p>
              <button 
                type="button" 
                className={`ghost-btn bookmark-btn ${bookmarkedKeys.has(currentBookmarkKey) ? 'bookmarked' : ''}`}
                onClick={handleToggleBookmark}
                title={bookmarkedKeys.has(currentBookmarkKey) ? "Remove bookmark" : "Bookmark this verse"}
              >
                {bookmarkedKeys.has(currentBookmarkKey) ? '★' : '☆'}
              </button>
            </div>
            {verse.hindiShloka ? (
              <div className="rsn-verse" style={{ textAlign }}>
                <div className="rsn-section rsn-hindi">
                  <p className="rsn-label">श्लोक</p>
                  <div className="verse-text">{verse.hindiShloka}</div>
                </div>
                {verse.englishShloka && (
                  <Expandable label="Transliteration" defaultOpen={false} storageKey="shri-harivansh.translitOpen">
                    <div className="verse-text rsn-translit">{verse.englishShloka}</div>
                  </Expandable>
                )}
                {verse.vyakhya && (
                  <Expandable label="व्याख्या — Meaning" defaultOpen={true} storageKey="shri-harivansh.meaningOpen">
                    <div className="rsn-vyakhya-text verse-text">{verse.vyakhya}</div>
                  </Expandable>
                )}
              </div>
            ) : (
              <div className="verse-text" style={{ textAlign }}>{verse.text}</div>
            )}
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
