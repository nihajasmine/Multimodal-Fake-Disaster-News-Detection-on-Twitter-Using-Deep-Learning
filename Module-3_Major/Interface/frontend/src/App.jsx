import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Test from './pages/Test';

function Navbar() {
  const location = useLocation();

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #E5E7EB',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '56px',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      <div style={{
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: '#2563EB',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#2563EB', letterSpacing: '-0.3px' }}>
            DisasterTweet Dashboard
          </span>
        </div>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
          <NavLink to="/" label="Home" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          } active={location.pathname === '/'} />
          <NavLink to="/test" label="Test" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
            </svg>
          } active={location.pathname === '/test'} />
        </div>

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', lineHeight: 1 }}>System Active</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px', lineHeight: 1 }}>Real-time Monitoring</div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '34px', height: '34px',
              borderRadius: '50%',
              background: '#E5E7EB',
              overflow: 'hidden',
              border: '2px solid #E5E7EB',
            }}>
              <img src="/profile.png" alt="user" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
            </div>
            <div style={{
              position: 'absolute', bottom: '1px', right: '1px',
              width: '9px', height: '9px',
              background: '#22C55E',
              borderRadius: '50%',
              border: '2px solid white',
            }} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label, icon, active }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '0 16px',
      fontSize: '14px',
      fontWeight: active ? 600 : 400,
      color: active ? '#2563EB' : '#6B7280',
      textDecoration: 'none',
      borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
      transition: 'color 0.15s, border-color 0.15s',
    }}>
      <span style={{ display: 'flex', color: 'inherit' }}>{icon}</span>
      {label}
    </Link>
  );
}

function Footer() {
  return (
    <footer style={{
      background: '#fff',
      borderTop: '1px solid #E5E7EB',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6B7280' }}>
        <span>© 2024 DisasterTweet Dashboard. Proprietary AI Monitoring.</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22C55E', fontWeight: 500 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Server Latency: 42ms
        </span>
      </div>
      <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#6B7280' }}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Support</a>
      </div>
    </footer>
  );
}

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F6F7' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/test" element={<Test />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
