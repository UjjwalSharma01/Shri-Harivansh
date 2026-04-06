'use client';

import { useState, useEffect, useRef } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, subDays
} from 'date-fns';
import { getCalendarMarkers, setCalendarMarker, getCalendarColors, setCalendarColors } from '../lib/db';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_COLORS = [
  { id: 'gold', label: 'Gold (Complete)', color: '#d4af37' },
  { id: 'sage', label: 'Sage (Partial)', color: '#8ba888' },
  { id: 'rose', label: 'Rose (Missed)', color: '#b07d7b' },
  { id: 'slate', label: 'Slate (Note)', color: '#7a8b99' }
];

export default function ActivityCalendar() {
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [markers, setMarkers] = useState({});
  const [markerColors, setMarkerColors] = useState(DEFAULT_COLORS);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Instantly load local cache on client mount (bypasses Next.js SSR hydration limits)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('shri-harivansh.calendar-markers');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Object.keys(parsed).length > 0) {
          setMarkers(prev => ({ ...parsed, ...prev })); // Inject instantly
        }
      }
    } catch(e) {}
  }, []);

  // Legend editing state
  const [editingLegendId, setEditingLegendId] = useState(null);
  const [editLegendText, setEditLegendText] = useState("");
  const [editLegendHex, setEditLegendHex] = useState("");

  const popupRef = useRef(null);

  // Compute Gamification Stats based precisely on active markers
  const calculateStats = (markersObj) => {
    const dates = Object.keys(markersObj)
      .filter(date => markersObj[date] && markersObj[date].length > 0 && !markersObj[date].includes('clear'))
      .sort((a, b) => new Date(b) - new Date(a));
      
    const totalDays = dates.length;
    let currentStreak = 0;
    
    if (dates.length > 0) {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
      
      let checkStr = null;
      if (dates.includes(todayStr)) checkStr = todayStr;
      else if (dates.includes(yesterdayStr)) checkStr = yesterdayStr;
      
      if (checkStr) {
        currentStreak = 1;
        let currentIterDate = new Date(checkStr + 'T00:00:00'); // safe parsing
        while (true) {
          currentIterDate = subDays(currentIterDate, 1);
          const nextStr = format(currentIterDate, 'yyyy-MM-dd');
          if (dates.includes(nextStr)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    return { currentStreak, totalDays };
  };

  const { currentStreak, totalDays } = calculateStats(markers);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const [markerData, colorsData] = await Promise.all([
          getCalendarMarkers(u),
          getCalendarColors(u)
        ]);
        
        // Offline-first PWA architecture: Merge cloud state down without wiping local interactions
        setMarkers(prevCached => {
          const merged = { ...prevCached, ...markerData };
          localStorage.setItem('shri-harivansh.calendar-markers', JSON.stringify(merged));
          return merged;
        });
        
        if (colorsData && colorsData.length > 0) {
          setMarkerColors(colorsData);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setSelectedDate(null);
      }
    };
    if (selectedDate) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getLabel = (id) => markerColors.find(c => c.id === id)?.label || 'Deleted Color';
  const getColorHex = (id) => markerColors.find(c => c.id === id)?.color || 'transparent';

  const handleColorSelect = async (colorId) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    let newColorsArray = [];

    // Optimistic UI update
    setMarkers(prev => {
      const next = { ...prev };
      let currentColors = next[dateStr] || [];
      if (!Array.isArray(currentColors)) currentColors = [currentColors];

      if (colorId === 'clear') {
        delete next[dateStr];
        newColorsArray = [];
      } else {
        if (currentColors.includes(colorId)) {
          // Remove it
          newColorsArray = currentColors.filter(id => id !== colorId);
        } else {
          // Add it
          newColorsArray = [...currentColors, colorId];
        }

        if (newColorsArray.length === 0) {
          delete next[dateStr];
        } else {
          next[dateStr] = newColorsArray;
        }
      }
      return next;
    });
    
    // Optimistically update cache for instant reloads
    setTimeout(() => {
      setMarkers(current => {
        localStorage.setItem('shri-harivansh.calendar-markers', JSON.stringify(current));
        return current;
      });
    }, 0);

    if (colorId === 'clear') {
      setSelectedDate(null);
    }

    await setCalendarMarker(user, dateStr, newColorsArray);
  };

  const handleLegendSave = async (id) => {
    if (!editLegendText.trim()) return;

    const nextColors = markerColors.map(c =>
      c.id === id ? { ...c, label: editLegendText.trim(), color: editLegendHex } : c
    );

    setMarkerColors(nextColors);
    setEditingLegendId(null);
    await setCalendarColors(user, nextColors);
  };

  const handleDeleteColor = async (id) => {
    const nextColors = markerColors.filter(c => c.id !== id);
    setMarkerColors(nextColors);
    setEditingLegendId(null);
    await setCalendarColors(user, nextColors);
  };

  const handleAddColor = async () => {
    const newId = 'custom-' + Date.now();
    const newColors = [...markerColors, { id: newId, label: 'New Marker', color: '#666666' }];
    setMarkerColors(newColors);

    setEditingLegendId(newId);
    setEditLegendText('New Marker');
    setEditLegendHex('#666666');
    await setCalendarColors(user, newColors);
  };

  return (
    <section className="panel grid-panel activity-panel">
      <div className="panel-header reader-header calendar-header-top">
        <div>
          <p className="eyebrow">Personal Tracker</p>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            My Reading Calendar
            {loading && (
              <span className="sync-badge" style={{ fontSize: '0.65rem', fontWeight: '500', padding: '3px 10px', background: 'var(--accent-subtle)', color: 'var(--accent)', borderRadius: '12px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <span className="sync-dot" style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%', marginRight: '4px', animation: 'glowPulse 1.5s infinite' }}></span>
                Syncing
              </span>
            )}
          </h3>
          <p className="panel-header-subtitle">Tap a date to assign a colored marker, or change a month.</p>
          
          {/* Gamification Stats Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '24px', background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)', fontSize: '0.78rem', fontWeight: '500', color: 'var(--accent)', boxShadow: 'var(--shadow-xs)' }}>
              <span>🔥</span> {currentStreak} Day Streak
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '24px', background: 'var(--bg-inset)', border: '1px solid var(--border-primary)', fontSize: '0.78rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
              <span>✨</span> {totalDays} Total Focus Days
            </div>
          </div>
        </div>
        <div className="calendar-nav" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', marginBottom: '16px' }}>
          <div className="calendar-month-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', width: '100%' }}>
            <button className="ghost-btn nav-arrow" onClick={prevMonth} style={{ padding: '8px 16px', fontSize: '1.2rem' }}>&larr;</button>
            <span className="calendar-month-label" style={{ fontSize: '1.1rem', fontWeight: '500', minWidth: '120px', textAlign: 'center' }}>{mounted ? format(currentDate, 'MMMM yyyy') : ''}</span>
            <button className="ghost-btn nav-arrow" onClick={nextMonth} style={{ padding: '8px 16px', fontSize: '1.2rem' }}>&rarr;</button>
          </div>
          
          <div className="calendar-jump-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
            <input 
              type="date" 
              className="calendar-date-picker"
              style={{ padding: '8px 12px', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-secondary)' }}
              value={mounted ? format(currentDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-');
                  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  setCurrentDate(dateObj);
                  setSelectedDate(dateObj);
                }
              }}
              title="Jump to specific date"
            />
            <button 
              className="ghost-btn tiny-btn calendar-today-btn" 
              style={{ padding: '8px 16px', borderLeft: '1px solid var(--border-primary)', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderRadius: '0', height: '100%', background: 'transparent' }}
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDate(now);
              }}
              title="Jump to today"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-border">
          <div className="calendar-classic-grid">
            <div className="calendar-classic-row calendar-classic-header">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="calendar-classic-col">{d}</div>
              ))}
            </div>

            <div className="calendar-classic-body">
              {(() => {
                const rows = [];
                let cells = [];

                days.forEach((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isTodayDate = isToday(day);
                  let markerIds = markers[dateStr] || [];
                  if (!Array.isArray(markerIds)) markerIds = [markerIds]; // Legacy safe fallback
                  const presentMarkers = markerIds.filter(id => id !== 'clear');

                  cells.push(
                    <div
                      key={day.toString()}
                      className={`calendar-classic-cell ${!isCurrentMonth ? 'disabled' : ''} ${isTodayDate ? 'today' : ''}`}
                      onClick={() => {
                        if (isCurrentMonth) {
                          setSelectedDate(
                            selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr ? null : day
                          );
                        }
                      }}
                    >
                      <span className="calendar-day-number">{format(day, 'd')}</span>

                      {/* Multi-marker display container */}
                      {presentMarkers.length > 0 && (
                        <div className="calendar-multi-markers" style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', padding: '0 4px' }}>
                          {presentMarkers.map(id => {
                            const markerColor = getColorHex(id);
                            if (markerColor === 'transparent') return null;
                            return (
                              <div key={id} style={{ backgroundColor: markerColor, width: '10px', height: '10px', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            );
                          })}
                        </div>
                      )}

                      {/* Color Picker Popup */}
                      {selectedDate && dateStr === format(selectedDate, 'yyyy-MM-dd') && (
                        <div className="calendar-color-picker" ref={popupRef}>
                          <p className="calendar-popup-title">{format(selectedDate, 'MMM d, yyyy')}</p>
                          {markerColors.map(c => {
                            const isSelected = presentMarkers.includes(c.id);
                            return (
                              <div
                                key={c.id}
                                className={`color-option ${isSelected ? 'selected' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleColorSelect(c.id); }}
                                style={{ backgroundColor: isSelected ? 'var(--bg-subtle)' : 'transparent' }}
                              >
                                <span className="color-circle" style={{ backgroundColor: c.color, border: isSelected ? '2px solid var(--text-primary)' : 'none' }}></span>
                                {c.label}
                                {isSelected && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-primary)' }}>✓</span>}
                              </div>
                            );
                          })}
                          <div
                            className="color-option"
                            onClick={(e) => { e.stopPropagation(); handleColorSelect('clear'); }}
                          >
                            <span className="color-circle clear-circle">✕</span>
                            Remove All
                          </div>
                        </div>
                      )}
                    </div>
                  );

                  if (cells.length === 7) {
                    rows.push(<div key={`row-${i}`} className="calendar-classic-row">{cells}</div>);
                    cells = [];
                  }
                });
                return rows;
              })()}
            </div>
          </div>
        </div>

        {/* Legend Editor */}
        <div className="calendar-legend-box">
          <h4>Customize Markers</h4>
          <p className="calendar-legend-hint">Define meanings or colors.</p>
          <div className="calendar-legend-list" style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
            {markerColors.map(c => (
              <div key={c.id} className="legend-item-wrap" style={{ display: 'inline-flex', flexShrink: 0, width: editingLegendId === c.id ? '100%' : 'auto' }}>
                {editingLegendId === c.id ? (
                  <div className="legend-editor">
                    <div className="legend-editor-top">
                      <input
                        type="color"
                        value={editLegendHex}
                        onChange={(e) => setEditLegendHex(e.target.value)}
                        className="color-picker-input"
                        title="Choose color"
                      />
                      <input
                        type="text"
                        value={editLegendText}
                        onChange={(e) => setEditLegendText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLegendSave(c.id)}
                        autoFocus
                        maxLength={25}
                        className="legend-text-input"
                        placeholder="Label..."
                      />
                    </div>
                    <div className="legend-editor-actions">
                      <button className="primary-btn tiny-btn" onClick={() => handleLegendSave(c.id)}>Save</button>
                      <button className="ghost-btn tiny-btn" onClick={() => setEditingLegendId(null)}>Cancel</button>
                      <button className="delete-btn tiny-btn" onClick={() => handleDeleteColor(c.id)} title="Delete Marker">🗑</button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="legend-item"
                    title="Click to edit"
                    onClick={() => {
                      setEditingLegendId(c.id);
                      setEditLegendText(c.label);
                      setEditLegendHex(c.color);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg-body)', border: '1px solid var(--border-primary)', borderRadius: '24px', cursor: 'pointer', boxShadow: 'var(--shadow-xs)' }}
                  >
                    <span className="color-circle" style={{ backgroundColor: c.color, width: '12px', height: '12px', borderRadius: '50%' }}></span>
                    <span className="legend-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {c.label} <span className="edit-icon" style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '4px' }}>✎</span>
                    </span>
                  </div>
                )}
              </div>
            ))}

            <button className="ghost-btn add-color-btn" onClick={handleAddColor} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '24px', border: '1px dashed var(--border-primary)', fontSize: '0.8rem', height: 'max-content' }}>
              + Add Marker
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
