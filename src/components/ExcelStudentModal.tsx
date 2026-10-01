import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileUp,
  UserCheck,
  UserPlus,
  Users,
  Info,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  parseStudentsFromExcel,
  generateStudentTemplateExcel,
  formatDateToVietnamese,
  ParsedExcelStudent
} from '../utils/excelImportExport';

interface ExcelStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelStudentModal: React.FC<ExcelStudentModalProps> = ({ isOpen, onClose }) => {
  const { students, classInfo, batchUpdateStudentsFromExcel } = useApp();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelStudent[]>([]);
  const [parseStats, setParseStats] = useState<{
    updateCount: number;
    newCount: number;
    warnings: string[];
    errors: string[];
  }>({
    updateCount: 0,
    newCount: 0,
    warnings: [],
    errors: []
  });
  const [importMode, setImportMode] = useState<'update' | 'append' | 'replace'>('update');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewFilter, setPreviewFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setResultMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        const res = parseStudentsFromExcel(buffer, students);
        if (res.success) {
          setParsedData(res.students);
          const updateCount = res.students.filter(s => s.actionType === 'update').length;
          const newCount = res.students.filter(s => s.actionType === 'insert').length;
          setParseStats({
            updateCount,
            newCount,
            warnings: res.warnings,
            errors: res.errors
          });
        } else {
          setParsedData([]);
          setResultMessage({ type: 'error', text: res.message });
          setParseStats({
            updateCount: 0,
            newCount: 0,
            warnings: res.warnings,
            errors: res.errors
          });
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) {
      setResultMessage({ type: 'error', text: 'Chưa có dữ liệu học sinh nào từ file Excel!' });
      return;
    }

    setIsProcessing(true);
    setResultMessage(null);

