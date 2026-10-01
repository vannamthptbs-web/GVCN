import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Plus,
  Check,
  XCircle,
  ThumbsUp,
  Clock,
  Edit2,
  Trash2,
  ShieldCheck,
  UserCheck,
  Filter,
  Wand2,
  X,
  Info,
  CalendarDays,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DutyStatus, CleaningDuty } from '../../types';
import { canManageDuty, isHomeroomTeacher } from '../../utils/permissionUtils';
import { getCurrentSchoolWeek } from '../../utils/emulationHistory';

const STATUS_LIST: DutyStatus[] = [
  'Chờ trực',
  'Hoàn thành tốt',
  'Hoàn thành',
  'Chưa hoàn thành',
  'Không thực hiện'
];

const QUICK_COMMENTS = [
  'Lớp sạch sẽ, bảng lau sạch, bục giảng gọn gàng (+2đ)',
  'Kê bàn ghế ngay ngắn thẳng hàng, gom đổ rác đúng giờ',
  'Đã vệ sinh đạt yêu cầu chung',
  'Còn sót một số mẩu rác dưới gầm bàn dãy cuối (-2đ)',
  'Chưa lau bục giảng và chưa giặt khăn lau bảng (-2đ)',
  'Chưa tắt quạt và đóng cửa sổ khi ra về (-2đ)',
  'Bỏ bê trực nhật, không thực hiện theo lịch phân công (-5đ)'
];

