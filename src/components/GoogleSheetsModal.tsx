import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  Key,
  Link,
  Layers,
  Database,
  Code,
  ShieldCheck,
  X,
  ChevronRight,
  Info,
  Save,
  RotateCcw,
  Sparkles,
  History,
  Trash2,
  CloudDownload
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getGoogleAppsScriptTemplate } from '../utils/googleSheetsSync';
import { isHomeroomTeacher } from '../utils/permissionUtils';

export const GoogleSheetsModal: React.FC = () => {
  const {
    googleSheetsModalOpen,
    setGoogleSheetsModalOpen,
    currentUserRole,
    googleSheetsConfig,
    updateGoogleSheetsConfig,
    syncAllToGoogleSheets,
    pullFromGoogleSheets,
    testGoogleSheetsConnection,
    exportClassDataToExcel,
    classInfo,
    backupGVCNData,
    restoreGVCNBackup,
    deleteGVCNBackup,
    gvcnBackupHistory,
    lastGVCNBackupAt,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'config' | 'guide' | 'sheets' | 'backup'>('config');
  const [sheetInput, setSheetInput] = useState(googleSheetsConfig.spreadsheetUrl || googleSheetsConfig.spreadsheetId);
  const [apiKeyInput, setApiKeyInput] = useState(googleSheetsConfig.apiKey || '');
  const [appScriptInput, setAppScriptInput] = useState(googleSheetsConfig.appScriptUrl || '');
  const [autoSyncInput, setAutoSyncInput] = useState(googleSheetsConfig.autoSync ?? true);

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!googleSheetsModalOpen || !isHomeroomTeacher(currentUserRole.role)) return null;

  const handleSaveConfig = () => {
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

    setFeedback({
      type: 'success',
      text: 'Đã lưu cấu hình Google Sheets thành công!',
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleTest = async () => {
    handleSaveConfig();
    setTesting(true);
    setFeedback({ type: 'info', text: 'Đang kiểm tra kết nối Google Sheets...' });
    const result = await testGoogleSheetsConnection();
    setTesting(false);
    setFeedback({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
  };

  const handleSyncNow = async () => {
    handleSaveConfig();
    setSyncing(true);
    setFeedback({ type: 'info', text: 'Đang đồng bộ toàn bộ 13 Sheet lên Google Sheets...' });
    const res = await syncAllToGoogleSheets();
    setSyncing(false);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleBackupGVCN = async (withExcel: boolean = false) => {
    handleSaveConfig();
    setBackingUp(true);
    setFeedback({ type: 'info', text: 'Đang tiến hành sao lưu dữ liệu cho GVCN (Lưu Snapshot & Sheet ThongTinLop_GVCN)...' });
    const res = await backupGVCNData({ exportExcel: withExcel, note: `Sao lưu GVCN qua giao diện Google Sheets` });
    setBackingUp(false);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handlePullData = async () => {
    handleSaveConfig();
    if (!window.confirm('Bạn có muốn tải toàn bộ dữ liệu từ Google Sheet về ứng dụng? Dữ liệu trên Google Sheet sẽ được lấy LÀM CHUẨN để cập nhật vào ứng dụng (hệ thống sẽ tự động sao lưu một bản dự phòng trước khi nạp).')) {
      return;
    }
    setPulling(true);
    setFeedback({ type: 'info', text: 'Đang tải dữ liệu chuẩn từ Google Sheet (đọc toàn bộ 13 sheet)...' });
    const res = await pullFromGoogleSheets();
    setPulling(false);
    setFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleRestoreSnapshot = (id: string) => {
    if (window.confirm('Bạn có chắc muốn khôi phục dữ liệu từ bản sao lưu này?')) {
      const res = restoreGVCNBackup(id);
      setFeedback({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
    }
  };

  const handleCopyScript = () => {
    const code = getGoogleAppsScriptTemplate();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const sheetList = [
    { 
      key: 'thongTinLopGVCN', 
      name: '★ ThongTinLop_GVCN (Chuyên biệt)', 
      desc: 'Lưu trữ thông tin Lớp học & GVCN chuẩn xác 100% để sao lưu và gọi lại dữ liệu',
      isNew: true,
      color: 'border-blue-300 bg-blue-50/70 text-blue-900'
    },
    { key: 'taiKhoan', name: '1. TaiKhoan', desc: 'Tài khoản & phân quyền GVCN, Ban cán sự, Tổ trưởng' },
    { key: 'thongTinLop', name: '2. ThongTinLop', desc: 'Sĩ số, GVCN, ban cán sự, chỉ tiêu, khẩu hiệu lớp' },
    { key: 'danhSachLop', name: '3. DanhSachLop', desc: 'Danh sách toàn bộ học sinh, tổ, chức vụ, liên hệ' },
    { key: 'diemDanh', name: '4. DiemDanh', desc: 'Nhật ký chuyên cần, đúng giờ, vắng phép/không phép' },
    { key: 'viPham', name: '5. ViPham', desc: 'Sổ ghi nhận lỗi, mức phạt điểm và khắc phục' },
    { key: 'khenThuong', name: '6. KhenThuong', desc: 'Sổ tuyên dương, việc tốt, thành tích, điểm cộng' },
    { key: 'hocTap', name: '7. HocTap', desc: 'Tiết học Tốt, kiểm tra miệng, điểm 9-10, bài tập' },
    { key: 'trucNhat', name: '8. TrucNhat', desc: 'Lịch phân công nhật ký trực nhật các tổ' },
    { key: 'laoDong', name: '9. LaoDong', desc: 'Buổi lao động vệ sinh khuôn viên trường' },
    { key: 'ngoaiKhoa', name: '10. NgoaiKhoa', desc: 'Phong trào văn nghệ, thể thao, báo tường, CLB' },
    { key: 'tuDanhGia', name: '11. TuDanhGia', desc: 'Bản tự chấm điểm rèn luyện & nhận xét hàng tuần' },
    { key: 'tongHopThiDua', name: '12. TongHopThiDua', desc: 'Bảng xếp hạng tổng hợp cá nhân & 4 tổ tuần' },
    { 
      key: 'giaiTriTichDiem', 
      name: '13. GiaiTri_TichDiem (Mới)', 
      desc: 'Lưu điểm thử thách hàng ngày, streak chuỗi ngày, phần thưởng tích lũy & lịch sử chơi trò chơi',
      isNew: true,
      color: 'border-emerald-300 bg-emerald-50/70 text-emerald-900'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-800/80 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Liên kết & Đồng bộ Google Sheets
                <span className="text-xs bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  13 Sheet đa nhiệm
                </span>
              </h2>
              <p className="text-xs text-emerald-100">
                Lưu trữ vĩnh viễn toàn bộ dữ liệu lớp {classInfo.className} trên bảng tính Google cá nhân
              </p>
            </div>
          </div>
          <button
            onClick={() => setGoogleSheetsModalOpen(false)}
            className="text-emerald-200 hover:text-white p-2 rounded-lg hover:bg-emerald-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            Cài đặt API & Kết nối
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Save className="w-4 h-4 text-indigo-600" />
            <span>Sao Lưu & Gọi Lại Dữ Liệu GVCN</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
              ThongTinLop_GVCN
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'sheets'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Cấu trúc 13 Trang tính (Sheets)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-4 h-4" />
            Mã Google Apps Script & Hướng dẫn
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {feedback && (
            <div
              className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {feedback.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {feedback.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {feedback.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />}
              <span className="font-medium">{feedback.text}</span>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Field 1: Spreadsheet URL / ID */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Đường dẫn (URL) hoặc Spreadsheet ID của Google Sheet:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={sheetInput}
                      onChange={e => setSheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv.../edit hoặc ID"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  {googleSheetsConfig.spreadsheetUrl && (
                    <a
                      href={googleSheetsConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                      title="Mở Google Sheet trên tab mới"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Mở Sheet
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn có thể tạo một bảng tính Google Sheets mới trắng, chia sẻ quyền Chỉnh sửa (Editor) rồi dán URL vào đây.
                </p>
              </div>

              {/* Field 2: Personal Google API Key */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Khóa API Cá nhân (Google Cloud API Key - Tùy chọn):
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSyA_vdX9r..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Dùng để truy vấn đọc dữ liệu tốc độ cao trực tiếp từ Google Sheets API v4.
                </p>
              </div>

              {/* Field 3: Google Apps Script Web App URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-semibold text-slate-800">
                    URL Web App Google Apps Script (Khuyên dùng để ghi 12 Sheet tự động):
                  </label>
                  <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                    Ghi 12 Sheet 1-Click
                  </span>
                </div>
                <div className="relative">
                  <Code className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={appScriptInput}
                    onChange={e => setAppScriptInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Xem tab <strong>"Mã Google Apps Script & Hướng dẫn"</strong> để lấy mã nguồn miễn phí và cài đặt trong 1 phút.
                </p>
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Tự động đồng bộ khi có thay đổi</div>
                    <div className="text-xs text-slate-500">Chỉ gửi cập nhật lên Google Sheets khi có thay đổi thực tế (không chạy ngầm liên tục, dữ liệu lưu tức thì)</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncInput}
                    onChange={e => setAutoSyncInput(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Status info box */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Trạng thái kết nối: <strong>{googleSheetsConfig.syncStatus === 'success' ? 'Đã kết nối' : 'Sẵn sàng'}</strong></span>
                </div>
                <div>
                  Lần đồng bộ cuối: <strong>{googleSheetsConfig.lastSyncedAt ? new Date(googleSheetsConfig.lastSyncedAt).toLocaleString('vi-VN') : 'Chưa đồng bộ'}</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-5">
              {/* Feature highlight banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 p-4 rounded-xl text-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
                      <Save className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        Sao Lưu Dữ Liệu Dành Riêng Cho GVCN
                        <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                          Sheet ThongTinLop_GVCN
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600">
                        Lưu trữ và gọi lại dữ liệu Lớp học & GVCN chuẩn xác 100% giữa Ứng dụng và Google Sheets
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-100 shrink-0">
                    Lần sao lưu gần nhất:{' '}
                    <strong>
                      {lastGVCNBackupAt ? new Date(lastGVCNBackupAt).toLocaleString('vi-VN') : 'Chưa có bản lưu'}
                    </strong>
                  </div>
                </div>

                {/* Class & GVCN quick glance */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block text-[11px]">Lớp:</span>
                    <strong className="text-indigo-900 text-sm">{classInfo.className}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block text-[11px]">GVCN:</span>
                    <strong className="text-indigo-900 text-sm">{classInfo.homeroomTeacher || 'Chưa đặt'}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                    <strong className="text-slate-700">{classInfo.teacherPhone || 'Chưa có'}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block text-[11px]">Học kỳ & Năm:</span>
                    <strong className="text-slate-700">{classInfo.semester} - {classInfo.schoolYear}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-white border-2 border-indigo-200 rounded-xl space-y-3 flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div>
                    <div className="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                      <Save className="w-4 h-4 text-indigo-600" />
                      Sao Lưu Toàn Bộ Dữ Liệu Lớp & GVCN
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Tự động lưu bản Snapshot an toàn trong hệ thống và đẩy ngay lên Google Sheets (bao gồm sheet <strong>ThongTinLop_GVCN</strong>).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleBackupGVCN(false)}
                      disabled={backingUp}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                    >
                      <Save className={`w-4 h-4 ${backingUp ? 'animate-spin' : ''}`} />
                      {backingUp ? 'Đang sao lưu...' : 'Sao Lưu Dữ Liệu Ngay'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBackupGVCN(true)}
                      disabled={backingUp}
                      title="Sao lưu và đồng thời tải về file Excel dự phòng"
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs flex items-center gap-1 border border-indigo-200 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      + Excel
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white border-2 border-blue-200 rounded-xl space-y-3 flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div>
                    <div className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                      <CloudDownload className="w-4 h-4 text-blue-600" />
                      Gọi Lại Dữ Liệu Từ Google Sheets
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Đọc lại sheet <strong>ThongTinLop_GVCN</strong> và toàn bộ danh sách để phục hồi chuẩn xác thông tin Lớp học, GVCN về ứng dụng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePullData}
                    disabled={pulling}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  >
                    <CloudDownload className={`w-4 h-4 ${pulling ? 'animate-spin' : ''}`} />
                    {pulling ? 'Đang gọi lại dữ liệu...' : 'Gọi Lại Dữ Liệu Về Ứng Dụng'}
                  </button>
                </div>
              </div>

              {/* Explanatory notes */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Cơ chế lưu trữ & gọi lại chuẩn xác:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                  <li>
                    Sheet <strong>ThongTinLop_GVCN</strong> lưu dạng bảng 2 cột chuẩn khóa - giá trị (Key-Value) cho: Tên trường, Tên lớp, Khối, GVCN, SĐT, Email, Sĩ số, Phòng học, Học kỳ, Năm học, Khẩu hiệu lớp.
                  </li>
                  <li>
                    Khi GVCN bấm <strong>Gọi Lại Dữ Liệu</strong>, ứng dụng tự động phân tích sheet này và cập nhật tức thì vào bộ nhớ ứng dụng cùng các tài khoản cán sự liên quan.
                  </li>
                  <li>
                    Mỗi lần bấm sao lưu hoặc gọi lại, hệ thống luôn lưu một bản <strong>Snapshot dự phòng</strong> bên dưới để có thể khôi phục lại bất kỳ lúc nào nếu cần.
                  </li>
                </ul>
              </div>

              {/* Backup History Snapshots */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    Lịch Sử Các Bản Sao Lưu GVCN ({gvcnBackupHistory.length})
                  </span>
                  {gvcnBackupHistory.length > 0 && (
                    <span className="text-slate-400 text-[11px]">
                      Lưu trữ an toàn tại trình duyệt của GVCN
                    </span>
                  )}
                </div>

                {gvcnBackupHistory.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                    Chưa có bản sao lưu nào. Hãy bấm <strong>Sao Lưu Dữ Liệu Ngay</strong> để tạo bản ghi đầu tiên!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {gvcnBackupHistory.map((snapshot, idx) => (
                      <div
                        key={`${snapshot.id || 'snapshot'}-${idx}`}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 hover:border-indigo-300 transition-colors"
                      >
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800">{snapshot.classInfo?.className || 'Lớp học'}</strong>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">GVCN: {snapshot.classInfo?.homeroomTeacher || 'N/A'}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                              {snapshot.studentsCount} học sinh
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{new Date(snapshot.timestamp).toLocaleString('vi-VN')}</span>
                            <span>•</span>
                            <span className="italic">{snapshot.note}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreSnapshot(snapshot.id)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs flex items-center gap-1 border border-indigo-200 transition-colors"
                            title="Khôi phục trạng thái lớp này"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Khôi phục
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGVCNBackup(snapshot.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
          )}

          {activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Cấu trúc 13 Bảng Trang tính được đồng bộ</h3>
                  <p className="text-xs text-slate-500">Bao gồm sheet chuyên biệt ThongTinLop_GVCN và 12 sheet quản lý nghiệp vụ</p>
                </div>
                <button
                  onClick={exportClassDataToExcel}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải mẫu 13 Sheet (.xlsx)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sheetList.map(sheet => (
                  <div 
                    key={sheet.key} 
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      sheet.isNew 
                        ? 'border-blue-300 bg-blue-50/70 shadow-xs' 
                        : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg border font-bold text-xs shrink-0 ${
                      sheet.isNew ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-200 text-emerald-600'
                    }`}>
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span>{sheet.name}</span>
                        {sheet.isNew && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                            MỚI
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{sheet.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <Info className="w-4 h-4 text-amber-700" />
                  3 Bước tạo Google Apps Script Web App để nhận dữ liệu 13 Sheet:
                </div>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Mở file Google Sheet của bạn &rarr; Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &rarr; Chọn <strong>Apps Script</strong>.</li>
                  <li>Xóa toàn bộ mã cũ, dán đoạn mã bên dưới vào và bấm <strong>Lưu (Ctrl + S)</strong>.</li>
                  <li>Bấm <strong>Triển khai (Deploy)</strong> &rarr; <strong>Tùy chọn triển khai mới (New deployment)</strong> &rarr; Chọn loại <strong>Ứng dụng web (Web app)</strong> &rarr; Đặt mục "Ai có quyền truy cập" thành <strong>Bất kỳ ai (Anyone)</strong> &rarr; Bấm Triển khai & copy đường link dán vào mục <strong>URL Web App</strong> ở Tab Cài đặt!</li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between bg-slate-800 px-4 py-2 rounded-t-xl text-slate-200 text-xs font-mono">
                  <span>GoogleAppsScript_Code.gs</span>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-sans transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Đã sao chép!' : 'Sao chép mã'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-b-xl text-xs font-mono max-h-60 overflow-y-auto leading-relaxed">
                  {getGoogleAppsScriptTemplate()}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={exportClassDataToExcel}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Xuất Excel (13 Sheet)
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-2xs"
            >
              <ShieldCheck className={`w-4 h-4 text-blue-600 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Backup Button for GVCN */}
            <button
              onClick={() => handleBackupGVCN(false)}
              disabled={backingUp}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
              title="Sao lưu thông tin Lớp học & GVCN lên Google Sheet và lưu snapshot"
            >
              <Save className={`w-4 h-4 ${backingUp ? 'animate-spin' : ''}`} />
              <span>{backingUp ? 'Đang sao lưu...' : 'Sao Lưu Dữ Liệu GVCN'}</span>
            </button>

            <button
              onClick={handlePullData}
              disabled={pulling}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Tải toàn bộ dữ liệu từ Google Sheet về làm dữ liệu chuẩn cho ứng dụng"
            >
              <CloudDownload className={`w-4 h-4 ${pulling ? 'animate-spin' : ''}`} />
              <span>{pulling ? 'Đang tải...' : 'Tải Từ Sheet (Chuẩn GG Sheet)'}</span>
            </button>

            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              title="Lưu tất cả dữ liệu từ ứng dụng lên 13 Sheet trên Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Đang lưu...' : 'Lưu Lên Google Sheet (13 Sheet)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
