import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  User, 
  FileText, 
  ArrowRightLeft 
} from 'lucide-react';
import { ViolationRecord, ViolationCategory, ViolationSeverity, ViolationProcessStatus } from '../types';
import { useApp } from '../context/AppContext';

interface EditViolationModalProps {
  violation: ViolationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditViolationModal: React.FC<EditViolationModalProps> = ({
  violation,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { students, updateViolation, deleteViolation, currentUserRole } = useApp();

  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState<ViolationCategory>('Nề nếp');
  const [severity, setSeverity] = useState<ViolationSeverity>('Nhẹ');
  const [title, setTitle] = useState('');
  const [penaltyPoints, setPenaltyPoints] = useState<number>(-2);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<ViolationProcessStatus>('Đã ghi nhận');
  const [remedyAction, setRemedyAction] = useState('');
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (violation) {
      setStudentId(violation.studentId);
      setCategory(violation.category);
      setSeverity(violation.severity);
      setTitle(violation.title);
      setPenaltyPoints(violation.penaltyPoints);
      setDate(violation.date);
      setStatus(violation.status);
      setRemedyAction(violation.remedyAction || '');
      setNote(violation.note || '');
      setConfirmDelete(false);
    }
  }, [violation, isOpen]);

  if (!isOpen || !violation) return null;

  const handleSeverityChange = (sev: ViolationSeverity) => {
    setSeverity(sev);
    if (sev === 'Nhẹ') setPenaltyPoints(-2);
    else if (sev === 'Vừa') setPenaltyPoints(-4);
    else if (sev === 'Nặng') setPenaltyPoints(-6);
    else if (sev === 'Rất nặng') setPenaltyPoints(-10);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !studentId) return;

    const updated: ViolationRecord = {
      ...violation,
      studentId,
      category,
      severity,
      title: title.trim(),
      penaltyPoints: -Math.abs(Number(penaltyPoints)),
      date,
      status,
      remedyAction: remedyAction.trim(),
      note: note.trim(),
    };

    updateViolation(updated);
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleDelete = () => {
    deleteViolation(violation.id);
    if (onSuccess) onSuccess();
    onClose();
  };

  const selectedStudent = students.find(s => s.id === studentId);
  const originalStudent = students.find(s => s.id === violation.studentId);
  const isReassigned = studentId !== violation.studentId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-700 via-rose-800 to-rose-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Điều Chỉnh Bản Ghi Vi Phạm</h3>
              <p className="text-xs text-rose-200">
                Sửa lỗi nếu ghi nhầm vi phạm, sai học sinh, sai mức phạt hoặc ngày tháng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Reassign Student if recorded wrong */}
          <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-rose-950 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-700" />
                <span>Học sinh vi phạm:</span>
              </label>
              <span className="text-[10px] bg-rose-200 text-rose-900 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                Đổi HS nếu ghi nhầm
              </span>
            </div>

            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.studentCode} - {s.fullName} (Tổ {s.groupId} - {s.roleInClass})
                </option>
              ))}
            </select>

            {isReassigned && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                ⚠️ Chuyển vi phạm từ <strong>{originalStudent?.fullName}</strong> sang <strong>{selectedStudent?.fullName}</strong>. Điểm thi đua sẽ được tự động tính lại cho cả hai học sinh.
              </p>
            )}
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tên lỗi vi phạm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Không mặc đồng phục, đi học muộn..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phân loại danh mục</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ViolationCategory)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Nề nếp">Nề nếp</option>
                <option value="Học tập">Học tập</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          {/* Severity & Penalty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mức độ vi phạm</label>
              <select
                value={severity}
                onChange={e => handleSeverityChange(e.target.value as ViolationSeverity)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Nhẹ">Nhẹ (-2đ)</option>
                <option value="Vừa">Vừa (-4đ)</option>
                <option value="Nặng">Nặng (-6đ)</option>
                <option value="Rất nặng">Rất nặng (-10đ)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điểm trừ thi đua</label>
              <input
                type="number"
                max={-1}
                value={penaltyPoints}
                onChange={e => setPenaltyPoints(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày vi phạm</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status & Remedy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trạng thái khắc phục</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ViolationProcessStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Đã ghi nhận">Đã ghi nhận</option>
                <option value="Đã nhắc nhở">Đã nhắc nhở</option>
                <option value="Đang khắc phục">Đang khắc phục</option>
                <option value="Đã tiến bộ">Đã tiến bộ (Đã khắc phục xong)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Biện pháp khắc phục</label>
              <input
                type="text"
                value={remedyAction}
                onChange={e => setRemedyAction(e.target.value)}
                placeholder="VD: Viết bản kiểm điểm, trực nhật bù..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú chi tiết</label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ghi chú hoàn cảnh, tiết học xảy ra hoặc người làm chứng..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Delete section */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                title="Xóa vi phạm nếu ghi nhầm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa vi phạm này (nếu ghi nhầm)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-lg border border-rose-300">
                <span className="font-bold text-rose-800 text-[11px]">Xác nhận xóa?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px]"
                >
                  Xóa ngay
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px]"
                >
                  Hủy
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
