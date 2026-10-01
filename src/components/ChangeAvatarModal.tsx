import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Camera,
  Check,
  AlertCircle,
  Loader2,
  X,
  CloudUpload,
  Link as LinkIcon,
  User,
  Sparkles,
  RefreshCw,
  Info,
  ExternalLink,
  Copy,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccountUser } from '../types';
import { formatGoogleDriveImageUrl } from '../utils/googleSheetsSync';

const PRESET_AVATARS = [
  { label: 'Học sinh nam 1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=250&auto=format&fit=crop&q=80' },
  { label: 'Học sinh nam 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80' },
  { label: 'Học sinh nam 3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80' },
  { label: 'Học sinh nữ 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80' },
  { label: 'Học sinh nữ 2', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&auto=format&fit=crop&q=80' },
  { label: 'Học sinh nữ 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80' },
  { label: 'Cán sự thanh lịch 1', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&auto=format&fit=crop&q=80' },
  { label: 'Cán sự thanh lịch 2', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&auto=format&fit=crop&q=80' },
];

export const ChangeAvatarModal: React.FC = () => {
  const {
    changeAvatarModalOpen,
    targetAvatarAccount,
    targetAvatarStudent,
    setChangeAvatarModalOpen,
    currentUserRole,
    accounts,
    students,
    uploadAvatar,
    changeAvatar,
    googleSheetsConfig,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isConvertedFromDrive, setIsConvertedFromDrive] = useState<boolean>(false);
  const [isDrivePermissionIssue, setIsDrivePermissionIssue] = useState<boolean>(false);
  const [showDriveGuide, setShowDriveGuide] = useState<boolean>(false);
  const [failedUploadBase64, setFailedUploadBase64] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xác định học sinh và tài khoản mục tiêu
  const effectiveStudent =
    targetAvatarStudent ||
    (targetAvatarAccount?.studentId ? students.find(s => s.id === targetAvatarAccount.studentId) : null) ||
    (targetAvatarAccount?.studentCode ? students.find(s => s.studentCode.toLowerCase() === targetAvatarAccount.studentCode?.toLowerCase()) : null) ||
    (currentUserRole.studentId ? students.find(s => s.id === currentUserRole.studentId) : null) ||
    (currentUserRole.role !== 'gvcn' ? students.find(s => s.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim()) : null) ||
    null;

  const effectiveAccount: AccountUser | null =
    targetAvatarAccount ||
    (effectiveStudent ? accounts.find(a => a.studentId === effectiveStudent.id || (effectiveStudent.studentCode && a.studentCode === effectiveStudent.studentCode) || a.fullName.toLowerCase().trim() === effectiveStudent.fullName.toLowerCase().trim()) : null) ||
    (currentUserRole.accountId ? accounts.find(a => a.id === currentUserRole.accountId) : null) ||
    (currentUserRole.studentId ? accounts.find(a => a.studentId === currentUserRole.studentId || a.id === `acc_${currentUserRole.studentId}`) : null) ||
    accounts.find(a => a.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim()) ||
    (effectiveStudent ? {
      id: `acc_${effectiveStudent.id}`,
      username: effectiveStudent.studentCode ? effectiveStudent.studentCode.toLowerCase() : `hs_${effectiveStudent.id}`,
      pin: effectiveStudent.pin || '123',
      fullName: effectiveStudent.fullName,
      role: 'hoc_sinh',
      title: effectiveStudent.roleInClass || 'Học sinh',
      category: 'hoc_sinh',
      studentId: effectiveStudent.id,
      studentCode: effectiveStudent.studentCode,
      groupId: effectiveStudent.groupId,
      avatar: effectiveStudent.avatar,
      permissions: ['Xem hồ sơ cá nhân', 'Tra cứu điểm thi đua'],
      status: 'active',
    } as AccountUser : null);

  const displayName = effectiveStudent?.fullName || effectiveAccount?.fullName || currentUserRole.name;
  const displayCode = effectiveStudent?.studentCode || effectiveAccount?.studentCode || '';
  const displayRole = effectiveStudent?.roleInClass || effectiveAccount?.title || (currentUserRole.role === 'gvcn' ? 'Giáo viên Chủ nhiệm' : 'Học sinh');
  const currentAvatar = effectiveStudent?.avatar || effectiveAccount?.avatar || currentUserRole.avatar || '';

  useEffect(() => {
    if (changeAvatarModalOpen) {
      setSelectedFile(null);
      setPreviewUrl('');
      setCustomUrlInput('');
      setErrorMsg('');
      setSuccessMsg('');
      setIsProcessing(false);
      setActiveTab('upload');
      setIsConvertedFromDrive(false);
      setIsDrivePermissionIssue(false);
      setShowDriveGuide(false);
      setFailedUploadBase64(null);
      setCopiedScript(false);
    }
  }, [changeAvatarModalOpen]);

  if (!changeAvatarModalOpen || (!effectiveAccount && !effectiveStudent)) return null;

  const handleFileSelect = (file: File) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsDrivePermissionIssue(false);

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP, GIF).');
      return;
    }

    // Giới hạn 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Dung lượng tệp ảnh không được vượt quá 10MB.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Chuẩn bị sẵn base64 dự phòng
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setFailedUploadBase64(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleCustomUrlChange = (val: string) => {
    const formatted = formatGoogleDriveImageUrl(val);
    setCustomUrlInput(formatted.url);
    if (formatted.url.startsWith('http')) {
      setPreviewUrl(formatted.url);
    }
    if (formatted.isConverted) {
      setIsConvertedFromDrive(true);
      setErrorMsg('');
    } else {
      setIsConvertedFromDrive(false);
    }
  };

  const handleSaveDirectFallback = async () => {
    if (!failedUploadBase64 || (!effectiveAccount && !effectiveStudent)) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await changeAvatar(failedUploadBase64, effectiveAccount, effectiveStudent);
      if (res.success) {
        setSuccessMsg('Đã lưu ảnh đại diện thành công và hiển thị từ nay về sau!');
        setTimeout(() => {
          setChangeAvatarModalOpen(false);
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Không thể lưu ảnh đại diện.');
      }
    } catch (err: any) {
      setErrorMsg('Đã xảy ra lỗi: ' + (err.message || 'Không xác định'));
    } finally {
      setIsProcessing(false);
    }
  };

  const copyDriveScript = () => {
    const code = `// Dán hàm này vào Apps Script và bấm Run (Chạy) để cấp quyền Google Drive:
function capQuyenGoogleDriveVaSheet() {
  var root = DriveApp.getRootFolder();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("✅ Đã cấp quyền Google Drive thành công: " + root.getName());
  return "OK";
}`;
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSaveAvatar = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsDrivePermissionIssue(false);

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMsg('Vui lòng chọn một hình ảnh từ máy tính hoặc điện thoại.');
        return;
      }

      setIsProcessing(true);
      try {
        const res = await uploadAvatar(selectedFile, effectiveAccount, effectiveStudent);
        if (res.success) {
          setSuccessMsg(res.message || 'Đã lưu ảnh đại diện và hiển thị từ nay về sau!');
          setTimeout(() => {
            setChangeAvatarModalOpen(false);
          }, 1200);
        } else if (res.compressedBase64) {
          // Tự động lưu ảnh nén chất lượng cao trực tiếp vào ứng dụng để học sinh luôn đổi được ảnh ngay lập tức
          const directSaveRes = await changeAvatar(res.compressedBase64, effectiveAccount, effectiveStudent);
          if (directSaveRes.success) {
            setSuccessMsg('Đã lưu ảnh đại diện thành công và hiển thị vĩnh viễn!');
            setTimeout(() => {
              setChangeAvatarModalOpen(false);
            }, 1200);
          } else {
            setErrorMsg(directSaveRes.message || 'Không thể lưu ảnh đại diện.');
          }
        } else {
          setErrorMsg(res.message || 'Không thể lưu ảnh đại diện.');
          if (res.isDrivePermissionError) {
            setIsDrivePermissionIssue(true);
            setShowDriveGuide(true);
          }
        }
      } catch (err: any) {
        setErrorMsg('Đã xảy ra lỗi: ' + (err.message || 'Không xác định'));
      } finally {
        setIsProcessing(false);
      }
    } else if (activeTab === 'url') {
      const urlToSave = customUrlInput.trim();
      if (!urlToSave) {
        setErrorMsg('Vui lòng dán liên kết URL ảnh hợp lệ.');
        return;
      }
      if (!urlToSave.startsWith('http://') && !urlToSave.startsWith('https://')) {
        setErrorMsg('URL hình ảnh phải bắt đầu bằng http:// hoặc https://');
        return;
      }

      setIsProcessing(true);
      try {
        const res = await changeAvatar(urlToSave, effectiveAccount, effectiveStudent);
        if (res.success) {
          setSuccessMsg('Đã lưu ảnh đại diện thành công và hiển thị từ nay về sau!');
          setTimeout(() => {
            setChangeAvatarModalOpen(false);
          }, 1200);
        } else {
          setErrorMsg(res.message || 'Không thể cập nhật ảnh đại diện.');
        }
      } catch (err: any) {
        setErrorMsg('Đã xảy ra lỗi: ' + (err.message || 'Không xác định'));
      } finally {
        setIsProcessing(false);
      }
    } else if (activeTab === 'presets') {
      if (!previewUrl) {
        setErrorMsg('Vui lòng nhấp chọn một ảnh chân dung mẫu.');
        return;
      }

      setIsProcessing(true);
      try {
        const res = await changeAvatar(previewUrl, effectiveAccount, effectiveStudent);
        if (res.success) {
          setSuccessMsg('Đã áp dụng ảnh chân dung mẫu thành công và hiển thị từ nay về sau!');
          setTimeout(() => {
            setChangeAvatarModalOpen(false);
          }, 1200);
        } else {
          setErrorMsg(res.message || 'Không thể cập nhật ảnh đại diện.');
        }
      } catch (err: any) {
        setErrorMsg('Đã xảy ra lỗi: ' + (err.message || 'Không xác định'));
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const isSelf =
    (effectiveAccount && currentUserRole.accountId && currentUserRole.accountId === effectiveAccount.id) ||
    (effectiveStudent && currentUserRole.studentId && currentUserRole.studentId === effectiveStudent.id) ||
    currentUserRole.name.toLowerCase().trim() === displayName.toLowerCase().trim();

  return (
    <div
      id="change-avatar-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Đổi Ảnh Đại Diện</h3>
              <p className="text-xs text-indigo-100 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Lưu trữ vĩnh viễn trên thiết bị &amp; đồng bộ Google Drive / Google Sheet</span>
              </p>
            </div>
          </div>
          <button
            id="close-avatar-modal-btn"
            onClick={() => !isProcessing && setChangeAvatarModalOpen(false)}
            disabled={isProcessing}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account / Student Info Pill */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Học sinh / Tài khoản:</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">
              {displayName}
            </span>
            {displayCode && (
              <span className="text-slate-500 font-mono">({displayCode})</span>
            )}
          </div>
          <span className="text-slate-500 font-medium">
            {displayRole}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Avatar Preview Section */}
          <div className="flex items-center justify-center gap-8 py-2">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto rounded-full ring-2 ring-slate-200 overflow-hidden shadow-inner bg-slate-100">
                <img
                  src={currentAvatar}
                  alt="Ảnh hiện tại"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1.5">Ảnh hiện tại</span>
            </div>

            <div className="text-slate-400 font-bold text-lg">➔</div>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto rounded-full ring-4 ring-indigo-500/40 overflow-hidden shadow-md bg-slate-100">
                <img
                  src={previewUrl || (activeTab === 'url' && customUrlInput) || currentAvatar}
                  alt="Ảnh mới dự kiến"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = currentAvatar;
                  }}
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold block mt-1.5">Ảnh mới dự kiến</span>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              id="tab-upload-file"
              type="button"
              onClick={() => {
                setActiveTab('upload');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải từ máy (Google Drive)</span>
            </button>
            <button
              id="tab-upload-url"
              type="button"
              onClick={() => {
                setActiveTab('url');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'url'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Dán liên kết ảnh</span>
            </button>
            <button
              id="tab-upload-presets"
              type="button"
              onClick={() => {
                setActiveTab('presets');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'presets'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ảnh mẫu</span>
            </button>
          </div>

          {/* TAB 1: File Upload (Google Drive) */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/70 scale-[0.99]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                  {selectedFile ? (
                    <Check className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <CloudUpload className="w-6 h-6 text-indigo-600" />
                  )}
                </div>

                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Đã chọn: {selectedFile.name}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Kích thước: {(selectedFile.size / 1024).toFixed(1)} KB • Nhấn để chọn ảnh khác
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Kéo thả ảnh vào đây hoặc nhấp để duyệt file
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Hỗ trợ chụp từ camera điện thoại, JPG, PNG, WEBP (Tự động nén tối ưu)
                    </p>
                  </div>
                )}
              </div>

              {/* Cloud Drive Guarantee & Permission Guide Toggle */}
              <div className="space-y-2">
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed flex-1">
                    <span className="font-semibold">Lưu trữ ảnh trên Google Drive:</span> Ảnh được nén tự động và lưu vào thư mục <code className="px-1 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono">Avatar_HocSinh</code> trên Google Drive của giáo viên.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDriveGuide(!showDriveGuide)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 shrink-0 ml-1"
                  >
                    {showDriveGuide ? 'Ẩn hướng dẫn' : 'Xem hướng dẫn quyền Drive'}
                  </button>
                </div>

                {/* HƯỚNG DẪN CẤP QUYỀN GOOGLE DRIVE */}
                {(showDriveGuide || isDrivePermissionIssue) && (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Cách xử lý khi tải ảnh lên Google Drive báo lỗi:</span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-amber-900">
                      Google yêu cầu tài khoản Google của bạn cấp quyền <strong>Google Drive (DriveApp)</strong> cho Google Apps Script lần đầu tiên:
                    </p>

                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-amber-900 pl-1 font-normal">
                      <li>Mở Google Sheet lớp học &rarr; chọn menu <strong>Tiện ích mở rộng</strong> &rarr; <strong>Apps Script</strong>.</li>
                      <li>Tại ô chọn tên hàm (bên cạnh nút "Chạy"), chọn hàm: <code className="px-1.5 py-0.5 bg-amber-200/80 font-mono text-amber-950 rounded font-bold">capQuyenGoogleDriveVaSheet</code>.</li>
                      <li>Bấm nút <strong>▷ Chạy (Run)</strong> &rarr; chọn tài khoản của bạn &rarr; chọn <i>Nâng cao</i> &rarr; bấm <i>Đi tới... (không an toàn)</i> &rarr; chọn <strong>Cho phép (Allow)</strong>.</li>
                      <li>Bấm <strong>Triển khai</strong> &rarr; <strong>Quản lý bản triển khai</strong> &rarr; bấm biểu tượng cây bút ✏️ &rarr; chọn <i>Phiên bản mới</i> &rarr; bấm <strong>Triển khai</strong>.</li>
                    </ol>

                    <div className="pt-1 flex items-center justify-between border-t border-amber-200/60">
                      <span className="text-[11px] text-amber-800 italic">Mã hàm cấp quyền Drive chuẩn:</span>
                      <button
                        type="button"
                        onClick={copyDriveScript}
                        className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                      >
                        {copiedScript ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3 text-amber-800" />}
                        <span>{copiedScript ? 'Đã sao chép mã!' : 'Sao chép mã hàm'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Direct Image URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Đường dẫn liên kết hình ảnh trực tuyến (hoặc link Google Drive):
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => handleCustomUrlChange(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... hoặc https://example.com/photo.jpg"
                    className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* THÔNG BÁO TỰ ĐỘNG CHUYỂN LINK DRIVE */}
              {isConvertedFromDrive && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã tự động nhận diện và chuyển đổi link Google Drive sang định dạng hình ảnh trực tiếp (lh3 CDN)!</span>
                </div>
              )}

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
                <p className="font-semibold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cách lấy link ảnh từ Google Drive để dán vào đây:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-indigo-800">
                  1. Mở Google Drive, nhấp chuột phải vào ảnh &rarr; <strong>Chia sẻ</strong> &rarr; đổi quyền thành <em>"Bất kỳ ai có đường liên kết"</em> (Người xem).<br />
                  2. Bấm <strong>Sao chép đường liên kết</strong> và dán vào ô bên trên. Hệ thống sẽ tự động tối ưu hóa để hiển thị tức thì cho toàn bộ lớp!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Preset Avatars */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                Chọn nhanh một ảnh đại diện phù hợp:
              </p>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AVATARS.map((preset, idx) => {
                  const isSelected = previewUrl === preset.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPreviewUrl(preset.url);
                        setErrorMsg('');
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-0.5 ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-105 shadow-md'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback Direct Save Button when Upload to Drive encounters issue */}
          {failedUploadBase64 && errorMsg && (
            <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl space-y-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-xs text-indigo-900 font-bold">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Tùy chọn cứu cánh nhanh (Không lo gián đoạn):</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Ảnh đã được nén tối ưu. Bạn có thể lưu trực tiếp ảnh này vào hệ thống và đồng bộ ngay sang Google Sheet mà không cần chờ cấu hình quyền Drive.
              </p>
              <button
                type="button"
                onClick={handleSaveDirectFallback}
                disabled={isProcessing}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Trực Tiếp Vào App &amp; Đồng Bộ Google Sheet Ngay</span>
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setChangeAvatarModalOpen(false)}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            id="btn-confirm-save-avatar"
            type="button"
            onClick={handleSaveAvatar}
            disabled={isProcessing || (activeTab === 'upload' && !selectedFile) || (activeTab === 'url' && !customUrlInput)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu lên Google Drive...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>Lưu &amp; Đồng Bộ Google Drive</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
