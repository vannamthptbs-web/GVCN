import React, { useState, useMemo } from 'react';
import {
  HeartHandshake,
  Plus,
  Trophy,
  Calendar,
  Users,
  Award,
  Sparkles,
  CheckCircle2,
  Star,
  Trash2,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import { MultiStudentPicker } from '../common/MultiStudentPicker';
import { canManageExtracurricular } from '../../utils/permissionUtils';

export const ExtracurricularView: React.FC = () => {
  const {
    extracurricularActivities,
    addExtracurricular,
    deleteExtracurricular,
    students,
    currentUserRole,
    classInfo,
  } = useApp();

  const canEdit = canManageExtracurricular(currentUserRole.role);

  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [selectedType, setSelectedType] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'Văn nghệ' | 'Thể thao' | 'Thiện nguyện' | 'Câu lạc bộ' | 'Khác'>('Văn nghệ');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newResult, setNewResult] = useState('');
  const [newBonus, setNewBonus] = useState(5);
  const [newSelectedStudentIds, setNewSelectedStudentIds] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState('');

  const filteredActivities = useMemo(() => {
    return extracurricularActivities.filter(act => {
      const actType = act.type || act.category || 'Khác';
      const matchType = selectedType === 'all' || actType === selectedType;
      const matchTime = isDateInRange(act.date, timeRange, customStartDate, customEndDate);
      return matchType && matchTime;
    });
  }, [extracurricularActivities, selectedType, timeRange, customStartDate, customEndDate]);

  const getParticipantsString = (act: (typeof extracurricularActivities)[0]): string => {
    if (Array.isArray(act.participants) && act.participants.length > 0) {
      return act.participants.join(', ');
    }
    if (Array.isArray(act.participations) && act.participations.length > 0) {
      return act.participations
        .map(p => {
          const s = students.find(item => item.id === p.studentId);
          return s ? s.fullName : p.studentId;
        })
        .filter(Boolean)
        .join(', ');
    }
    return `Tập thể lớp ${classInfo.className || ''}`;
  };

  const getActivityBonus = (act: (typeof extracurricularActivities)[0]): number => {
    if (typeof act.bonusScore === 'number') return act.bonusScore;
    if (Array.isArray(act.participations)) {
      return act.participations.reduce((sum, p) => sum + (p.pointsBonus || 0), 0);
    }
    return 0;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const participantList = newSelectedStudentIds.length > 0
      ? newSelectedStudentIds.map(id => students.find(s => s.id === id)?.fullName || id)
      : [`Tập thể lớp ${classInfo.className || ''}`];

    addExtracurricular({
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      result: newResult || 'Đã tham gia tích cực',
      bonusScore: Number(newBonus),
      participants: participantList,
      notes: newNotes,
    });
    setIsAddOpen(false);
    setNewTitle('');
    setNewResult('');
    setNewNotes('');
    setNewSelectedStudentIds([]);
  };

  const handleDelete = (id: string) => {
    deleteExtracurricular(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Hoạt Động Ngoại Khóa & Phong Trào Đoàn Thể</h2>
            <span className="bg-pink-100 text-pink-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Lớp phó Văn thể mỹ & Bí thư
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp các giải thưởng văn nghệ, giải thể thao, câu lạc bộ và phong trào thiện nguyện của lớp {classInfo.className}
          </p>
        </div>

        {canEdit ? (
          <button
            onClick={() => {
              setNewSelectedStudentIds([]);
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-pink-600/20 flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi nhận phong trào</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium self-start md:self-auto">
            Chế độ chỉ xem (Thành viên)
          </div>
        )}
      </div>

      {/* Filter and Time Range Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-pink-600" />
            <span className="font-bold text-slate-700">Thời gian:</span>
            <TimeRangePicker
              selectedOption={timeRange}
              onChangeOption={setTimeRange}
              customStartDate={customStartDate}
              onChangeCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              onChangeCustomEndDate={setCustomEndDate}
              size="sm"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-500">Thể loại:</span>
            {(['all', 'Văn nghệ', 'Thể thao', 'Thiện nguyện', 'Câu lạc bộ'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedType === type
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'all' ? 'Tất cả' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
            <Trophy className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Chưa có hoạt động ngoại khóa nào trong khoảng thời gian đã chọn</p>
            <p className="text-slate-400 mt-1">Chọn thời gian khác hoặc nhấn "Ghi nhận phong trào"</p>
          </div>
        ) : (
          filteredActivities.map(act => (
            <div
              key={act.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-pink-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm sm:text-base">{act.title}</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-pink-100 text-pink-800">
                    {act.type || act.category || 'Hoạt động'}
                  </span>
                  {getActivityBonus(act) > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-amber-100 text-amber-800">
                      +{getActivityBonus(act)} điểm thi đua
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                  <span>📅 Ngày: <strong>{act.date}</strong></span>
                  {(act.result || act.description) && (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Trophy className="w-3.5 h-3.5" /> Thành tích: {act.result || act.description}
                    </span>
                  )}
                  <span>
                    👥 Tham gia: <strong>{getParticipantsString(act)}</strong>
                  </span>
                </div>

                {(act.notes || (act.description && act.result && act.notes !== act.description)) && (
                  <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    {act.notes || act.description}
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex items-center gap-3 self-end md:self-center">
                  {deleteConfirmId === act.id ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-xl border border-rose-200">
                      <span className="text-[11px] text-rose-700 font-bold px-1">Xác nhận xóa?</span>
                      <button
                        onClick={() => handleDelete(act.id)}
                        className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] hover:bg-rose-700"
                      >
                        Xóa
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(act.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Xóa hoạt động này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Add */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-pink-100 text-pink-800 rounded-lg">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Hoạt Động Phong Trào</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên hoạt động / Sự kiện <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Hội diễn văn nghệ 20/11, Giải bóng đá..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-pink-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thể loại</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Văn nghệ">Văn nghệ</option>
                    <option value="Thể thao">Thể thao</option>
                    <option value="Thiện nguyện">Thiện nguyện</option>
                    <option value="Câu lạc bộ">Câu lạc bộ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày diễn ra</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kết quả / Giải thưởng</label>
                  <input
                    type="text"
                    value={newResult}
                    onChange={e => setNewResult(e.target.value)}
                    placeholder="Giải Nhất / Giải Nhì..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm cộng thi đua</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={newBonus}
                    onChange={e => setNewBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                <MultiStudentPicker
                  students={students}
                  selectedStudentIds={newSelectedStudentIds}
                  onChange={setNewSelectedStudentIds}
                  label="Học sinh tham gia"
                  helperText="Chọn học sinh tham gia hoặc để trống nếu đại diện toàn thể lớp"
                  maxHeight="max-h-40"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú chi tiết</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Tiết mục múa, thành tích nổi bật..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu Phong Trào {newSelectedStudentIds.length > 0 ? `(${newSelectedStudentIds.length} HS)` : '(Cả lớp)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
