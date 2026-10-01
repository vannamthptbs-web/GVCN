import React from 'react';
import { 
  GraduationCap, 
  UserCheck, 
  Bell, 
  Download, 
  PlusCircle, 
  RotateCcw, 
  ShieldCheck, 
  Users,
  ChevronDown,
  FileSpreadsheet,
  RefreshCw,
  Key,
  LogOut,
  LogIn,
  Eye,
  Save,
  Camera,
  FileJson
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isGuestUser, isHomeroomTeacher, canManageClassActivities, isClassCadre, isClassAdmin } from '../utils/permissionUtils';

interface NavbarProps {
  onOpenMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { 
    currentUserRole, 
    setCurrentUserRole, 
    availableRoles, 
    accounts,
    students,
    switchAccount,
    logout,
    openLoginModal,
    setLoginModalOpen,
    setChangePasswordModalOpen,
    setChangeAvatarModalOpen,
    setQuickActionModalOpen, 
    setGoogleSheetsModalOpen,
    setAccountModalOpen,
    googleSheetsConfig,
    syncAllToGoogleSheets,
    backupGVCNData,
    exportDataToJson,
    exportClassDataToExcel,
    undoLastAction,
    activityLogs,
    studentsNeedingAttention,
    classInfo,
    isInitialLoadingData,
    isSyncingData,
    pullFromGoogleSheets,
    syncNotification,
    triggerManualSyncWithConfirmation,
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isBackingUp, setIsBackingUp] = React.useState(false);

