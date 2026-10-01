import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Search,
  Sparkles,
  Star,
  Trophy,
  Heart,
  BookOpen,
  PartyPopper,
  Trash2,
  Calendar,
  Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { RewardCategory, RewardRecord } from '../../types';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import { EditRewardModal } from '../EditRewardModal';
import { MultiStudentPicker } from '../common/MultiStudentPicker';
import { canManageClassActivities } from '../../utils/permissionUtils';

export const RewardsView: React.FC = () => {
  const {
    rewards,
    students,
    addReward,
    batchAddRewards,
    deleteReward,
    currentUserRole,
    setSelectedStudentIdForDetail,
    classInfo,
  } = useApp();

  const canEdit = canManageClassActivities(currentUserRole.role);

  const [editingReward, setEditingReward] = useState<RewardRecord | null>(null);
  // Mặc định hiển thị dữ liệu khen thưởng trong tuần
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('this_week');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<number | 'all'>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for adding reward (supports 1, multiple, group, or whole class)
  const [newStudentIds, setNewStudentIds] = useState<string[]>(students[0]?.id ? [students[0].id] : []);
  const [newCategory, setNewCategory] = useState<RewardCategory>('Học tập');
  const [newTitle, setNewTitle] = useState('');
  const [newBonus, setNewBonus] = useState(5);
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const studentMap = useMemo(() => {
    const map: Record<string, typeof students[0]> = {};
    students.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  const filteredRewards = useMemo(() => {
    return rewards.filter(r => {
      const student = studentMap[r.studentId];
      if (!student) return false;

      const matchSearch =
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentCode.includes(searchTerm) ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = filterCategory === 'all' || r.category === filterCategory;
      const matchGroup = filterGroup === 'all' || student.groupId === filterGroup;
      const matchTime = isDateInRange(r.date, timeRange, customStartDate, customEndDate);

      return matchSearch && matchCategory && matchGroup && matchTime;
    });
  }, [rewards, studentMap, searchTerm, filterCategory, filterGroup, timeRange, customStartDate, customEndDate]);

  const triggerCheer = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!newStudentIds || newStudentIds.length === 0 || !newTitle.trim()) return;

    if (newStudentIds.length === 1) {
      addReward({
        studentId: newStudentIds[0],
        date: newDate,
        category: newCategory,
        title: newTitle.trim(),
        bonusPoints: Number(newBonus),
        note: newNote.trim(),
        recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
      });
    } else {
      const records = newStudentIds.map(sId => ({
        studentId: sId,
        date: newDate,
        category: newCategory,
        title: newTitle.trim(),
        bonusPoints: Number(newBonus),
        note: newNote.trim(),
        recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
      }));
      batchAddRewards(records);
    }

    triggerCheer();
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewNote('');
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    deleteReward(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-white/20 border border-white/30 text-emerald-200 text-xs font-bold px-3 py-0.5 rounded-full">
              Bảng Vàng Danh Dự Lớp {classInfo.className}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Khen Thưởng – Việc Tốt – Hoa Điểm Mười
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
            Tuyên dương các tấm gương vượt khó, nhặt được của rơi, điểm 10 kiểm tra và đóng góp tích cực cho phong trào lớp.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          <button
            onClick={triggerCheer}
            className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <PartyPopper className="w-4 h-4" />
            <span>Tung pháo hoa chúc mừng 🎉</span>
          </button>

          {canEdit ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Khen thưởng ngay</span>
            </button>
          ) : (
            <div className="px-3.5 py-2 bg-white/20 text-white border border-white/30 rounded-xl text-xs font-medium">
              Chế độ chỉ xem
            </div>
          )}
        </div>

        <div className="absolute right-0 bottom-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Time Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-slate-700">Lọc theo thời gian:</span>
        </div>
        <TimeRangePicker
          selectedOption={timeRange}
          onChangeOption={setTimeRange}
          customStartDate={customStartDate}
          onChangeCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          onChangeCustomEndDate={setCustomEndDate}
        />
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học sinh, thành tích..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="Học tập">Học tập & Điểm 10</option>
              <option value="Phong trào">Phong trào & Hoạt động</option>
              <option value="Việc tốt">Việc tốt & Nhặt được của rơi</option>
              <option value="Tiến bộ">Tiến bộ vượt bậc</option>
            </select>

            <select
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="all">Tất cả tổ</option>
              <option value={1}>Tổ 1</option>
              <option value={2}>Tổ 2</option>
              <option value={3}>Tổ 3</option>
              <option value={4}>Tổ 4</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRewards.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
            <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Không có khen thưởng nào phù hợp trong khoảng thời gian đã chọn.</p>
          </div>
        ) : (
          filteredRewards.map(rew => {
            const student = studentMap[rew.studentId];
            if (!student) return null;

            return (
              <div
                key={rew.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-xs group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.avatar}
                        alt={student.fullName}
                        className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400 cursor-pointer shadow-xs"
                        onClick={() => setSelectedStudentIdForDetail(student.id)}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => setSelectedStudentIdForDetail(student.id)}
                            className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer text-sm"
                          >
                            {student.fullName}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                            Tổ {student.groupId}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Ngày khen: <strong>{rew.date}</strong> • Người ghi: {rew.recordedBy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs">
                        +{rew.bonusPoints} Điểm
                      </span>

                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingReward(rew)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                            title="Sửa chi tiết khen thưởng / Đổi học sinh nếu ghi nhầm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>

                          {deleteConfirmId === rew.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-300 shadow-2xs">
                              <span className="text-[11px] text-rose-800 font-extrabold px-1">Xóa?</span>
                              <button
                                onClick={() => handleDelete(rew.id)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px]"
                              >
                                Có
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-[10px]"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(rew.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                              title="Xóa khen thưởng này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{rew.title}</span>
                    </div>
                    {rew.note && (
                      <p className="text-slate-600 text-xs italic pl-5.5">
                        {rew.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Phân loại: <strong className="text-slate-600">{rew.category}</strong></span>
                  <span className="text-emerald-700 font-semibold">Được cộng vào bảng điểm thi đua</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Reward */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Khen Thưởng & Việc Tốt</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <MultiStudentPicker
                  students={students}
                  selectedStudentIds={newStudentIds}
                  onChange={setNewStudentIds}
                  label="Học sinh được khen"
                  helperText="Có thể chọn 1 học sinh, nhiều học sinh, theo tổ hoặc toàn lớp"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Danh mục</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Học tập">Học tập & Điểm 10</option>
                    <option value="Phong trào">Phong trào & Hoạt động</option>
                    <option value="Việc tốt">Việc tốt & Nhặt của rơi</option>
                    <option value="Tiến bộ">Tiến bộ vượt bậc</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm cộng thi đua</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newBonus}
                    onChange={e => setNewBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung khen thưởng <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Đạt điểm 10 kiểm tra 1 tiết Toán, Giúp bạn học tốt..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày ghi nhận</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chi tiết / Lời tuyên dương</label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Ghi nhận cụ thể đóng góp hoặc thành tích..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={newStudentIds.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu Khen Thưởng {newStudentIds.length > 1 ? `(${newStudentIds.length} HS)` : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reward Modal */}
      <EditRewardModal
        reward={editingReward}
        isOpen={!!editingReward}
        onClose={() => setEditingReward(null)}
      />
    </div>
  );
};
