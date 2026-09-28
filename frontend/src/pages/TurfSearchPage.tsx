import React, { useEffect, useState } from 'react';
import type { Turf, SportType } from '../types';
import { searchTurfs } from '../lib/turfService';
import { TurfBookingModal } from '../components/TurfBookingModal';
import {
  MapPin,
  Navigation,
  Star,
  Search,
  Calendar,
} from 'lucide-react';

const AVAILABLE_CITIES = ['Coimbatore', 'Chennai', 'Bengaluru'];

export const TurfSearchPage: React.FC = () => {
  const [city, setCity] = useState('Coimbatore');
  const [sportFilter, setSportFilter] = useState<SportType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected turf for booking modal
  const [bookingTurf, setBookingTurf] = useState<Turf | null>(null);

  const fetchTurfs = async () => {
    setLoading(true);
    try {
      const results = await searchTurfs({
        city,
        sport: sportFilter,
        searchQuery,
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
      });
      setTurfs(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurfs();
  }, [city, sportFilter, searchQuery, userLocation]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('Acquiring GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationStatus('Sorted by real-time distance!');
        setTimeout(() => setLocationStatus(null), 3000);
      },
      err => {
        console.warn(err);
        // Fallback demo coordinates near Coimbatore center
        setUserLocation({ lat: 11.0168, lng: 76.9558 });
        setLocationStatus('Using Coimbatore Central GPS coordinates.');
        setTimeout(() => setLocationStatus(null), 3000);
      },
      { timeout: 7000 }
    );
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
      {/* Search Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-amber" style={{ marginBottom: '0.4rem' }}>
          Floodlit Turfs &amp; Grounds
        </span>
        <h1 style={{ fontSize: '2.4rem', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
          Book a Turf in {city}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '620px' }}>
          Find high-grade cricket boxes and floodlit football pitches. Sorted by distance using great-circle Haversine computation.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            justifyContent: 'space-between',
          }}
        >
          {/* City Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="var(--accent-floodlight)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-scoreboard)' }}>
              City:
            </span>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.45rem 0.85rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-scoreboard)',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {AVAILABLE_CITIES.map(c => (
                <option key={c} value={c} style={{ backgroundColor: '#0F1A14' }}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Browser Geolocation Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleUseMyLocation}
              className="btn btn-surface btn-sm"
              style={{
                borderColor: userLocation ? 'var(--status-success)' : 'var(--border-strong)',
                color: userLocation ? 'var(--status-success)' : 'var(--text-primary)',
              }}
            >
              <Navigation size={14} />
              <span>{userLocation ? 'Location Active' : 'Use My Location'}</span>
            </button>
            {locationStatus && (
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-floodlight)' }}>
                {locationStatus}
              </span>
            )}
          </div>
        </div>

        {/* Sport Filter Chips + Search Input */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Sport Filter Chips */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setSportFilter('all')}
              className={`btn btn-sm ${sportFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            >
              All Sports
            </button>
            <button
              onClick={() => setSportFilter('cricket')}
              className={`btn btn-sm ${sportFilter === 'cricket' ? 'btn-primary' : 'btn-outline'}`}
            >
              🏏 Cricket
            </button>
            <button
              onClick={() => setSportFilter('football')}
              className={`btn btn-sm ${sportFilter === 'football' ? 'btn-primary' : 'btn-outline'}`}
            >
              ⚽ Football
            </button>
          </div>

          {/* Name / Area Search Box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '380px' }}>
            <Search
              size={16}
              color="var(--text-tertiary)"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search area (e.g. Peelamedu, RS Puram)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
              }}
            />
          </div>
        </div>
      </div>

      {/* Turf Results Grid (Static cards, no hover animations per prompt instruction) */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Computing pitch distances and slot matrices...
        </div>
      ) : turfs.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '3rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '1rem' }}>
            No turfs match your current filter criteria in {city}.
          </p>
          <button
            onClick={() => {
              setSportFilter('all');
              setSearchQuery('');
            }}
            className="btn btn-surface btn-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {turfs.map(turf => (
            <div
              key={turf.id}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Turf Image with overlay badges */}
              <div style={{ position: 'relative', height: '170px', backgroundColor: '#0A120D' }}>
                <img
                  src={turf.imageUrl}
                  alt={turf.name}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={e => {
                    // Fallback visual if unpkg/unsplash offline
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Rating Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(15, 26, 20, 0.88)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.2rem 0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <Star size={13} fill="#F2C94C" color="#F2C94C" />
                  <span>{turf.rating}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                    ({turf.reviewsCount})
                  </span>
                </div>

                {/* Distance Badge (Calculated by Haversine) */}
                {turf.distanceKm !== undefined && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'rgba(27, 58, 43, 0.92)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.2rem 0.55rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-scoreboard)',
                      fontWeight: 700,
                    }}
                  >
                    <Navigation size={12} color="var(--accent-floodlight)" />
                    <span>{turf.distanceKm} km away</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {turf.sports.map((s: any) => (
                      <span key={s} className="badge badge-amber" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                        {s}
                      </span>
                    ))}
                  </div>

                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.3rem', lineHeight: 1.2 }}>
                    {turf.name}
                  </h2>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <MapPin size={13} color="var(--accent-floodlight)" />
                    <span>{turf.area}</span>
                  </div>

                  {/* Amenities */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                    {turf.amenities.slice(0, 3).map((amenity: any) => (
                      <span
                        key={amenity}
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-tertiary)',
                          backgroundColor: 'var(--bg-primary)',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price and Book Action */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      Pricing
                    </div>
                    <div style={{ fontFamily: 'var(--font-scoreboard)', fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-floodlight)' }}>
                      ₹{turf.pricePerHour}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}> / hr</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setBookingTurf(turf)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0.55rem 1rem' }}
                  >
                    <Calendar size={14} />
                    <span>Book Slot</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Slot Picker Modal */}
      {bookingTurf && (
        <TurfBookingModal
          turf={bookingTurf}
          onClose={() => setBookingTurf(null)}
        />
      )}
    </div>
  );
};
