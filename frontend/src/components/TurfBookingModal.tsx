import React, { useState } from 'react';
import type { Turf, DaySlots, TurfSlot, BookingConfirmation } from '../types';
import { getAvailableSlots, bookSlot } from '../lib/turfService';
import { X, Calendar, Clock, CheckCircle2, MapPin } from 'lucide-react';

interface TurfBookingModalProps {
  turf: Turf;
  onClose: () => void;
}

export const TurfBookingModal: React.FC<TurfBookingModalProps> = ({ turf, onClose }) => {
  const daySlotsList: DaySlots[] = getAvailableSlots(turf.id);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<TurfSlot | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSport, setSelectedSport] = useState(turf.sports[0]);

  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [formError, setFormError] = useState('');

  const currentDay = daySlotsList[selectedDayIndex];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setFormError('Please select an available time slot.');
      return;
    }
    if (!playerName.trim()) {
      setFormError('Please enter player name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setFormError('Please enter a valid contact phone number.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const conf = await bookSlot({
        turfId: turf.id,
        slotId: selectedSlot.id,
        date: currentDay.date,
        playerName: playerName.trim(),
        phone: phone.trim(),
        sport: selectedSport,
      });
      setConfirmation(conf);
    } catch (err: any) {
      setFormError(err.message || 'Booking request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 8, 0.88)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1.5px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-scoreboard)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span className="badge badge-amber" style={{ marginBottom: '0.2rem' }}>
              Turf Slot Reservation
            </span>
            <h2 id="booking-modal-title" style={{ fontSize: '1.45rem', margin: 0 }}>
              {turf.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
              <MapPin size={12} color="var(--accent-floodlight)" />
              <span>{turf.area}, {turf.city}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking modal"
            style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {confirmation ? (
            /* SUCCESS STATE */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(46, 204, 113, 0.15)',
                  border: '2px solid var(--status-success)',
                  color: 'var(--status-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <span className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
                Booking Request Confirmed
              </span>

              <h3 style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>Pitch Locked In!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                Your slot has been reserved. Please present your booking reference at the turf entry counter.
              </p>

              {/* Receipt Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'left',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  fontFamily: 'var(--font-scoreboard)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>BOOKING ID</span>
                  <strong style={{ color: 'var(--accent-floodlight)', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                    {confirmation.bookingId}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>TURF</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{confirmation.turf.name}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>DATE</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{confirmation.date}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>TIME SLOT</span>
                  <span style={{ color: 'var(--accent-floodlight)', fontSize: '1rem', fontWeight: 800 }}>
                    {confirmation.slot.startTime} - {confirmation.slot.endTime}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>LEAD PLAYER</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{confirmation.playerName}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>ESTIMATED TOTAL</span>
                  <strong style={{ color: 'var(--status-success)', fontSize: '1.25rem' }}>
                    ₹{confirmation.slot.price}
                  </strong>
                </div>
              </div>

              <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
                Done
              </button>
            </div>
          ) : (
            /* SLOT PICKER & BOOKING FORM */
            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {formError && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(232, 93, 74, 0.15)',
                    border: '1px solid var(--status-live)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--status-live)',
                    fontSize: '0.88rem',
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Day Selection Tabs */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-scoreboard)', textTransform: 'uppercase' }}>
                  <Calendar size={14} color="var(--accent-floodlight)" />
                  Select Date
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {daySlotsList.map((day, idx) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setSelectedDayIndex(idx);
                        setSelectedSlot(null);
                      }}
                      className={`btn btn-sm ${selectedDayIndex === idx ? 'btn-primary' : 'btn-surface'}`}
                      style={{ flex: 1, padding: '0.65rem 0.5rem', fontSize: '0.95rem' }}
                    >
                      {day.dayLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-scoreboard)', textTransform: 'uppercase' }}>
                  <Clock size={14} color="var(--accent-floodlight)" />
                  Available Floodlit Slots ({currentDay.dayLabel})
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    paddingRight: '0.25rem',
                  }}
                >
                  {currentDay.slots.map((slot: TurfSlot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const isAvailable = slot.available;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '0.65rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected
                            ? '2px solid var(--accent-floodlight)'
                            : '1px solid var(--border-subtle)',
                          backgroundColor: isSelected
                            ? 'var(--accent-floodlight)'
                            : !isAvailable
                            ? 'rgba(0,0,0,0.3)'
                            : 'var(--bg-primary)',
                          color: isSelected
                            ? '#0F1A14'
                            : !isAvailable
                            ? 'var(--text-tertiary)'
                            : 'var(--text-primary)',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          textAlign: 'center',
                          opacity: !isAvailable ? 0.4 : 1,
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '0.92rem', fontWeight: 700 }}>
                          {slot.startTime}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {isAvailable ? `₹${slot.price}` : 'Booked'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sport Preference */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: 'var(--font-scoreboard)', textTransform: 'uppercase' }}>
                  Sport
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {turf.sports.map((s: any) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSport(s)}
                      className={`btn btn-sm ${selectedSport === s ? 'btn-primary' : 'btn-surface'}`}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                    >
                      {s === 'cricket' ? '🏏 Cricket' : '⚽ Football'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Contact Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="playerName" style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Player / Team Name
                  </label>
                  <input
                    id="playerName"
                    type="text"
                    required
                    placeholder="e.g. Dinesh Kumar"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="phone" style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.9rem', fontSize: '1.15rem' }}
                >
                  {submitting
                    ? 'Confirming Slot...'
                    : selectedSlot
                    ? `Request Booking (₹${selectedSlot.price})`
                    : 'Select a Slot to Continue'}
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>
                  No prepayment required right now. Pay on arrival at turf.
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
