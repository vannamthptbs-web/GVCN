import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Key,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Search,
  Sparkles,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccountUser } from '../types';
import { GoogleAuthModal } from './GoogleAuthModal';

export const LoginModal: React.FC = () => {
  const {
    loginModalOpen,
    setLoginModalOpen,
    loginTargetUsername,
    setLoginTargetUsername,
    accounts,
    loginWithCredentials,
    loginWithGoogle,
    currentUserRole,
  } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'gvcn' | 'ban_can_su' | 'to_truong_pho' | 'hoc_sinh'>('all');
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  useEffect(() => {
    if (loginModalOpen) {
      if (loginTargetUsername) {
        setUsername(loginTargetUsername);
        setShowAccountPicker(false);
      } else {
        setUsername('');
        setShowAccountPicker(false);
      }
      setPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowPassword(false);
    }
  }, [loginModalOpen, loginTargetUsername]);

  if (!loginModalOpen) return null;

  const targetAccount = accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase());

  const filteredAccounts = accounts.filter(acc => {
    if (selectedCategory !== 'all' && acc.category !== selectedCategory) return false;
    if (searchAccountQuery.trim()) {
      const q = searchAccountQuery.toLowerCase();
      return (
        acc.fullName.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        acc.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSelectAccount = (acc: AccountUser) => {
    setUsername(acc.username);
    setShowAccountPicker(false);
    setErrorMessage(null);
  };

  const handleGoogleSuccess = async (profile: {
    email: string;
    name: string;
    avatar: string;
    googleId: string;
  }) => {
    const res = await loginWithGoogle(profile);
    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        setLoginModalOpen(false);
        setLoginTargetUsername(null);
        setSuccessMessage(null);
      }, 800);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setErrorMessage('Vui lòng nhập hoặc chọn Tên đăng nhập!');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập Mật khẩu / Mã PIN!');
      return;
    }

    const result = loginWithCredentials(username, password);
    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    setSuccessMessage(result.message);
    setTimeout(() => {
      setLoginModalOpen(false);
      setLoginTargetUsername(null);
      setSuccessMessage(null);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <Lock className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Đăng nhập Hệ thống
              </h3>
              <p className="text-[11px] text-blue-100">
                Xác thực Tên đăng nhập và Mật khẩu / PIN bảo mật
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setLoginModalOpen(false);
              setLoginTargetUsername(null);
            }}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Quick Google Sign In */}
          <button
            type="button"
            onClick={() => setGoogleModalOpen(true)}
            className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2.5 transition-all shadow-2xs"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span>Đăng nhập nhanh bằng tài khoản Google</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">
                Hoặc tài khoản nội bộ
              </span>
            </div>
          </div>

          {/* Target Account Badge if recognized */}
          {targetAccount && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-3">
              <img
                src={targetAccount.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={targetAccount.fullName}
                className="w-10 h-10 rounded-full object-cover border border-blue-300"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{targetAccount.fullName}</p>
                <p className="text-[11px] text-blue-700 font-medium truncate">{targetAccount.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountPicker(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold"
              >
                Đổi tài khoản
              </button>
            </div>
          )}

          {/* Quick Account Picker Dropdown / Modal */}
          {showAccountPicker && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Chọn tài khoản đăng nhập</span>
                <button
                  type="button"
                  onClick={() => setShowAccountPicker(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-medium"
                >
                  Thu gọn
                </button>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'gvcn', label: 'GVCN' },
                  { key: 'ban_can_su', label: 'Cán sự' },
                  { key: 'to_truong_pho', label: 'Tổ trưởng' },
                  { key: 'hoc_sinh', label: 'Học sinh' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedCategory(tab.key as any)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      selectedCategory === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Tìm tên học sinh, chức vụ..."
                  value={searchAccountQuery}
                  onChange={e => setSearchAccountQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100">
                {filteredAccounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className="w-full text-left p-1.5 hover:bg-blue-50 rounded-lg flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={acc.avatar} alt={acc.fullName} className="w-6 h-6 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{acc.fullName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{acc.title} • <span className="font-mono">{acc.username}</span></p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-[11px] text-rose-600 mt-0.5">
                  Vui lòng kiểm tra lại chính xác Tên đăng nhập và Mật khẩu/PIN.
                </p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-semibold">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Tên đăng nhập / Tài khoản:</label>
                {!showAccountPicker && (
                  <button
                    type="button"
                    onClick={() => setShowAccountPicker(true)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <User className="w-3 h-3" />
                    Chọn từ danh sách lớp
                  </button>
                )}
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="VD: gvcn, hoặc chọn tài khoản..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Mật khẩu / Mã PIN:</label>
                <span className="text-[10px] text-slate-500 font-medium">GVCN: <strong className="font-mono text-emerald-700">123456</strong> • HS: <strong className="font-mono text-blue-600">123</strong></span>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Mật khẩu (mặc định: 123)..."
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Đăng nhập & Xác thực
            </button>
          </form>

          {/* Quick Notice */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              Quên mật khẩu?
            </span>
            <span className="text-blue-600 font-medium">
              Liên hệ GVCN để được cấp lại PIN
            </span>
          </div>
        </div>
      </div>

      <GoogleAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onSuccess={handleGoogleSuccess}
        mode="login"
      />
    </div>
  );
};
