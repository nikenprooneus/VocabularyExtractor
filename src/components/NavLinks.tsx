import { Link } from 'react-router-dom';
import { Settings, Shield, Network } from 'lucide-react';

interface NavLinksProps {
  isActive: (path: string) => boolean;
  isAdmin: boolean;
  mobile?: boolean;
  dark?: boolean;
}

export function NavLinks({ isActive, isAdmin, mobile = false, dark = false }: NavLinksProps) {
  const whitespace = mobile ? ' whitespace-nowrap' : '';
  const inactiveClass = dark
    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    : 'text-slate-600 hover:bg-slate-100';
  const activeClass = dark ? 'bg-slate-700 text-slate-100' : 'bg-blue-100 text-blue-700';
  const adminActiveClass = dark ? 'bg-amber-900/60 text-amber-400' : 'bg-amber-100 text-amber-700';
  const adminInactiveClass = dark
    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    : 'text-slate-600 hover:bg-slate-100';

  return (
    <>
      <Link
        to="/"
        className={`px-4 py-2 rounded-lg font-medium transition-all${whitespace} ${
          isActive('/') ? activeClass : inactiveClass
        }`}
      >
        Generator
      </Link>
      <Link
        to="/knowledge-graph"
        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2${whitespace} ${
          isActive('/knowledge-graph') ? activeClass : inactiveClass
        }`}
      >
        <Network size={16} />
        Knowledge Graph
      </Link>
      <Link
        to="/settings"
        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2${whitespace} ${
          isActive('/settings') ? activeClass : inactiveClass
        }`}
      >
        <Settings size={16} />
        Settings
      </Link>
      {isAdmin && (
        <Link
          to="/admin"
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2${whitespace} ${
            isActive('/admin') ? adminActiveClass : adminInactiveClass
          }`}
        >
          <Shield size={16} />
          Admin
        </Link>
      )}
    </>
  );
}
