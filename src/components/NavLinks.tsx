import { Link } from 'react-router-dom';
import { Settings, Shield } from 'lucide-react';

interface NavLinksProps {
  isActive: (path: string) => boolean;
  isAdmin: boolean;
  mobile?: boolean;
}

export function NavLinks({ isActive, isAdmin, mobile = false }: NavLinksProps) {
  const whitespace = mobile ? ' whitespace-nowrap' : '';

  return (
    <>
      <Link
        to="/"
        className={`px-4 py-2 rounded-lg font-medium transition-all${whitespace} ${
          isActive('/')
            ? 'bg-blue-100 text-blue-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Generator
      </Link>
      <Link
        to="/settings"
        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2${whitespace} ${
          isActive('/settings')
            ? 'bg-blue-100 text-blue-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Settings size={16} />
        Settings
      </Link>
      {isAdmin && (
        <Link
          to="/admin"
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2${whitespace} ${
            isActive('/admin')
              ? 'bg-amber-100 text-amber-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield size={16} />
          Admin
        </Link>
      )}
    </>
  );
}
