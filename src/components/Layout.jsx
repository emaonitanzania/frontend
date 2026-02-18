import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const MOBILE_BREAKPOINT = 900;
const LANGUAGE_KEY = 'emaoni_language';

const navItems = [
  { path: '/chat', icon: 'fa-comments', label: 'Chats', labelSw: 'Mazungumzo' },
  { path: '/inbox', icon: 'fa-inbox', label: 'Inbox', labelSw: 'Ujumbe' },
  { path: '/unreplied', icon: 'fa-exclamation-circle', label: 'Unreplied', labelSw: 'Bila Majibu' },
  { path: '/history', icon: 'fa-history', label: 'History', labelSw: 'Historia' },
  { path: '/escalation', icon: 'fa-level-up-alt', label: 'Escalation', labelSw: 'Ngazi za Rufaa' },
  { path: '/faqs', icon: 'fa-question-circle', label: 'FAQs', labelSw: 'Maswali' },
  { path: '/leader/register', icon: 'fa-user-plus', label: 'Leader Register', labelSw: 'Sajili Kiongozi' },
  { path: '/leader/portal', icon: 'fa-user-shield', label: 'Leader Portal', labelSw: 'Tovuti ya Kiongozi' },
];

const getInitialMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
};

export default function Layout({ children }) {
  const location = useLocation();
  const [dark, setDark] = useState(false);
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    const cached = window.localStorage.getItem(LANGUAGE_KEY);
    return cached === 'sw' ? 'sw' : 'en';
  });
  const [isMobile, setIsMobile] = useState(getInitialMobile);
  const [sidebarOpen, setSidebarOpen] = useState(!getInitialMobile());
  const tx = (en, sw) => (language === 'sw' ? sw : en);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      setSidebarOpen((prev) => {
        if (!mobile) return true;
        return prev && mobile;
      });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleDark = () => setDark((prev) => !prev);
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'sw' : 'en'));
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    }
  }, [language]);

  const sidebarStyle = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '84vw',
        maxWidth: 300,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.24s ease',
        zIndex: 40,
      }
    : {
        width: 260,
        minWidth: 260,
      };

  return (
    <div
      className={dark ? 'dark' : ''}
      style={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {isMobile && sidebarOpen && (
        <button
          aria-label={tx('Close menu', 'Funga menyu')}
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            border: 'none',
            zIndex: 30,
            cursor: 'pointer',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          background: dark ? '#1e293b' : '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '2px 0 10px rgba(0,0,0,0.06)',
          transition: 'background 0.3s',
          zIndex: isMobile ? 40 : 10,
          ...sidebarStyle,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: isMobile ? '18px 18px' : '24px 20px',
            borderBottom: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            justifyContent: isMobile ? 'space-between' : 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'center' }}>
            <span
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: isMobile ? 28 : 32,
                fontWeight: 700,
                color: '#2563eb',
                lineHeight: 1,
              }}
            >
              e-maoni
            </span>
            <span
              style={{
                marginTop: 6,
                fontSize: 11,
                fontWeight: 600,
                color: dark ? '#94a3b8' : '#64748b',
                letterSpacing: 0.2,
              }}
            >
              co-founded by swalehe
            </span>
          </div>
          {isMobile && (
            <button
              aria-label={tx('Close menu', 'Funga menyu')}
              onClick={() => setSidebarOpen(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${dark ? '#475569' : '#cbd5e1'}`,
                background: dark ? '#0f172a' : '#f8fafc',
                color: dark ? '#e2e8f0' : '#334155',
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: isMobile ? '12px 0' : '20px 0', overflowY: 'auto' }}>
          {navItems.map(({ path, icon, label, labelSw }) => (
            <NavLink
              key={path}
              to={path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: isMobile ? '14px 18px' : '15px 20px',
                cursor: 'pointer',
                color: isActive ? '#2563eb' : (dark ? '#94a3b8' : '#64748b'),
                background: isActive ? (dark ? '#1e3a8a' : '#dbeafe') : 'transparent',
                borderLeft: `4px solid ${isActive ? '#2563eb' : 'transparent'}`,
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 500,
                fontSize: 15,
                transition: 'all 0.2s',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = dark ? '#334155' : '#f8fafc';
                  e.currentTarget.style.color = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = dark ? '#94a3b8' : '#64748b';
                }
              }}
            >
              <i className={`fas ${icon}`} style={{ width: 24, marginRight: 12, fontSize: 17, textAlign: 'center' }} />
              {tx(label, labelSw)}
            </NavLink>
          ))}
        </nav>

        {/* Language toggle */}
        <div
          style={{
            padding: isMobile ? '8px 16px 0 16px' : '12px 20px 0 20px',
            borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <button
            onClick={toggleLanguage}
            style={{
              width: '100%',
              borderRadius: 8,
              border: `1px solid ${dark ? '#475569' : '#cbd5e1'}`,
              background: dark ? '#0f172a' : '#f8fafc',
              color: dark ? '#e2e8f0' : '#334155',
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {language === 'en' ? 'Switch to Swahili' : 'Badili kwenda English'}
          </button>
        </div>

        {/* Dark mode toggle */}
        <div
          style={{
            padding: isMobile ? 16 : 20,
            borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <i className="fas fa-sun" style={{ color: dark ? '#94a3b8' : '#f59e0b', fontSize: 14 }} />
          <label style={{ position: 'relative', display: 'inline-block', width: 52, height: 28, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dark}
              onChange={toggleDark}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: dark ? '#2563eb' : '#cbd5e1',
                borderRadius: 34,
                transition: '0.3s',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: dark ? 26 : 4,
                top: 4,
                width: 20,
                height: 20,
                background: '#fff',
                borderRadius: '50%',
                transition: '0.3s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }}
            />
          </label>
          <i className="fas fa-moon" style={{ color: dark ? '#818cf8' : '#94a3b8', fontSize: 14 }} />
        </div>
      </aside>

      {/* Main */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: dark ? '#0f172a' : '#f8fafc',
          color: dark ? '#f1f5f9' : '#1e293b',
          transition: 'background 0.3s, color 0.3s',
        }}
      >
        {isMobile && (
          <div
            style={{
              height: 58,
              minHeight: 58,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              borderBottom: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
              background: dark ? '#1e293b' : '#ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <button
              aria-label={tx('Open menu', 'Fungua menyu')}
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                border: `1px solid ${dark ? '#475569' : '#cbd5e1'}`,
                background: dark ? '#0f172a' : '#f8fafc',
                color: dark ? '#e2e8f0' : '#334155',
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-bars" />
            </button>
            <span
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: 26,
                fontWeight: 700,
                color: '#2563eb',
              }}
            >
              e-maoni
            </span>
            <button
              aria-label={tx('Toggle theme', 'Badili mwonekano')}
              onClick={toggleDark}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                border: `1px solid ${dark ? '#475569' : '#cbd5e1'}`,
                background: dark ? '#0f172a' : '#f8fafc',
                color: dark ? '#e2e8f0' : '#334155',
                cursor: 'pointer',
              }}
            >
              <i className={`fas ${dark ? 'fa-sun' : 'fa-moon'}`} />
            </button>
          </div>
        )}

        {children({ dark, isMobile, language, tx })}
      </div>
    </div>
  );
}
