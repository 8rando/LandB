import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isLocked: boolean;
  lockoutTime: number;
  // User management (admin only)
  users: User[];
  createUser: (username: string, password: string, role: 'admin' | 'cashier') => { ok: boolean; error?: string };
  deleteUser: (username: string) => { ok: boolean; error?: string };
  updateUserPassword: (username: string, newPassword: string) => { ok: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USERS: User[] = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'cashier', password: 'cashier123', role: 'cashier' },
];

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 60000;
const USERS_KEY = 'app_users';

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as User[];
  } catch { /* ignore */ }
  // Seed defaults on first run
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    setUsers(loadUsers());

    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) setUser(JSON.parse(storedUser));

    const lockoutEnd = localStorage.getItem('lockoutEnd');
    if (lockoutEnd) {
      const endTime = parseInt(lockoutEnd);
      if (Date.now() < endTime) {
        setIsLocked(true);
        setLockoutTime(Math.ceil((endTime - Date.now()) / 1000));
      } else {
        localStorage.removeItem('lockoutEnd');
      }
    }
  }, []);

  useEffect(() => {
    if (!isLocked) return;
    const timer = setInterval(() => {
      const lockoutEnd = localStorage.getItem('lockoutEnd');
      if (lockoutEnd) {
        const remaining = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 1000);
        if (remaining <= 0) {
          setIsLocked(false);
          setLockoutTime(0);
          setFailedAttempts(0);
          localStorage.removeItem('lockoutEnd');
          clearInterval(timer);
        } else {
          setLockoutTime(remaining);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  const login = (username: string, password: string): boolean => {
    if (isLocked) return false;
    const currentUsers = loadUsers();
    const found = currentUsers.find(u => u.username === username && u.password === password);
    if (found) {
      const session = { username: found.username, role: found.role, password: '' };
      setUser(session);
      localStorage.setItem('currentUser', JSON.stringify(session));
      setFailedAttempts(0);
      return true;
    }
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      const end = Date.now() + LOCKOUT_DURATION;
      localStorage.setItem('lockoutEnd', end.toString());
      setIsLocked(true);
      setLockoutTime(60);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const createUser = (username: string, password: string, role: 'admin' | 'cashier') => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || !password) return { ok: false, error: 'Username and password are required' };
    if (trimmed.length < 3) return { ok: false, error: 'Username must be at least 3 characters' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
    const current = loadUsers();
    if (current.some(u => u.username.toLowerCase() === trimmed)) {
      return { ok: false, error: 'Username already exists' };
    }
    const updated = [...current, { username: trimmed, password, role }];
    saveUsers(updated);
    setUsers(updated);
    return { ok: true };
  };

  const deleteUser = (username: string) => {
    if (username === 'admin') return { ok: false, error: 'Cannot delete the admin account' };
    if (user?.username === username) return { ok: false, error: 'Cannot delete your own account' };
    const current = loadUsers();
    const updated = current.filter(u => u.username !== username);
    saveUsers(updated);
    setUsers(updated);
    return { ok: true };
  };

  const updateUserPassword = (username: string, newPassword: string) => {
    if (newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };
    const current = loadUsers();
    const updated = current.map(u => u.username === username ? { ...u, password: newPassword } : u);
    saveUsers(updated);
    setUsers(updated);
    return { ok: true };
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, isLocked, lockoutTime,
      users, createUser, deleteUser, updateUserPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
