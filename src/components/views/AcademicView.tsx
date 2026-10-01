import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  Filter,
  Trash2,
  Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import { MultiStudentPicker } from '../common/MultiStudentPicker';
import { canManageClassActivities } from '../../utils/permissionUtils';

export const AcademicView: React.FC = () => {
  const {
    academicRecords,
    students,
    addAcademicRecord,
    batchAddAcademicRecords,
    deleteAcademicRecord,
    currentUserRole,
    setSelectedStudentIdForDetail
  } = useApp();

  const canEdit = canManageClassActivities(currentUserRole.role);

  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states (supports selecting 1, multiple, group, or whole class)
  const [studentIds, setStudentIds] = useState<string[]>(students[0]?.id ? [students[0].id] : []);
  const [subject, setSubject] = useState('Toán');
  const [type, setType] = useState<'Điểm tốt (9-10)' | 'Chưa làm bài tập' | 'Không thuộc bài' | 'Phát biểu tích cực' | 'Tiến bộ vượt bậc'>('Điểm tốt (9-10)');
  const [score, setScore] = useState<number | undefined>(10);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const subjectsList = ['Toán', 'Văn', 'Tiếng Anh', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học'];

  const studentMap = useMemo(() => {
    const map: Record<string, typeof students[0]> = {};
    students.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  const filteredRecords = useMemo(() => {
    return academicRecords.filter(r => {
      const student = studentMap[r.studentId];
      if (!student) return false;

      const matchSearch =
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentCode.includes(searchTerm) ||
        r.subject.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSub = selectedSubject === 'all' || r.subject === selectedSubject;
      const matchType = selectedType === 'all' || r.type === selectedType;
      const matchTime = isDateInRange(r.date, timeRange, customStartDate, customEndDate);

      return matchSearch && matchSub && matchType && matchTime;
    });
  }, [academicRecords, studentMap, searchTerm, selectedSubject, selectedType, timeRange, customStartDate, customEndDate]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!studentIds || studentIds.length === 0) return;

    if (studentIds.length === 1) {
      addAcademicRecord({
        studentId: studentIds[0],
        date,
        subject,
        type,
        score: score ? Number(score) : undefined,
        note: note.trim(),
        recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
      });
    } else {
      const records = studentIds.map(sId => ({
        studentId: sId,
        date,
        subject,
        type,
        score: score ? Number(score) : undefined,
        note: note.trim(),
        recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
      }));
      batchAddAcademicRecords(records);
    }

    setIsAddModalOpen(false);
    setNote('');
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    deleteAcademicRecord(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Theo Dõi Tình Hình Học Tập & Sổ Đầu Bài</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Sổ Đầu Bài Điện Tử
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận điểm tốt, chuẩn bị bài, bài tập về nhà và phát biểu xây dựng bài trong từng tiết học
          </p>
        </div>

        {canEdit ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-600/20 flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi nhận tiết học</span>
          </button>
        ) : (
          <div className="px-3.5 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 self-start md:self-auto">
            Chế độ chỉ xem (Thành viên)
          </div>
        )}
      </div>

      {/* Time Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
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

      {/* Filter Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học sinh, môn học..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="all">Tất cả môn học</option>
              {subjectsList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="all">Tất cả phân loại</option>
              <option value="Điểm tốt (9-10)">Điểm tốt (9-10)</option>
              <option value="Phát biểu tích cực">Phát biểu tích cực</option>
              <option value="Tiến bộ vượt bậc">Tiến bộ vượt bậc</option>
              <option value="Chưa làm bài tập">Chưa làm bài tập</option>
              <option value="Không thuộc bài">Không thuộc bài</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Không có ghi nhận học tập nào trong khoảng thời gian đã chọn.</p>
          </div>
        ) : (
          filteredRecords.map(rec => {
            const student = studentMap[rec.studentId];
            if (!student) return null;
            const isPositive = rec.type.includes('Điểm') || rec.type.includes('Phát biểu') || rec.type.includes('Tiến bộ');

            return (
              <div
                key={rec.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={student.avatar}
                    alt={student.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer"
                    onClick={() => setSelectedStudentIdForDetail(student.id)}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => setSelectedStudentIdForDetail(student.id)}
                        className="font-bold text-slate-900 hover:text-blue-700 cursor-pointer text-sm"
                      >
                        {student.fullName}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[11px]">
                        Môn {rec.subject}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rec.type}
                      </span>
                      {rec.score !== undefined && (
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black text-[11px]">
                          Điểm {rec.score}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Ngày: <strong>{rec.date}</strong> • Người ghi: {rec.recordedBy}
                    </p>
                    {rec.note && (
                      <p className="text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 mt-1 max-w-xl">
                        {rec.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {canEdit && (
                    deleteConfirmId === rec.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                        <span className="text-[10px] text-rose-700 font-bold px-1">Xóa?</span>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px]"
                        >
                          Có
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(rec.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Xóa ghi nhận này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Record */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Học Tập Trong Tiết Học</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <MultiStudentPicker
                  students={students}
                  selectedStudentIds={studentIds}
                  onChange={setStudentIds}
                  label="Học sinh"
                  helperText="Có thể chọn 1 học sinh, nhiều học sinh, theo tổ hoặc toàn lớp"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Môn học</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  >
                    {subjectsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày ghi nhận</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hình thức đánh giá</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Điểm tốt (9-10)">Điểm tốt (9-10)</option>
                    <option value="Phát biểu tích cực">Phát biểu tích cực</option>
                    <option value="Tiến bộ vượt bậc">Tiến bộ vượt bậc</option>
                    <option value="Chưa làm bài tập">Chưa làm bài tập</option>
                    <option value="Không thuộc bài">Không thuộc bài</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm số (nếu có)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={score ?? ''}
                    onChange={e => setScore(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú cụ thể</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ví dụ: Lên bảng giải xuất sắc bài tập nâng cao..."
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
                  disabled={studentIds.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu Ghi Nhận {studentIds.length > 1 ? `(${studentIds.length} HS)` : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
