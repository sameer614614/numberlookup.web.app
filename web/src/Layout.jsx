import { Link, NavLink, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-brand">
          <Link to="/" className="brand-link">
            <span className="brand-accent">number</span>lookup
          </Link>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Lookup
          </NavLink>
          <NavLink to="/blog" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Blog
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>
          &copy; {new Date().getFullYear()} numberlookup. Built for Firebase Hosting with Cloud Functions,
          Firestore, Realtime Database, and Storage.
        </p>
      </footer>
    </div>
  );
}

export default Layout;
