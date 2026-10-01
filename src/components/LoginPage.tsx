import React, { useState } from 'react';
import {
  Lock,
  User,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Search,
  ChevronRight,
  GraduationCap,
  Users,
  Sparkles,
  School,
  ArrowRight,
  Shield,
  UserPlus,
  LogIn,
  Check,
  Phone,
  Mail,
  BookOpen,
  MessageCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccountUser, TeacherRegistrationData } from '../types';
import { GoogleAuthModal } from './GoogleAuthModal';
import { isRealGoogleEmail } from '../utils/googleAuth';

export const LoginPage: React.FC = () => {
  const {
    accounts,
    classInfo,
    loginWithCredentials,
    loginWithGoogle,
    registerTeacherAccount,
    students
  } = useApp();

  // Primary mode: 'login' | 'register'
  const [mainMode, setMainMode] = useState<'login' | 'register'>('login');

  // Submode for Registration: 'google' | 'standard'
  const [registerType, setRegisterType] = useState<'google' | 'standard'>('google');

  // Login states
  const [loginMode, setLoginMode] = useState<'student_cadre' | 'gvcn'>('gvcn');
  const [username, setUsername] = useState('gvcn');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration states (Standard)
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regClassName, setRegClassName] = useState('');
  const [regSchoolName, setRegSchoolName] = useState('');
  const [regSchoolYear, setRegSchoolYear] = useState('2026 - 2027');
  const [regGradeLevel, setRegGradeLevel] = useState('Khối 10');
  const [regMotto, setRegMotto] = useState('Mỗi ngày cố gắng 1 chút, thành công ngày càng sẽ gần hơn');

  // Registration states (Google)
  const [googleProfile, setGoogleProfile] = useState<{
    email: string;
    name: string;
    avatar: string;
    googleId: string;
  } | null>(null);
  const [googleClassName, setGoogleClassName] = useState('');
  const [googleSchoolName, setGoogleSchoolName] = useState('');
  const [googleSchoolYear, setGoogleSchoolYear] = useState('2026 - 2027');
  const [googleGradeLevel, setGoogleGradeLevel] = useState('Khối 10');
  const [googlePin, setGooglePin] = useState('123456');

  // General feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);

  const handleCopyZalo = () => {
    navigator.clipboard?.writeText('0979466078');
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  // Google Auth Modal
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleModalMode, setGoogleModalMode] = useState<'login' | 'register'>('login');

  // Quick picker states for student/cadre
  const [showPicker, setShowPicker] = useState(false);
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [pickerCategory, setPickerCategory] = useState<'all' | 'ban_can_su' | 'to_truong_pho' | 'hoc_sinh'>('all');

  const handleTabChange = (mode: 'student_cadre' | 'gvcn') => {
    setLoginMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword('');
    setShowPicker(false);
    if (mode === 'gvcn') {
      const gvcnAcc = accounts.find(a => a.category === 'gvcn' || a.role === 'gvcn');
      setUsername(gvcnAcc?.username || 'gvcn');
    } else {
      setUsername('');
    }
  };

  const targetAccount = accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase());

  const filteredAccounts = accounts.filter(acc => {
    if (acc.category === 'gvcn' || acc.role === 'gvcn') return false;
    if (pickerCategory !== 'all' && acc.category !== pickerCategory) return false;
    if (searchAccountQuery.trim()) {
      const q = searchAccountQuery.toLowerCase().trim();
      return (
        acc.fullName.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        acc.title.toLowerCase().includes(q) ||
        (acc.studentCode && acc.studentCode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSelectAccount = (acc: AccountUser) => {
    setUsername(acc.username);
    setShowPicker(false);
    setErrorMessage(null);
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Vui lòng nhập hoặc chọn Tên đăng nhập / Mã tài khoản!');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập Mật khẩu / Mã PIN!');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      let resolvedUsername = cleanUsername;
      const byCode = accounts.find(
        a => a.studentCode && a.studentCode.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (byCode) {
        resolvedUsername = byCode.username;
      }

      const result = loginWithCredentials(resolvedUsername, password);
      setIsLoading(false);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage(result.message);
    }, 250);
  };

  // Open Google Auth Modal
  const handleOpenGoogleAuth = (mode: 'login' | 'register') => {
    setGoogleModalMode(mode);
    setGoogleModalOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Google Auth Modal Success callback
  const handleGoogleAuthSuccess = async (profile: {
    email: string;
    name: string;
    avatar: string;
    googleId: string;
  }) => {
    if (googleModalMode === 'login') {
      setIsLoading(true);
      const res = await loginWithGoogle(profile);
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage(res.message);
      } else if (res.needsRegistration) {
        // Switch to registration mode with this google account
        setMainMode('register');
        setRegisterType('google');
        setGoogleProfile(profile);
        setErrorMessage('Tài khoản Google chưa liên kết lớp học. Vui lòng hoàn tất thông tin để khởi tạo lớp mới!');
      } else {
        setErrorMessage(res.message);
      }
    } else {
      // In register mode: fill google profile info
      setGoogleProfile(profile);
      setSuccessMessage(`Đã xác thực tài khoản Google: ${profile.email}`);
    }
  };

  // Standard Teacher Registration handler
  const handleStandardRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regFullName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên Giáo viên Chủ nhiệm!');
      return;
    }
    if (!regUsername.trim()) {
      setErrorMessage('Vui lòng nhập Tên đăng nhập mong muốn!');
      return;
    }
    if (!regPin.trim() || regPin.trim().length < 3) {
      setErrorMessage('Mật khẩu / Mã PIN phải có ít nhất 3 ký tự!');
      return;
    }
    if (regPin.trim() !== regConfirmPin.trim()) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp!');
      return;
    }
    if (!regClassName.trim()) {
      setErrorMessage('Vui lòng nhập Tên lớp chủ nhiệm (ví dụ: 10A1, 12C7)!');
      return;
    }

    setIsLoading(true);
    const regData: TeacherRegistrationData = {
      fullName: regFullName.trim(),
      username: regUsername.trim(),
      pin: regPin.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      className: regClassName.trim(),
      schoolName: regSchoolName.trim() || 'Trường THPT',
      schoolYear: regSchoolYear.trim() || '2026 - 2027',
      gradeLevel: regGradeLevel,
      semester: 'Học kỳ I',
      motto: regMotto.trim(),
      authProvider: 'credentials',
    };

    const res = await registerTeacherAccount(regData);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setSuccessMessage(res.message);
  };

  // Google Teacher Registration handler
  const handleGoogleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!googleProfile) {
      setErrorMessage('Vui lòng bấm nút "Xác thực tài khoản Google" trước!');
      return;
    }

    if (!googleClassName.trim()) {
      setErrorMessage('Vui lòng nhập Tên lớp chủ nhiệm (ví dụ: 10A1, 11B2, 12C7)!');
      return;
    }

    setIsLoading(true);
    const emailPrefix = googleProfile.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const autoUsername = `gv_${emailPrefix}`;

    const regData: TeacherRegistrationData = {
      fullName: googleProfile.name.trim(),
      username: autoUsername,
      pin: googlePin.trim() || '123456',
      email: googleProfile.email.trim(),
      className: googleClassName.trim(),
      schoolName: googleSchoolName.trim() || 'Trường THPT',
      schoolYear: googleSchoolYear.trim() || '2026 - 2027',
      gradeLevel: googleGradeLevel,
      semester: 'Học kỳ I',
      authProvider: 'google',
      googleId: googleProfile.googleId,
      googleAvatar: googleProfile.avatar,
    };

    const res = await registerTeacherAccount(regData);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setSuccessMessage(res.message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-between p-3 sm:p-6 lg:p-8 antialiased font-sans text-slate-100 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Form Center Box */}
      <main className="max-w-5xl mx-auto w-full my-auto py-3 sm:py-5 relative z-10 flex flex-col items-center">
        {/* 3D Joyful Title with Background Banner mimicking image.png */}
        <div className="w-full mb-4 sm:mb-6 relative z-10 select-none animate-in fade-in zoom-in-95 duration-500">
          <div className="relative overflow-hidden bg-gradient-to-b from-sky-400/35 via-blue-600/25 to-indigo-900/40 border-2 border-sky-400/45 rounded-3xl p-4 sm:p-7 backdrop-blur-md shadow-2xl text-center">
            {/* Ambient sunburst / light glow */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-48 bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-2 left-6 text-amber-300 text-lg sm:text-2xl animate-bounce pointer-events-none">⭐</div>
            <div className="absolute top-3 right-8 text-amber-300 text-base sm:text-xl animate-pulse pointer-events-none">✨</div>
            <div className="absolute bottom-3 left-10 text-yellow-300 text-xs sm:text-base pointer-events-none">✨</div>
            <div className="absolute bottom-4 right-12 text-amber-300 text-sm sm:text-lg pointer-events-none">⭐</div>

            {/* Top Subtitle Pill */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-600/50 via-indigo-600/50 to-blue-600/50 border border-sky-300/40 text-sky-100 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2 shadow-xs backdrop-blur-xs relative z-10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Chuyển đổi số giáo dục & thi đua học đường 4.0</span>
            </div>

            {/* 3D "LỚP HỌC HẠNH PHÚC" TITLE ON 1 SINGLE LINE */}
            <div className="relative z-10 flex items-center justify-center my-1 sm:my-2">
              {/* 3D Tilted Graduation Cap perched on top-left of the first word */}
              <div className="relative inline-flex items-center justify-center">
                <div
                  className="absolute -top-4 sm:-top-7 -left-3 sm:-left-6 -rotate-12 select-none pointer-events-none drop-shadow-[0_8px_12px_rgba(0,0,0,0.6)] z-20"
                  aria-hidden="true"
                >
                  <div className="relative">
                    <GraduationCap className="w-8 h-8 sm:w-14 sm:h-14 text-blue-500 fill-blue-700 stroke-cyan-300 stroke-[1.5]" />
                    <span className="absolute -bottom-1 right-1 text-amber-300 text-xs sm:text-sm font-bold">🎗️</span>
                  </div>
                </div>

                {/* 3D Extruded Single-Line Heading with Uniform Vietnamese Font */}
                <h1
                  className="font-['Baloo_2',sans-serif] uppercase tracking-normal whitespace-nowrap text-3xl sm:text-5xl md:text-6xl lg:text-[4.2rem] py-1 select-none"
                  style={{
                    fontFamily: "'Baloo 2', 'Nunito', sans-serif",
                    fontWeight: 900,
                    color: '#FFDE17',
                    WebkitTextStroke: '2.5px #062870',
                    paintOrder: 'stroke fill',
                    textShadow: `
                      0 1px 0 #0d42a6,
                      0 2px 0 #0b3aa0,
                      0 3px 0 #093392,
                      0 4px 0 #082d84,
                      0 5px 0 #072675,
                      0 6px 0 #062066,
                      0 7px 0 #051a56,
                      0 8px 0 #041444,
                      0 10px 1px rgba(0, 0, 0, 0.45),
                      0 14px 22px rgba(4, 20, 68, 0.65)
                    `,
                  }}
                >
                  LỚP HỌC HẠNH PHÚC
                </h1>

                {/* 3D Heart badge on top right like image */}
                <div className="absolute -top-2 sm:-top-4 -right-2 sm:-right-4 select-none pointer-events-none drop-shadow-md">
                  <span className="text-base sm:text-2xl animate-pulse">💖</span>
                </div>
              </div>
            </div>

            {/* Ribbon 1: Curved Green Banner (Quản lý lớp học – Tặng điểm – Tạo trò chơi học tập) */}
            <div className="mt-2.5 sm:mt-3 flex items-center justify-center relative z-10">
              <div className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-1 sm:py-1.5 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 border-2 border-emerald-300 text-white font-black text-xs sm:text-sm rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.45)] tracking-wide">
                <span>Quản lý lớp học – Tặng điểm – Nề nếp thi đua</span>
              </div>
            </div>

            {/* Ribbon 2: Golden Yellow Banner (HIỆU QUẢ – THÔNG MINH – TIỆN LỢI) */}
            <div className="mt-1.5 flex items-center justify-center relative z-10">
              <div className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-0.5 sm:py-1 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 border border-yellow-200 text-blue-950 font-black text-[10px] sm:text-xs rounded-full shadow-md uppercase tracking-wider">
                <span>HIỆU QUẢ – THÔNG MINH – TIỆN LỢI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Area: Login Card (Left) + Copyright & Zalo Notice Card (Right) */}
        <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 sm:gap-6 mt-1">
          {/* Card Main Box */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 text-slate-800 overflow-hidden transition-all w-full max-w-lg shrink-0">
          {/* Main Mode Switcher: Đăng Nhập vs Đăng Ký Tài Khoản GVCN */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 border-b border-slate-200 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setMainMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 ${
                mainMode === 'login'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span>Đăng Nhập</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMainMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-3 rounded-2xl transition-all flex items-center justify-center gap-2 ${
                mainMode === 'register'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng Ký GVCN Mới</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ĐĂNG NHẬP                                                          */}
          {/* ========================================================================= */}
          {mainMode === 'login' && (
            <div>
              {/* Card Header for Login */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold text-blue-100 mb-1.5">
                      <Lock className="w-3 h-3 text-blue-200" />
                      Cổng xác thực bắt buộc
                    </span>
                    <span className="text-[11px] text-blue-100 font-medium">Bảo mật GVCN</span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    Đăng Nhập Quản Lý Lớp
                  </h2>
                  <p className="text-xs text-blue-100/90 mt-0.5 leading-relaxed">
                    Đăng nhập bằng tài khoản Google chính chủ hoặc mã đăng nhập lớp.
                  </p>
                </div>
              </div>

              {/* Official Google Sign-In Primary Button */}
              <div className="p-5 pb-2">
                <button
                  type="button"
                  onClick={() => handleOpenGoogleAuth('login')}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 group"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Đăng nhập nhanh bằng tài khoản Google thật</span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="bg-white px-3 text-slate-400 font-semibold">
                      Hoặc đăng nhập tài khoản nội bộ
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Switch Tabs for credentials login */}
              <div className="px-5">
                <div className="p-1 bg-slate-100 rounded-xl flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => handleTabChange('gvcn')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      loginMode === 'gvcn'
                        ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Giáo viên CN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('student_cadre')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      loginMode === 'student_cadre'
                        ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Học sinh / Cán sự</span>
                  </button>
                </div>
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleLogin} className="p-5 pt-3 space-y-3.5">
                {/* Recognized Target Account Badge */}
                {targetAccount && (
                  <div className="p-2.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-center gap-3">
                    <img
                      src={targetAccount.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={targetAccount.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-blue-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{targetAccount.fullName}</p>
                      <p className="text-[11px] text-blue-700 font-semibold truncate">
                        {targetAccount.title} {targetAccount.groupId ? `• Tổ ${targetAccount.groupId}` : ''}
                      </p>
                    </div>
                    {loginMode === 'student_cadre' && (
                      <button
                        type="button"
                        onClick={() => setShowPicker(true)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 underline font-bold shrink-0"
                      >
                        Đổi
                      </button>
                    )}
                  </div>
                )}

                {/* Student Quick Account Picker */}
                {loginMode === 'student_cadre' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Tài khoản học sinh:</label>
                      <button
                        type="button"
                        onClick={() => setShowPicker(prev => !prev)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{showPicker ? 'Đóng danh sách' : 'Chọn từ danh sách lớp'}</span>
                      </button>
                    </div>

                    {showPicker && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in">
                        <div className="flex flex-wrap gap-1">
                          {[
                            { key: 'all', label: 'Tất cả' },
                            { key: 'ban_can_su', label: 'Ban cán sự' },
                            { key: 'to_truong_pho', label: 'Tổ trưởng' },
                            { key: 'hoc_sinh', label: 'Thành viên' },
                          ].map(tab => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setPickerCategory(tab.key as any)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                pickerCategory === tab.key
                                  ? 'bg-indigo-600 text-white'
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
                            placeholder="Tìm tên, mã học sinh, tổ..."
                            value={searchAccountQuery}
                            onChange={e => setSearchAccountQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100">
                          {filteredAccounts.map(acc => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => handleSelectAccount(acc)}
                              className="w-full text-left p-1.5 hover:bg-indigo-50 rounded-lg flex items-center justify-between transition-colors group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={acc.avatar} alt={acc.fullName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700">
                                    {acc.fullName}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {acc.title} • {acc.studentCode || acc.username} {acc.groupId ? `(Tổ ${acc.groupId})` : ''}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Username input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{loginMode === 'gvcn' ? 'Tên đăng nhập GVCN' : 'Tên đăng nhập / Mã HS'}</span>
                    {loginMode === 'gvcn' && (
                      <span className="text-[10px] font-normal text-slate-400 font-mono">Ví dụ: gvcn</span>
                    )}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder={loginMode === 'gvcn' ? 'Tên đăng nhập GVCN' : 'Nhập mã HS hoặc tên tài khoản'}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Mật khẩu / Mã PIN</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">Mặc định: 123456</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Nhập mã PIN / Mật khẩu..."
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all tracking-wider"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">{errorMessage}</span>
                  </div>
                )}

                {/* Success message */}
                {successMessage && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{successMessage}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                    loginMode === 'gvcn'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/25 active:scale-[0.98]'
                      : 'bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 shadow-indigo-500/25 active:scale-[0.98]'
                  } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập vào Hệ thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Prompt to register for new teachers */}
                <div className="pt-2 text-center border-t border-slate-100">
                  <p className="text-xs text-slate-600">
                    Giáo viên mới chưa có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMainMode('register');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Đăng ký tài khoản GVCN & Khởi tạo lớp mới
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ĐĂNG KÝ TÀI KHOẢN GVCN MỚI                                          */}
          {/* ========================================================================= */}
          {mainMode === 'register' && (
            <div>
              {/* Header for Registration */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold text-emerald-100 mb-1.5">
                    <UserPlus className="w-3 h-3 text-emerald-200" />
                    Dành cho Giáo viên mới
                  </span>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    Đăng Ký Tài Khoản GVCN
                  </h2>
                  <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">
                    Khởi tạo lớp học mới tinh, xóa bỏ toàn bộ dữ liệu nền cũ để quản lý lớp của riêng thầy/cô.
                  </p>
                </div>
              </div>

              {/* Sub-tabs: Google Account vs Standard Registration */}
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterType('google');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`py-2 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      registerType === 'google'
                        ? 'bg-white border-blue-400 text-blue-700 shadow-xs'
                        : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Đăng ký bằng Google thật</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRegisterType('standard');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`py-2 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      registerType === 'standard'
                        ? 'bg-white border-emerald-400 text-emerald-700 shadow-xs'
                        : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Đăng ký bình thường</span>
                  </button>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* Option A: Đăng ký bằng tài khoản Google thật                       */}
              {/* ----------------------------------------------------------------- */}
              {registerType === 'google' && (
                <form onSubmit={handleGoogleRegister} className="p-5 space-y-3.5">
                  {/* Google Account Connect Card */}
                  {googleProfile ? (
                    <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={googleProfile.avatar}
                          alt={googleProfile.name}
                          className="w-10 h-10 rounded-full border-2 border-blue-400 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{googleProfile.name}</p>
                          <p className="text-[11px] text-blue-700 font-mono truncate">{googleProfile.email}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                            <Check className="w-3 h-3" /> Đã xác thực Google
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenGoogleAuth('register')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline shrink-0"
                      >
                        Đổi tài khoản
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl text-center space-y-2">
                      <p className="text-xs font-bold text-blue-950">
                        Bấm nút dưới đây để kết nối tài khoản Google chính chủ
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenGoogleAuth('register')}
                        className="w-full py-2.5 px-4 bg-white hover:bg-blue-50 border-2 border-blue-300 hover:border-blue-500 rounded-xl text-xs font-bold text-blue-800 shadow-xs flex items-center justify-center gap-2.5 transition-all"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                        </svg>
                        <span>Xác thực bằng tài khoản Google chính chủ (@gmail.com)</span>
                      </button>
                    </div>
                  )}

                  {/* Class Info Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tên lớp chủ nhiệm *</span>
                      </label>
                      <input
                        type="text"
                        value={googleClassName}
                        onChange={e => setGoogleClassName(e.target.value)}
                        placeholder="ví dụ: 10A1, 11B2, 12C1..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Trường học</span>
                      </label>
                      <input
                        type="text"
                        value={googleSchoolName}
                        onChange={e => setGoogleSchoolName(e.target.value)}
                        placeholder="ví dụ: THPT Lê Quý Đôn, THPT Chuyên..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Khối</label>
                      <select
                        value={googleGradeLevel}
                        onChange={e => setGoogleGradeLevel(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                      >
                        <option value="Khối 10">Khối 10</option>
                        <option value="Khối 11">Khối 11</option>
                        <option value="Khối 12">Khối 12</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Mã PIN dự phòng</label>
                      <input
                        type="text"
                        value={googlePin}
                        onChange={e => setGooglePin(e.target.value)}
                        placeholder="Mặc định: 123456"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Clean Slate Assurance Banner */}
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cam kết sạch sẽ:</strong> Khởi tạo lớp học mới hoàn toàn trống, không có dữ liệu học sinh hay vi phạm cũ nào lưu lại.
                    </span>
                  </div>

                  {/* Error & Success Messages */}
                  {errorMessage && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{successMessage}</span>
                    </div>
                  )}

                  {/* Submit Google Register */}
                  <button
                    type="submit"
                    disabled={isLoading || !googleProfile}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                      isLoading || !googleProfile ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang khởi tạo lớp...</span>
                      </>
                    ) : (
                      <>
                        <span>Hoàn tất Đăng ký với Google & Bắt đầu</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* Option B: Giáo viên đăng ký bình thường                            */}
              {/* ----------------------------------------------------------------- */}
              {registerType === 'standard' && (
                <form onSubmit={handleStandardRegister} className="p-5 space-y-3">
                  {/* Full Name & Username */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Họ và tên GVCN *</span>
                      </label>
                      <input
                        type="text"
                        value={regFullName}
                        onChange={e => setRegFullName(e.target.value)}
                        placeholder="Thầy / Cô (Họ và tên GVCN)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>Tên đăng nhập *</span>
                      </label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        placeholder="ví dụ: gvcn_toan, thay_nam, co_mai..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span>Mật khẩu / Mã PIN *</span>
                      </label>
                      <input
                        type="password"
                        value={regPin}
                        onChange={e => setRegPin(e.target.value)}
                        placeholder="Tối thiểu 3 ký tự"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xác nhận mật khẩu *</span>
                      </label>
                      <input
                        type="password"
                        value={regConfirmPin}
                        onChange={e => setRegConfirmPin(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Class Name & School */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tên lớp chủ nhiệm *</span>
                      </label>
                      <input
                        type="text"
                        value={regClassName}
                        onChange={e => setRegClassName(e.target.value)}
                        placeholder="ví dụ: 10A1, 11B2, 12C1..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Trường học</span>
                      </label>
                      <input
                        type="text"
                        value={regSchoolName}
                        onChange={e => setRegSchoolName(e.target.value)}
                        placeholder="ví dụ: THPT Lê Quý Đôn, THPT Chuyên..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Số điện thoại GVCN</span>
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="Số điện thoại liên hệ"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>Email GVCN</span>
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="Địa chỉ email cá nhân"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Grade & Year */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Khối</label>
                      <select
                        value={regGradeLevel}
                        onChange={e => setRegGradeLevel(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                      >
                        <option value="Khối 10">Khối 10</option>
                        <option value="Khối 11">Khối 11</option>
                        <option value="Khối 12">Khối 12</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Niên khóa</label>
                      <input
                        type="text"
                        value={regSchoolYear}
                        onChange={e => setRegSchoolYear(e.target.value)}
                        placeholder="2026 - 2027"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Clean Slate Assurance Banner */}
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Khởi tạo lớp mới:</strong> Hệ thống tự động xóa sạch dữ liệu nền cũ, đảm bảo giáo viên mới có danh sách lớp trống hoàn toàn.
                    </span>
                  </div>

                  {/* Error & Success Messages */}
                  {errorMessage && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="font-semibold">{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{successMessage}</span>
                    </div>
                  )}

                  {/* Submit Standard Register */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang khởi tạo tài khoản & lớp mới...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng ký tài khoản GVCN & Khởi tạo lớp</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Bottom Switch back to Login */}
              <div className="p-4 pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-600">
                  Đã có tài khoản GVCN hoặc Học sinh?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMainMode('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    Quay lại Đăng nhập tại đây
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

          {/* Copyright & Zalo Notice Card (Placed on the right side of login card, smaller and aligned) */}
          <div className="w-full lg:w-72 xl:w-80 p-4 sm:p-5 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/95 border border-amber-400/50 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-3 shrink-0 animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-300 drop-shadow-md">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>Bản quyền: Thầy Nguyễn Văn Nam</span>
            </div>
            <p className="text-xs font-bold text-slate-200">
              THPT Bình Sơn - Quảng Ngãi
            </p>
            <p className="text-[11px] text-sky-200 font-medium leading-relaxed">
              Chuyên cung cấp SKKN mới, KHKT hành vi, Viết app theo yêu cầu ...
            </p>

            {/* DÒNG CHỮ ĐỎ NỔI BẬT THEO YÊU CẦU: */}
            <div className="w-full pt-2 border-t border-rose-500/40 flex flex-col items-center gap-2.5">
              <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white p-2 rounded-xl shadow-md border border-red-300 text-center animate-pulse">
                <p className="text-[11px] sm:text-xs font-black tracking-tight leading-snug">
                  ⚠️ Ứng dụng đang chạy trên máy tính, nếu muốn dữ liệu online xin vui lòng liên hệ Zalo:
                  <span className="block mt-1 text-yellow-200 underline underline-offset-2 font-black text-sm">0979466078</span>
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full pt-1">
                <a
                  href="https://zalo.me/0979466078"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Nhắn Zalo: 0979466078</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyZalo}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                >
                  {copiedZalo ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Đã chép số Zalo</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sao chép SĐT Zalo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System notice footer */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400">
            Hệ thống Quản lý Nề nếp & Thi đua Lớp học • Bản quyền nội bộ lớp {classInfo.className || 'mới'}
          </p>
        </div>
      </main>

      {/* Footer Banner */}
      <footer className="max-w-6xl mx-auto w-full py-2 px-4 text-xs text-slate-400 border-t border-white/10 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <span className="italic">{classInfo.motto || 'Mỗi ngày cố gắng 1 chút, thành công ngày càng sẽ gần hơn'}</span>
        <span className="text-[11px] text-amber-300/90 font-medium">
          Tác giả: Thầy Nguyễn Văn Nam (THPT Bình Sơn - Quảng Ngãi)
        </span>
      </footer>

      {/* Google Authentication Dialog */}
      <GoogleAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onSuccess={handleGoogleAuthSuccess}
        mode={googleModalMode}
      />
    </div>
  );
};
