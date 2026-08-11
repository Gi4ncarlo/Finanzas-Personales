import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DatePickerModern({ value, onChange, placeholder = 'Seleccionar fecha', label, align = 'left', containerStyle = {} }) {
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
      {label && <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600, color: 'var(--color-text-muted)' }}><CalendarIcon size={15} /><span>{label}</span></label>}
      <div 
        onClick={toggleCalendar}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--color-surface-2)',
          border: isOpen ? '1px solid var(--color-gold)' : '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 12px',
          cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
        }}
      >
        <CalendarIcon size={16} color={value ? 'var(--color-gold)' : 'var(--color-text-muted)'} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: value ? 'var(--color-text)' : 'var(--color-text-muted)', flex: 1 }}>
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
          position: 'absolute', top: 'calc(100% + 6px)',
          left: align === 'right' ? 'auto' : 0,
          right: align === 'right' ? 0 : 'auto',
          zIndex: 1000, width: '270px',
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)', padding: '14px', animation: 'calendarAppear 0.18s ease-out'
        }}>
          <style>{`
            @keyframes calendarAppear { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            .calendar-day { display: flex; align-items: center; justify-content: center; height: 32px; font-size: 0.85rem; border-radius: 6px; cursor: pointer; transition: all 0.15s; color: var(--color-text); }
            .calendar-day.inactive { color: var(--color-text-muted); opacity: 0.3; }
            .calendar-day:hover:not(.inactive) { background-color: var(--color-surface-2); }
            .calendar-day.selected { background-color: var(--color-gold) !important; color: #000000 !important; font-weight: 800 !important; }
            .calendar-day.today { border: 1px solid var(--color-gold); color: var(--color-gold); }
            .calendar-day.selected.today { background-color: var(--color-gold) !important; color: #000000 !important; font-weight: 800 !important; border: 1px solid #FFFFFF; }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <button type="button" onClick={() => changeMonth(-1)} className="btn-icon" style={{ padding: '4px', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="btn-icon" style={{ padding: '4px', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><ChevronRight size={18} /></button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
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
          <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', justifyContent: 'center' }}>
             <button 
                type="button"
                onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    handleDateClick(today.getDate());
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
             >
                Hoy: {new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
