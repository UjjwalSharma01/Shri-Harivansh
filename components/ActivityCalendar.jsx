'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday 
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
  
  // Legend editing state
  const [editingLegendId, setEditingLegendId] = useState(null);
  const [editLegendText, setEditLegendText] = useState("");
  const [editLegendHex, setEditLegendHex] = useState("");

  const popupRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const [markerData, colorsData] = await Promise.all([
          getCalendarMarkers(u),
          getCalendarColors(u)
        ]);
        setMarkers(markerData);
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

  if (loading) return null;
  if (!user) return null;

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
    
    // Optimistic UI update
    setMarkers(prev => {
      const next = { ...prev };
      if (colorId === 'clear') {
        delete next[dateStr];
      } else {
        next[dateStr] = colorId;
      }
      return next;
    });
    setSelectedDate(null);

    await setCalendarMarker(user, dateStr, colorId);
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
          <h3>My Reading Calendar</h3>
          <p className="panel-header-subtitle">Tap a date to assign a colored marker, or change a month.</p>
        </div>
        <div className="calendar-nav">
          <button className="ghost-btn nav-arrow" onClick={prevMonth}>&larr;</button>
          
          <div className="calendar-month-jump">
            <span className="calendar-month-label">{format(currentDate, 'MMMM yyyy')}</span>
            
            <div className="calendar-jump-controls">
              <input 
                type="date" 
                className="calendar-date-picker"
                value={format(currentDate, 'yyyy-MM-dd')}
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

          <button className="ghost-btn nav-arrow" onClick={nextMonth}>&rarr;</button>
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
                  const markerId = markers[dateStr];
                  const markerColor = getColorHex(markerId);
                  
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
                      {markerId && markerId !== 'clear' && markerColor !== 'transparent' && (
                        <div className="calendar-marker-dot" style={{ backgroundColor: markerColor }} />
                      )}
                      
                      {/* Color Picker Popup */}
                      {selectedDate && dateStr === format(selectedDate, 'yyyy-MM-dd') && (
                        <div className="calendar-color-picker" ref={popupRef}>
                          <p className="calendar-popup-title">{format(selectedDate, 'MMM d, yyyy')}</p>
                          {markerColors.map(c => (
                            <div 
                              key={c.id} 
                              className="color-option"
                              onClick={(e) => { e.stopPropagation(); handleColorSelect(c.id); }}
                            >
                              <span className="color-circle" style={{ backgroundColor: c.color }}></span>
                              {c.label}
                            </div>
                          ))}
                          <div 
                              className="color-option"
                              onClick={(e) => { e.stopPropagation(); handleColorSelect('clear'); }}
                            >
                              <span className="color-circle clear-circle">✕</span>
                              Remove Marker
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
          <div className="calendar-legend-list">
            {markerColors.map(c => (
              <div key={c.id} className="legend-item-wrap">
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
                  >
                    <span className="color-circle" style={{ backgroundColor: c.color }}></span>
                    <span className="legend-label">
                      {c.label} <span className="edit-icon">✎</span>
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            <button className="ghost-btn add-color-btn" onClick={handleAddColor}>
              + Add Marker
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
