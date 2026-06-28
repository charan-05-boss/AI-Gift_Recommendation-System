import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Gift, LayoutDashboard, Sparkles, Menu, X, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import GiftForm from './pages/GiftForm';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import DetailPage from './pages/DetailPage';

import './index.css';
import './App.css';

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const links = [
    { to: '/', icon: <Gift size={16} />, label: 'Find a Gift' },
    { to: '/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  ];

  return (
    <nav className="nav">
      <div className="container">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            Paper Plane
          </a>

          {/* Desktop links */}
          <div className="nav-links desktop-nav">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {l.icon}
                <span>{l.label}</span>
              </NavLink>
            ))}
            <button
              className="btn btn-ghost btn-sm"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              style={{ padding: 'var(--space-2)', marginLeft: 'var(--space-2)' }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>

          <div className="mobile-nav-controls" style={{ gap: 'var(--space-2)' }}>
            <button
              className="btn btn-ghost btn-sm mobile-menu-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{ padding: 'var(--space-2)' }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="btn btn-ghost btn-sm mobile-menu-btn"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="mobile-nav animate-fade-in">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                {l.icon}
                <span>{l.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

function AppRoutes() {
  const [recommendations, setRecommendations] = useState(null);
  const [formData, setFormData] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const navigate = useNavigate();

  const handleFormSubmit = (data, recs, id) => {
    setFormData(data);
    setRecommendations(recs);
    setOrderId(id);
    navigate('/results');
  };

  return (
    <div className="page-wrapper">

      <Nav />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<GiftForm onSubmit={handleFormSubmit} />} />
          <Route path="/results" element={<Results recommendations={recommendations} formData={formData} orderId={orderId} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:id" element={<DetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