export const DutyView: React.FC = () => {
  const {
    cleaningDuties,
    students,
    updateDutyStatus,
    updateDuty,
    addDuty,
    deleteDuty,
    currentUserRole,
    setCurrentUserRole,
    availableRoles,
    groupScores
  } = useApp();

  // Selected week filter - Mặc định tuần hiện tại
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(() => getCurrentSchoolWeek());
  // Group filter
  const [filterGroup, setFilterGroup] = useState<number | 'all'>('all');
  // Status filter
  const [filterStatus, setFilterStatus] = useState<DutyStatus | 'all'>('all');
  // Search text
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<CleaningDuty | null>(null);
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formGroupId, setFormGroupId] = useState<number>(1);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<DutyStatus>('Chờ trực');
  const [formAssignedType, setFormAssignedType] = useState<'all_group' | 'custom'>('all_group');
  const [formSelectedStudentIds, setFormSelectedStudentIds] = useState<string[]>([]);
  const [formNote, setFormNote] = useState<string>('');

  // Auto-schedule form state
  const [autoStartDate, setAutoStartDate] = useState<string>(() => {
    // Default to nearest Monday or today
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [autoStartingGroup, setAutoStartingGroup] = useState<number>(1);

  // Check permissions: GVCN, Lớp trưởng, Lớp phó Lao động
  const isAuthorized = canManageDuty(currentUserRole.role);
  const isGVCN = isHomeroomTeacher(currentUserRole.role);

  // Helper: Format Vietnamese date with weekday
  const formatVietnameseDate = (dateStr: string) => {
    try {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayOfWeek = weekdays[d.getDay()] || '';
        return `${dayOfWeek}, ${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper: Get Group Badge Styling
  const getGroupBadgeStyle = (groupId: number) => {
    switch (groupId) {
      case 1:
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-500/20';
      case 2:
        return 'bg-blue-50 text-blue-800 border-blue-300 ring-blue-500/20';
      case 3:
        return 'bg-amber-50 text-amber-900 border-amber-300 ring-amber-500/20';
      case 4:
        return 'bg-purple-50 text-purple-900 border-purple-300 ring-purple-500/20';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-500/20';
    }
  };

  // Status Badge Component
  const getStatusBadge = (status: DutyStatus) => {
    switch (status) {
      case 'Hoàn thành tốt':
        return (
          <span className="bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hoàn thành tốt (+2đ)</span>
          </span>
        );
      case 'Hoàn thành':
        return (
          <span className="bg-blue-100/90 text-blue-900 border border-blue-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Đạt yêu cầu (0đ)</span>
          </span>
        );
      case 'Chưa hoàn thành':
        return (
          <span className="bg-amber-100/90 text-amber-950 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Chưa sạch (-2đ)</span>
          </span>
        );
      case 'Không thực hiện':
        return (
          <span className="bg-rose-100/90 text-rose-950 border border-rose-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Bỏ trực nhật (-5đ)</span>
          </span>
        );
      case 'Chờ trực':
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Chờ trực (0đ)</span>
          </span>
        );
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormGroupId(1);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStatus('Chờ trực');
    setFormAssignedType('all_group');
    const groupStudents = students.filter(s => s.groupId === 1);
    setFormSelectedStudentIds(groupStudents.map(s => s.id));
    setFormNote('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (duty: CleaningDuty) => {
    setEditingDuty(duty);
    setFormGroupId(duty.groupId);
    setFormDate(duty.date);
    setFormStatus(duty.status);
    const groupStudents = students.filter(s => s.groupId === duty.groupId);
    if (
      duty.assignedStudentIds.length === 0 ||
      duty.assignedStudentIds.length === groupStudents.length
    ) {
      setFormAssignedType('all_group');
      setFormSelectedStudentIds(groupStudents.map(s => s.id));
    } else {
      setFormAssignedType('custom');
      setFormSelectedStudentIds(duty.assignedStudentIds);
    }
    setFormNote(duty.evaluationNote || '');
  };

  // When form group ID changes, update selected student IDs if all_group
  const handleFormGroupChange = (newGroupId: number) => {
    setFormGroupId(newGroupId);
    if (formAssignedType === 'all_group') {
      const gStudents = students.filter(s => s.groupId === newGroupId);
      setFormSelectedStudentIds(gStudents.map(s => s.id));
    }
  };

  // Submit Add Duty Form
  const handleSaveAddDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    if (!formDate) {
      alert('Vui lòng chọn ngày trực!');
      return;
    }

    const assignedIds =
      formAssignedType === 'all_group'
        ? students.filter(s => s.groupId === formGroupId).map(s => s.id)
        : formSelectedStudentIds;

    const pointsDelta =
      formStatus === 'Hoàn thành tốt'
        ? 2
        : formStatus === 'Chưa hoàn thành'
        ? -2
        : formStatus === 'Không thực hiện'
        ? -5
        : 0;

    addDuty({
      date: formDate,
      groupId: formGroupId,
      assignedStudentIds: assignedIds,
      status: formStatus,
      evaluationNote: formNote.trim(),
      inspectorName: currentUserRole.name,
      inspectorRole: currentUserRole.title,
      pointsDelta,
      confirmedAt: formStatus !== 'Chờ trực' ? new Date().toISOString() : undefined
    });

    setIsAddModalOpen(false);
  };

  // Submit Edit Duty Form
  const handleSaveEditDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !editingDuty) return;
    if (!formDate) {
      alert('Vui lòng chọn ngày trực!');
      return;
    }

    const assignedIds =
      formAssignedType === 'all_group'
        ? students.filter(s => s.groupId === formGroupId).map(s => s.id)
        : formSelectedStudentIds;

    const pointsDelta =
      formStatus === 'Hoàn thành tốt'
        ? 2
        : formStatus === 'Chưa hoàn thành'
        ? -2
        : formStatus === 'Không thực hiện'
        ? -5
        : 0;

    updateDuty({
      ...editingDuty,
      date: formDate,
      groupId: formGroupId,
      assignedStudentIds: assignedIds,
      status: formStatus,
      evaluationNote: formNote.trim(),
      pointsDelta,
      confirmedAt: formStatus !== 'Chờ trực' ? (editingDuty.confirmedAt || new Date().toISOString()) : undefined
    });

    setEditingDuty(null);
  };

  // Handle Auto-Schedule for Week (5 Days Mon - Fri)
  const handleGenerateWeeklySchedule = () => {
    if (!isAuthorized) return;
    if (!autoStartDate) {
      alert('Vui lòng chọn ngày bắt đầu tuần (Thứ Hai)!');
      return;
    }

    const start = new Date(autoStartDate);
    let currentGroup = autoStartingGroup;

    for (let i = 0; i < 5; i++) {
      const dutyDate = new Date(start);
      dutyDate.setDate(start.getDate() + i);
      const dateStr = dutyDate.toISOString().split('T')[0];

      // Check if already exists on date
      const exists = cleaningDuties.some(d => d.date === dateStr);
      if (!exists) {
        const gStudents = students.filter(s => s.groupId === currentGroup).map(s => s.id);
        addDuty({
          date: dateStr,
          groupId: currentGroup,
          assignedStudentIds: gStudents,
          status: 'Chờ trực',
          evaluationNote: `Lịch trực tự động phân công cho Tổ ${currentGroup}`,
          inspectorName: currentUserRole.name,
          inspectorRole: currentUserRole.title,
          pointsDelta: 0
        });
      }

      // Rotate group 1 -> 2 -> 3 -> 4 -> 1
      currentGroup = currentGroup === 4 ? 1 : currentGroup + 1;
    }

    setIsAutoScheduleModalOpen(false);
    alert('Đã tạo xong lịch trực nhật tuần cho các tổ!');
  };

  // Filter and sort cleaning duties
  const filteredDuties = useMemo(() => {
    return cleaningDuties
      .filter(duty => {
        // Filter by group
        if (filterGroup !== 'all' && duty.groupId !== filterGroup) return false;

        // Filter by status
        if (filterStatus !== 'all' && duty.status !== filterStatus) return false;

        // Filter by search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesDate = duty.date.toLowerCase().includes(term);
          const matchesNote = (duty.evaluationNote || '').toLowerCase().includes(term);
          const matchesInspector = (duty.inspectorName || '').toLowerCase().includes(term);
          const assignedStudents = students.filter(s => duty.assignedStudentIds.includes(s.id));
          const matchesStudent = assignedStudents.some(s => s.fullName.toLowerCase().includes(term));
          if (!matchesDate && !matchesNote && !matchesInspector && !matchesStudent) return false;
        }

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Sort by newest date first
  }, [cleaningDuties, filterGroup, filterStatus, searchTerm, students]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900">Quản Lý Trực Nhật & Vệ Sinh Lớp Học</h2>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold px-3 py-0.5 rounded-full shadow-2xs">
              Lớp Học Xanh - Sạch - Đẹp
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Phân công xoay vòng theo 4 tổ • GVCN, Lớp trưởng, Lớp phó Lao động điền tổ, ngày trực & chấm điểm hoàn thành
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Duty Button */}
          {isAuthorized ? (
            <>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                title="Điền tổ, ngày trực và mức độ hoàn thành"
              >
                <Plus className="w-4 h-4" />
                <span>Điền / Thêm Lịch Trực Nhật</span>
              </button>

              <button
                onClick={() => setIsAutoScheduleModalOpen(true)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-800 border border-blue-300 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                title="Tự động phân công xoay vòng 4 tổ cho 5 ngày trong tuần"
              >
                <Wand2 className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Phân công tuần tự động</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              <span>Chỉ GVCN, Lớp trưởng & Lớp phó LĐ có quyền điền lịch</span>
            </div>
          )}
        </div>
      </div>

      {/* Role Notice & Authorization Bar */}
      <div
        className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all shadow-2xs ${
          isAuthorized
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isAuthorized ? (
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 bg-amber-600 text-white rounded-lg shadow-xs">
              <Info className="w-4 h-4" />
            </div>
          )}
          <div>
            <p className="font-extrabold text-[13px] flex items-center gap-1.5">
              <span>Quyền quản lý trực nhật:</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-black ${isAuthorized ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
                {currentUserRole.title} ({currentUserRole.name})
              </span>
            </p>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isAuthorized
                ? '✅ Bạn có đầy đủ quyền điền tổ phân công, chọn ngày trực, chỉnh sửa và chấm mức độ hoàn thành trực nhật.'
                : 'ℹ️ Bạn đang xem ở chế độ chỉ đọc. Chức năng điền tổ, ngày trực và chấm điểm hoàn thành dành cho GVCN, Lớp trưởng và Lớp phó Lao động.'}
            </p>
          </div>
        </div>

        {isGVCN && (
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-600">Thử nghiệm vai trò:</span>
            {availableRoles
              .filter(r => r.role === 'gvcn' || r.role === 'lop_truong' || r.role === 'lop_pho_lao_dong')
              .filter((r, idx, self) => self.findIndex(item => item.role === r.role) === idx)
              .map((r, idx) => {
                const isActive = currentUserRole.role === r.role;
                return (
                  <button
                    key={`${r.role}-${r.accountId || r.studentId || idx}`}
                    type="button"
                    onClick={() => setCurrentUserRole(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all shadow-2xs ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                    title={`Chuyển sang ${r.title}`}
                  >
                    {r.title}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* Duty Rules / Criteria Guide */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 p-4 rounded-2xl shadow-2xs">
        <h4 className="font-extrabold text-amber-950 text-xs mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-600" />
          Tiêu chuẩn đánh giá trực nhật phòng học:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs text-amber-950">
          <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
            <strong className="text-amber-900 block mb-0.5">1. Bảng & Bục giảng:</strong>
            <span className="text-[11px] text-slate-700 leading-relaxed">Lau sạch bảng, giặt khăn lau, xếp phấn gọn gàng.</span>
          </div>
          <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
            <strong className="text-amber-900 block mb-0.5">2. Sàn lớp học:</strong>
            <span className="text-[11px] text-slate-700 leading-relaxed">Quét sạch rác dưới gầm bàn, gom rác vào thùng cuối lớp.</span>
          </div>
          <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
            <strong className="text-amber-900 block mb-0.5">3. Bàn ghế:</strong>
            <span className="text-[11px] text-slate-700 leading-relaxed">Kê ngay ngắn thẳng hàng theo sơ đồ 4 dãy học tập.</span>
          </div>
          <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
            <strong className="text-amber-900 block mb-0.5">4. Cửa & Điện nước:</strong>
            <span className="text-[11px] text-slate-700 leading-relaxed">Tắt quạt, tắt đèn chiếu sáng, chốt cửa sổ khi ra về.</span>
          </div>
        </div>
      </div>

      {/* 4 Groups Cleanliness Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(groupId => {
          const gScore = groupScores[groupId];
          const groupDuties = cleaningDuties.filter(d => d.groupId === groupId);
          const goodCount = groupDuties.filter(d => d.status === 'Hoàn thành tốt').length;
          const okCount = groupDuties.filter(d => d.status === 'Hoàn thành').length;
          const poorCount = groupDuties.filter(d => d.status === 'Chưa hoàn thành' || d.status === 'Không thực hiện').length;

          return (
            <div
              key={groupId}
              className={`bg-white p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-xs ${
                filterGroup === groupId ? 'ring-2 ring-emerald-500 border-emerald-400' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">Tổ {groupId}</span>
                <span className="text-emerald-700 font-black text-base">{gScore?.cleanRate.toFixed(0) || 100}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Tỷ lệ hoàn thành tốt</p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <span>Đã trực: <strong className="text-slate-900">{groupDuties.length}</strong> buổi</span>
                <span className="text-emerald-600 font-bold">{goodCount} tốt</span>
                {poorCount > 0 && <span className="text-rose-600 font-bold">{poorCount} lỗi</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo ngày (YYYY-MM-DD), tên học sinh, người chấm, nhận xét..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium"
            />
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Group Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-slate-500 font-bold text-[11px] whitespace-nowrap">Lọc Tổ:</span>
            <button
              onClick={() => setFilterGroup('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shadow-2xs ${
                filterGroup === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Tất cả tổ ({cleaningDuties.length})
            </button>
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shadow-2xs ${
                  filterGroup === g
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tổ {g} ({cleaningDuties.filter(d => d.groupId === g).length})
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter: Status */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-slate-500 font-bold text-[11px]">Mức độ hoàn thành:</span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Tất cả ({cleaningDuties.length})
          </button>
          {STATUS_LIST.map(st => {
            const count = cleaningDuties.filter(d => d.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === st
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Duty Log & Status Changers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Lịch trực nhật & Đánh giá hàng ngày ({filteredDuties.length} buổi)</span>
          </h3>

          <span className="text-[11px] text-slate-500 font-medium">
            Điểm thi đua: Hoàn thành tốt (+2đ) • Đạt (0đ) • Chưa sạch (-2đ) • Bỏ trực (-5đ)
          </span>
        </div>

        {filteredDuties.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Chưa có lịch trực nhật nào phù hợp với bộ lọc</p>
            <p className="text-xs text-slate-500">
              Nhấn nút "Điền / Thêm Lịch Trực Nhật" để thêm ngày trực mới cho các tổ.
            </p>
            {isAuthorized && (
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Điền Lịch Trực Nhật Ngay</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDuties.map(duty => {
              const assignedStudents = students.filter(s => duty.assignedStudentIds.includes(s.id));
              const formattedDate = formatVietnameseDate(duty.date);

              return (
                <div
                  key={duty.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  {/* Left Column: Group, Date, Students, Notes */}
                  <div className="space-y-2 flex-1 min-w-[280px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{formattedDate}</span>

                      {/* Group badge */}
                      <span
                        className={`font-black px-2.5 py-0.5 rounded-lg text-xs border ring-1 shadow-2xs ${getGroupBadgeStyle(
                          duty.groupId
                        )}`}
                      >
                        TỔ {duty.groupId} TRỰC NHẬT
                      </span>

                      {/* Status badge */}
                      {getStatusBadge(duty.status)}
                    </div>

                    {/* Assigned students */}
                    <div className="flex items-start gap-1.5 text-slate-600 text-xs">
                      <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-500">Học sinh phụ trách: </span>
                        <span className="font-bold text-slate-800">
                          {assignedStudents.length === 0 ||
                          assignedStudents.length === students.filter(s => s.groupId === duty.groupId).length
                            ? `Tất cả học sinh Tổ ${duty.groupId} (${students.filter(s => s.groupId === duty.groupId).length} bạn)`
                            : assignedStudents.map(s => s.fullName).join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Notes & Inspector */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      {duty.evaluationNote ? (
                        <p className="text-slate-700 italic font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                          📝 Nhận xét: "{duty.evaluationNote}"
                        </p>
                      ) : (
                        <span className="italic text-slate-400">Chưa có nhận xét vệ sinh</span>
                      )}

                      {duty.inspectorName && duty.status !== 'Chờ trực' && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          Đánh giá bởi: <strong className="text-slate-800">{duty.inspectorName}</strong> ({duty.inspectorRole})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: 1-Click Evaluation Buttons & Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Status selection pills (1-click quick update) */}
                    {isAuthorized ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {STATUS_LIST.map(st => {
                          const isSelected = duty.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateDutyStatus(duty.id, st, duty.evaluationNote)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                                isSelected
                                  ? st === 'Hoàn thành tốt'
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-sm'
                                    : st === 'Hoàn thành'
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-sm'
                                    : st === 'Chưa hoàn thành'
                                    ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-sm'
                                    : st === 'Không thực hiện'
                                    ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-sm'
                                    : 'bg-slate-800 text-white ring-2 ring-slate-400 shadow-sm'
                                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                              }`}
                              title={`Chấm mức độ: ${st}`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">Chỉ xem mức độ hoàn thành</div>
                    )}

                    {/* Edit and Delete Buttons */}
                    {isAuthorized && (
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(duty)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                          title="Sửa tổ trực, đổi ngày hoặc cập nhật nhận xét"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        {deleteConfirmId === duty.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-300 shadow-2xs">
                            <span className="text-[11px] text-rose-800 font-extrabold px-1">Xóa?</span>
                            <button
                              type="button"
                              onClick={() => {
                                deleteDuty(duty.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px]"
                            >
                              Có
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-[10px]"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(duty.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                            title="Xóa lịch trực này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL 1: ADD NEW DUTY SCHEDULE ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>Điền & Phân Công Lịch Trực Nhật</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn tổ, ngày trực và mức độ hoàn thành theo yêu cầu GVCN / Lớp trưởng / Lớp phó Lao động
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddDuty} className="space-y-4 text-xs">
              {/* 1. Điền Tổ trực */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  1. Chọn Tổ Trực Nhật <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(g => {
                    const studentCount = students.filter(s => s.groupId === g).length;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleFormGroupChange(g)}
                        className={`p-3 rounded-xl border text-center transition-all shadow-2xs ${
                          formGroupId === g
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold border-emerald-600 shadow-md ring-2 ring-emerald-400'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold'
                        }`}
                      >
                        <div className="text-sm font-black">Tổ {g}</div>
                        <div className={`text-[10px] mt-0.5 ${formGroupId === g ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {studentCount} học sinh
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Điền Ngày trực */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    2. Ngày Trực Nhật <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Thứ Trong Tuần (Tự động)
                  </label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                    {formatVietnameseDate(formDate) || 'Chưa chọn ngày'}
                  </div>
                </div>
              </div>

              {/* 3. Điền Mức độ hoàn thành của tổ */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  3. Mức Độ Hoàn Thành Của Tổ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STATUS_LIST.map(st => {
                    const isSelected = formStatus === st;
                    const badgeDesc =
                      st === 'Hoàn thành tốt'
                        ? '+2đ thi đua'
                        : st === 'Hoàn thành'
                        ? '0đ đạt chuẩn'
                        : st === 'Chưa hoàn thành'
                        ? '-2đ thi đua'
                        : st === 'Không thực hiện'
                        ? '-5đ thi đua'
                        : '0đ chưa kiểm tra';

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormStatus(st)}
                        className={`p-2.5 rounded-xl border text-left transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 font-extrabold ring-2 ring-emerald-500 shadow-sm'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-semibold'
                        }`}
                      >
                        <div className="font-bold text-xs">{st}</div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                          {badgeDesc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Học sinh phụ trách */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  4. Học Sinh Phụ Trách Trực Nhật
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="assignedType"
                      checked={formAssignedType === 'all_group'}
                      onChange={() => {
                        setFormAssignedType('all_group');
                        const gStudents = students.filter(s => s.groupId === formGroupId);
                        setFormSelectedStudentIds(gStudents.map(s => s.id));
                      }}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Toàn bộ học sinh Tổ {formGroupId} (Mặc định)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="assignedType"
                      checked={formAssignedType === 'custom'}
                      onChange={() => setFormAssignedType('custom')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Chọn học sinh cụ thể trong tổ</span>
                  </label>
                </div>

                {formAssignedType === 'custom' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                    {students
                      .filter(s => s.groupId === formGroupId)
                      .map(s => {
                        const isChecked = formSelectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setFormSelectedStudentIds(prev => [...prev, s.id]);
                                } else {
                                  setFormSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-bold text-slate-800">{s.fullName}</span>
                            <span className="text-[11px] text-slate-400">({s.studentCode})</span>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* 5. Ghi chú & Đánh giá */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  5. Nhận Xét / Tiêu Chí Vệ Sinh
                </label>
                <textarea
                  rows={2}
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Ví dụ: Bảng sạch, bục giảng sạch, kê bàn ngay ngắn, đổ rác đúng giờ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold self-center">Gợi ý nhanh:</span>
                  {QUICK_COMMENTS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormNote(c)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition-colors"
                    >
                      {c.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspector info */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px]">
                <span className="text-emerald-900 font-semibold">Người ghi nhận & chấm điểm:</span>
                <span className="font-extrabold text-emerald-800">
                  {currentUserRole.name} ({currentUserRole.title})
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Lịch Trực Nhật</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT EXISTING DUTY ================= */}
      {editingDuty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-600" />
                  <span>Chỉnh Sửa Trực Nhật & Mức Độ Hoàn Thành</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật lại tổ, ngày trực hoặc đánh giá lại mức độ hoàn thành của tổ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDuty(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDuty} className="space-y-4 text-xs">
              {/* 1. Điền Tổ trực */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  1. Tổ Trực Nhật <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleFormGroupChange(g)}
                      className={`p-3 rounded-xl border text-center transition-all shadow-2xs ${
                        formGroupId === g
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold border-amber-600 shadow-md ring-2 ring-amber-400'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold'
                      }`}
                    >
                      <div className="text-sm font-black">Tổ {g}</div>
                      <div className={`text-[10px] mt-0.5 ${formGroupId === g ? 'text-amber-100' : 'text-slate-500'}`}>
                        {students.filter(s => s.groupId === g).length} học sinh
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Điền Ngày trực */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    2. Ngày Trực Nhật <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Thứ Trong Tuần
                  </label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                    {formatVietnameseDate(formDate) || 'Chưa chọn ngày'}
                  </div>
                </div>
              </div>

              {/* 3. Điền Mức độ hoàn thành của tổ */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  3. Mức Độ Hoàn Thành Của Tổ <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STATUS_LIST.map(st => {
                    const isSelected = formStatus === st;
                    const badgeDesc =
                      st === 'Hoàn thành tốt'
                        ? '+2đ thi đua'
                        : st === 'Hoàn thành'
                        ? '0đ đạt chuẩn'
                        : st === 'Chưa hoàn thành'
                        ? '-2đ thi đua'
                        : st === 'Không thực hiện'
                        ? '-5đ thi đua'
                        : '0đ chưa kiểm tra';

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormStatus(st)}
                        className={`p-2.5 rounded-xl border text-left transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 font-extrabold ring-2 ring-amber-500 shadow-sm'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-semibold'
                        }`}
                      >
                        <div className="font-bold text-xs">{st}</div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                          {badgeDesc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Học sinh phụ trách */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  4. Học Sinh Phụ Trách
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="assignedTypeEdit"
                      checked={formAssignedType === 'all_group'}
                      onChange={() => {
                        setFormAssignedType('all_group');
                        const gStudents = students.filter(s => s.groupId === formGroupId);
                        setFormSelectedStudentIds(gStudents.map(s => s.id));
                      }}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Toàn bộ học sinh Tổ {formGroupId}</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="assignedTypeEdit"
                      checked={formAssignedType === 'custom'}
                      onChange={() => setFormAssignedType('custom')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Chọn học sinh cụ thể trong tổ</span>
                  </label>
                </div>

                {formAssignedType === 'custom' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                    {students
                      .filter(s => s.groupId === formGroupId)
                      .map(s => {
                        const isChecked = formSelectedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setFormSelectedStudentIds(prev => [...prev, s.id]);
                                } else {
                                  setFormSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                }
                              }}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span className="font-bold text-slate-800">{s.fullName}</span>
                            <span className="text-[11px] text-slate-400">({s.studentCode})</span>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* 5. Ghi chú & Đánh giá */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  5. Nhận Xét / Ghi Chú Đánh Giá
                </label>
                <textarea
                  rows={2}
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Nhập nhận xét chi tiết..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold self-center">Gợi ý nhanh:</span>
                  {QUICK_COMMENTS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormNote(c)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition-colors"
                    >
                      {c.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDuty(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-amber-600/25 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Cập Nhật Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: AUTO SCHEDULE WEEKLY ================= */}
      {isAutoScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-blue-600" />
                  <span>Phân Công Lịch Trực Nhật Tuần</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động tạo lịch 5 ngày (Thứ Hai đến Thứ Sáu) xoay vòng 4 tổ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAutoScheduleModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Ngày Bắt Đầu Tuần (Thứ Hai):
                </label>
                <input
                  type="date"
                  value={autoStartDate}
                  onChange={e => setAutoStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Tổ Trực Ngày Đầu Tuần (Thứ Hai):
                </label>
                <select
                  value={autoStartingGroup}
                  onChange={e => setAutoStartingGroup(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={1}>Bắt đầu từ Tổ 1</option>
                  <option value={2}>Bắt đầu từ Tổ 2</option>
                  <option value={3}>Bắt đầu từ Tổ 3</option>
                  <option value={4}>Bắt đầu từ Tổ 4</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                <strong>Lịch phân công dự kiến:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Thứ Hai: Tổ {autoStartingGroup}</li>
                  <li>Thứ Ba: Tổ {autoStartingGroup === 4 ? 1 : autoStartingGroup + 1}</li>
                  <li>Thứ Tư: Tổ {((autoStartingGroup + 1) % 4) + 1}</li>
                  <li>Thứ Năm: Tổ {((autoStartingGroup + 2) % 4) + 1}</li>
                  <li>Thứ Sáu: Tổ {((autoStartingGroup + 3) % 4) + 1}</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAutoScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleGenerateWeeklySchedule}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Tạo Lịch Cả Tuần</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
