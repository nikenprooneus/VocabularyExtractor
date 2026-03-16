import { ReactNode, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Zap, Settings, Shield, ChevronDown, Network } from 'lucide-react';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    if (!confirm('Are you sure you want to sign out?')) return;

    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login');
    } catch {
      toast.error('Failed to sign out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const isAdmin = user?.role === 'admin';
  const isGraphPage = location.pathname === '/knowledge-graph';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??';

  const navLinkClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? isGraphPage
          ? 'bg-slate-700 text-slate-100'
          : 'bg-slate-100 text-slate-900'
        : isGraphPage
        ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <div className={isGraphPage ? 'h-screen flex flex-col bg-slate-950 overflow-hidden' : 'min-h-screen bg-slate-50'}>
      <header className={`sticky top-0 z-50 flex-shrink-0 ${isGraphPage ? 'bg-slate-900 border-b border-slate-700/60' : 'bg-white border-b border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className={`text-sm font-semibold tracking-tight ${isGraphPage ? 'text-slate-100' : 'text-slate-900'}`}>
                  Vocabulary Extractor
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-1">
                <Link to="/" className={navLinkClass('/')}>Generator</Link>
                <Link to="/knowledge-graph" className={`${navLinkClass('/knowledge-graph')} flex items-center gap-1.5`}>
                  <Network size={14} />
                  Knowledge Graph
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isGraphPage
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isGraphPage ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-white'}`}>
                    {userInitials}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Signed in as</p>
                      <p className="text-sm text-slate-800 font-medium truncate mt-0.5">{user?.email}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-semibold border border-amber-200">
                          <Shield size={10} />
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings size={15} className="text-slate-400" />
                        Settings
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Shield size={15} className="text-amber-500" />
                          Admin Dashboard
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 py-1">
                      <button
                        onClick={handleSignOut}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <LogOut size={15} />
                        {isLoggingOut ? 'Signing out...' : 'Sign out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav className="md:hidden flex items-center gap-1 pb-2.5 overflow-x-auto">
            <Link to="/" className={navLinkClass('/')}>Generator</Link>
            <Link to="/knowledge-graph" className={`${navLinkClass('/knowledge-graph')} flex items-center gap-1.5`}>
              <Network size={14} />
              Knowledge Graph
            </Link>
          </nav>
        </div>
      </header>

      {isGraphPage ? (
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      )}
    </div>
  );
}
