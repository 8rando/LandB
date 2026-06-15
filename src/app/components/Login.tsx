import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AlertCircle } from 'lucide-react';
import lbLogo from '../../imports/lb-logo.png';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user, isLocked, lockoutTime } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLocked) {
      setError(`Account locked. Try again in ${lockoutTime} seconds.`);
      return;
    }

    const success = login(username, password);
    if (!success) {
      setError('Invalid credentials. After 3 failed attempts, account will be locked for 60 seconds.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="flex flex-col items-center gap-4">
              <img src={lbLogo} alt="L & B Limited" className="w-24 h-24 object-contain" />
              <h1 className="text-center text-3xl">L & B Limited</h1>
            </div>
          </div>

          <p className="text-center text-gray-600 mb-8">Inventory Management System</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLocked && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 text-center">
                Account locked for {lockoutTime} seconds
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm mb-2 text-gray-700">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLocked}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLocked}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLocked}>
              {isLocked ? 'Locked' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
