import React, { useState, useEffect } from 'react';
import {
  Key,
  Lock,
  ShieldCheck,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isGuestUser } from '../utils/permissionUtils';

export const ChangePasswordModal: React.FC = () => {
  const {
    changePasswordModalOpen,
    setChangePasswordModalOpen,
    currentUserRole,
    accounts,
    changePassword,
    setLoginModalOpen,
  } = useApp();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isGuest = isGuestUser(currentUserRole.role);
  const currentAccount = accounts.find(
    a => a.id === currentUserRole.accountId || a.fullName === currentUserRole.name
  );

  useEffect(() => {
    if (changePasswordModalOpen) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [changePasswordModalOpen]);

  if (!changePasswordModalOpen) return null;

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: 'Chưa nhập', color: 'bg-slate-200', score: 0 };
    if (pass.length < 3) return { label: 'Quá ngắn (Tối thiểu 3 ký tự)', color: 'bg-rose-500', score: 1 };
    if (pass.length < 6) return { label: 'Trung bình', color: 'bg-amber-500', score: 2 };
    const hasNumber = /\d/.test(pass);
    const hasLetter = /[a-zA-Z]/.test(pass);
    if (hasNumber && hasLetter && pass.length >= 6) {
      return { label: 'Rất mạnh (Bảo mật cao)', color: 'bg-emerald-500', score: 4 };
    }
    return { label: 'Tốt', color: 'bg-blue-500', score: 3 };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isGuest || !currentAccount) {
      setErrorMessage('Bạn đang ở chế độ Khách. Vui lòng đăng nhập tài khoản trước khi đổi mật khẩu!');
      return;
    }

    if (!oldPassword.trim()) {
      setErrorMessage('Vui lòng nhập Mật khẩu / Mã PIN hiện tại!');
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Vui lòng nhập Mật khẩu / Mã PIN mới!');
      return;
    }

    if (newPassword.trim().length < 3) {
      setErrorMessage('Mật khẩu mới phải có độ dài tối thiểu 3 ký tự!');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới!');
      return;
    }

    if (oldPassword.trim() === newPassword.trim()) {
      setErrorMessage('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(oldPassword.trim(), newPassword.trim(), confirmPassword.trim());
      if (!result.success) {
        setErrorMessage(result.message);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(result.message);
      setTimeout(() => {
        setChangePasswordModalOpen(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <Key className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Đổi Mật Khẩu / Mã PIN</h3>
              <p className="text-[11px] text-blue-100">Bắt buộc xác thực mật khẩu cũ trước khi đổi</p>
            </div>
          </div>
          <button
            onClick={() => setChangePasswordModalOpen(false)}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* User badge */}
          {currentAccount ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <img
                src={currentAccount.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentAccount.fullName}
                className="w-10 h-10 rounded-full object-cover border border-slate-300"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentAccount.fullName}</p>
                <p className="text-[11px] text-blue-700 font-medium truncate">
                  {currentAccount.title} • Tài khoản: <span className="font-mono text-slate-800 font-bold">{currentAccount.username}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
              <span>Bạn đang chưa đăng nhập tài khoản nào.</span>
              <button
                type="button"
                onClick={() => {
                  setChangePasswordModalOpen(false);
                  setLoginModalOpen(true);
                }}
                className="font-bold underline text-blue-700"
              >
                Đăng nhập ngay
              </button>
            </div>
          )}

          {/* Error / Success alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="font-semibold">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Old Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Mật khẩu / Mã PIN hiện tại <span className="text-rose-500">*</span>:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={e => {
                    setOldPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Nhập mật khẩu đang sử dụng..."
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  2. Mật khẩu / Mã PIN mới <span className="text-rose-500">*</span>:
                </label>
                {newPassword && (
                  <span className="text-[10px] font-semibold text-slate-500">
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Mật khẩu mới (tối thiểu 4 ký tự)..."
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div className="mt-1.5 flex gap-1 items-center">
                  {[1, 2, 3, 4].map(idx => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        strength.score >= idx ? strength.color : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Xác nhận lại mật khẩu mới <span className="text-rose-500">*</span>:
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Nhập lại chính xác mật khẩu mới..."
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Bảo mật & Cố định:</strong> Mật khẩu là bảo quản cá nhân. Khi học sinh đổi mật khẩu, hệ thống sẽ lưu cố định trên Google Sheet để dùng cho các lần sau và tuyệt đối không tự ý đổi mật khẩu trở lại trạng thái ban đầu.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setChangePasswordModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isGuest || isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 active:scale-98 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Lưu mật khẩu mới</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
