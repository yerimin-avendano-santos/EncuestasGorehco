import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  ClipboardPlus,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Ui';
import { classNames } from '../lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/encuestas/nueva', label: 'Nueva encuesta', icon: ClipboardPlus },
  { to: '/mis-registros', label: 'Mis registros', icon: FileText },
  { to: '/registros', label: 'Registros', icon: Building2, adminOnly: true },
  { to: '/admin/usuarios', label: 'Administración', icon: Settings, adminOnly: true },
];

export function TopNav() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const items = NAV_ITEMS.filter(
    (item) => !item.adminOnly || profile?.rol === 'admin',
  );

  const handleSignOut = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <NavLink to="/" className="brand" aria-label="Ir al panel">
            <span className="brand-mark" aria-hidden="true">
              <span
                style={{
                  fontFamily: 'var(--font-inter-tight)',
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                E
              </span>
            </span>
            <span className="brand-wordmark">
              <span className="brand-name">Encuestas GOREHCO</span>
              <span className="brand-sub">TD · Procesos administrativos</span>
            </span>
          </NavLink>

          <nav className="nav-links" aria-label="Navegación principal">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    classNames('nav-link', isActive && 'active')
                  }
                >
                  <Icon size={15} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="nav-right">
            <div className="user-wrap" ref={menuRef}>
              <button
                type="button"
                className="user-button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar name={profile?.nombre} />
                <span className="user-meta">
                  <span className="user-name">{profile?.nombre ?? 'Usuario'}</span>
                  <span className="user-role">
                    {profile?.rol === 'admin' ? 'Administrador' : 'Encuestador'}
                  </span>
                </span>
              </button>

              {menuOpen && (
                <div className="user-menu" role="menu">
                  <div className="user-menu-head">
                    <div className="row gap-8">
                      <Avatar name={profile?.nombre} />
                      <div style={{ minWidth: 0 }}>
                        <div className="user-cell-name">{profile?.nombre}</div>
                        <div className="user-cell-email">{profile?.email}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="user-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/cuenta');
                    }}
                  >
                    <UserRound size={15} />
                    Mi cuenta
                  </button>
                  {profile?.rol === 'admin' && (
                    <button
                      type="button"
                      className="user-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/admin/usuarios');
                      }}
                    >
                      <Settings size={15} />
                      Administración
                    </button>
                  )}
                  <button
                    type="button"
                    className="user-menu-item danger"
                    role="menuitem"
                    onClick={() => void handleSignOut()}
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="nav-toggle"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Navegación móvil">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  classNames('mobile-nav-link', isActive && 'active')
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
          <div className="mobile-nav-divider" />
          <NavLink to="/cuenta" className="mobile-nav-link">
            <UserRound size={16} />
            Mi cuenta
          </NavLink>
          <button
            type="button"
            className="mobile-nav-link"
            onClick={() => void handleSignOut()}
            style={{ border: 0, background: 'transparent', width: '100%' }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </nav>
      )}
    </>
  );
}