  const isGuest = isGuestUser(currentUserRole.role);
  const isGVCN = isHomeroomTeacher(currentUserRole.role);
  const isCadre = isClassCadre(currentUserRole.role) || isClassAdmin(currentUserRole.role);
  // Chỉ GVCN mới được xem và bấm nút Google Sheets trên thanh Navbar (bảo mật tuyệt đối, không để HS hoặc người lạ vào)
  const canSeeSyncButton = isGVCN;
  const canRecord = canManageClassActivities(currentUserRole.role);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    await triggerManualSyncWithConfirmation('Đồng bộ từ thanh tiêu đề');
    setIsSyncing(false);
  };

  const handleQuickBackup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBackingUp(true);
    await backupGVCNData({ exportExcel: false, note: 'Sao lưu nhanh từ thanh tiêu đề GVCN' });
    setIsBackingUp(false);
  };

  const handleQuickExportJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    exportDataToJson();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'khach': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'gvcn': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'lop_truong': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'lop_pho_hoc_tap': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'lop_pho_lao_dong': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'lop_pho_van_the_my': return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'to_truong': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile menu button + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Mở menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">QUẢN LÝ LỚP HỌC</span>
                {classInfo?.className ? (
                  <span className="bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    {classInfo.className}
                  </span>
                ) : (
                  <span className="bg-slate-200 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                    Chưa tạo lớp
                  </span>
                )}
                {isGuest && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Eye className="w-3 h-3" /> Chỉ xem
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Trợ lý Giáo viên Chủ nhiệm & Cán sự lớp</p>
            </div>
          </div>
        </div>

        {/* Right: Role switcher + Google Sheets + Quick Action + Notifications */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dedicated GVCN Backup Button */}
          {isGVCN && (
            <>
              <button
                onClick={handleQuickBackup}
                disabled={isBackingUp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/25 border border-indigo-500 disabled:opacity-50"
                title="Sao lưu dữ liệu cho GVCN (lưu Snapshot & cập nhật sheet ThongTinLop_GVCN trên Google Sheets)"
              >
                <Save className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : 'text-indigo-200'}`} />
                <span className="hidden sm:inline">{isBackingUp ? 'Đang sao lưu...' : 'Sao Lưu GVCN'}</span>
              </button>

              <button
                onClick={handleQuickExportJson}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm border border-amber-400"
                title="Lưu toàn bộ thông tin thành file JSON tải về máy (khỏi lo mất thông tin)"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Lưu JSON</span>
              </button>
            </>
          )}

          {/* Google Sheets Sync Button (GVCN & Ban cán sự lớp) */}
          {canSeeSyncButton && (
            <div className="flex items-center bg-white border border-emerald-300 hover:border-emerald-400 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setGoogleSheetsModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isInitialLoadingData
                    ? 'bg-amber-50 text-amber-800'
                    : isSyncing || isSyncingData || syncNotification?.status === 'saving'
                    ? 'bg-blue-50 text-blue-800'
                    : syncNotification?.status === 'success'
                    ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400'
                    : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800'
                }`}
                title="Google Sheets: Tự động lưu và tải dữ liệu thời gian thực"
              >
                <FileSpreadsheet className={`w-4 h-4 ${isInitialLoadingData ? 'text-amber-600 animate-pulse' : 'text-emerald-700'}`} />
                <span className="hidden md:inline">
                  {isInitialLoadingData
                    ? 'Đang tải onl...'
                    : isSyncing || isSyncingData || syncNotification?.status === 'saving'
                    ? 'Đang lưu...'
                    : syncNotification?.status === 'success'
                    ? '✓ Đã lưu Sheets'
                    : 'Google Sheets'}
                </span>
              </button>
              <button
                onClick={handleQuickSync}
                disabled={isSyncing || isSyncingData || isInitialLoadingData}
                title="Bấm để lưu và đồng bộ ngay lập tức lên Google Sheets"
                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || isSyncingData || isInitialLoadingData || syncNotification?.status === 'saving' ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* Quick Action Button (only if authorized) */}
          {canRecord && (
            <button
              onClick={() => setQuickActionModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ghi nhận nhanh</span>
            </button>
          )}

          {/* Undo Button */}
          {isGVCN && activityLogs.length > 0 && (
            <button
              onClick={undoLastAction}
              title="Hoàn tác thao tác gần nhất"
              className="p-2 text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-300 shadow-2xs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Notification Alert Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative p-2 text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/90 shadow-2xs"
              aria-label="Thông báo"
            >
              <Bell className="w-5 h-5" />
              {studentsNeedingAttention.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">Cảnh báo nề nếp & Chuyên cần</span>
                    <span className="bg-rose-100 text-rose-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {studentsNeedingAttention.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => setNotifDropdownOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Đóng
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {studentsNeedingAttention.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Lớp đang duy trì nề nếp rất tốt! Không có học sinh vi phạm nghiêm trọng.</p>
                  ) : (
                    studentsNeedingAttention.map(item => (
                      <div key={item.student.id} className="p-2.5 bg-rose-50/60 rounded-lg border border-rose-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{item.student.fullName}</span>
                          <span className="text-rose-600 font-medium">Tổ {item.student.groupId}</span>
                        </div>
                        <p className="text-slate-600 mt-1">{Array.isArray(item.attentionReasons) ? item.attentionReasons.join(' • ') : ''}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Login button if Guest */}
          {isGuest && (
            <button
              onClick={() => openLoginModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          )}

          {/* Role Switcher Pill & Logout */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-2xs ${getRoleBadgeColor(currentUserRole.role)}`}
            >
              <img
                src={currentUserRole.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'}
                alt={currentUserRole.name}
                className="w-6 h-6 rounded-full object-cover border border-white/60"
              />
              <div className="text-left hidden sm:block leading-tight">
                <p className="font-bold text-slate-900 truncate max-w-[130px]">{currentUserRole.name}</p>
                <p className="text-[10px] opacity-85 truncate max-w-[130px]">{currentUserRole.title}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Chuyển vai trò / Đăng nhập</p>
                  {isGVCN && (
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        setAccountModalOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <Key className="w-3 h-3" />
                      Quản lý tài khoản
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1 space-y-1">
                  {!isGuest ? (
                    <>
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          const currentAcc = (currentUserRole.accountId ? accounts.find(a => a.id === currentUserRole.accountId) : null) ||
                            (currentUserRole.studentId ? accounts.find(a => a.studentId === currentUserRole.studentId) : null) ||
                            accounts.find(a => a.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim());
                          const currentStd = currentUserRole.studentId
                            ? students.find(s => s.id === currentUserRole.studentId)
                            : students.find(s => s.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim());
                          setChangeAvatarModalOpen(true, currentAcc || null, currentStd || null);
                        }}
                        className="w-full py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border border-indigo-200"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Đổi ảnh đại diện (Google Drive)
                      </button>
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          setChangePasswordModalOpen(true);
                        }}
                        className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border border-blue-200"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Đổi mật khẩu / Mã PIN
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border border-rose-200"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Đăng xuất tài khoản
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        openLoginModal();
                      }}
                      className="w-full py-2 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <LogIn className="w-4 h-4" />
                      Đăng nhập tài khoản cá nhân
                    </button>
                  )}
                </div>

                <div className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Tài khoản hệ thống (yêu cầu mật khẩu)
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {accounts.map((acc) => {
                    const isCurrent = currentUserRole.name === acc.fullName;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          if (!isCurrent) {
                            openLoginModal(acc.username);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                          isCurrent ? 'bg-emerald-50 text-emerald-900 font-semibold cursor-default' : 'text-slate-700'
                        }`}
                      >
                        <img src={acc.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'} alt={acc.fullName} className="w-8 h-8 rounded-full object-cover" />
                        <div className="text-xs flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{acc.fullName}</p>
                          <p className="text-[11px] text-slate-500 truncate">{acc.title} • <span className="font-mono text-slate-400">{acc.username}</span></p>
                        </div>
                        {isCurrent ? (
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                            Đang dùng
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-600 font-semibold">
                            Đăng nhập
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {isGVCN && (
                  <div className="px-3 pt-2 border-t border-slate-100 mt-1">
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        setAccountModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Mở trung tâm quản lý tài khoản
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Logout Button */}
          {!isGuest && (
            <button
              onClick={() => logout()}
              title="Đăng xuất khỏi hệ thống"
              className="px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-bold shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


