import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Check,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Award,
  Sparkles,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Key,
  Link,
  Code,
  Copy,
  ExternalLink,
  RefreshCw,
  Users,
  ShieldCheck,
  Building,
  GraduationCap,
  Download,
  CloudDownload,
  History,
  Trash2,
  Info,
  KeyRound,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  FileJson,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getGoogleAppsScriptTemplate } from '../../utils/googleSheetsSync';
import { canViewTargetAccountPin, isGuestUser } from '../../utils/permissionUtils';
import { BannerModal } from '../BannerModal';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    currentUserRole,
    classInfo,
    updateClassInfo,
    googleSheetsConfig,
    updateGoogleSheetsConfig,
    syncAllToGoogleSheets,
    testGoogleSheetsConnection,
    exportClassDataToExcel,
    clearAllStudents,
    exportStudentAccountsList,
    accounts,
    setAccountModalOpen,
    setGoogleSheetsModalOpen,
    setChangePasswordModalOpen,
    openLoginModal,
    cleanData,
    normalizeAndFixData,
    resetToDefaultData,
    clearAllOldBackgroundData,
    students,
    violations,
    attendance,
    rewards,
    backupGVCNData,
    exportDataToJson,
    importDataFromJson,
    restoreGVCNBackup,
    deleteGVCNBackup,
    gvcnBackupHistory,
    lastGVCNBackupAt,
    pullFromGoogleSheets,
  } = useApp();

  const [localSettings, setLocalSettings] = useState(settings);
  const [localClassInfo, setLocalClassInfo] = useState(classInfo);
  
  // Keep local state in sync when context changes
  useEffect(() => {
    setLocalClassInfo(classInfo);
  }, [classInfo]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  
  const [sheetInput, setSheetInput] = useState(googleSheetsConfig.spreadsheetUrl || googleSheetsConfig.spreadsheetId);
  const [apiKeyInput, setApiKeyInput] = useState(googleSheetsConfig.apiKey || '');
  const [appScriptInput, setAppScriptInput] = useState(googleSheetsConfig.appScriptUrl || '');
  const [autoSyncInput, setAutoSyncInput] = useState(googleSheetsConfig.autoSync ?? true);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [classInfoSaved, setClassInfoSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);

  // Clean data modal / confirmation state
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingStudents, setIsClearingStudents] = useState(false);

  const handleConfirmClearAllStudents = async () => {
    setIsClearingStudents(true);
    try {
      const res = await clearAllStudents();
      if (res.success) {
        setCleanFeedback(`Đã xóa sạch thành công toàn bộ ${res.count} học sinh khỏi danh sách lớp!`);
        setIsClearAllModalOpen(false);
        setTimeout(() => setCleanFeedback(null), 4000);
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Lỗi xóa danh sách học sinh: ' + (err.message || ''));
    } finally {
      setIsClearingStudents(false);
    }
  };

  const handleSaveClassInfoOnly = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateClassInfo(localClassInfo);
    setClassInfoSaved(true);
    setTimeout(() => setClassInfoSaved(false), 3500);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(localSettings);
    updateClassInfo(localClassInfo);

    let cleanId = sheetInput.trim();
    let url = sheetInput.trim();
    if (sheetInput.includes('spreadsheets/d/')) {
      const match = sheetInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }
    } else if (!sheetInput.startsWith('http')) {
      cleanId = sheetInput;
      url = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
    }

    updateGoogleSheetsConfig({
      spreadsheetId: cleanId,
      spreadsheetUrl: url,
      apiKey: apiKeyInput.trim(),
      appScriptUrl: appScriptInput.trim(),
      autoSync: autoSyncInput,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    const res = await testGoogleSheetsConnection();
    setTesting(false);
    setSyncFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const res = await syncAllToGoogleSheets();
    setSyncing(false);
    setSyncFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleBackupGVCN = async (withExcel: boolean = false) => {
    setBackingUp(true);
    setSyncFeedback({
      type: 'success',
      text: 'Đang tiến hành sao lưu dữ liệu cho GVCN (Lưu Snapshot & Sheet ThongTinLop_GVCN)...',
    });
    const res = await backupGVCNData({ exportExcel: withExcel, note: 'Sao lưu GVCN từ trang Cài đặt' });
    setBackingUp(false);
    setSyncFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  const handlePullData = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn gọi lại dữ liệu từ Google Sheets về ứng dụng? Dữ liệu hiện tại sẽ được cập nhật từ Sheet (hệ thống sẽ tự động lưu một bản sao lưu an toàn trước khi nạp).')) {
      return;
    }
    setPulling(true);
    setSyncFeedback({
      type: 'success',
      text: 'Đang gọi lại dữ liệu từ Google Sheets (đọc sheet ThongTinLop_GVCN và các sheet)...',
    });
    const res = await pullFromGoogleSheets();
    setPulling(false);
    setSyncFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  const handleRestoreSnapshot = (id: string) => {
    if (window.confirm('Bạn có chắc muốn khôi phục dữ liệu từ bản sao lưu này?')) {
      const res = restoreGVCNBackup(id);
      setSyncFeedback({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const [jsonExporting, setJsonExporting] = useState(false);

  const handleExportJson = () => {
    setJsonExporting(true);
    const res = exportDataToJson();
    setJsonExporting(false);
    setSyncFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Bạn có chắc chắn muốn nạp dữ liệu từ tệp "${file.name}"? Dữ liệu toàn bộ lớp học sẽ được cập nhật đồng bộ (hệ thống sẽ tự động tạo một bản sao lưu an toàn trước khi nạp).`)) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setSyncFeedback({ type: 'error', text: 'Tệp JSON rỗng, không thể nạp!' });
          return;
        }
        const res = importDataFromJson(text);
        setSyncFeedback({
          type: res.success ? 'success' : 'error',
          text: res.message,
        });
        setTimeout(() => setSyncFeedback(null), 6000);
      } catch (err: any) {
        setSyncFeedback({
          type: 'error',
          text: 'Lỗi khi đọc tệp JSON: ' + (err.message || 'Tệp không hợp lệ'),
        });
        setTimeout(() => setSyncFeedback(null), 6000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(getGoogleAppsScriptTemplate());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleResetDefaults = () => {
    const defaults = {
      baseScore: 100,
      penaltyLight: -2,
      penaltyMedium: -4,
      penaltyHeavy: -6,
      penaltySevere: -10,
      bonusGoodDeed: 5,
      bonusGoodScore: 3,
      bonusDutyExcel: 2,
      bonusCompetition: 10,
      warningAbsenceThreshold: 3,
      warningViolationThreshold: 3,
      warningScoreThreshold: 85,
    };
    setLocalSettings(defaults);
    updateSettings(defaults);
  };

  const isGVCN = currentUserRole.role === 'gvcn';
  if (!isGVCN) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Khu vực dành riêng cho Giáo viên Chủ nhiệm</h2>
        <p className="text-sm text-slate-500">
          Chỉ có tài khoản Giáo viên Chủ nhiệm (GVCN) mới có quyền truy cập và cấu hình mục Cài đặt này. Khách và học sinh chỉ có quyền xem thông tin chung.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Cấu Hình Toàn Diện Hệ Thống & Google Sheets</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Lớp {classInfo.className}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý khóa API Google cá nhân, liên kết Google Sheets 13 bảng, tài khoản cán sự và sao lưu dữ liệu GVCN
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            title="Đặt lại mức điểm gốc và thang điểm thưởng / phạt về mặc định ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục quy chế</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            title="Lưu toàn bộ cài đặt hệ thống và cấu hình Google Sheets"
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Đã Lưu Thành Công!' : 'Lưu Tất Cả Cấu Hình'}</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
          syncFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{syncFeedback.text}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold">X</button>
        </div>
      )}

      {/* DEDICATED GVCN BACKUP & RESTORE CENTER */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-700/50 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-800/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/30 border border-indigo-400/40 rounded-xl text-indigo-300">
              <Save className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Trung Tâm Sao Lưu & Phục Hồi Dữ Liệu GVCN
                </h3>
                <span className="text-[11px] bg-indigo-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Sheet ThongTinLop_GVCN & File JSON
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Tạo bản lưu trữ chuyên biệt thông tin Lớp học & GVCN trên Google Sheets hoặc tải File JSON về máy tính để sao lưu và bảo vệ dữ liệu vĩnh viễn 100%
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBackupGVCN(false)}
              disabled={backingUp}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${backingUp ? 'animate-spin' : ''}`} />
              <span>{backingUp ? 'Đang sao lưu...' : 'Sao Lưu Dữ Liệu Ngay'}</span>
            </button>
            <button
              type="button"
              onClick={handlePullData}
              disabled={pulling}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <CloudDownload className={`w-4 h-4 ${pulling ? 'animate-spin' : ''}`} />
              <span>{pulling ? 'Đang gọi lại...' : 'Gọi Lại Dữ Liệu Từ Sheet'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={jsonExporting}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              title="Lưu toàn bộ thông tin lớp học thành file JSON tải về máy"
            >
              <FileJson className="w-4 h-4" />
              <span>Lưu File JSON</span>
            </button>
            <label
              className="px-3 py-2 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 font-semibold rounded-xl text-xs flex items-center gap-1 border border-indigo-600/60 transition-colors cursor-pointer"
              title="Phục hồi toàn bộ thông tin lớp học từ file JSON đã lưu"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Khôi Phục JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => handleBackupGVCN(true)}
              disabled={backingUp}
              className="px-3 py-2 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-200 font-semibold rounded-xl text-xs flex items-center gap-1 border border-indigo-600/60 transition-colors disabled:opacity-50"
              title="Sao lưu và xuất file Excel 13 sheet dự phòng"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel Dự Phòng</span>
            </button>
          </div>
        </div>

        {/* Current Class Info Glance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/50">
            <span className="text-indigo-300 block text-[11px]">Lớp đang quản lý:</span>
            <strong className="text-white text-sm">{classInfo.className} ({classInfo.gradeLevel})</strong>
          </div>
          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/50">
            <span className="text-indigo-300 block text-[11px]">Giáo viên chủ nhiệm:</span>
            <strong className="text-white text-sm">{classInfo.homeroomTeacher || 'Chưa đặt'}</strong>
          </div>
          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/50">
            <span className="text-indigo-300 block text-[11px]">Sĩ số hiện tại:</span>
            <strong className="text-white text-sm">{students.length} học sinh (4 tổ)</strong>
          </div>
          <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/50">
            <span className="text-indigo-300 block text-[11px]">Lần sao lưu gần nhất:</span>
            <strong className="text-amber-300 text-xs">
              {lastGVCNBackupAt ? new Date(lastGVCNBackupAt).toLocaleString('vi-VN') : 'Chưa có'}
            </strong>
          </div>
        </div>

        {/* Backup History Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-200 flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-400" />
              Lịch sử các bản sao lưu an toàn của GVCN ({gvcnBackupHistory.length})
            </span>
            <span className="text-indigo-300/70 text-[11px]">
              Tự động tạo bản lưu khi bấm Sao Lưu hoặc Gọi Lại Dữ Liệu
            </span>
          </div>

          {gvcnBackupHistory.length === 0 ? (
            <div className="p-3.5 bg-indigo-950/40 rounded-xl border border-dashed border-indigo-800 text-center text-xs text-indigo-300/70">
              Chưa có bản ghi sao lưu nào. Hãy bấm nút <strong>Sao Lưu Dữ Liệu Ngay</strong> để tạo bản lưu an toàn đầu tiên!
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {gvcnBackupHistory.slice(0, 6).map((snapshot, idx) => (
                <div
                  key={`${snapshot.id || 'snapshot'}-${idx}`}
                  className="p-2.5 bg-indigo-950/50 border border-indigo-800/60 rounded-xl flex items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-white">{snapshot.classInfo?.className || 'Lớp'}</strong>
                      <span className="text-indigo-400">•</span>
                      <span className="text-indigo-200">GVCN: {snapshot.classInfo?.homeroomTeacher || 'N/A'}</span>
                      <span className="text-[10px] bg-indigo-800 text-indigo-200 px-1.5 py-0.5 rounded font-mono">
                        {snapshot.studentsCount} học sinh
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-300/80 flex items-center gap-2">
                      <span>{new Date(snapshot.timestamp).toLocaleString('vi-VN')}</span>
                      <span>•</span>
                      <span className="italic">{snapshot.note}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snapshot.id)}
                      className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded text-xs flex items-center gap-1 transition-colors shadow-2xs"
                      title="Khôi phục trạng thái lớp này"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Khôi phục
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `SaoLuu_GVCN_${snapshot.className || 'Class'}_${snapshot.id}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="p-1 text-indigo-300 hover:text-amber-300 hover:bg-indigo-800/50 rounded transition-colors"
                      title="Tải bản sao lưu này thành file JSON"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGVCNBackup(snapshot.id)}
                      className="p-1 text-indigo-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition-colors"
                      title="Xóa bản lưu này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: GOOGLE SHEETS & PERSONAL API INTEGRATION */}
      <div className="bg-white p-6 rounded-2xl border border-emerald-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Liên Kết Google Sheets & Khóa API Cá Nhân
                <span className="text-[10px] bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full">
                  13 Bảng Dữ Liệu
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                  ThongTinLop_GVCN
                </span>
              </h3>
              <p className="text-xs text-slate-500">Tự động đồng bộ toàn bộ tài khoản, học sinh, điểm danh, nề nếp và thông tin Lớp - GVCN vào Google Sheet</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-blue-200"
              title="Kiểm tra kết nối với Google Sheet của bạn"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs"
              title="Đồng bộ ngay dữ liệu lên Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Đang gửi...' : 'Đồng bộ ngay'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Spreadsheet URL */}
          <div className="space-y-1 md:col-span-2">
            <label className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Đường dẫn (URL) hoặc Spreadsheet ID của Google Sheet:</span>
              {googleSheetsConfig.spreadsheetUrl && (
                <a
                  href={googleSheetsConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  Mở trang tính trên Google Drive
                </a>
              )}
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={sheetInput}
                onChange={e => setSheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv.../edit"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Bạn chỉ cần tạo một file Google Sheet mới và dán đường link vào đây.
            </p>
          </div>

          {/* Personal API Key */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800">
              Khóa API Cá Nhân (Google Cloud Sheets API Key - Tùy chọn):
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSyA_vdX9r..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Dùng để tra cứu và đọc dữ liệu nhanh trực tiếp từ Google Sheets API v4.
            </p>
          </div>

          {/* Apps Script URL */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800">
              URL Web App Google Apps Script (Ghi 12 Sheet tự động):
            </label>
            <div className="relative">
              <Code className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={appScriptInput}
                onChange={e => setAppScriptInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              URL triển khai Web App để nhận và ghi đồng thời 12 sheet với màu sắc định dạng đẹp.
            </p>
          </div>
        </div>

        {/* Quick Apps Script Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-indigo-600" />
              Mã Google Apps Script tự động tạo 12 Sheet
            </span>
            <button
              type="button"
              onClick={handleCopyScript}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-[11px] flex items-center gap-1 transition-colors"
            >
              {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedCode ? 'Đã sao chép!' : 'Sao chép mã'}
            </button>
          </div>
          <p className="text-slate-500 text-[11px]">
            Trong Google Sheet: Chọn <strong>Tiện ích mở rộng &rarr; Apps Script</strong> &rarr; Dán mã này &rarr; Bấm <strong>Triển khai (Deploy) dưới dạng Ứng dụng web (Web App)</strong> với quyền "Bất kỳ ai (Anyone)".
          </p>
        </div>
      </div>

      {/* SECTION 2: CLASS INFORMATION & TEACHER PROFILE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Thông Tin Lớp Học & Giáo Viên Chủ Nhiệm</h3>
              <p className="text-xs text-slate-500">Tự động đồng bộ tên lớp, GVCN và các trường thông tin đến toàn bộ ứng dụng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {classInfoSaved && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Đã đồng bộ thông tin Lớp & GVCN!
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveClassInfoOnly}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Cập nhật thông tin</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên trường:</label>
            <input
              type="text"
              value={localClassInfo.schoolName || ''}
              onChange={e => setLocalClassInfo({ ...localClassInfo, schoolName: e.target.value })}
              placeholder="VD: Trường THPT Chuyên..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Khối lớp:</label>
            <select
              value={localClassInfo.gradeLevel || 'Khối 11'}
              onChange={e => setLocalClassInfo({ ...localClassInfo, gradeLevel: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-900"
            >
              <option value="Khối 10">Khối 10</option>
              <option value="Khối 11">Khối 11</option>
              <option value="Khối 12">Khối 12</option>
              <option value="Khối 6">Khối 6</option>
              <option value="Khối 7">Khối 7</option>
              <option value="Khối 8">Khối 8</option>
              <option value="Khối 9">Khối 9</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên lớp:</label>
            <input
              type="text"
              value={localClassInfo.className}
              onChange={e => setLocalClassInfo({ ...localClassInfo, className: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:ring-2 focus:ring-blue-400 rounded-lg font-bold text-blue-900 text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Học kỳ & Năm học:</label>
            <div className="grid grid-cols-2 gap-1">
              <select
                value={localClassInfo.semester || 'Học kỳ I'}
                onChange={e => setLocalClassInfo({ ...localClassInfo, semester: e.target.value })}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
              >
                <option value="Học kỳ I">Học kỳ I</option>
                <option value="Học kỳ II">Học kỳ II</option>
                <option value="Cả năm">Cả năm</option>
              </select>
              <input
                type="text"
                value={localClassInfo.schoolYear}
                onChange={e => setLocalClassInfo({ ...localClassInfo, schoolYear: e.target.value })}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Họ tên GVCN:</label>
            <input
              type="text"
              value={localClassInfo.homeroomTeacher}
              onChange={e => setLocalClassInfo({ ...localClassInfo, homeroomTeacher: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:ring-2 focus:ring-blue-400 rounded-lg font-bold text-blue-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Số điện thoại GVCN:</label>
            <input
              type="text"
              value={localClassInfo.teacherPhone}
              onChange={e => setLocalClassInfo({ ...localClassInfo, teacherPhone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email GVCN:</label>
            <input
              type="text"
              value={localClassInfo.teacherEmail}
              onChange={e => setLocalClassInfo({ ...localClassInfo, teacherEmail: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phòng học:</label>
            <input
              type="text"
              value={localClassInfo.roomNumber}
              onChange={e => setLocalClassInfo({ ...localClassInfo, roomNumber: e.target.value })}
              placeholder="VD: Phòng 302 - Nhà A"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">Khẩu hiệu / Mục tiêu lớp:</label>
            <input
              type="text"
              value={localClassInfo.motto}
              onChange={e => setLocalClassInfo({ ...localClassInfo, motto: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
            />
          </div>

          {/* Banner Trang chủ */}
          <div className="sm:col-span-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {localClassInfo.bannerUrl ? (
                  <div className="w-20 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs relative group">
                    <img 
                      src={localClassInfo.bannerUrl} 
                      alt="Banner lớp" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ) : (
                  <div className="w-20 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>Ảnh Banner Trang Chủ</span>
                    {localClassInfo.bannerUrl ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-200">
                        Đang có ảnh
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-1.5 py-0.2 rounded-full">
                        Màu mặc định
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ảnh hiển thị ở đầu bảng điều khiển Trang chủ của lớp {localClassInfo.className}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{localClassInfo.bannerUrl ? 'Đổi ảnh banner' : 'Tải / Chọn ảnh banner'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2.5: DATA CLEANING & STREAMLINING */}
      <div className="bg-white p-6 rounded-2xl border border-indigo-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Làm Sạch & Thông Suốt Dữ Liệu Lớp Học
                <span className="text-[10px] bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded-full">
                  Bảo Trì Dữ Liệu
                </span>
              </h3>
              <p className="text-xs text-slate-500">Chuẩn hóa tên viết hoa, kiểm tra phân tổ (1-4), loại bỏ vi phạm trùng lặp và làm thông suốt hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const res = normalizeAndFixData();
                setCleanFeedback(res.message);
                setTimeout(() => setCleanFeedback(null), 5000);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chuẩn Hóa & Làm Sạch Tức Thì</span>
            </button>
          </div>
        </div>

        {cleanFeedback && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-semibold flex items-center justify-between">
            <span>✨ {cleanFeedback}</span>
            <button onClick={() => setCleanFeedback(null)} className="text-indigo-400 hover:text-indigo-700 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Data summary badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] text-slate-500 font-semibold">Sĩ Số Học Sinh</p>
            <p className="text-base font-black text-slate-900 mt-0.5">{students.length} HS</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] text-slate-500 font-semibold">Bản Ghi Điểm Danh</p>
            <p className="text-base font-black text-slate-900 mt-0.5">{attendance.length} lượt</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] text-slate-500 font-semibold">Ghi Nhận Khen Thưởng</p>
            <p className="text-base font-black text-emerald-600 mt-0.5">{rewards.length} hoa điểm 10</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[11px] text-slate-500 font-semibold">Ghi Nhận Vi Phạm</p>
            <p className="text-base font-black text-rose-600 mt-0.5">{violations.length} trường hợp</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn xóa tất cả vi phạm để bắt đầu một chu kỳ thi đua mới?')) {
                cleanData({ clearViolations: true });
                setCleanFeedback('Đã làm sạch toàn bộ dữ liệu vi phạm cũ thành công!');
                setTimeout(() => setCleanFeedback(null), 4000);
              }
            }}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-xs transition-colors"
          >
            Làm sạch Vi phạm thi đua
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn xóa dữ liệu điểm danh cũ?')) {
                cleanData({ clearAttendance: true });
                setCleanFeedback('Đã xóa dữ liệu điểm danh cũ!');
                setTimeout(() => setCleanFeedback(null), 4000);
              }
            }}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold rounded-lg text-xs transition-colors"
          >
            Làm sạch Điểm danh cũ
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Khôi phục toàn bộ hệ thống về dữ liệu mẫu chuẩn ban đầu? Mọi chỉnh sửa sẽ được đặt lại.')) {
                resetToDefaultData();
                setCleanFeedback('Đã khôi phục toàn bộ hệ thống về dữ liệu gốc ban đầu thành công!');
                setTimeout(() => setCleanFeedback(null), 4000);
              }
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs transition-colors"
          >
            Khôi phục dữ liệu mẫu gốc
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu nền cũ để bắt đầu với một lớp học hoàn toàn mới và sạch sẽ (0 học sinh)?')) {
                clearAllOldBackgroundData();
                setCleanFeedback('Đã xóa sạch toàn bộ dữ liệu nền cũ thành công! Hệ thống sẵn sàng cho lớp học mới.');
                setTimeout(() => setCleanFeedback(null), 5000);
              }
            }}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Xóa dữ liệu nền cũ (Lớp sạch)</span>
          </button>
          {currentUserRole.role === 'gvcn' && (
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-xs ml-auto"
              title="Xóa sạch toàn bộ danh sách học sinh để làm mới hoặc nhập lại từ đầu"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa sạch danh sách học sinh ({students.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: ACCOUNTS & ROLES OVERVIEW */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* BANNER XUẤT TÀI KHOẢN & MẬT KHẨU CHO HỌC SINH */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 rounded-2xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0 shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">Xuất Danh Sách Lớp, Tài Khoản & Mật Khẩu</h4>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {students.length} Học sinh
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                Tải về file Excel chứa đầy đủ Họ tên, Mã HS, Tổ, Chức vụ, Tài khoản đăng nhập (Username), Mật khẩu (PIN ban đầu hoặc mật khẩu đã đổi mới), và Phiếu in phát cho từng học sinh để đăng nhập hệ thống.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={exportStudentAccountsList}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/25 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Xuất File Excel Tài Khoản & Mật Khẩu</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Danh Sách Tài Khoản & Bảo Mật Mật Khẩu</h3>
              <p className="text-xs text-slate-500">Bảo mật đa tầng: Học sinh không xem/sửa được mật khẩu của nhau</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isGuestUser(currentUserRole.role) && (
              <button
                type="button"
                onClick={() => setChangePasswordModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                Đổi mật khẩu / PIN
              </button>
            )}
            <button
              type="button"
              onClick={() => setAccountModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Trung tâm tài khoản ({accounts.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {accounts.slice(0, 6).map(acc => {
            const hasPinAccess = canViewTargetAccountPin(currentUserRole, acc.id);
            const isCurrent = currentUserRole.name === acc.fullName;

            return (
              <div
                key={acc.id}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  isCurrent ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/30' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <img
                  src={acc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={acc.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 truncate">{acc.fullName}</span>
                    {isCurrent && (
                      <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                        Bạn
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-indigo-600 font-medium truncate">{acc.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center justify-between">
                    <span>User: <strong className="text-slate-700">{acc.username}</strong></span>
                    <span>PIN: <strong className="text-slate-700">{hasPinAccess ? acc.pin : '••••'}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: COMPETITION SCORING RULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Điểm gốc & Điểm trừ vi phạm */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-slate-900 text-sm">Điểm Gốc & Mức Trừ Vi Phạm</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điểm gốc đầu tuần / đầu tháng</label>
              <input
                type="number"
                value={localSettings.baseScore}
                onChange={e => setLocalSettings({ ...localSettings, baseScore: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vi phạm Nhẹ (Điểm trừ)</label>
                <input
                  type="number"
                  value={localSettings.penaltyLight}
                  onChange={e => setLocalSettings({ ...localSettings, penaltyLight: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-rose-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vi phạm Vừa (Điểm trừ)</label>
                <input
                  type="number"
                  value={localSettings.penaltyMedium}
                  onChange={e => setLocalSettings({ ...localSettings, penaltyMedium: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-rose-600 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vi phạm Nặng (Điểm trừ)</label>
                <input
                  type="number"
                  value={localSettings.penaltyHeavy}
                  onChange={e => setLocalSettings({ ...localSettings, penaltyHeavy: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-rose-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vi phạm Rất nặng (Điểm trừ)</label>
                <input
                  type="number"
                  value={localSettings.penaltySevere}
                  onChange={e => setLocalSettings({ ...localSettings, penaltySevere: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-rose-600 font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Điểm cộng khen thưởng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Điểm Cộng Khen Thưởng & Việc Tốt</h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hoa điểm 9 - 10</label>
                <input
                  type="number"
                  value={localSettings.bonusGoodScore}
                  onChange={e => setLocalSettings({ ...localSettings, bonusGoodScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Việc tốt / Giúp bạn</label>
                <input
                  type="number"
                  value={localSettings.bonusGoodDeed}
                  onChange={e => setLocalSettings({ ...localSettings, bonusGoodDeed: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-emerald-600 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trực nhật Xuất sắc</label>
                <input
                  type="number"
                  value={localSettings.bonusDutyExcel}
                  onChange={e => setLocalSettings({ ...localSettings, bonusDutyExcel: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giải Phong trào / Thể thao</label>
                <input
                  type="number"
                  value={localSettings.bonusCompetition}
                  onChange={e => setLocalSettings({ ...localSettings, bonusCompetition: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-emerald-600 font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL XÁC NHẬN XÓA SẠCH DANH SÁCH HỌC SINH */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa sạch danh sách học sinh</h3>
                <p className="text-rose-600 font-semibold text-[11px]">Thao tác bảo mật cao của GVCN</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-900 text-xs leading-relaxed space-y-2">
              <p>
                Bạn đang chuẩn bị <strong>XÓA SẠCH TOÀN BỘ {students.length} HỌC SINH</strong> cùng tất cả tài khoản học sinh khỏi lớp <strong>{classInfo.className}</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-rose-800 font-medium text-[11px]">
                <li>Toàn bộ dữ liệu điểm danh, vi phạm, khen thưởng, học tập của học sinh sẽ được dọn dẹp.</li>
                <li>Tài khoản GVCN được bảo toàn tuyệt đối.</li>
                <li>Hệ thống sẽ <strong>tự động tạo một bản sao lưu an toàn</strong> trước khi xóa để bạn có thể khôi phục bất cứ lúc nào.</li>
              </ul>
            </div>

            <p className="text-slate-500 text-[11px] italic text-center">
              Sau khi xóa sạch, bạn có thể thêm lại học sinh mới hoặc nhập danh sách học sinh mới từ file Excel.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isClearingStudents}
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isClearingStudents}
                onClick={handleConfirmClearAllStudents}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                {isClearingStudents ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa sạch...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận XÓA SẠCH</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cài đặt Banner */}
      <BannerModal
        isOpen={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
      />
    </div>
  );
};

