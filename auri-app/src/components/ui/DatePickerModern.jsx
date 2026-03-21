import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DatePickerModern({ value, onChange, placeholder = 'Seleccionar fecha', label, containerStyle = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value + 'T12:00:00') : new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCalendar = () => setIsOpen(!isOpen);

  const handleDateClick = (day) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const formattedDate = selectedDate.toISOString().split('T')[0];
    onChange(formattedDate);
    setIsOpen(false);
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const changeYear = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear() + offset, currentDate.getMonth(), 1));
  };

  // Calendar logic
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

  const days = [];
  // Previous month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, current: false });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, current: true });
  }
  // Next month padding
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false });
  }

  const isSelected = (day, isCurrentMonth) => {
    if (!value || !isCurrentMonth) return false;
    const vDate = new Date(value + 'T12:00:00');
    return vDate.getDate() === day && vDate.getMonth() === currentDate.getMonth() && vDate.getFullYear() === currentDate.getFullYear();
  };

  const isToday = (day, isCurrentMonth) => {
    if (!isCurrentMonth) return false;
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  };

  return (
    <div className="datepicker-container" ref={containerRef} style={{ position: 'relative', width: '100%', userSelect: 'none', ...containerStyle }}>
      {label && <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text-muted)' }}>{label}</label>}
      <div 
        onClick={toggleCalendar}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--color-surface-2)',
          border: isOpen ? '1px solid var(--color-gold)' : '1px solid var(--color-border)', borderRadius: '8px', padding: '12px',
          cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
        }}
      >
        <CalendarIcon size={18} color={value ? 'var(--color-gold)' : 'var(--color-text-muted)'} />
        <span style={{ fontSize: '0.95rem', color: value ? 'var(--color-text)' : 'var(--color-text-muted)', flex: 1 }}>
          {value ? new Date(value + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : placeholder}
        </span>
        {value && (
          <button 
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--color-text-muted)', opacity: 0.6, display: 'flex' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 1000, width: '280px',
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)', padding: '16px', animation: 'calendarAppear 0.2s ease-out'
        }}>
          <style>{`
            @keyframes calendarAppear { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            .calendar-day { display: flex; align-items: center; justify-content: center; height: 32px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
            .calendar-day.inactive { color: var(--color-text-muted); opacity: 0.3; }
            .calendar-day:hover:not(.inactive) { background-color: var(--color-surface-2); }
            .calendar-day.selected { background-color: var(--color-gold) !important; color: #000; font-weight: 700; }
            .calendar-day.today { border: 1px solid var(--color-gold); color: var(--color-gold); }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button type="button" onClick={() => changeMonth(-1)} className="btn-icon" style={{ padding: '4px' }}><ChevronLeft size={18} /></button>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="btn-icon" style={{ padding: '4px' }}><ChevronRight size={18} /></button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {days.map((d, i) => (
              <div
                key={i}
                className={`calendar-day ${!d.current ? 'inactive' : ''} ${isSelected(d.day, d.current) ? 'selected' : ''} ${isToday(d.day, d.current) ? 'today' : ''}`}
                onClick={() => d.current && handleDateClick(d.day)}
              >
                {d.day}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', justifyContent: 'center' }}>
             <button 
                type="button"
                onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    handleDateClick(today.getDate());
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
             >
                Hoy: {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
