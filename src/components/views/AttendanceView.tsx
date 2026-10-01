import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  UserX,
  AlertCircle,
  Calendar,
  Save,
  Check,
  ShieldAlert,
  Search,
  Filter,
  Trash2,
  List,
  History,
  AlertTriangle,
  Users,
  LayoutGrid,
  Table,
  Sparkles,
  Eye,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus } from '../../types';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import { canManageAttendance } from '../../utils/permissionUtils';

export const AttendanceView: React.FC = () => {
  const {
    students,
    attendance,
    bulkMarkAttendance,
    deleteAttendance,
    batchDeleteAttendance,
    currentUserRole,
    studentScores,
    setSelectedStudentIdForDetail
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'sheet' | 'history'>('sheet');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedSession, setSelectedSession] = useState<'Sáng' | 'Chiều'>('Sáng');
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'all'>(() => {
    return (currentUserRole.role === 'to_truong' || currentUserRole.role === 'to_pho') && currentUserRole.groupId
      ? currentUserRole.groupId
      : 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');

  // History filtering states - Mặc định tuần hiện tại
  const [historyTimeRange, setHistoryTimeRange] = useState<TimeRangeOption>('this_week');
  const [historyCustomStart, setHistoryCustomStart] = useState('2026-09-01');
  const [historyCustomEnd, setHistoryCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all_absent' | 'absent_excused' | 'absent_unexcused'>('all_absent');
  const [historyGroupFilter, setHistoryGroupFilter] = useState<number>(0);
  const [historySearch, setHistorySearch] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState<'cards' | 'table'>('cards');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Local draft status for current date & session
  const [draftStatuses, setDraftStatuses] = useState<Record<string, { status: AttendanceStatus; note: string }>>(() => {
    const map: Record<string, { status: AttendanceStatus; note: string }> = {};
    students.forEach(s => {
      const existing = attendance.find(
        a => a.studentId === s.id && a.date === new Date().toISOString().slice(0, 10) && (a.session === 'Sáng' || !a.session)
      );
      map[s.id] = {
        status: existing ? existing.status : 'present',
        note: existing?.note || '',
      };
    });
    return map;
  });

  // Sync draftStatuses when date or session changes
  useEffect(() => {
    const map: Record<string, { status: AttendanceStatus; note: string }> = {};
    students.forEach(s => {
      const existing = attendance.find(
        a => a.studentId === s.id && a.date === selectedDate && (a.session === selectedSession || !a.session)
      );
      map[s.id] = {
        status: existing ? existing.status : 'present',
        note: existing?.note || '',
      };
    });
    setDraftStatuses(map);
  }, [selectedDate, selectedSession, students]);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const isAuthorizedAttendance = canManageAttendance(currentUserRole?.role);

  // Update status for a student
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!isAuthorizedAttendance) return;
    setDraftStatuses(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    if (!isAuthorizedAttendance) return;
    setDraftStatuses(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  // Mark all present in 1 click
  const handleMarkAllPresent = () => {
    if (!isAuthorizedAttendance) return;
    setDraftStatuses(prev => {
      const updated = { ...prev };
      students.forEach(s => {
        if (selectedGroupId === 'all' || s.groupId === selectedGroupId) {
          updated[s.id] = { status: 'present', note: '' };
        }
      });
      return updated;
    });
  };

  // Save attendance sheet: Only save non-present records (absent or late).
  // Implicitly all other students are PRESENT (no need to create bloated 'present' records).
  const handleSaveAttendance = () => {
    if (!isAuthorizedAttendance) return;
    // 1. Remove old records on this date and session to avoid duplicates
    const existingForSession = attendance.filter(
      a => a.date === selectedDate && (a.session === selectedSession || !a.session)
    );
    if (existingForSession.length > 0) {
      batchDeleteAttendance(existingForSession.map(a => a.id));
    }

    // 2. Only save non-present records
    const nonPresentRecords = (Object.entries(draftStatuses) as [string, { status: AttendanceStatus; note: string }][])
      .filter(([_, data]) => data.status !== 'present')
      .map(([studentId, data]) => ({
        studentId,
        date: selectedDate,
        session: selectedSession,
        status: data.status,
        note: data.note,
        recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
      }));

    if (nonPresentRecords.length > 0) {
      bulkMarkAttendance(nonPresentRecords);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteHistoryRecord = (id: string) => {
    if (!isAuthorizedAttendance) return;
    deleteAttendance(id);
    setDeleteConfirmId(null);
  };

  // Redundant 'present' records cleanup
  const redundantPresentRecords = useMemo(() => {
    return attendance.filter(a => a.status === 'present');
  }, [attendance]);

  const handleCleanPresentRecords = () => {
    if (redundantPresentRecords.length > 0) {
      batchDeleteAttendance(redundantPresentRecords.map(a => a.id));
    }
  };

  // Calculations for current draft sheet
  const currentRecords = useMemo(() => {
    return students.filter(s => {
      const matchGroup = selectedGroupId === 'all' || s.groupId === selectedGroupId;
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentCode.includes(searchTerm);
      return matchGroup && matchSearch;
    });
  }, [students, selectedGroupId, searchTerm]);

  const draftList = Object.values(draftStatuses) as { status: AttendanceStatus; note: string }[];
  const presentCount = draftList.filter(d => d.status === 'present').length;
  const absentExcusedCount = draftList.filter(d => d.status === 'absent_excused').length;
  const absentUnexcusedCount = draftList.filter(d => d.status === 'absent_unexcused').length;
  const lateCount = draftList.filter(d => d.status === 'late').length;

  const studentMap = useMemo(() => {
    const map: Record<string, typeof students[0]> = {};
    students.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  // STRICT ABSENCE HISTORY:
  // Only records of students who were absent (absent_excused, absent_unexcused) within the time range
  const absentRecordsInRange = useMemo(() => {
    return attendance.filter(item => {
      // Must be absent (ignore present, late)
      if (item.status !== 'absent_excused' && item.status !== 'absent_unexcused') {
        return false;
      }
      if (historyStatusFilter === 'absent_excused' && item.status !== 'absent_excused') {
        return false;
      }
      if (historyStatusFilter === 'absent_unexcused' && item.status !== 'absent_unexcused') {
        return false;
      }
      return isDateInRange(item.date, historyTimeRange, historyCustomStart, historyCustomEnd);
    });
  }, [attendance, historyStatusFilter, historyTimeRange, historyCustomStart, historyCustomEnd]);

  // Aggregate by absent student:
  // - Students who were absent
  // - All absent dates & sessions
  // - Total number of absent sessions (tổng số buổi vắng)
  const absentStudentsSummary = useMemo(() => {
    const map = new Map<string, typeof absentRecordsInRange>();

    absentRecordsInRange.forEach(rec => {
      const list = map.get(rec.studentId) || [];
      list.push(rec);
      map.set(rec.studentId, list);
    });

    const items: Array<{
      student: typeof students[0];
      totalAbsences: number; // Tổng số buổi vắng
      excusedCount: number;
      unexcusedCount: number;
      penaltyPoints: number;
      records: typeof absentRecordsInRange;
    }> = [];

    map.forEach((recs, studentId) => {
      const student = studentMap[studentId];
      if (!student) return;

      if (historyGroupFilter !== 0 && student.groupId !== historyGroupFilter) {
        return;
      }

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        if (!student.fullName.toLowerCase().includes(q) && !student.studentCode.toLowerCase().includes(q)) {
          return;
        }
      }

      const excusedCount = recs.filter(r => r.status === 'absent_excused').length;
      const unexcusedCount = recs.filter(r => r.status === 'absent_unexcused').length;
      const penaltyPoints = unexcusedCount * 3 + excusedCount * 0.5;
      const sortedRecs = [...recs].sort((a, b) => b.date.localeCompare(a.date));

      items.push({
        student,
        totalAbsences: recs.length,
        excusedCount,
        unexcusedCount,
        penaltyPoints,
        records: sortedRecs,
      });
    });

    // Sort by total absences descending
    items.sort((a, b) => {
      if (b.totalAbsences !== a.totalAbsences) {
        return b.totalAbsences - a.totalAbsences;
      }
      return a.student.fullName.localeCompare(b.student.fullName);
    });

    return items;
  }, [absentRecordsInRange, studentMap, historyGroupFilter, historySearch]);

  // Quick stats
  const totalAbsenceSessions = absentRecordsInRange.length;
  const uniqueAbsentStudents = new Set(absentRecordsInRange.map(r => r.studentId)).size;
  const totalExcusedSessions = absentRecordsInRange.filter(r => r.status === 'absent_excused').length;
  const totalUnexcusedSessions = absentRecordsInRange.filter(r => r.status === 'absent_unexcused').length;

  return (
    <div className="space-y-5">
      {/* Header with quick stats & Sub-tab switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Điểm Danh & Quản Lý Chuyên Cần Lớp Học</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Sổ Điểm Danh Điện Tử
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mặc định toàn bộ học sinh <strong>CÓ MẶT</strong>. Mục lịch sử chỉ theo dõi những học sinh vắng, ngày vắng và tổng số buổi vắng.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('sheet')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'sheet'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Điểm danh ngày</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-rose-600" />
              <span>Lịch sử vắng ({uniqueAbsentStudents} HS vắng)</span>
            </button>
          </div>

          {activeSubTab === 'sheet' && (
            isAuthorizedAttendance ? (
              <>
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl transition-all active:scale-95"
                >
                  ✓ Tất cả CÓ MẶT
                </button>

                <button
                  onClick={handleSaveAttendance}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  <span>{saveSuccess ? 'Đã Lưu Thành Công!' : 'Lưu Điểm Danh'}</span>
                </button>
              </>
            ) : (
              <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Chế độ chỉ xem ({currentUserRole.title})</span>
              </span>
            )
          )}
        </div>
      </div>

      {!isAuthorizedAttendance && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Chế độ chỉ xem:</strong> Bạn đang đăng nhập với vai trò <strong>{currentUserRole.title}</strong>. Học sinh bình thường không có quyền thực hiện điểm danh hoặc thay đổi trạng thái chuyên cần.
          </span>
        </div>
      )}

      {activeSubTab === 'sheet' ? (
        <>
          {/* Date, Session & Group Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày điểm danh</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Buổi học</label>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setSelectedSession('Sáng')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    selectedSession === 'Sáng' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Buổi Sáng
                </button>
                <button
                  onClick={() => setSelectedSession('Chiều')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    selectedSession === 'Chiều' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Buổi Chiều
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lọc theo Tổ</label>
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="all">Toàn bộ lớp ({students.length} học sinh)</option>
                <option value={1}>Tổ 1 ({students.filter(s => s.groupId === 1).length} HS)</option>
                <option value={2}>Tổ 2 ({students.filter(s => s.groupId === 2).length} HS)</option>
                <option value={3}>Tổ 3 ({students.filter(s => s.groupId === 3).length} HS)</option>
                <option value={4}>Tổ 4 ({students.filter(s => s.groupId === 4).length} HS)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tìm học sinh</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tên học sinh..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Real-time Attendance Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="text-[11px] text-emerald-800 font-semibold block">Có mặt</span>
              <div className="text-2xl font-black text-emerald-700">{presentCount}/{students.length}</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <span className="text-[11px] text-blue-800 font-semibold block">Vắng có phép</span>
              <div className="text-2xl font-black text-blue-700">{absentExcusedCount}</div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <span className="text-[11px] text-rose-800 font-semibold block">Vắng không phép</span>
              <div className="text-2xl font-black text-rose-700">{absentUnexcusedCount}</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <span className="text-[11px] text-amber-800 font-semibold block">Đi muộn</span>
              <div className="text-2xl font-black text-amber-700">{lateCount}</div>
            </div>
          </div>

          {/* Attendance Sheet List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {currentRecords.map((student, idx) => {
                const currentDraft = draftStatuses[student.id] || { status: 'present', note: '' };
                const stats = studentScores[student.id];
                const hasFrequentAbsences = (stats?.totalAbsences || 0) >= 3;

                return (
                  <div
                    key={student.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Student info */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <span className="text-slate-400 font-mono text-[11px] w-5 text-right">{idx + 1}</span>
                      <img
                        src={student.avatar}
                        alt={student.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => setSelectedStudentIdForDetail(student.id)}
                            className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer text-sm"
                          >
                            {student.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">({student.studentCode})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>Tổ {student.groupId}</span>
                          <span>•</span>
                          <span>{student.roleInClass}</span>
                          {hasFrequentAbsences && (
                            <span className="text-rose-600 font-bold flex items-center gap-0.5 bg-rose-50 px-1.5 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3" /> Đã nghỉ {stats?.totalAbsences} buổi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: 1-Click Action Buttons or Read-Only Status */}
                    {isAuthorizedAttendance ? (
                      <>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                              currentDraft.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Có mặt
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'late')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                              currentDraft.status === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                          >
                            Đi muộn
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent_excused')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                              currentDraft.status === 'absent_excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                          >
                            Vắng có phép
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent_unexcused')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                              currentDraft.status === 'absent_unexcused'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            Vắng không phép
                          </button>
                        </div>

                        {/* Right: Note input if not present */}
                        {currentDraft.status !== 'present' && (
                          <div className="w-full lg:w-64">
                            <input
                              type="text"
                              value={currentDraft.note}
                              onChange={e => handleNoteChange(student.id, e.target.value)}
                              placeholder="Nhập lý do vắng / đi muộn..."
                              className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-medium"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                          currentDraft.status === 'present'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : currentDraft.status === 'late'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : currentDraft.status === 'absent_excused'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {currentDraft.status === 'present' && '✓ Có mặt'}
                          {currentDraft.status === 'late' && '⏰ Đi muộn'}
                          {currentDraft.status === 'absent_excused' && '📋 Vắng có phép'}
                          {currentDraft.status === 'absent_unexcused' && '❌ Vắng không phép'}
                        </span>
                        {currentDraft.note && (
                          <span className="text-xs text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            Lý do: {currentDraft.note}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* History & Log Tab: ONLY SHOW ABSENT STUDENTS, ABSENT DATES, AND TOTAL ABSENT SESSIONS */
        <div className="space-y-4">
          {/* Banner to clean old redundant 'present' records if any exist */}
          {redundantPresentRecords.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Phát hiện <strong>{redundantPresentRecords.length}</strong> bản ghi 'Có mặt' được lưu từ trước. Mặc định mọi học sinh đều có mặt, bạn có thể dọn dẹp để lịch sử chỉ lưu trữ danh sách vắng.
                </span>
              </div>
              <button
                onClick={handleCleanPresentRecords}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-auto"
              >
                Dọn dẹp bản ghi 'Có mặt'
              </button>
            </div>
          )}

          {/* Quick Absence Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tổng lượt vắng</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <UserX className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {totalAbsenceSessions} <span className="text-xs font-normal text-slate-500">buổi</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Trong khoảng thời gian chọn</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Học sinh vắng</span>
                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {uniqueAbsentStudents} <span className="text-xs font-normal text-slate-500">học sinh</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Có ≥ 1 buổi nghỉ học</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Vắng có phép</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {totalExcusedSessions} <span className="text-xs font-normal text-slate-500">buổi</span>
              </div>
              <p className="text-[11px] text-blue-600/80 font-medium mt-0.5">Trừ 0.5 điểm/buổi</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Vắng không phép</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <ShieldAlert className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-700 mt-1">
                {totalUnexcusedSessions} <span className="text-xs font-normal text-slate-500">buổi</span>
              </div>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">Trừ 3.0 điểm/buổi</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Time Range Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-700">Thời gian:</span>
                <TimeRangePicker
                  selectedOption={historyTimeRange}
                  onChangeOption={setHistoryTimeRange}
                  customStartDate={historyCustomStart}
                  onChangeCustomStartDate={setHistoryCustomStart}
                  customEndDate={historyCustomEnd}
                  onChangeCustomEndDate={setHistoryCustomEnd}
                  size="sm"
                />
              </div>

              {/* View Mode & Type Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setHistoryStatusFilter('all_absent')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      historyStatusFilter === 'all_absent' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Tất cả vắng ({totalAbsenceSessions})
                  </button>
                  <button
                    onClick={() => setHistoryStatusFilter('absent_excused')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      historyStatusFilter === 'absent_excused' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Có phép ({totalExcusedSessions})
                  </button>
                  <button
                    onClick={() => setHistoryStatusFilter('absent_unexcused')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      historyStatusFilter === 'absent_unexcused' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Không phép ({totalUnexcusedSessions})
                  </button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setHistoryViewMode('cards')}
                    className={`p-1.5 rounded-lg transition-all ${
                      historyViewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                    title="Xem dạng thẻ"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setHistoryViewMode('table')}
                    className={`p-1.5 rounded-lg transition-all ${
                      historyViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                    title="Xem dạng bảng"
                  >
                    <Table className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sub Filter: Groups & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="font-semibold text-slate-500 mr-1 shrink-0">Lọc theo tổ:</span>
                {[0, 1, 2, 3, 4].map(g => (
                  <button
                    key={g}
                    onClick={() => setHistoryGroupFilter(g)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                      historyGroupFilter === g
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {g === 0 ? 'Tất cả tổ' : `Tổ ${g}`}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm học sinh vắng..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Absence Content Area */}
          {absentStudentsSummary.length === 0 ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-emerald-900">
                Không có học sinh nào vắng trong khoảng thời gian đã chọn!
              </h4>
              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                Toàn bộ học sinh đều tham gia học tập chuyên cần đầy đủ 100%. Không ghi nhận trường hợp nghỉ học có phép hoặc không phép.
              </p>
            </div>
          ) : historyViewMode === 'cards' ? (
            /* Cards View: Shows Absent Student, Total Absent Sessions, and Dates */
            <div className="space-y-3">
              {absentStudentsSummary.map(item => {
                const { student, totalAbsences, excusedCount, unexcusedCount, penaltyPoints, records } = item;

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-rose-200 transition-all overflow-hidden p-4 sm:p-5"
                  >
                    {/* Card Header: Student Info & Total Absences Highlight */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatar}
                          alt={student.fullName}
                          className="w-11 h-11 rounded-full object-cover border-2 border-rose-200 shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => setSelectedStudentIdForDetail(student.id)}
                              className="font-bold text-slate-900 hover:text-rose-700 cursor-pointer text-base"
                            >
                              {student.fullName}
                            </span>
                            <span className="text-slate-400 font-mono text-xs">({student.studentCode})</span>
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                              Tổ {student.groupId}
                            </span>
                            {student.roleInClass && student.roleInClass !== 'Thành viên' && (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                {student.roleInClass}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Bấm vào tên để xem toàn bộ hồ sơ thi đua & điểm chuyên cần
                          </p>
                        </div>
                      </div>

                      {/* Prominent TOTAL ABSENT SESSIONS BADGE */}
                      <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 bg-rose-50/80 px-4 py-2 sm:py-2.5 rounded-xl border border-rose-200/80 shrink-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-semibold text-rose-800">Tổng số buổi vắng:</span>
                          <span className="text-2xl font-black text-rose-700">{totalAbsences}</span>
                          <span className="text-xs font-bold text-rose-800">buổi</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                          <span className="text-blue-700 font-bold">{excusedCount} có phép</span>
                          <span>•</span>
                          <span className="text-rose-700 font-bold">{unexcusedCount} không phép</span>
                          <span>•</span>
                          <span className="text-rose-800">Trừ {penaltyPoints.toFixed(1)}đ</span>
                        </div>
                      </div>
                    </div>

                    {/* Absent Dates Section */}
                    <div className="pt-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-rose-600" />
                          <span>Chi tiết các ngày vắng ({records.length} buổi):</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {records.map(rec => (
                          <div
                            key={rec.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 transition-all ${
                              rec.status === 'absent_unexcused'
                                ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                                : 'bg-blue-50/60 border-blue-200 text-blue-900'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs">
                                  {rec.date}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/80 border border-slate-200">
                                  {rec.session || 'Sáng'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    rec.status === 'absent_unexcused'
                                      ? 'bg-rose-200 text-rose-900'
                                      : 'bg-blue-200 text-blue-900'
                                  }`}
                                >
                                  {rec.status === 'absent_unexcused' ? 'Không phép (-3đ)' : 'Có phép (-0.5đ)'}
                                </span>
                              </div>

                              {rec.note ? (
                                <p className="text-[11px] text-slate-700 font-medium italic">
                                  Lý do: "{rec.note}"
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">
                                  (Chưa ghi lý do)
                                </p>
                              )}

                              <p className="text-[10px] text-slate-400">
                                Ghi bởi: {rec.recordedBy}
                              </p>
                            </div>

                            {/* Delete single record action */}
                            {isAuthorizedAttendance && (
                              <div className="shrink-0">
                                {deleteConfirmId === rec.id ? (
                                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-rose-300 shadow-xs">
                                    <button
                                      onClick={() => handleDeleteHistoryRecord(rec.id)}
                                      className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px]"
                                    >
                                      Xóa
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
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                    title="Xóa buổi vắng này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View: Summary Table of Absent Students, Absent Dates, Total Sessions */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-3 w-12 text-center">STT</th>
                      <th className="py-3 px-3 w-24">Mã HS</th>
                      <th className="py-3 px-4">Học sinh vắng</th>
                      <th className="py-3 px-3 w-20 text-center">Tổ</th>
                      <th className="py-3 px-4 w-36 text-center">Tổng số buổi vắng</th>
                      <th className="py-3 px-4">Các ngày vắng chi tiết</th>
                      <th className="py-3 px-3 w-24 text-right">Trừ thi đua</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absentStudentsSummary.map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-500">{item.student.studentCode}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={item.student.avatar}
                              alt={item.student.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <span
                                onClick={() => setSelectedStudentIdForDetail(item.student.id)}
                                className="font-bold text-slate-900 hover:text-rose-700 cursor-pointer text-sm block"
                              >
                                {item.student.fullName}
                              </span>
                              {item.student.roleInClass && item.student.roleInClass !== 'Thành viên' && (
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  {item.student.roleInClass}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">Tổ {item.student.groupId}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-black text-xs">
                              {item.totalAbsences} buổi
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              ({item.excusedCount} CP, {item.unexcusedCount} KP)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xl">
                            {item.records.map(rec => (
                              <div
                                key={rec.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                                  rec.status === 'absent_unexcused'
                                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                                    : 'bg-blue-50 border-blue-200 text-blue-800'
                                }`}
                                title={rec.note ? `Lý do: ${rec.note}` : undefined}
                              >
                                <span className="font-bold">{rec.date}</span>
                                <span className="text-[10px] opacity-75">({rec.session || 'Sáng'})</span>
                                <span className="text-[10px] font-bold">
                                  {rec.status === 'absent_unexcused' ? 'KP' : 'CP'}
                                </span>
                                {rec.note && <span className="italic max-w-[120px] truncate text-[10px]">- {rec.note}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-600">
                          -{item.penaltyPoints.toFixed(1)}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