    try {
      const res = await batchUpdateStudentsFromExcel(parsedData, importMode);
      if (res.success) {
        setResultMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setResultMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setResultMessage({ type: 'error', text: 'Lỗi thực thi: ' + (err?.message || 'Không xác định') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadStandardTemplate = () => {
    generateStudentTemplateExcel(undefined, classInfo.className, 'standard_moet');
  };

  const handleDownloadSimpleTemplate = () => {
    generateStudentTemplateExcel(undefined, classInfo.className, 'simple');
  };

  const handleDownloadCurrentList = () => {
    generateStudentTemplateExcel(students, classInfo.className, 'standard_moet');
  };

  const filteredPreview = parsedData.filter(s => {
    if (!previewFilter) return true;
    const term = previewFilter.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(term) ||
      s.studentCode.toLowerCase().includes(term) ||
      `tổ ${s.groupId}`.toLowerCase().includes(term) ||
      s.roleInClass.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-6 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Cập Nhật & Nhập Danh Sách Học Sinh Bằng File Excel</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Lớp {classInfo.className} • Đồng bộ nhanh hồ sơ, tổ, chức vụ và thông tin phụ huynh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Action Bar: Download Templates */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Tải Mẫu Excel Chuẩn Hoặc Xuất Danh Sách Hiện Tại
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    Chuẩn vnEdu / SMAS / Bộ GD&ĐT
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mẫu chuẩn gồm Sheet Dữ liệu (tách Họ đệm + Tên, Ngày sinh DD/MM/YYYY, Tổ, Chức vụ, Email, SĐT, Phụ huynh) và Sheet Hướng dẫn quy chuẩn
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={handleDownloadStandardTemplate}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                title="Mẫu chuẩn đầy đủ tương thích vnEdu, SMAS, có Sheet hướng dẫn chi tiết"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Tải Mẫu Chuẩn (vnEdu/SMAS)
              </button>
              <button
                type="button"
                onClick={handleDownloadSimpleTemplate}
                className="flex-1 sm:flex-initial px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                title="Mẫu đơn giản gọn nhẹ cột Họ và tên gộp"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                Mẫu Rút Gọn
              </button>
              <button
                type="button"
                onClick={handleDownloadCurrentList}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                title="Xuất toàn bộ 34 học sinh hiện tại thành file Excel chuẩn để chỉnh sửa nhanh"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                Xuất DS Lớp Hiện Tại ({students.length} HS)
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              1. Chọn hoặc kéo thả file Excel (.xlsx, .xls, .csv)
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/60 scale-[1.005]'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {selectedFile ? <CheckCircle2 className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Nhấn để chọn file khác
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Kéo thả file Excel vào đây hoặc <span className="text-emerald-600 underline">bấm để chọn</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ các định dạng .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Import Mode Selection */}
          {parsedData.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                2. Lựa chọn phương thức cập nhật dữ liệu
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode('update')}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    importMode === 'update'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck className={`w-4 h-4 ${importMode === 'update' ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span className="text-sm font-semibold text-slate-800">Cập nhật & Hợp nhất</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Khớp Mã HS hoặc Họ tên: cập nhật thông tin mới, giữ nguyên điểm thi đua & vi phạm. Thêm mới nếu chưa có.
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                    Khuyên dùng
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    importMode === 'append'
                      ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className={`w-4 h-4 ${importMode === 'append' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="text-sm font-semibold text-slate-800">Chỉ thêm mới (Append)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Chỉ thêm vào danh sách các học sinh chưa có trong lớp. Không ghi đè học sinh cũ.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    importMode === 'replace'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={`w-4 h-4 ${importMode === 'replace' ? 'text-amber-600' : 'text-slate-500'}`} />
                    <span className="text-sm font-semibold text-slate-800">Thay thế toàn bộ</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Thay toàn bộ danh sách lớp bằng file này. Hệ thống tự động tạo bản sao lưu GVCN trước khi thực hiện.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Feedback Message */}
          {resultMessage && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 border ${
                resultMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {resultMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="text-sm font-medium">{resultMessage.text}</div>
            </div>
          )}

          {/* Data Preview Section */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">
                    3. Xem trước danh sách dữ liệu ({parsedData.length} học sinh)
                  </h4>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                    {parseStats.updateCount} Cập nhật
                  </span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                    {parseStats.newCount} Thêm mới
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={previewFilter}
                    onChange={(e) => setPreviewFilter(e.target.value)}
                    placeholder="Tìm theo tên, mã HS..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5">STT</th>
                      <th className="px-3 py-2.5">Mã HS</th>
                      <th className="px-3 py-2.5">Họ và tên</th>
                      <th className="px-3 py-2.5">Giới tính</th>
                      <th className="px-3 py-2.5">Ngày sinh</th>
                      <th className="px-3 py-2.5">Tổ</th>
                      <th className="px-3 py-2.5">Chức vụ</th>
                      <th className="px-3 py-2.5">SĐT HS</th>
                      <th className="px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5">Phụ huynh</th>
                      <th className="px-3 py-2.5">Địa chỉ</th>
                      <th className="px-3 py-2.5 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreview.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-medium text-slate-800">{s.studentCode}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{s.fullName}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                              s.gender === 'Nữ' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.gender}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">
                          {formatDateToVietnamese(s.dateOfBirth)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-medium text-slate-700">Tổ {s.groupId}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{s.roleInClass}</td>
                        <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{s.phone}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500 truncate max-w-[140px]" title={s.email || ''}>
                          {s.email || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-700 block whitespace-nowrap">{s.parentName}</span>
                          <span className="text-[10px] text-slate-400 font-mono block whitespace-nowrap">{s.parentPhone}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]" title={s.address}>
                          {s.address}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {s.actionType === 'update' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                              <UserCheck className="w-3 h-3" />
                              Cập nhật
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                              <UserPlus className="w-3 h-3" />
                              Thêm mới
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-semibold">Bảo toàn dữ liệu học sinh:</span> Khi dùng chế độ <strong>Cập nhật & Hợp nhất</strong>, hệ thống giữ nguyên mọi dữ liệu chấm điểm thi đua, vi phạm, khen thưởng và điểm danh trước đó.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {parsedData.length > 0 ? (
              <span>Sẵn sàng cập nhật <strong>{parsedData.length}</strong> học sinh</span>
            ) : (
              <span>Vui lòng tải lên file Excel để tiếp tục</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing || parsedData.length === 0}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm flex items-center gap-2 transition-all ${
                isProcessing || parsedData.length === 0
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Áp Dụng Cập Nhật Dữ Liệu
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
