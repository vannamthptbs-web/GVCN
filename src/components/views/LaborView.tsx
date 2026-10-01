import React, { useState, useMemo } from 'react';
import {
  Hammer,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  Trash2,
  MapPin,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Edit3,
  Check,
  ChevronDown,
  Info,
  BadgeAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import { LaborActivity, LaborStatus, LaborStudentStatus } from '../../types';
import { canManageLabor } from '../../utils/permissionUtils';

export const LaborView: React.FC = () => {
  const {
    laborActivities,
    addLaborActivity,
    updateLaborActivity,
    confirmLaborActivity,
    deleteLaborActivity,
    students,
    currentUserRole,
    classInfo,
  } = useApp();

  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [confirmingActivity, setConfirmingActivity] = useState<LaborActivity | null>(null);
  const [editingActivity, setEditingActivity] = useState<LaborActivity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const isAuthorizedLabor = canManageLabor(currentUserRole?.role);

  // New Labor Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newLoc, setNewLoc] = useState('Khuôn viên trường');
  const [newGroupScope, setNewGroupScope] = useState<'all' | 'groups'>('all');
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([1, 2, 3, 4]);
  const [newNotes, setNewNotes] = useState('');

  // Evaluation / Inspection State inside Modal
  const [evalStatus, setEvalStatus] = useState<LaborStatus>('Hoàn thành tốt');
  const [evalInspectorName, setEvalInspectorName] = useState(
    currentUserRole.role.includes('GVCN') ? 'Cô Nguyễn Thị Mai' : 'Nguyễn Đức Thắng'
  );
  const [evalInspectorRole, setEvalInspectorRole] = useState(
    currentUserRole.role.includes('GVCN') ? 'Giáo viên chủ nhiệm' : 'Lớp phó Lao động'
  );
  const [evalNote, setEvalNote] = useState('');
  const [evalStudentStatuses, setEvalStudentStatuses] = useState<
    Record<string, { status: LaborStudentStatus; note?: string; pointsDelta?: number }>
  >({});

  const filteredActivities = useMemo(() => {
    return laborActivities.filter(act => {
      const inDate = isDateInRange(act.date, timeRange, customStartDate, customEndDate);
      if (!inDate) return false;

      const isPending = !act.isConfirmed || act.status === 'Chờ thực hiện';
      if (statusFilter === 'pending') return isPending;
      if (statusFilter === 'confirmed') return !isPending;
      return true;
    });
  }, [laborActivities, timeRange, customStartDate, customEndDate, statusFilter]);

  // Summary counts
  const summary = useMemo(() => {
    const total = laborActivities.length;
    const pending = laborActivities.filter(a => !a.isConfirmed || a.status === 'Chờ thực hiện').length;
    const confirmed = total - pending;
    return { total, pending, confirmed };
  }, [laborActivities]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorizedLabor) return;
    if (!newTitle.trim()) return;

    const assignedGroups = newGroupScope === 'all' ? [1, 2, 3, 4] : selectedGroupIds;
    const assignedLabel =
      newGroupScope === 'all'
        ? `Toàn lớp ${classInfo.className} (4 tổ)`
        : `Tổ ${assignedGroups.sort().join(', Tổ ')}`;

    // Target students
    const targetStudents =
      newGroupScope === 'all' ? students : students.filter(s => assignedGroups.includes(s.groupId));

    addLaborActivity({
      title: newTitle.trim(),
      date: newDate,
      location: newLoc,
      assignedGroup: assignedLabel,
      assignedGroupIds: assignedGroups,
      description: newNotes,
      notes: newNotes,
      status: 'Chờ thực hiện',
      isConfirmed: false,
      participations: targetStudents.map(s => ({
        studentId: s.id,
        status: 'Có mặt',
        note: '',
      })),
    });

    setIsAddOpen(false);
    setNewTitle('');
    setNewNotes('');
  };

  const handleOpenEvaluationModal = (act: LaborActivity) => {
    setConfirmingActivity(act);
    setEvalStatus(act.status && act.status !== 'Chờ thực hiện' ? act.status : 'Hoàn thành tốt');
    setEvalInspectorName(
      act.inspectorName ||
        (currentUserRole.role.includes('GVCN') ? 'Cô Nguyễn Thị Mai' : 'Nguyễn Đức Thắng')
    );
    setEvalInspectorRole(
      act.inspectorRole ||
        (currentUserRole.role.includes('GVCN') ? 'Giáo viên chủ nhiệm' : 'Lớp phó Lao động')
    );
    setEvalNote(act.evaluationNote || act.notes || '');

    // Map existing student statuses
    const map: Record<string, { status: LaborStudentStatus; note?: string; pointsDelta?: number }> = {};
    const relevantStudents =
      act.assignedGroupIds && act.assignedGroupIds.length > 0
        ? students.filter(s => act.assignedGroupIds?.includes(s.groupId))
        : students;

    relevantStudents.forEach(st => {
      const existing = act.participations?.find(p => p.studentId === st.id);
      if (existing) {
        map[st.id] = {
          status: existing.status,
          note: existing.note || '',
          pointsDelta: existing.pointsDelta,
        };
      } else {
        map[st.id] = {
          status: 'Có mặt',
          note: '',
        };
      }
    });
    setEvalStudentStatuses(map);
  };

  const handleSaveEvaluation = () => {
    if (!isAuthorizedLabor || !confirmingActivity) return;

    const participations = (Object.entries(evalStudentStatuses) as [string, { status: LaborStudentStatus; note?: string; pointsDelta?: number }][]).map(([studentId, item]) => {
      let delta = item.pointsDelta;
      if (delta === undefined) {
        if (item.status === 'Hoàn thành tốt') delta = 2;
        else if (item.status === 'Có mặt') delta = 1;
        else if (item.status === 'Vắng có phép') delta = 0;
        else if (item.status === 'Vắng không phép') delta = -3;
        else if (item.status === 'Chưa hoàn thành') delta = -2;
      }
      return {
        studentId,
        status: item.status,
        note: item.note,
        pointsDelta: delta,
      };
    });

    confirmLaborActivity(confirmingActivity.id, {
      status: evalStatus,
      inspectorName: evalInspectorName,
      inspectorRole: evalInspectorRole,
      evaluationNote: evalNote,
      participations,
    });

    setConfirmingActivity(null);
  };

  const handleDelete = (id: string) => {
    if (!isAuthorizedLabor) return;
    deleteLaborActivity(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Quản Lý Phân Công & Nghiệm Thu Lao Động</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Lớp phó Lao động & GVCN
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Theo dõi kế hoạch lao động, dọn dẹp vệ sinh trường lớp. <strong>Quy tắc thi đua:</strong> Khi phân công (Chờ thực hiện) hệ thống tuyệt đối không trừ hoặc cộng điểm; điểm số chỉ được áp dụng vào thi đua sau khi hoàn thành và có xác nhận nghiệm thu.
          </p>
        </div>

        {isAuthorizedLabor ? (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-amber-600/20 flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Lên kế hoạch phân công mới</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start md:self-auto">
            <Info className="w-4 h-4 text-slate-500" />
            <span>Chế độ chỉ xem ({currentUserRole.title})</span>
          </span>
        )}
      </div>

      {/* Metric Counters & Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{summary.pending}</div>
            <div className="text-xs font-medium text-slate-500">Chờ thực hiện (Chưa tính điểm)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{summary.confirmed}</div>
            <div className="text-xs font-medium text-slate-500">Đã nghiệm thu (Đã tính điểm)</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex items-start gap-2.5">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900">
            <p className="font-bold">Quy tắc chuẩn hóa điểm số lao động:</p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              • Hoàn thành tốt: <strong>+2đ</strong> | Có mặt: <strong>+1đ</strong> | Nghỉ có phép: <strong>0đ</strong><br />
              • Vắng không phép: <strong>-3đ</strong> | Bỏ về / Chưa xong: <strong>-2đ</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-amber-600" />
            Thời gian:
          </span>
          <TimeRangePicker
            selectedOption={timeRange}
            onChangeOption={setTimeRange}
            customStartDate={customStartDate}
            onChangeCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            onChangeCustomEndDate={setCustomEndDate}
          />
        </div>

        <div className="flex items-center gap-1.5 self-stretch md:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({laborActivities.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Chờ thực hiện ({summary.pending})
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              statusFilter === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã nghiệm thu ({summary.confirmed})
          </button>
        </div>
      </div>

      {/* List of activities */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
            <Hammer className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Không có đợt lao động nào trong khoảng lọc đã chọn</p>
            <p className="text-slate-400 mt-1">Chọn mốc thời gian khác hoặc nhấn "Lên kế hoạch phân công mới"</p>
          </div>
        ) : (
          filteredActivities.map(act => {
            const isConfirmed = act.isConfirmed && act.status !== 'Chờ thực hiện';
            const relevantStudents =
              act.assignedGroupIds && act.assignedGroupIds.length > 0
                ? students.filter(s => act.assignedGroupIds?.includes(s.groupId))
                : students;

            const goodCount = act.participations?.filter(p => p.status === 'Hoàn thành tốt').length || 0;
            const presentCount = act.participations?.filter(p => p.status === 'Có mặt').length || 0;
            const excusedCount = act.participations?.filter(p => p.status === 'Vắng có phép').length || 0;
            const unexcusedCount = act.participations?.filter(p => p.status === 'Vắng không phép').length || 0;
            const incompleteCount = act.participations?.filter(p => p.status === 'Chưa hoàn thành').length || 0;

            return (
              <div
                key={act.id}
                className={`bg-white p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs group ${
                  isConfirmed ? 'border-slate-200 hover:border-emerald-300' : 'border-amber-200 bg-amber-50/20 hover:border-amber-400'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">{act.title}</span>

                    {isConfirmed ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã nghiệm thu: {act.status} (Đã tính điểm)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        Kế hoạch chờ thực hiện (Chưa tính điểm)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600 text-xs">
                    <span className="flex items-center gap-1">📅 Ngày: <strong>{act.date}</strong></span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-600" /> Địa điểm: <strong>{act.location}</strong></span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-600" /> Phân công: <strong>{act.assignedGroup || 'Toàn lớp'}</strong></span>
                    <span>👥 Lực lượng: <strong>{relevantStudents.length} học sinh</strong></span>
                  </div>

                  {/* Inspector and confirmation notes */}
                  {isConfirmed ? (
                    <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-emerald-950 space-y-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Người nghiệm thu: {act.inspectorName} ({act.inspectorRole || 'Cán sự'})</span>
                        {act.confirmedAt && (
                          <span className="text-[10px] text-emerald-700">
                            • {new Date(act.confirmedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      {act.evaluationNote && (
                        <p className="text-slate-600 text-[11px] italic">
                          "{act.evaluationNote}"
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1 text-[11px] flex-wrap">
                        <span className="text-emerald-700 font-medium">Tốt (+2đ): <strong>{goodCount}</strong></span>
                        <span className="text-blue-700 font-medium">Có mặt (+1đ): <strong>{presentCount}</strong></span>
                        {excusedCount > 0 && <span className="text-slate-600">Nghỉ phép (0đ): <strong>{excusedCount}</strong></span>}
                        {unexcusedCount > 0 && <span className="text-rose-700 font-bold">Vắng k.phép (-3đ): <strong>{unexcusedCount}</strong></span>}
                        {incompleteCount > 0 && <span className="text-amber-700 font-bold">Chưa xong (-2đ): <strong>{incompleteCount}</strong></span>}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-200/80 text-amber-900 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Kế hoạch đang phân công. Học sinh trong danh sách <strong>chưa bị trừ hay cộng bất kỳ điểm nào</strong> cho đến khi GVCN hoặc Lớp phó Lao động tiến hành nghiệm thu sau khi lao động hoàn tất.
                      </span>
                    </div>
                  )}

                  {act.description && (
                    <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200/80 text-[11px]">
                      Yêu cầu: {act.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleOpenEvaluationModal(act)}
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      !isAuthorizedLabor || isConfirmed
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>
                      {isAuthorizedLabor 
                        ? (isConfirmed ? 'Xem / Sửa nghiệm thu' : 'Nghiệm thu & Chấm điểm')
                        : 'Xem chi tiết nghiệm thu'}
                    </span>
                  </button>

                  {isAuthorizedLabor && (
                    deleteConfirmId === act.id ? (
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
                        title="Xóa đợt lao động này"
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

      {/* Modal Add Labor Plan */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Hammer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Lên Kế Hoạch Phân Công Lao Động</h3>
                  <p className="text-[11px] text-slate-500">Kế hoạch lập ra ở trạng thái Chờ thực hiện (chưa tính điểm)</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-base">✕</button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung lao động / Công việc <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Tổng vệ sinh chuẩn bị lễ 20-11, chăm sóc bồn hoa..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày thực hiện</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={newLoc}
                    onChange={e => setNewLoc(e.target.value)}
                    placeholder="Sân trường / Nhà thi đấu / Bồn hoa"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phân công lực lượng tham gia</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="groupScope"
                      checked={newGroupScope === 'all'}
                      onChange={() => setNewGroupScope('all')}
                    />
                    <span>Toàn bộ 4 tổ ({students.length} HS)</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="groupScope"
                      checked={newGroupScope === 'groups'}
                      onChange={() => setNewGroupScope('groups')}
                    />
                    <span>Chỉ định theo tổ</span>
                  </label>
                </div>

                {newGroupScope === 'groups' && (
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    {[1, 2, 3, 4].map(g => (
                      <label key={g} className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedGroupIds(prev => [...prev, g]);
                            } else {
                              setSelectedGroupIds(prev => prev.filter(x => x !== g));
                            }
                          }}
                        />
                        <span>Tổ {g}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dụng cụ & Hướng dẫn cụ thể</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Mang chổi rễ, giẻ lau, xô nước, khẩu trang..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                💡 <strong>Lưu ý:</strong> Khi lưu kế hoạch, học sinh sẽ được ghi nhận trong danh sách chờ. Điểm số chỉ được cộng hoặc trừ khi bạn nhấn <em>"Nghiệm thu & Chấm điểm"</em> sau khi hoàn thành.
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Lưu Kế Hoạch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Evaluation / Inspection */}
      {confirmingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-slate-200 text-xs animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Nghiệm Thu & Chấm Điểm Lao Động</h3>
                  <p className="text-[11px] text-slate-500">
                    Đợt: <strong>{confirmingActivity.title}</strong> ({confirmingActivity.date})
                  </p>
                </div>
              </div>
              <button onClick={() => setConfirmingActivity(null)} className="text-slate-400 hover:text-slate-600 font-bold text-base">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ hoàn thành chung</label>
                  <select
                    value={evalStatus}
                    onChange={e => setEvalStatus(e.target.value as LaborStatus)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    <option value="Hoàn thành tốt">Hoàn thành tốt (Xuất sắc)</option>
                    <option value="Hoàn thành">Hoàn thành (Đạt yêu cầu)</option>
                    <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                    <option value="Chờ thực hiện">Chờ thực hiện (Chưa nghiệm thu)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người nghiệm thu</label>
                  <input
                    type="text"
                    value={evalInspectorName}
                    onChange={e => setEvalInspectorName(e.target.value)}
                    placeholder="Họ tên người kiểm tra"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vai trò người kiểm tra</label>
                  <select
                    value={evalInspectorRole}
                    onChange={e => setEvalInspectorRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Lớp phó Lao động">Lớp phó Lao động</option>
                    <option value="Giáo viên chủ nhiệm">Giáo viên chủ nhiệm</option>
                    <option value="Lớp trưởng">Lớp trưởng</option>
                    <option value="Đoàn trường">Ban Chấp Hành Đoàn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhận xét nghiệm thu chi tiết</label>
                <input
                  type="text"
                  value={evalNote}
                  onChange={e => setEvalNote(e.target.value)}
                  placeholder="Ví dụ: Khu vực sạch sẽ, hoàn thành đúng giờ, các bạn tích cực..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              {/* Individual Student Grading Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 text-sm">
                    Đánh giá từng học sinh ({Object.keys(evalStudentStatuses).length} HS):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...evalStudentStatuses };
                        Object.keys(updated).forEach(id => {
                          updated[id] = { ...updated[id], status: 'Hoàn thành tốt', pointsDelta: 2 };
                        });
                        setEvalStudentStatuses(updated);
                      }}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[10px]"
                    >
                      Tất cả Hoàn thành tốt (+2đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...evalStudentStatuses };
                        Object.keys(updated).forEach(id => {
                          updated[id] = { ...updated[id], status: 'Có mặt', pointsDelta: 1 };
                        });
                        setEvalStudentStatuses(updated);
                      }}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg text-[10px]"
                    >
                      Tất cả Có mặt (+1đ)
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 sticky top-0 text-[11px] font-bold text-slate-700">
                      <tr>
                        <th className="p-2 border-b border-slate-200">Mã & Họ tên</th>
                        <th className="p-2 border-b border-slate-200">Tổ</th>
                        <th className="p-2 border-b border-slate-200">Đánh giá hoàn thành</th>
                        <th className="p-2 border-b border-slate-200">Điểm (±)</th>
                        <th className="p-2 border-b border-slate-200">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.keys(evalStudentStatuses).map(studentId => {
                        const st = students.find(s => s.id === studentId);
                        const record = evalStudentStatuses[studentId];
                        if (!st) return null;

                        return (
                          <tr key={studentId} className="hover:bg-slate-50/80">
                            <td className="p-2 font-medium">
                              <span className="font-bold text-slate-900">{st.fullName}</span>
                              <span className="text-[10px] text-slate-400 block">{st.studentCode}</span>
                            </td>
                            <td className="p-2">Tổ {st.groupId}</td>
                            <td className="p-2">
                              <select
                                value={record.status}
                                onChange={e => {
                                  const newSt = e.target.value as LaborStudentStatus;
                                  let delta = 1;
                                  if (newSt === 'Hoàn thành tốt') delta = 2;
                                  else if (newSt === 'Có mặt') delta = 1;
                                  else if (newSt === 'Vắng có phép') delta = 0;
                                  else if (newSt === 'Vắng không phép') delta = -3;
                                  else if (newSt === 'Chưa hoàn thành') delta = -2;

                                  setEvalStudentStatuses(prev => ({
                                    ...prev,
                                    [studentId]: {
                                      ...prev[studentId],
                                      status: newSt,
                                      pointsDelta: delta,
                                    },
                                  }));
                                }}
                                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                              >
                                <option value="Hoàn thành tốt">Hoàn thành tốt (+2đ)</option>
                                <option value="Có mặt">Có mặt đầy đủ (+1đ)</option>
                                <option value="Vắng có phép">Vắng có phép (0đ)</option>
                                <option value="Vắng không phép">Vắng không phép (-3đ)</option>
                                <option value="Chưa hoàn thành">Chưa hoàn thành (-2đ)</option>
                              </select>
                            </td>
                            <td className="p-2 font-bold">
                              {record.pointsDelta !== undefined ? (
                                <span
                                  className={
                                    record.pointsDelta > 0
                                      ? 'text-emerald-600'
                                      : record.pointsDelta < 0
                                      ? 'text-rose-600'
                                      : 'text-slate-500'
                                  }
                                >
                                  {record.pointsDelta > 0 ? `+${record.pointsDelta}` : record.pointsDelta}đ
                                </span>
                              ) : (
                                <span className="text-emerald-600">+1đ</span>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={record.note || ''}
                                onChange={e => {
                                  const text = e.target.value;
                                  setEvalStudentStatuses(prev => ({
                                    ...prev,
                                    [studentId]: {
                                      ...prev[studentId],
                                      note: text,
                                    },
                                  }));
                                }}
                                placeholder="Ghi chú nếu có..."
                                className="w-full px-2 py-0.5 border border-slate-200 rounded text-[11px]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[11px] text-slate-500 italic">
                {!isAuthorizedLabor
                  ? '🔒 Bạn đang xem ở chế độ chỉ đọc. Chỉ GVCN hoặc Lớp phó Lao động mới có quyền lưu nghiệm thu.'
                  : evalStatus === 'Chờ thực hiện'
                  ? '⚠️ Lưu ý: Đang chọn Chờ thực hiện sẽ không cộng hoặc trừ điểm cho học sinh.'
                  : '✅ Điểm số sẽ được tự động cộng/trừ vào bảng thi đua ngay sau khi xác nhận.'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingActivity(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-600 hover:bg-slate-100"
                >
                  {isAuthorizedLabor ? 'Hủy' : 'Đóng'}
                </button>
                {isAuthorizedLabor && (
                  <button
                    type="button"
                    onClick={handleSaveEvaluation}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                  >
                    Xác Nhận Nghiệm Thu & Lưu Điểm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
