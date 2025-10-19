import { Link, NavLink, Outlet } from 'react-router-dom';

function Layout() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="app-shell">
      <header className="site-header" role="banner">
        <div className="site-header__inner">
          <Link to="/" className="brand-link" aria-label="CallerID home">
            CallerID
          </Link>
          <nav aria-label="Primary navigation" className="site-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Lookup
            </NavLink>
            <NavLink to="/blog" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Blog
            </NavLink>
            <NavLink to="/faq" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              FAQs
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="site-main" role="main">
        <Outlet />
      </main>

      <footer className="site-footer" role="contentinfo">
        <div className="site-footer__grid">
          <div>
            <p className="brand-foot">CallerID</p>
            <p className="foot-copy">
              Privacy-first phone intelligence. We cache lookups securely to reduce third-party calls and keep your
              searches fast.
            </p>
          </div>
          <div>
            <p className="foot-copy">
              &copy; {currentYear} CallerID. All rights reserved. GDPR compliant &amp; ready for CCPA/CPRA requests.
            </p>
            <p className="foot-copy">
              Need help? Email{' '}
              <a href="mailto:support@callerid.web.app" className="foot-link">
                support@callerid.web.app
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
