import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useTheme } from 'next-themes';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { useSupabaseData } from '../context/SupabaseDataContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Upload,
  Settings,
  LogOut,
  Users,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import lbLogo from '../../imports/lb-logo.png';

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin', 'cashier'] },
  { to: '/inventory',   label: 'Inventory',   icon: Package,         roles: ['admin', 'cashier'] },
  { to: '/checkout',    label: 'Checkout',    icon: ShoppingCart,    roles: ['admin', 'cashier'] },
  { to: '/invoices',    label: 'Invoices',    icon: FileText,        roles: ['admin', 'cashier'] },
  { to: '/bulk-upload', label: 'Bulk Upload', icon: Upload,          roles: ['admin'] },
  { to: '/users',       label: 'Users',       icon: Users,           roles: ['admin'] },
  { to: '/settings',    label: 'Settings',    icon: Settings,        roles: ['admin'] },
];

export function Layout() {
  const { user, signOut } = useSupabaseAuth();
  const { settings } = useSupabaseData();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isHoverMode = settings.sidebarMode === 'hover';
  const expanded = !isHoverMode || hovered;
  const isDark = resolvedTheme === 'dark';

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role || ''));

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row">
      {/* ── Mobile top bar ── */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 h-14 shadow-sm">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={lbLogo} alt="L & B Limited" className="w-7 h-7 object-contain" />
          <p className="text-sm text-gray-900 dark:text-gray-100">L &amp; B Limited</p>
        </div>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex-shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"
          aria-label="Toggle theme"
        >
          {isDark
            ? <Sun className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            : <Moon className="w-4 h-4 text-yellow-700" />
          }
        </button>
      </header>

      {/* ── Mobile nav drawer ── */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="h-14 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <img src={lbLogo} alt="L & B Limited" className="w-8 h-8 object-contain" />
                <p className="text-gray-900 dark:text-gray-100">L &amp; B Limited</p>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
              {filteredNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg py-3 px-3 transition-colors duration-150 ${
                      isActive
                        ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`flex-shrink-0 w-5 h-5 ${isActive ? 'text-yellow-600 dark:text-yellow-400' : ''}`} />
                      <span className="text-sm">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <span className="text-xs text-yellow-700 dark:text-yellow-400 uppercase">{user?.username?.[0]}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">{user?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 capitalize leading-tight">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center w-full gap-2.5 rounded-lg py-2.5 px-3 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        onMouseEnter={() => isHoverMode && setHovered(true)}
        onMouseLeave={() => isHoverMode && setHovered(false)}
        style={{
          width: expanded ? '16rem' : '4.5rem',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
        className="hidden md:flex md:flex-col relative z-20 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm"
      >
        {/* ── Logo ── */}
        <div className="h-[72px] flex items-center border-b border-gray-200 dark:border-gray-800 px-3 overflow-hidden">
          <img
            src={lbLogo}
            alt="L & B Limited"
            className="w-10 h-10 object-contain flex-shrink-0"
          />
          <div
            style={{
              opacity: expanded ? 1 : 0,
              maxWidth: expanded ? '180px' : '0px',
              transition: 'opacity 0.2s ease, max-width 0.28s cubic-bezier(0.4,0,0.2,1)',
            }}
            className="overflow-hidden ml-3"
          >
            <p className="whitespace-nowrap text-gray-900 dark:text-gray-100 leading-tight">L &amp; B Limited</p>
            <p className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight mt-0.5">
              {user?.role === 'admin' ? 'Administrator' : 'Cashier'}
            </p>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
          {filteredNav.map(({ to, label, icon: Icon }) => (
            <div key={to} className="relative group/nav">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center rounded-lg py-2.5 transition-colors duration-150 ${
                    expanded ? 'px-3 gap-3' : 'justify-center px-0'
                  } ${
                    isActive
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`flex-shrink-0 w-5 h-5 ${isActive ? 'text-yellow-600 dark:text-yellow-400' : ''}`} />
                    <span
                      style={{
                        opacity: expanded ? 1 : 0,
                        maxWidth: expanded ? '160px' : '0px',
                        transition: 'opacity 0.18s ease, max-width 0.28s cubic-bezier(0.4,0,0.2,1)',
                      }}
                      className="overflow-hidden whitespace-nowrap text-sm"
                    >
                      {label}
                    </span>
                    {!expanded && isActive && (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    )}
                  </>
                )}
              </NavLink>

              {/* Floating tooltip when collapsed */}
              {!expanded && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                    {label}
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* ── Theme toggle + User / Logout ── */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-3 overflow-hidden">
          {/* Theme toggle */}
          <div className="relative group/theme mb-2">
            <button
              onClick={toggleTheme}
              className={`flex items-center w-full rounded-lg py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                expanded ? 'px-3 gap-2.5' : 'justify-center px-0'
              }`}
              aria-label="Toggle theme"
            >
              {isDark
                ? <Sun className="w-4 h-4 flex-shrink-0" />
                : <Moon className="w-4 h-4 flex-shrink-0" />
              }
              <span
                style={{
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? '120px' : '0px',
                  transition: 'opacity 0.18s ease, max-width 0.28s cubic-bezier(0.4,0,0.2,1)',
                }}
                className="overflow-hidden whitespace-nowrap text-sm"
              >
                {isDark ? 'Light mode' : 'Dark mode'}
              </span>
            </button>
            {!expanded && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/theme:opacity-100 transition-opacity duration-150">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                  {isDark ? 'Light mode' : 'Dark mode'}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              </div>
            )}
          </div>

          <div className={`flex items-center mb-2 ${expanded ? 'gap-2.5' : 'justify-center'}`}>
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <span className="text-xs text-yellow-700 dark:text-yellow-400 uppercase">{user?.username?.[0]}</span>
            </div>
            <div
              style={{
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? '140px' : '0px',
                transition: 'opacity 0.18s ease, max-width 0.28s cubic-bezier(0.4,0,0.2,1)',
              }}
              className="overflow-hidden"
            >
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap truncate leading-tight">{user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap capitalize leading-tight">{user?.role}</p>
            </div>
          </div>

          <div className="relative group/logout">
            <button
              onClick={handleLogout}
              className={`flex items-center w-full rounded-lg py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ${
                expanded ? 'px-3 gap-2.5' : 'justify-center px-0'
              }`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span
                style={{
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? '120px' : '0px',
                  transition: 'opacity 0.18s ease, max-width 0.28s cubic-bezier(0.4,0,0.2,1)',
                }}
                className="overflow-hidden whitespace-nowrap text-sm"
              >
                Logout
              </span>
            </button>
            {!expanded && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/logout:opacity-100 transition-opacity duration-150">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                  Logout
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
