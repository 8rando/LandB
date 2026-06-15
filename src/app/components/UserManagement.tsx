import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Users, Plus, Trash2, KeyRound, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function UserManagement() {
  const { users, createUser, deleteUser, updateUserPassword, user: currentUser } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'cashier' | 'admin'>('cashier');
  const [showNewPw, setShowNewPw] = useState(false);

  const [resetPassword, setResetPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createUser(newUsername, newPassword, newRole);
    if (result.ok) {
      toast.success(`Account "${newUsername}" created`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('cashier');
      setShowCreate(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = (username: string) => {
    if (!confirm(`Delete account "${username}"? This cannot be undone.`)) return;
    const result = deleteUser(username);
    if (result.ok) {
      toast.success(`Account "${username}" deleted`);
    } else {
      toast.error(result.error);
    }
  };

  const handleResetPassword = (e: React.FormEvent, username: string) => {
    e.preventDefault();
    const result = updateUserPassword(username, resetPassword);
    if (result.ok) {
      toast.success(`Password updated for "${username}"`);
      setEditingPassword(null);
      setResetPassword('');
    } else {
      toast.error(result.error);
    }
  };

  const admins = users.filter(u => u.role === 'admin');
  const cashiers = users.filter(u => u.role === 'cashier');

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2">User Management</h1>
          <p className="text-gray-600">{users.length} account{users.length !== 1 ? 's' : ''} — admins and cashiers</p>
        </div>
        <Button onClick={() => { setShowCreate(true); setEditingPassword(null); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Account
        </Button>
      </div>

      {/* ── Create account modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Account
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Username</label>
                <Input
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="e.g. john_cashier"
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-400 mt-1">At least 3 characters, lowercase</p>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Password</label>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cashier', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`py-2.5 rounded-lg text-sm border-2 capitalize transition-colors ${
                        newRole === r
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {newRole === 'cashier'
                    ? 'Can do checkout, view invoices, and add inventory items'
                    : 'Full access to all features including settings and bulk upload'}
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit">Create Account</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Admins ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-5 border-b border-gray-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-yellow-600" />
          <h2>Administrators ({admins.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {admins.map(u => (
            <UserRow
              key={u.username}
              user={u}
              isCurrent={currentUser?.username === u.username}
              isEditing={editingPassword === u.username}
              resetPassword={resetPassword}
              showResetPw={showResetPw}
              onStartEdit={() => { setEditingPassword(u.username); setResetPassword(''); setShowCreate(false); }}
              onCancelEdit={() => setEditingPassword(null)}
              onResetSubmit={e => handleResetPassword(e, u.username)}
              onResetChange={v => setResetPassword(v)}
              onToggleShowPw={() => setShowResetPw(v => !v)}
              onDelete={() => handleDelete(u.username)}
            />
          ))}
        </div>
      </div>

      {/* ── Cashiers ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-5 border-b border-gray-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <h2>Cashiers ({cashiers.length})</h2>
        </div>
        {cashiers.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No cashier accounts yet.{' '}
            <button onClick={() => setShowCreate(true)} className="text-yellow-600 hover:underline">
              Create one
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cashiers.map(u => (
              <UserRow
                key={u.username}
                user={u}
                isCurrent={currentUser?.username === u.username}
                isEditing={editingPassword === u.username}
                resetPassword={resetPassword}
                showResetPw={showResetPw}
                onStartEdit={() => { setEditingPassword(u.username); setResetPassword(''); setShowCreate(false); }}
                onCancelEdit={() => setEditingPassword(null)}
                onResetSubmit={e => handleResetPassword(e, u.username)}
                onResetChange={v => setResetPassword(v)}
                onToggleShowPw={() => setShowResetPw(v => !v)}
                onDelete={() => handleDelete(u.username)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
        Accounts are stored locally in this browser. Share credentials securely with your staff.
      </div>
    </div>
  );
}

interface UserRowProps {
  user: { username: string; role: string };
  isCurrent: boolean;
  isEditing: boolean;
  resetPassword: string;
  showResetPw: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onResetSubmit: (e: React.FormEvent) => void;
  onResetChange: (v: string) => void;
  onToggleShowPw: () => void;
  onDelete: () => void;
}

function UserRow({
  user, isCurrent, isEditing, resetPassword, showResetPw,
  onStartEdit, onCancelEdit, onResetSubmit, onResetChange, onToggleShowPw, onDelete,
}: UserRowProps) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm text-yellow-700 uppercase">{user.username[0]}</span>
          </div>
          <div>
            <p className="text-gray-900">
              {user.username}
              {isCurrent && <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">you</span>}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button onClick={onStartEdit} variant="ghost" size="sm" className="gap-1.5 text-gray-600">
              <KeyRound className="w-3.5 h-3.5" />
              Reset Password
            </Button>
          )}
          {user.username !== 'admin' && (
            <Button
              onClick={onDelete}
              variant="ghost"
              size="sm"
              className="p-2 text-red-500 hover:bg-red-50"
              title="Delete account"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <form onSubmit={onResetSubmit} className="mt-3 flex items-center gap-2 pl-12">
          <div className="relative flex-1">
            <Input
              type={showResetPw ? 'text' : 'password'}
              value={resetPassword}
              onChange={e => onResetChange(e.target.value)}
              placeholder="New password (min 6 chars)"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={onToggleShowPw}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit}>Cancel</Button>
        </form>
      )}
    </div>
  );
}
