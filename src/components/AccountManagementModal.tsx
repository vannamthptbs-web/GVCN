import React, { useState } from 'react';
import {
  Users,
  Shield,
  Key,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Copy,
  Check,
  X,
  Lock,
  Phone,
  Mail,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  Eye,
  EyeOff,
  AlertCircle,
  Camera
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccountUser, RoleType } from '../types';
import {
  isGuestUser,
  isHomeroomTeacher,
  canAdministerAllAccounts,
  canEditTargetAccount,
  canViewTargetAccountPin,
} from '../utils/permissionUtils';
import { generateStudentUsername, DEFAULT_STUDENT_PIN } from '../utils/roleHierarchy';

export const AccountManagementModal: React.FC = () => {
  const {
    accountModalOpen,
    setAccountModalOpen,
    accounts,
    currentUserRole,
    switchAccount,
    loginWithCredentials,
    addAccount,
    updateAccount,
    deleteAccount,
    classInfo,
    openLoginModal,
    setChangePasswordModalOpen,
    setChangeAvatarModalOpen,
    students,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'gvcn' | 'ban_can_su' | 'to_truong_pho' | 'hoc_sinh'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form modal state for adding / editing
  const [editingAccount, setEditingAccount] = useState<AccountUser | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  // Login form state
  const [loginMode, setLoginMode] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Add/Edit Form fields
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<RoleType>('hoc_sinh');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'gvcn' | 'ban_can_su' | 'to_truong_pho' | 'hoc_sinh'>('hoc_sinh');
  const [formGroupId, setFormGroupId] = useState<number | undefined>(undefined);
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  if (!accountModalOpen || !isHomeroomTeacher(currentUserRole.role)) return null;

  const isGVCN = isHomeroomTeacher(currentUserRole.role);
  const isGuest = isGuestUser(currentUserRole.role);

  const filteredAccounts = accounts.filter(acc => {
    if (selectedCategory !== 'all' && acc.category !== selectedCategory) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      return (
        acc.fullName.toLowerCase().includes(kw) ||
        acc.username.toLowerCase().includes(kw) ||
        acc.title.toLowerCase().includes(kw) ||
        (acc.studentCode && acc.studentCode.toLowerCase().includes(kw))
      );
    }
    return true;
  });

  const handleCopyCredentials = (acc: AccountUser) => {
    const hasPinAccess = canViewTargetAccountPin(currentUserRole, acc.id);
    const pinText = hasPinAccess ? acc.pin : '•••••• (Chỉ GVCN và chính chủ xem được)';
    const text = `Tài khoản Lớp ${classInfo.className}:
Họ và tên: ${acc.fullName} (${acc.title})
Tên đăng nhập: ${acc.username}
Mã PIN: ${pinText}
Email: ${acc.email || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = () => {
    if (!canAdministerAllAccounts(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền tạo thêm tài khoản!');
      return;
    }
    setIsAddMode(true);
    setEditingAccount(null);
    setFormFullName('');
    setFormUsername('');
    setFormPin(DEFAULT_STUDENT_PIN);
    setFormRole('hoc_sinh');
    setFormTitle('Học sinh');
    setFormCategory('hoc_sinh');
    setFormGroupId(1);
    setFormEmail('');
    setFormPhone('');
    setFormNotes('');
  };

  const handleOpenEdit = (acc: AccountUser) => {
    if (!canEditTargetAccount(currentUserRole, acc.id)) {
      alert('Bạn chỉ có quyền chỉnh sửa tài khoản cá nhân của chính mình!');
      return;
    }
    setIsAddMode(false);
    setEditingAccount(acc);
    setFormFullName(acc.fullName);
    setFormUsername(acc.username);
    setFormPin(acc.pin);
    setFormRole(acc.role);
    setFormTitle(acc.title);
    setFormCategory(acc.category);
    setFormGroupId(acc.groupId);
    setFormEmail(acc.email || '');
    setFormPhone(acc.phone || '');
    setFormNotes(acc.notes || '');
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formUsername.trim() || !formPin.trim()) {
      alert('Vui lòng điền đầy đủ Họ tên, Tên đăng nhập và Mã PIN!');
      return;
    }

    if (isAddMode) {
      addAccount({
        username: formUsername.trim(),
        pin: formPin.trim(),
        fullName: formFullName.trim(),
        role: formRole,
        title: formTitle.trim() || 'Học sinh',
        category: formCategory,
        groupId: formGroupId,
        email: formEmail.trim(),
        phone: formPhone.trim(),
        permissions: ['Xem hồ sơ cá nhân', 'Tra cứu điểm thi đua'],
        status: 'active',
        notes: formNotes.trim(),
      });
    } else if (editingAccount) {
      updateAccount({
        ...editingAccount,
        username: isGVCN ? formUsername.trim() : editingAccount.username,
        pin: formPin.trim(),
        fullName: isGVCN ? formFullName.trim() : editingAccount.fullName,
        role: isGVCN ? formRole : editingAccount.role,
        title: isGVCN ? formTitle.trim() : editingAccount.title,
        category: isGVCN ? formCategory : editingAccount.category,
        groupId: isGVCN ? formGroupId : editingAccount.groupId,
        email: formEmail.trim(),
        phone: formPhone.trim(),
        notes: formNotes.trim(),
      });
    }

    setIsAddMode(false);
    setEditingAccount(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = loginWithCredentials(loginUsername, loginPin);
    if (!result.success) {
      setLoginError(result.message);
      return;
    }
    setLoginMode(false);
    setLoginError(null);
    setAccountModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-800/80 rounded-xl border border-blue-500/30">
              <Users className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Hệ thống Tài khoản & Phân quyền
                <span className="text-xs bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-full font-medium">
                  {accounts.length} Tài khoản
                </span>
              </h2>
              <p className="text-xs text-blue-100">
                Phân định nghiêm ngặt: Học sinh chỉ chỉnh sửa tài khoản của mình • Khách chỉ xem
              </p>
            </div>
          </div>
          <button
            onClick={() => setAccountModalOpen(false)}
            className="text-blue-200 hover:text-white p-2 rounded-lg hover:bg-blue-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Permission Banner */}
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            {isGuest ? (
              <span><strong>Chế độ Khách (Chưa đăng nhập):</strong> Bạn chỉ có quyền xem tổng quan. Hãy đăng nhập để thao tác.</span>
            ) : isGVCN ? (
              <span><strong>Tài khoản GVCN:</strong> Quản trị viên tối cao — Có toàn quyền quản lý và cấp phát tài khoản.</span>
            ) : (
              <span><strong>Tài khoản cá nhân:</strong> Bạn chỉ có quyền chỉnh sửa thông tin & đổi mã PIN của chính mình.</span>
            )}
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'gvcn', label: 'GVCN' },
              { key: 'ban_can_su', label: 'Ban Cán Sự' },
              { key: 'to_truong_pho', label: 'Tổ Trưởng/Phó' },
              { key: 'hoc_sinh', label: 'Học sinh' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tên, chức danh, user..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isGuest && (
              <button
                onClick={() => {
                  setAccountModalOpen(false);
                  setChangePasswordModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                Đổi mật khẩu / PIN
              </button>
            )}
            <button
              onClick={() => {
                setAccountModalOpen(false);
                openLoginModal();
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              Đăng nhập xác thực
            </button>
            {isGVCN && (
              <button
                onClick={handleOpenAdd}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Cấp tài khoản mới
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loginMode ? (
            <div className="max-w-md mx-auto p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Đăng nhập tài khoản</h3>
                <p className="text-xs text-slate-500">Nhập Tên đăng nhập và Mã PIN bảo mật</p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đăng nhập:</label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="VD: gvcn_thuha, loptruong_hoang, totruong_to1..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã PIN:</label>
                  <input
                    type="password"
                    required
                    value={loginPin}
                    onChange={e => setLoginPin(e.target.value)}
                    placeholder="Mã PIN 4-6 số"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors"
                >
                  Xác nhận Đăng nhập
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAccounts.map(acc => {
                const isCurrent = currentUserRole.accountId === acc.id || currentUserRole.name === acc.fullName;
                const canEditThis = canEditTargetAccount(currentUserRole, acc.id);
                const canViewPin = canViewTargetAccountPin(currentUserRole, acc.id);

                return (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => {
                            const matchingStudent = students.find(s => s.id === acc.studentId || (acc.studentCode && s.studentCode === acc.studentCode) || s.fullName === acc.fullName);
                            setChangeAvatarModalOpen(true, acc, matchingStudent || null);
                          }}
                          title="Đổi ảnh đại diện (Lưu Google Drive)"
                        >
                          <img
                            src={acc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={acc.fullName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 group-hover:brightness-90 transition-all"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-slate-900">{acc.fullName}</h4>
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                                Đang dùng
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-blue-700">{acc.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span>User: <strong className="font-mono text-slate-700">{acc.username}</strong></span>
                            <span>•</span>
                            <span>PIN: <strong className="font-mono text-slate-700">{canViewPin ? acc.pin : '••••••'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const matchingStudent = students.find(s => s.id === acc.studentId || (acc.studentCode && s.studentCode === acc.studentCode) || s.fullName === acc.fullName);
                            setChangeAvatarModalOpen(true, acc, matchingStudent || null);
                          }}
                          title="Đổi ảnh đại diện (Lưu Google Drive & Sheet)"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopyCredentials(acc)}
                          title="Sao chép thông tin tài khoản"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          {copiedId === acc.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {canEditThis && (
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            title="Chỉnh sửa tài khoản"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isGVCN && acc.role !== 'gvcn' && (
                          <button
                            onClick={() => deleteAccount(acc.id)}
                            title="Xóa tài khoản"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Permissions tags */}
                    {acc.permissions && acc.permissions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1">
                        {acc.permissions.slice(0, 3).map((perm, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {perm}
                          </span>
                        ))}
                        {acc.permissions.length > 3 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                            +{acc.permissions.length - 3} quyền
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action button */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[10px] text-slate-400">
                        {acc.phone && <span className="mr-2">📞 {acc.phone}</span>}
                      </div>
                      {isCurrent ? (
                        <button
                          onClick={() => {
                            setAccountModalOpen(false);
                            setChangePasswordModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                        >
                          <Key className="w-3 h-3 text-emerald-700" />
                          Đổi mật khẩu
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setAccountModalOpen(false);
                            openLoginModal(acc.username);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Lock className="w-3 h-3" />
                          Đăng nhập vai này
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add/Edit Modal Layer */}
        {(isAddMode || editingAccount) && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAddMode ? 'Cấp tài khoản mới' : 'Chỉnh sửa tài khoản'}
                  </h3>
                  {!isGVCN && !isAddMode && (
                    <p className="text-[11px] text-slate-500">Chỉ chỉnh sửa được mã PIN và thông tin liên lạc cá nhân.</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsAddMode(false);
                    setEditingAccount(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên: {!isGVCN && <span className="text-slate-400 text-[10px]">(Cố định)</span>}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isGVCN && !isAddMode}
                      value={formFullName}
                      onChange={e => {
                        const name = e.target.value;
                        setFormFullName(name);
                        if (isAddMode && name.trim()) {
                          setFormUsername(generateStudentUsername(name, formTitle, formGroupId));
                        }
                      }}
                      placeholder="Nguyễn Văn A"
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isGVCN && !isAddMode ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chức danh: {!isGVCN && <span className="text-slate-400 text-[10px]">(Cố định)</span>}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isGVCN && !isAddMode}
                      value={formTitle}
                      onChange={e => {
                        const title = e.target.value;
                        setFormTitle(title);
                        if (isAddMode && formFullName.trim()) {
                          setFormUsername(generateStudentUsername(formFullName, title, formGroupId));
                        }
                      }}
                      placeholder="Tổ trưởng Tổ 1, Lớp phó..."
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isGVCN && !isAddMode ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên đăng nhập: {!isGVCN && <span className="text-slate-400 text-[10px]">(Cố định)</span>}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isGVCN && !isAddMode}
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      placeholder="VD: ltkhang, nbhan..."
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isGVCN && !isAddMode ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 text-blue-700">Mã PIN cá nhân (Được phép đổi):</label>
                    <input
                      type="text"
                      required
                      value={formPin}
                      onChange={e => setFormPin(e.target.value)}
                      placeholder="123"
                      className="w-full px-3 py-1.5 border border-blue-400 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none bg-blue-50/40 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nhóm vai trò: {!isGVCN && <span className="text-slate-400 text-[10px]">(Cố định)</span>}
                    </label>
                    <select
                      disabled={!isGVCN && !isAddMode}
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as any)}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isGVCN && !isAddMode ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300 bg-white'
                      }`}
                    >
                      <option value="gvcn">Giáo viên Chủ nhiệm</option>
                      <option value="ban_can_su">Ban Cán Sự Lớp</option>
                      <option value="to_truong_pho">Ban Cán Sự Tổ</option>
                      <option value="hoc_sinh">Học sinh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thuộc Tổ: {!isGVCN && <span className="text-slate-400 text-[10px]">(Cố định)</span>}
                    </label>
                    <select
                      disabled={!isGVCN && !isAddMode}
                      value={formGroupId || ''}
                      onChange={e => setFormGroupId(e.target.value ? Number(e.target.value) : undefined)}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isGVCN && !isAddMode ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300 bg-white'
                      }`}
                    >
                      <option value="">Toàn lớp</option>
                      <option value="1">Tổ 1</option>
                      <option value="2">Tổ 2</option>
                      <option value="3">Tổ 3</option>
                      <option value="4">Tổ 4</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại liên lạc:</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="0912..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email liên lạc:</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="email@lop11a1.edu.vn"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMode(false);
                      setEditingAccount(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs"
                  >
                    {isAddMode ? 'Tạo tài khoản' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Đang đăng nhập: <strong className="text-slate-800">{currentUserRole.name}</strong> ({currentUserRole.title})
          </div>
          <button
            onClick={() => setAccountModalOpen(false)}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
