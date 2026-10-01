import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Award, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  User, 
  FileText, 
  ArrowRightLeft,
  Sparkles 
} from 'lucide-react';
import { RewardRecord, RewardCategory } from '../types';
import { useApp } from '../context/AppContext';

interface EditRewardModalProps {
  reward: RewardRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REWARD_CATEGORIES: RewardCategory[] = [
  'Điểm tốt',
  'Giúp đỡ bạn',
  'Nhiệm vụ xuất sắc',
  'Thành tích học tập',
  'Văn nghệ - Thể thao',
  'Việc tốt',
  'Tiến bộ vượt bậc'
];

export const EditRewardModal: React.FC<EditRewardModalProps> = ({
  reward,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { students, updateReward, deleteReward } = useApp();

  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState<RewardCategory>('Điểm tốt');
  const [title, setTitle] = useState('');
  const [bonusPoints, setBonusPoints] = useState<number>(3);
  const [date, setDate] = useState('');
  const [evidence, setEvidence] = useState('');
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (reward) {
      setStudentId(reward.studentId);
      setCategory(reward.category);
      setTitle(reward.title);
      setBonusPoints(reward.bonusPoints);
      setDate(reward.date);
      setEvidence(reward.evidence || '');
      setNote(reward.note || '');
      setConfirmDelete(false);
    }
  }, [reward, isOpen]);

  if (!isOpen || !reward) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !studentId) return;

    const updated: RewardRecord = {
      ...reward,
      studentId,
      category,
      title: title.trim(),
      bonusPoints: Math.abs(Number(bonusPoints)),
      date,
      evidence: evidence.trim(),
      note: note.trim(),
    };

    updateReward(updated);
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleDelete = () => {
    deleteReward(reward.id);
    if (onSuccess) onSuccess();
    onClose();
  };

  const selectedStudent = students.find(s => s.id === studentId);
  const originalStudent = students.find(s => s.id === reward.studentId);
  const isReassigned = studentId !== reward.studentId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Điều Chỉnh Khen Thưởng - Việc Tốt</h3>
              <p className="text-xs text-emerald-100">
                Sửa đổi nếu ghi nhầm thành tích, sai học sinh hoặc sai điểm cộng
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
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Học sinh được khen thưởng:</span>
              </label>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                Đổi HS nếu ghi nhầm
              </span>
            </div>

            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.studentCode} - {s.fullName} (Tổ {s.groupId} - {s.roleInClass})
                </option>
              ))}
            </select>

            {isReassigned && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                ⚠️ Chuyển khen thưởng từ <strong>{originalStudent?.fullName}</strong> sang <strong>{selectedStudent?.fullName}</strong>. Điểm thi đua sẽ được tự động cộng cho đúng học sinh.
              </p>
            )}
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tiêu đề khen thưởng / Việc tốt <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Điểm 10 môn Toán, Giúp bạn khuyết tật..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Danh mục khen thưởng</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as RewardCategory)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
              >
                {REWARD_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Points & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điểm cộng thi đua (+đ)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={bonusPoints}
                onChange={e => setBonusPoints(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày khen thưởng</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Evidence */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Minh chứng / Người xác nhận</label>
            <input
              type="text"
              value={evidence}
              onChange={e => setEvidence(e.target.value)}
              placeholder="VD: Lời khen của cô giáo dạy Hóa, biên bản sao đỏ..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Chi tiết câu chuyện hoặc thành tích..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Delete section */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                title="Xóa khen thưởng nếu ghi nhầm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa khen thưởng (nếu ghi nhầm)</span>
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-600/30 flex items-center gap-1.5"
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
