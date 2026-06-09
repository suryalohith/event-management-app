
import React, { useState } from 'react';

type AdminAuthResult = {
  success: boolean;
  error?: string;
};

interface AdminLoginProps {
  onLogin: (email: string, password: string) => Promise<AdminAuthResult> | AdminAuthResult;
  onSendVerification: (email: string, password: string) => Promise<void> | void;
}

const AUTH_ACTION_TIMEOUT_MS = 20000;

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
};

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onSendVerification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsSubmitting(true);
    try {
      const result = await withTimeout(
        Promise.resolve(onLogin(email.trim(), password)),
        AUTH_ACTION_TIMEOUT_MS,
        'Login request timed out. Please check your connection and try again.'
      );

      if (!result.success) {
        setError(result.error || 'Invalid email or password');
        setPassword('');
      }
    } catch (loginError) {
      if (loginError instanceof Error) {
        setError(loginError.message);
      } else {
        setError('Login failed. Please try again.');
      }
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendVerification = async () => {
    setError('');
    setInfo('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Enter email and password to send verification email.');
      return;
    }

    setIsSendingVerification(true);
    try {
      await withTimeout(
        Promise.resolve(onSendVerification(normalizedEmail, password)),
        AUTH_ACTION_TIMEOUT_MS,
        'Verification request timed out. Please check your connection and try again.'
      );
      setInfo('Verification email sent. Please verify your inbox and then login again.');
    } catch (verificationError) {
      if (verificationError instanceof Error) {
        setError(verificationError.message);
      } else {
        setError('Failed to send verification email.');
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl border border-white/10 flex items-center justify-center">
            <span className="text-2xl font-black text-white">AU</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Admin Access</h1>
          <p className="text-zinc-500 text-sm">Enter credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500 mono tracking-widest font-bold">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500 mono tracking-widest font-bold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700"
              autoComplete="current-password"
              required
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            {info && <p className="text-emerald-400 text-xs mt-2">{info}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isSendingVerification}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-60"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSendVerification();
              }}
              disabled={isSendingVerification || isSubmitting}
              className="w-full py-4 border border-indigo-500/40 text-indigo-300 bg-indigo-500/10 font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-60"
            >
              {isSendingVerification ? 'Sending...' : 'Verify Email'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <a href="/" className="text-zinc-600 text-xs hover:text-white transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
