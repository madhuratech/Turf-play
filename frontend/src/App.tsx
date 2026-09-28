import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { TurfSearchPage } from './pages/TurfSearchPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateRoomPage />} />
              <Route path="/join" element={<JoinRoomPage />} />
              <Route path="/room/:code" element={<ScoreboardPage />} />
              <Route path="/turfs" element={<TurfSearchPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Minimal Footnote */}
          <footer
            style={{
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              padding: '1.5rem 0',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: 'var(--text-tertiary)',
            }}
          >
            <div className="container">
              Kick &amp; Crease &bull; Night Stadium Floodlight Live Scoring &bull; One Editor Per Team
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
