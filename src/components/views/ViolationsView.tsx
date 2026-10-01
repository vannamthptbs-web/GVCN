import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Trash2,
  Calendar,
  Edit2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ViolationCategory, ViolationSeverity, ViolationProcessStatus, ViolationRecord } from '../../types';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import { EditViolationModal } from '../EditViolationModal';
import { MultiStudentPicker } from '../common/MultiStudentPicker';
import {
  canManageClassActivities,
  canViewStudentViolations,
  isBanCanSu,
  isGroupLeader,
  isHomeroomTeacher
} from '../../utils/permissionUtils';

export const ViolationsView: React.FC = () => {
  const {
    violations,
    students,
    updateViolationStatus,
    addViolation,
    batchAddViolations,
    deleteViolation,
    currentUserRole,
    setSelectedStudentIdForDetail
  } = useApp();

  const canEdit = canManageClassActivities(currentUserRole.role);
  const isGVCN = isHomeroomTeacher(currentUserRole.role);
  const isBCS = isBanCanSu(currentUserRole.role);
  const isTT = isGroupLeader(currentUserRole.role);

  const [editingViolation, setEditingViolation] = useState<ViolationRecord | null>(null);
  // Mặc định hiển thị dữ liệu vi phạm trong tuần
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('this_week');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<number | 'all'>(() => {
    return isTT && currentUserRole.groupId ? currentUserRole.groupId : 'all';
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for adding violation (supports selecting 1, multiple, group, or whole class)
  const [newStudentIds, setNewStudentIds] = useState<string[]>(students[0]?.id ? [students[0].id] : []);
  const [newCategory, setNewCategory] = useState<ViolationCategory>('Nề nếp');
  const [newSeverity, setNewSeverity] = useState<ViolationSeverity>('Nhẹ');
  const [newTitle, setNewTitle] = useState('');
  const [newPenalty, setNewPenalty] = useState(-2);
  const [newNote, setNewNote] = useState('');
  const [newRemedy, setNewRemedy] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const studentMap = useMemo(() => {
    const map: Record<string, typeof students[0]> = {};
    students.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const student = studentMap[v.studentId];
      if (!student) return false;

      // Phân quyền xem vi phạm:
      // - GVCN & Ban cán sự: xem vi phạm cả lớp
      // - TT (Tổ trưởng/Tổ phó): xem vi phạm các thành viên trong tổ
      // - Cá nhân học sinh: CHỈ xem vi phạm của bản thân mình
      const hasPermission = canViewStudentViolations(currentUserRole, {
        id: student.id,
        groupId: student.groupId,
      });
      if (!hasPermission) return false;

      const matchSearch =
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentCode.includes(searchTerm) ||
        v.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = filterCategory === 'all' || v.category === filterCategory;
      const matchSeverity = filterSeverity === 'all' || v.severity === filterSeverity;
      const matchStatus = filterStatus === 'all' || v.status === filterStatus;
      const matchGroup = filterGroup === 'all' || student.groupId === filterGroup;
      const matchTime = isDateInRange(v.date, timeRange, customStartDate, customEndDate);

      return matchSearch && matchCategory && matchSeverity && matchStatus && matchGroup && matchTime;
    });
  }, [violations, studentMap, currentUserRole, searchTerm, filterCategory, filterSeverity, filterStatus, filterGroup, timeRange, customStartDate, customEndDate]);

  // Summary counts based on filtered time range
  const totalCount = filteredViolations.length;
  const resolvedCount = filteredViolations.filter(v => v.status === 'Đã tiến bộ').length;
  const inProgressCount = filteredViolations.filter(v => v.status === 'Đang khắc phục' || v.status === 'Đã nhắc nhở').length;
  const newCount = filteredViolations.filter(v => v.status === 'Đã ghi nhận').length;

  const handleSeverityChange = (sev: ViolationSeverity) => {
    setNewSeverity(sev);
    if (sev === 'Nhẹ') setNewPenalty(-2);
    else if (sev === 'Vừa') setNewPenalty(-4);
    else if (sev === 'Nặng') setNewPenalty(-6);
    else if (sev === 'Rất nặng') setNewPenalty(-10);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!newStudentIds || newStudentIds.length === 0 || !newTitle.trim()) return;

    if (newStudentIds.length === 1) {
      addViolation({
        studentId: newStudentIds[0],
        date: newDate,
        category: newCategory,
        severity: newSeverity,
        title: newTitle.trim(),
        penaltyPoints: newPenalty,
        note: newNote,
        recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
        status: 'Đã ghi nhận',
        remedyAction: newRemedy,
      });
    } else {
      const records = newStudentIds.map(sId => ({
        studentId: sId,
        date: newDate,
        category: newCategory,
        severity: newSeverity,
        title: newTitle.trim(),
        penaltyPoints: newPenalty,
        note: newNote,
        recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
        status: 'Đã ghi nhận' as ViolationProcessStatus,
        remedyAction: newRemedy,
      }));
      batchAddViolations(records);
    }

    setIsAddModalOpen(false);
    setNewTitle('');
    setNewNote('');
    setNewRemedy('');
  };

  const handleDelete = (id: string) => {
    if (!canEdit) return;
    deleteViolation(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Theo Dõi Vi Phạm Nề Nếp & Tiến Trình Khắc Phục</h2>
            <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredViolations.length} ghi nhận
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mục tiêu giáo dục: Nhắc nhở kịp thời, hỗ trợ khắc phục và ghi nhận sự tiến bộ của học sinh
          </p>
        </div>

        {canEdit ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi nhận vi phạm</span>
          </button>
        ) : (
          <div className="px-3.5 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 self-start md:self-auto">
            Chế độ chỉ xem
          </div>
        )}
      </div>

      {/* Role Permission Scope Banner */}
      {!isGVCN && !isBCS && (
        <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900 shadow-xs">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="leading-relaxed">
            {isTT ? (
              <span>
                <strong>Quyền hạn Tổ trưởng / Tổ phó:</strong> Bạn chỉ xem danh sách vi phạm của các thành viên trong <strong>Tổ {currentUserRole.groupId || 1}</strong>.
              </span>
            ) : (
              <span>
                <strong>Quyền hạn Cá nhân:</strong> Bạn chỉ xem danh sách vi phạm của <strong>chính bản thân mình</strong> ({currentUserRole.name}) để theo dõi và khắc phục nề nếp.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Time Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-rose-600" />
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

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-slate-500 block font-semibold">Tổng số vi phạm</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</div>
          <span className="text-[10px] text-slate-400">Trong thời gian lọc</span>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-800 font-semibold block">Mới ghi nhận</span>
          <div className="text-2xl font-black text-amber-700 mt-0.5">{newCount}</div>
          <span className="text-[10px] text-amber-600">Cần cán sự nhắc nhở</span>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-blue-800 font-semibold block">Đang khắc phục</span>
          <div className="text-2xl font-black text-blue-700 mt-0.5">{inProgressCount}</div>
          <span className="text-[10px] text-blue-600">Đang theo dõi</span>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-emerald-800 font-semibold block">Đã tiến bộ 🎉</span>
          <div className="text-2xl font-black text-emerald-700 mt-0.5">{resolvedCount}</div>
          <span className="text-[10px] text-emerald-600">Đã sửa đổi tốt</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học sinh, nội dung lỗi..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="all">Tất cả phân loại</option>
              <option value="Nề nếp">Nề nếp</option>
              <option value="Học tập">Học tập</option>
              <option value="Khác">Khác</option>
            </select>

            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="Nhẹ">Nhẹ (-2đ)</option>
              <option value="Vừa">Vừa (-4đ)</option>
              <option value="Nặng">Nặng (-6đ)</option>
              <option value="Rất nặng">Rất nặng (-10đ)</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đã ghi nhận">Đã ghi nhận</option>
              <option value="Đã nhắc nhở">Đã nhắc nhở</option>
              <option value="Đang khắc phục">Đang khắc phục</option>
              <option value="Đã tiến bộ">Đã tiến bộ</option>
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

      {/* Violation Records List */}
      <div className="space-y-3">
        {filteredViolations.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
            <AlertTriangle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Không có ghi nhận vi phạm nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          filteredViolations.map(vio => {
            const student = studentMap[vio.studentId];
            if (!student) return null;

            return (
              <div
                key={vio.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3 text-xs group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                          className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer text-sm"
                        >
                          {student.fullName}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold text-[11px]">
                          Tổ {student.groupId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            vio.severity === 'Nhẹ'
                              ? 'bg-amber-100 text-amber-800'
                              : vio.severity === 'Vừa'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {vio.severity} ({vio.penaltyPoints}đ)
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Ngày ghi nhận: <strong>{vio.date}</strong> • Người ghi: <strong>{vio.recordedBy}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Penalty points display & Action Buttons */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-sm font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                      {vio.penaltyPoints} Điểm thi đua
                    </span>

                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingViolation(vio)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                          title="Sửa chi tiết vi phạm / Đổi học sinh nếu ghi nhầm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        {deleteConfirmId === vio.id ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-300 shadow-2xs">
                            <span className="text-[11px] text-rose-800 font-extrabold px-1">Xóa?</span>
                            <button
                              onClick={() => handleDelete(vio.id)}
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
                            onClick={() => setDeleteConfirmId(vio.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                            title="Xóa vi phạm này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-slate-800">
                    Nội dung lỗi: <span className="text-slate-900 font-semibold">{vio.title}</span>
                  </div>
                  {vio.note && (
                    <div className="text-slate-600 italic">
                      Chi tiết: {vio.note}
                    </div>
                  )}
                  {vio.remedyAction && (
                    <div className="text-emerald-800 font-medium pt-1 border-t border-slate-200/60">
                      Biện pháp khắc phục: {vio.remedyAction}
                    </div>
                  )}
                </div>

                {/* Status Transition Control Steps */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-slate-500 text-[11px] font-medium">
                    Tiến trình giáo dục & khắc phục:
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['Đã ghi nhận', 'Đã nhắc nhở', 'Đang khắc phục', 'Đã tiến bộ'] as ViolationProcessStatus[]).map(st => (
                      <button
                        key={st}
                        disabled={!canEdit}
                        onClick={() => canEdit && updateViolationStatus(vio.id, st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          vio.status === st
                            ? st === 'Đã tiến bộ'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'Đang khắc phục'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-900 text-white shadow-xs'
                            : canEdit
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 cursor-pointer'
                            : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-default opacity-60'
                        }`}
                      >
                        {st === 'Đã tiến bộ' ? '✨ ' : ''}{st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Violation */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 text-rose-800 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Vi Phạm Nề Nếp</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <MultiStudentPicker
                  students={students}
                  selectedStudentIds={newStudentIds}
                  onChange={setNewStudentIds}
                  label="Học sinh vi phạm"
                  helperText="Có thể chọn 1 học sinh, nhiều học sinh, theo tổ hoặc toàn lớp"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân loại lỗi</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Nề nếp">Nề nếp (đồng phục, muộn...)</option>
                    <option value="Học tập">Học tập (bài tập, dụng cụ...)</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ vi phạm</label>
                  <select
                    value={newSeverity}
                    onChange={e => handleSeverityChange(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Nhẹ">Nhẹ (-2đ)</option>
                    <option value="Vừa">Vừa (-4đ)</option>
                    <option value="Nặng">Nặng (-6đ)</option>
                    <option value="Rất nặng">Rất nặng (-10đ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung vi phạm <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Đi học muộn 10 phút, Không sơ vin, Sử dụng điện thoại..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày vi phạm</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm trừ thi đua</label>
                  <input
                    type="number"
                    value={newPenalty}
                    onChange={e => setNewPenalty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-rose-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú cụ thể</label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Mô tả hoàn cảnh, số lần vi phạm..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biện pháp khắc phục / Hướng xử lý</label>
                <input
                  type="text"
                  value={newRemedy}
                  onChange={e => setNewRemedy(e.target.value)}
                  placeholder="Ví dụ: Làm bù nhật ký trực nhật, Nhắc nhở trước lớp..."
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu Vi Phạm {newStudentIds.length > 1 ? `(${newStudentIds.length} HS)` : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Violation Modal */}
      <EditViolationModal
        violation={editingViolation}
        isOpen={!!editingViolation}
        onClose={() => setEditingViolation(null)}
      />
    </div>
  );
};
