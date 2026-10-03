import React, { useState } from 'react';
import {
  BookOpen,
  X,
  GraduationCap,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  Key,
  Upload,
  Download,
  Search,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  HelpCircle,
  UserPlus,
  Sparkles,
  Award,
  ChevronRight,
  Printer,
  Smartphone,
  Laptop
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'gvcn' | 'cadre' | 'student' | 'faq'>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedZalo, setCopiedZalo] = useState(false);

  if (!isOpen) return null;

  const handleCopyZalo = () => {
    navigator.clipboard.writeText('0979466078');
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[92vh] max-h-[850px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 text-slate-800">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white p-4 sm:p-6 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/20 border border-white/25 text-xs font-bold text-sky-100 uppercase tracking-wider backdrop-blur-xs">
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                <span>Cẩm nang sử dụng ứng dụng Lớp Học Hạnh Phúc</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Hướng Dẫn Sử Dụng Chi Tiết</span>
                <span className="text-amber-300 text-sm font-semibold bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-300/40">
                  Phiên bản 2026
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
                Hướng dẫn đầy đủ từ các bước đăng nhập, thiết lập lớp, quản lý thi đua dành riêng cho GVCN, Ban Cán Sự và Học Sinh.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition-all border border-white/20"
                title="In tài liệu hướng dẫn"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Search bar inside header */}
          <div className="mt-4 relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nội dung (ví dụ: mật khẩu, tải excel, google sheet, tên đăng nhập...)"
              className="w-full pl-9 pr-4 py-1.5 bg-white/95 text-slate-900 placeholder:text-slate-500 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0 scrollbar-none text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('quickstart')}
            className={`py-2 px-3 sm:px-4 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'quickstart'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Bắt Đầu Nhanh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gvcn')}
            className={`py-2 px-3 sm:px-4 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'gvcn'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Dành Cho GVCN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cadre')}
            className={`py-2 px-3 sm:px-4 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'cadre'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-300" />
            <span>Ban Cán Sự & Sao Đỏ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`py-2 px-3 sm:px-4 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'student'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-yellow-300" />
            <span>Học Sinh & Phụ Huynh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`py-2 px-3 sm:px-4 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'faq'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Hỏi - Đáp & Hỗ Trợ</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-700 leading-relaxed text-xs sm:text-sm">
          
          {/* ========================================================================= */}
          {/* TAB 1: BẮT ĐẦU NHANH                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Chào mừng thầy cô và các em đến với ứng dụng Lớp Học Hạnh Phúc!</h3>
                  <p className="mt-1 text-slate-600">
                    Ứng dụng được thiết kế nhằm số hóa công tác chủ nhiệm, theo dõi thi đua, chấm điểm nề nếp, sơ đồ lớp và tạo động lực học tập tích cực cho học sinh.
                  </p>
                </div>
              </div>

              {/* 3 Core Roles Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <h4 className="font-extrabold text-blue-900 text-sm">Giáo Viên Chủ Nhiệm (GVCN)</h4>
                  <p className="text-slate-600 text-xs">
                    Toàn quyền thiết lập lớp, quản lý danh sách học sinh, phân công ban cán sự, cấu hình thang điểm thi đua và gắn link Google Sheet riêng của cá nhân.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('gvcn')}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 underline pt-1"
                  >
                    Xem chi tiết dành cho GVCN <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <h4 className="font-extrabold text-indigo-900 text-sm">Ban Cán Sự & Sao Đỏ</h4>
                  <p className="text-slate-600 text-xs">
                    Được cấp quyền ghi nhận điểm danh, trừ điểm vi phạm, cộng điểm việc tốt, chấm trực nhật, quản lý lao động và báo cáo tổng kết tuần theo phân công.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cadre')}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-1 underline pt-1"
                  >
                    Xem chi tiết cho Cán sự lớp <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <h4 className="font-extrabold text-emerald-900 text-sm">Học Sinh & Phụ Huynh</h4>
                  <p className="text-slate-600 text-xs">
                    Đăng nhập bằng Tên đăng nhập tự động (<strong>Tên không dấu + Mã HS</strong>), xem bảng xếp hạng thi đua, theo dõi lịch trực nhật, sơ đồ lớp và nộp tự đánh giá.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('student')}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 underline pt-1"
                  >
                    Xem chi tiết cho Học sinh <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 4 Golden Principles Highlight */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>4 Nguyên Tắc Vàng Cần Nắm Rõ</span>
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span><strong>Mỗi GVCN có 1 link Google Sheet độc lập:</strong> Khi thầy cô đăng nhập và dán link Apps Script / Google Sheet của mình, hệ thống sẽ gắn chặt link đó với tài khoản của thầy cô. Thầy cô khác sẽ dùng link khác và dữ liệu học sinh hoàn toàn tách biệt.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span><strong>Tự động tạo tài khoản học sinh:</strong> Khi GVCN tải danh sách học sinh bằng file Excel lên, hệ thống tự động sinh tên tài khoản theo nguyên tắc: <code>Tên HS không dấu + Mã HS</code> (ví dụ: Nguyễn Văn An, mã HS1001 ➔ tên đăng nhập: <code>anhs1001</code>). Đảm bảo không bao giờ trùng tài khoản giữa các lớp.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span><strong>Mật khẩu mặc định tiện lợi:</strong> Mọi học sinh đều có mật khẩu ban đầu là <code>123456</code> (hoặc <code>123</code>). Học sinh có thể tự đổi mật khẩu sau khi đăng nhập.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                    <span><strong>Lưu ngầm êm ái:</strong> Mọi dữ liệu được tự động lưu mượt mà không gây gián đoạn hay hiện popup thông báo làm phiền thầy cô và học sinh.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DÀNH CHO GIÁO VIÊN CHỦ NHIỆM (GVCN)                               */}
          {/* ========================================================================= */}
          {activeTab === 'gvcn' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-blue-900 text-sm sm:text-base">Quy trình 6 bước làm chủ lớp học dành cho GVCN</h3>
                  <p className="mt-0.5 text-xs text-blue-800">
                    Thầy cô vui lòng thực hiện tuần tự từ bước 1 đến bước 6 để khởi tạo lớp và đưa vào sử dụng thi đua.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-xs rounded-full">Bước 1</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Đăng ký tài khoản GVCN & Khởi tạo lớp mới</h4>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 pl-2">
                  <li>Ở màn hình đăng nhập, bấm vào tab <strong>"Đăng Ký GVCN Mới"</strong>.</li>
                  <li>Thầy cô có thể chọn <strong>"Đăng ký bằng Google"</strong> (nhanh và an toàn) hoặc <strong>"Đăng ký Tiêu chuẩn"</strong> (nhập tên đăng nhập, mật khẩu, tên GVCN, tên lớp như 10A1, 11B2...).</li>
                  <li>Khi hoàn tất, hệ thống tự động khởi tạo lớp với danh sách sạch hoàn toàn, sẵn sàng đón học sinh mới.</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-xs rounded-full">Bước 2</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Gắn link Google Sheet cá nhân của GVCN</h4>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold">⭐ Điểm đặc biệt: Mỗi GVCN 1 link Google Sheet riêng</p>
                  <p>
                    Vào menu <strong>"Cài đặt"</strong> hoặc bấm nút <strong>"Google Sheets"</strong> trên thanh điều hướng. Dán link Google Apps Script / Google Sheet của thầy cô vào ô cấu hình.
                  </p>
                  <p className="text-[11px] text-amber-800 italic">
                    ➔ Hệ thống sẽ gắn chặt link này vào tài khoản của thầy cô. Khi giáo viên khác đăng nhập, họ sẽ nhập link riêng của họ mà không ảnh hưởng gì tới lớp của thầy cô!
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-xs rounded-full">Bước 3</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Tải danh sách học sinh từ file Excel & Tự động tạo tài khoản</h4>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 pl-2">
                  <li>Vào mục <strong>"Danh sách lớp"</strong> ➔ bấm <strong>"Nhập / Cập nhật Excel"</strong>.</li>
                  <li>Thầy cô có thể dùng file xuất từ vnEdu, SMAS, CSDL ngành hoặc tải <strong>"File mẫu chuẩn"</strong> có sẵn trong ứng dụng.</li>
                  <li><strong>Hệ thống tự động:</strong>
                    <ul className="list-circle list-inside pl-4 mt-1 space-y-0.5 text-blue-900 font-medium">
                      <li>Tạo tài khoản đăng nhập cho từng em: <code>Tên không dấu + Mã HS</code> (Ví dụ: Nguyễn Văn An - mã HS1001 ➔ <code>anhs1001</code>).</li>
                      <li>Cấp mật khẩu ban đầu mặc định là <code>123456</code>.</li>
                      <li>Tự động chia đều 4 tổ hoặc theo cột Tổ có sẵn trong file Excel.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-xs rounded-full">Bước 4</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Xuất danh sách tài khoản & Gửi cho phụ huynh / học sinh</h4>
                </div>
                <p className="text-xs text-slate-600">
                  Tại mục <strong>"Quản lý tài khoản"</strong> hoặc trong <strong>"Danh sách lớp"</strong>, bấm nút <strong>"Xuất DS Tài Khoản & Mật Khẩu"</strong>.
                  Thầy cô sẽ nhận được file Excel chứa đầy đủ Họ tên, Mã HS, Tên đăng nhập và Mật khẩu để in dán bảng tin lớp hoặc gửi vào nhóm Zalo phụ huynh.
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-xs rounded-full">Bước 5</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Phân công Ban Cán Sự & Phân quyền nề nếp</h4>
                </div>
                <p className="text-xs text-slate-600">
                  Trong danh sách học sinh, thầy cô chọn chức vụ cho từng em: <em>Lớp trưởng, Lớp phó Học tập, Lớp phó Lao động, Lớp phó Văn thể mỹ, Bí thư, Tổ trưởng Tổ 1..4</em>.
                  Ứng dụng sẽ tự động phân quyền tương ứng để các em hỗ trợ chấm điểm và trực nhật cho lớp.
                </p>
              </div>

              {/* Step 6 */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-extrabold text-xs rounded-full">Bước 6</span>
                  <h4 className="font-extrabold text-slate-900 text-sm">Xem xếp hạng thi đua, sơ đồ lớp & Xuất báo cáo tuần</h4>
                </div>
                <p className="text-xs text-slate-600">
                  Mỗi tuần, hệ thống tự động tổng hợp điểm cá nhân và điểm tổ, xếp hạng thi đua nhất - nhì - ba. Thầy cô chỉ cần bấm <strong>"Xuất báo cáo thi đua tuần"</strong> để sinh biên bản sinh hoạt lớp chỉ trong 3 giây.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: DÀNH CHO BAN CÁN SỰ & SAO ĐỎ                                      */}
          {/* ========================================================================= */}
          {activeTab === 'cadre' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
                <Users className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-indigo-900 text-sm sm:text-base">Hướng dẫn nhiệm vụ dành cho Ban Cán Sự Lớp & Sao Đỏ</h3>
                  <p className="mt-0.5 text-xs text-indigo-800">
                    Cán sự lớp là cánh tay phải đắc lực của GVCN trong việc duy trì kỷ cương và tạo động lực cho các bạn.
                  </p>
                </div>
              </div>

              {/* Role Permissions Matrix */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Bảng phân quyền chi tiết theo chức vụ:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-[11px] font-bold">Lớp Trưởng</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Toàn quyền điều hành như GVCN:</strong> Chấm điểm thi đua, duyệt đánh giá tuần, quản lý sơ đồ lớp, theo dõi vi phạm và khen thưởng toàn diện.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-bold">Lớp Phó Học Tập</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Điểm danh đầu giờ, ghi nhận các bạn đạt điểm 9-10, tuyên dương phát biểu tốt và ghi nhận các trường hợp chưa làm bài tập về nhà.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold">Lớp Phó Lao Động</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Phân công và nghiệm thu vệ sinh trực nhật hàng ngày; lên kế hoạch và chấm điểm lao động ngoài giờ của 4 tổ.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-600 text-white rounded text-[11px] font-bold">Tổ Trưởng & Tổ Phó</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Theo dõi sát sao thành viên tổ mình, điểm danh chuyên cần, kiểm tra nề nếp trang phục, ghi nhận việc tốt và nhắc nhở vi phạm.
                    </p>
                  </div>
                </div>
              </div>

              {/* How to record points */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                <h4 className="font-extrabold text-slate-900 text-sm">Cách chấm điểm & ghi nhận vi phạm / khen thưởng nhanh:</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 pl-2">
                  <li>Đăng nhập bằng tài khoản cán sự của em.</li>
                  <li>Bấm nút <strong>"Ghi nhận nhanh"</strong> (màu xanh ở góc trên) hoặc vào mục <strong>"Thi đua cá nhân" / "Thi đua tổ"</strong>.</li>
                  <li>Chọn tên học sinh hoặc tên tổ ➔ Chọn tiêu chí (ví dụ: Đồng phục đúng quy định +2đ; Nói chuyện riêng -2đ...).</li>
                  <li>Bấm <strong>"Lưu ghi nhận"</strong>. Điểm số sẽ tự động cập nhật ngay tức thì!</li>
                </ol>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: DÀNH CHO HỌC SINH & PHỤ HUYNH                                    */}
          {/* ========================================================================= */}
          {activeTab === 'student' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-emerald-900 text-sm sm:text-base">Hướng dẫn đăng nhập & tra cứu dành cho Học Sinh</h3>
                  <p className="mt-0.5 text-xs text-emerald-800">
                    Ứng dụng giúp các em tự theo dõi tiến bộ của bản thân và cùng tổ thi đua vươn lên mỗi ngày.
                  </p>
                </div>
              </div>

              {/* Login Rule Box */}
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="font-black text-amber-950 text-sm uppercase">Quy Tắc Đăng Nhập Chuẩn Cho Học Sinh</h4>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Tên đăng nhập:</span>
                    <span className="font-black text-blue-700 font-mono text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Tên học sinh không dấu + Mã học sinh
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-500 font-semibold">Mật khẩu mặc định:</span>
                    <span className="font-black text-emerald-700 font-mono text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      123456
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">Ví dụ cụ thể:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Học sinh tên: <strong>Nguyễn Văn An</strong>, Mã học sinh: <strong>HS1001</strong> ➔ Tên đăng nhập: <code className="bg-white px-1.5 py-0.5 rounded border font-bold text-blue-700">anhs1001</code></li>
                    <li>Học sinh tên: <strong>Trần Thị Bích Ngọc</strong>, Mã học sinh: <strong>HS1015</strong> ➔ Tên đăng nhập: <code className="bg-white px-1.5 py-0.5 rounded border font-bold text-blue-700">ngochs1015</code></li>
                    <li>Học sinh tên: <strong>Lê Hữu Đạt</strong>, Mã học sinh: <strong>1105</strong> ➔ Tên đăng nhập: <code className="bg-white px-1.5 py-0.5 rounded border font-bold text-blue-700">dat1105</code></li>
                  </ul>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    * Mẹo: Em cũng có thể nhập trực tiếp Mã học sinh hoặc chọn tên mình trong danh sách lớp tại ô đăng nhập!
                  </p>
                </div>
              </div>

              {/* What Students Can Do */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Học sinh có thể làm gì trên ứng dụng?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-extrabold text-blue-900 text-xs">📊 Theo dõi điểm rèn luyện</span>
                    <p className="text-xs text-slate-600">
                      Xem chi tiết các điểm cộng hoa điểm tốt, điểm trừ nề nếp hàng ngày minh bạch, rõ ràng theo từng tuần.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-extrabold text-emerald-900 text-xs">🏆 Bảng vàng thi đua tổ</span>
                    <p className="text-xs text-slate-600">
                      Xem tổ của mình đang đứng thứ mấy trong tuần, cùng các bạn trong tổ phấn đấu giành cờ luân lưu.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-extrabold text-indigo-900 text-xs">🪑 Sơ đồ lớp & Chỗ ngồi</span>
                    <p className="text-xs text-slate-600">
                      Biết chính xác vị trí bàn, dãy, bạn cùng bàn và lịch phân công trực nhật lớp mỗi ngày.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-extrabold text-purple-900 text-xs">🔒 Đổi mật khẩu cá nhân</span>
                    <p className="text-xs text-slate-600">
                      Sau khi đăng nhập bằng mật khẩu 123456, em bấm vào hình đại diện ở góc phải để đổi mật khẩu bảo mật của riêng mình.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: HỎI - ĐÁP & HỖ TRỢ KỸ THUẬT                                       */}
          {/* ========================================================================= */}
          {activeTab === 'faq' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-black text-amber-300 text-sm sm:text-base">Liên hệ tác giả & Hỗ trợ kỹ thuật</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Thầy Nguyễn Văn Nam</strong> – Trường THPT Bình Sơn, Tỉnh Quảng Ngãi.<br />
                    Chuyên cung cấp Sáng kiến kinh nghiệm (SKKN) mới, Khoa học kỹ thuật hành vi, Lập trình ứng dụng trường học theo yêu cầu.
                  </p>
                </div>
                <div className="shrink-0 flex flex-col gap-2">
                  <a
                    href="https://zalo.me/0979466078"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Zalo: 0979466078</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyZalo}
                    className="inline-flex items-center justify-center gap-1 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                  >
                    {copiedZalo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedZalo ? 'Đã sao chép' : 'Chép SĐT'}</span>
                  </button>
                </div>
              </div>

              {/* FAQ Accordion list */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Các câu hỏi thường gặp:</h4>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    1. Nhiều thầy cô cùng sử dụng ứng dụng trên cùng một máy thì có bị trùng dữ liệu không?
                  </p>
                  <p className="text-xs text-slate-600">
                    <strong>Không bao giờ!</strong> Mỗi thầy cô đăng ký tài khoản GVCN riêng sẽ có một không gian dữ liệu hoàn toàn độc lập: danh sách học sinh riêng, lớp riêng và link Google Sheet riêng biệt. Khi thầy cô nào đăng nhập thì dữ liệu của lớp đó sẽ hiển thị.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    2. Học sinh quên mật khẩu đã đổi thì xử lý thế nào?
                  </p>
                  <p className="text-xs text-slate-600">
                    GVCN hoặc Lớp trưởng chỉ cần vào mục <strong>"Quản lý tài khoản"</strong>, tìm tên học sinh đó và bấm nút <strong>"Xem mã PIN"</strong> hoặc <strong>"Cấp lại mã PIN mới"</strong>. Mã PIN sẽ lập tức được đặt lại về <code>123456</code> hoặc mã mới do thầy cô chỉ định.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    3. File Excel tải lên danh sách học sinh cần những cột nào?
                  </p>
                  <p className="text-xs text-slate-600">
                    Hệ thống rất thông minh và tự động nhận diện các cột: <em>Mã HS, Họ và tên (hoặc tách Họ đệm + Tên), Giới tính, Ngày sinh, Tổ, Chức vụ</em>. Thầy cô có thể tải trực tiếp file Excel xuất từ vnEdu, SMAS hoặc tải file mẫu có sẵn trong ứng dụng.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    4. Ứng dụng chạy offline trên máy tính hay chạy online trên điện thoại?
                  </p>
                  <p className="text-xs text-slate-600">
                    Ứng dụng đang chạy tối ưu trên máy tính trình duyệt web. Nếu quý thầy cô muốn đồng bộ dữ liệu Online trên Google Sheets để cả lớp cùng truy cập trên điện thoại, vui lòng liên hệ Zalo <strong>0979466078</strong> để được hướng dẫn tích hợp trực tiếp!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold text-slate-800">Cần trợ giúp thêm?</span>
            <span>Liên hệ Zalo Thầy Nam: <strong className="text-blue-700">0979466078</strong></span>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            Đã hiểu, quay lại ứng dụng
          </button>
        </div>

      </div>
    </div>
  );
};
