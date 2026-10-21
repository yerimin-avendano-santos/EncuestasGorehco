import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';

export function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>
            Encuestas GOREHCO 2026 · Transformación digital y procesos administrativos
          </span>
          <span className="row gap-12 wrap">
            <Link to="/cuenta" className="muted">
              Mi cuenta
            </Link>
            <a
              href="/docs/consentimiento-informado.pdf"
              target="_blank"
              rel="noreferrer"
              className="muted"
            >
              Consentimiento informado
            </a>
            <a
              href="/docs/cuestionario-td-pa.pdf"
              target="_blank"
              rel="noreferrer"
              className="muted"
            >
              Cuestionario
            </a>
            <span>Universidad Nacional Mayor de San Marcos</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
