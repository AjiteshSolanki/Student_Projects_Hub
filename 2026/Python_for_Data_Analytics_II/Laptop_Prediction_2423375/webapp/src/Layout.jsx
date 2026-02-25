import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Calculator, Briefcase, Database } from 'lucide-react';

const links = [
  { to: '/', label: 'Overview', icon: BarChart3 },
  { to: '/quote', label: 'Quote Simulator', icon: Calculator },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/model', label: 'Model & Data', icon: Database },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="dot" />
          <span>PriceIQ</span>
        </div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
