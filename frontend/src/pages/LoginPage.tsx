import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileCheck2, ArrowRight, Lock, Mail, Sparkles, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('sarah.jenkins@nexusglobal.com');
  const [password, setPassword] = useState('demo-password-123');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth token or authenticate with Supabase
    setTimeout(() => {
      localStorage.setItem('documind_token', 'mock_token_' + Date.now());
      setIsLoading(false);
      navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center mx-auto shadow-glow-brand">
            <FileCheck2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            DocuMind <span className="text-brand-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400">
            Intelligent Document Processing & Knowledge Discovery
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com"
                  className="w-full bg-navy-950 border border-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-navy-950 border border-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-glow-brand transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Workspace Access */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('documind_token', 'demo_user_token');
                navigate('/dashboard');
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800/80 border border-brand-500/30 text-brand-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan group-hover:scale-110 transition-transform" />
              Quick Demo Access (Sarah Jenkins, CPO)
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          Don't have an enterprise account?{' '}
          <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
