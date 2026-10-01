import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MapPin, 
  User, 
  Award, 
  AlertTriangle, 
  BookOpen, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Edit2,
  Edit3, 
  Save, 
  PlusCircle, 
  Calendar,
  MessageSquare,
  TrendingUp,
  ShieldAlert,
  Trash2,
  Camera
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ViolationRecord, RewardRecord } from '../types';
import { EditStudentModal } from './EditStudentModal';
import { EditViolationModal } from './EditViolationModal';
import { EditRewardModal } from './EditRewardModal';
import {
  canManageStudentMaster,
  canManageClassActivities,
  isHomeroomTeacher,
  canViewStudentViolations,
  canViewStudentPrivateInfo,
  isBanCanSu,
  isGroupLeader
} from '../utils/permissionUtils';

export const StudentDetailModal: React.FC = () => {
  const {
    selectedStudentIdForDetail,
    setSelectedStudentIdForDetail,
    students,
    updateStudent,
    studentScores,
    attendance,
    violations,
    rewards,
    academicRecords,
    cleaningDuties,
    extracurricularActivities,
    evaluations,
    updateViolationStatus,
    deleteViolation,
    deleteReward,
    updateEvaluationRemarks,
    currentUserRole,
    accounts,
    setChangeAvatarModalOpen,
    setQuickActionModalOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'timeline' | 'violations' | 'rewards' | 'academic' | 'evaluation' | 'edit'>('timeline');
  const [editingNotes, setEditingNotes] = useState(false);
  const [teacherNoteText, setTeacherNoteText] = useState('');
  const [teacherEvalRemark, setTeacherEvalRemark] = useState('');

  const canEditStudent = canManageStudentMaster(currentUserRole?.role);
  const canManageActivities = canManageClassActivities(currentUserRole?.role);
  const isGVCN = isHomeroomTeacher(currentUserRole?.role);

  // Edit modals state
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editingViolation, setEditingViolation] = useState<ViolationRecord | null>(null);
  const [editingReward, setEditingReward] = useState<RewardRecord | null>(null);
  const [deleteConfirmViolationId, setDeleteConfirmViolationId] = useState<string | null>(null);
  const [deleteConfirmRewardId, setDeleteConfirmRewardId] = useState<string | null>(null);

  if (!selectedStudentIdForDetail) return null;

  const student = students.find(s => s.id === selectedStudentIdForDetail);
  if (!student) return null;

  // Phân quyền xem vi phạm & thông tin cá nhân bảo mật:
  // - GVCN & Ban cán sự: xem tất cả
  // - TT (Tổ trưởng/Tổ phó): xem học sinh trong tổ
  // - Cá nhân: chỉ xem của chính bản thân
  const canViewViolations = canViewStudentViolations(currentUserRole, student);
  const canViewPrivateInfo = canViewStudentPrivateInfo(currentUserRole, student);

  const stats = studentScores[student.id];

  // Specific student history
  const studentAttendance = attendance.filter(a => a.studentId === student.id);
  const studentViolations = canViewViolations ? violations.filter(v => v.studentId === student.id) : [];
  const studentRewards = rewards.filter(r => r.studentId === student.id);
  const studentAcademic = academicRecords.filter(a => a.studentId === student.id);
  const studentDuties = cleaningDuties.filter(d => d.assignedStudentIds.includes(student.id));
  const studentEvaluations = evaluations.filter(e => e.studentId === student.id);

  // Combined timeline (chỉ hiện vi phạm nếu có quyền xem)
  const timelineEvents = [
    ...studentViolations.map(v => ({ type: 'violation', date: v.date, title: v.title, sub: `Vi phạm (${v.penaltyPoints}đ) • ${v.status}`, points: v.penaltyPoints, raw: v })),
    ...studentRewards.map(r => ({ type: 'reward', date: r.date, title: r.title, sub: `Khen thưởng (+${r.bonusPoints}đ) • ${r.category}`, points: r.bonusPoints, raw: r })),
    ...studentAttendance.filter(a => a.status !== 'present').map(a => ({
      type: 'attendance',
      date: a.date,
      title: a.status === 'late' ? 'Đi học muộn' : a.status === 'absent_excused' ? 'Nghỉ học có phép' : 'Vắng không phép',
      sub: a.note || 'Điểm danh',
      points: a.status === 'absent_unexcused' ? -3 : a.status === 'late' ? -1 : -0.5,
      raw: a,
    })),
    ...studentAcademic.map(ac => ({
      type: 'academic',
      date: ac.date,
      title: `${ac.subject}: ${ac.type}`,
      sub: ac.note || '',
      points: ac.type === 'Điểm tốt (9-10)' ? 1 : -1,
      raw: ac,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const handleSaveNotes = () => {
    updateStudent({
      ...student,
      teacherNotes: teacherNoteText,
    });
    setEditingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with profile banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 pb-6">
          <button
            onClick={() => setSelectedStudentIdForDetail(null)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => {
                const matchingAcc = accounts.find(a => a.studentId === student.id || a.studentCode === student.studentCode);
                setChangeAvatarModalOpen(true, matchingAcc || null, student);
              }}
              title="Nhấn để đổi ảnh đại diện (Lưu Google Drive)"
            >
              <img
                src={student.avatar}
                alt={student.fullName}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/40 shadow-md group-hover:brightness-90 transition-all"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-white shadow">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{student.fullName}</h2>
                <span className="bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Mã: {student.studentCode}
                </span>
                <span className="bg-blue-500/25 border border-blue-400/40 text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Tổ {student.groupId}
                </span>
                <span className="bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {student.roleInClass}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const matchingAcc = accounts.find(a => a.studentId === student.id || a.studentCode === student.studentCode);
                    setChangeAvatarModalOpen(true, matchingAcc || null, student);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all shadow-sm cursor-pointer ml-1"
                  title="Đổi ảnh đại diện, tự động lưu vào Google Drive và Google Sheet"
                >
                  <Camera className="w-3 h-3" />
                  <span>Đổi ảnh (Drive)</span>
                </button>
                {canEditStudent && (
                  <button
                    type="button"
                    onClick={() => setIsEditingStudent(true)}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all shadow-sm cursor-pointer ml-1"
                    title="Chỉnh sửa thông tin học sinh, đổi tổ, cập nhật SĐT, phụ huynh..."
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Sửa thông tin HS</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>🎂 Ngày sinh: {student.dateOfBirth}</span>
                <span>⚧ Giới tính: {student.gender}</span>
                {canViewPrivateInfo ? (
                  <>
                    <span>📱 SĐT HS: {student.phone || 'Chưa có'}</span>
                    <span>👨‍👩‍👧 Phụ huynh: {student.parentName || 'Chưa có'} ({student.parentPhone || '---'})</span>
                  </>
                ) : (
                  <span className="text-slate-400 italic">🔒 SĐT và thông tin liên lạc được bảo mật</span>
                )}
              </div>
            </div>

            {/* Score Card Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-center min-w-[120px] self-stretch sm:self-auto flex flex-col justify-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Điểm thi đua</span>
              <div className="text-2xl font-black text-emerald-400 my-0.5">
                {stats?.totalScore.toFixed(1) || '100'}đ
              </div>
              <div className="text-[11px] text-slate-200">
                Hạng cá nhân: #{stats?.rankInClass || 1}
              </div>
            </div>
          </div>

          {/* Attention Banner if applicable */}
          {stats?.needsAttention && canViewViolations && (
            <div className="mt-3 p-2 bg-rose-500/20 border border-rose-400/40 rounded-lg flex items-center gap-2 text-xs text-rose-200">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                <strong>Học sinh cần quan tâm:</strong> {Array.isArray(stats.attentionReasons) ? stats.attentionReasons.join(' • ') : ''}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'timeline', label: 'Dòng thời gian (Tổng thể)', icon: Clock },
            ...(canViewViolations ? [{ id: 'violations', label: `Vi phạm (${studentViolations.length})`, icon: AlertTriangle }] : []),
            { id: 'rewards', label: `Khen thưởng (${studentRewards.length})`, icon: Award },
            { id: 'academic', label: `Học tập (${studentAcademic.length})`, icon: BookOpen },
            { id: 'evaluation', label: `Tự đánh giá (${studentEvaluations.length})`, icon: MessageSquare },
            ...((canEditStudent || isGVCN) ? [{ id: 'edit', label: 'Hồ sơ & Ghi chú GVCN', icon: Edit3 }] : []),
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Lịch sử sự kiện & quá trình rèn luyện</h4>
                <span className="text-slate-500">{timelineEvents.length} ghi nhận</span>
              </div>

              {timelineEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  Chưa có ghi nhận đặc biệt nào. Học sinh đang duy trì trạng thái tốt.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {timelineEvents.map((ev, i) => (
                    <div key={i} className="relative group">
                      <div
                        className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] ${
                          ev.type === 'reward'
                            ? 'bg-emerald-500'
                            : ev.type === 'violation'
                            ? 'bg-rose-500'
                            : ev.type === 'academic'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                      >
                        {ev.type === 'reward' ? '★' : ev.type === 'violation' ? '!' : '•'}
                      </div>
                      <div className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200/80 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{ev.title}</span>
                          <span className="text-slate-400 text-[11px]">{ev.date}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-slate-600 text-xs">{ev.sub}</p>
                          <span
                            className={`font-bold text-xs ${
                              ev.points > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {ev.points > 0 ? `+${ev.points}` : ev.points}đ
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIOLATIONS & REMEDY PROGRESS */}
          {activeTab === 'violations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Danh sách Vi phạm & Tiến trình Khắc phục</h4>
                  <p className="text-slate-500 text-[11px]">Quy trình: Vi phạm → Nhắc nhở → Khắc phục → Đã tiến bộ</p>
                </div>
              </div>

              {studentViolations.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 text-emerald-800">
                  <Award className="w-10 h-10 mx-auto text-emerald-600 mb-2" />
                  <p className="font-bold">Tuyệt vời! Học sinh không có vi phạm nào.</p>
                  <p className="text-slate-500 mt-1">Luôn chấp hành tốt nội quy và nề nếp lớp học.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentViolations.map(vio => (
                    <div key={vio.id} className="p-4 bg-rose-50/40 border border-rose-200/80 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{vio.title}</span>
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {vio.severity} ({vio.penaltyPoints}đ)
                            </span>
                            <span className="text-slate-500 text-[11px]">{vio.date}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">Người ghi: {vio.recordedBy}</p>
                          {vio.note && <p className="text-slate-500 italic mt-0.5">Ghi chú: {vio.note}</p>}
                        </div>

                        {/* Status changer & edit/delete buttons */}
                        {canManageActivities && (
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingViolation(vio)}
                                className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                title="Điều chỉnh vi phạm này nếu ghi nhầm hoặc sai mức phạt"
                              >
                                <Edit2 className="w-3 h-3 text-amber-600" />
                                <span>Sửa</span>
                              </button>

                              {deleteConfirmViolationId === vio.id ? (
                                <div className="flex items-center gap-1 bg-rose-100 p-0.5 rounded-md border border-rose-300">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteViolation(vio.id);
                                      setDeleteConfirmViolationId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Xóa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmViolationId(null)}
                                    className="px-1.5 py-0.5 bg-white text-slate-700 rounded text-[10px]"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmViolationId(vio.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Xóa vi phạm này nếu ghi nhầm"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {(['Đã ghi nhận', 'Đã nhắc nhở', 'Đang khắc phục', 'Đã tiến bộ'] as const).map(status => (
                                <button
                                  key={status}
                                  onClick={() => updateViolationStatus(vio.id, status)}
                                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                    vio.status === status
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                  }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Remedy details */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-700">Biện pháp khắc phục: </span>
                        <span className="text-slate-600">
                          {vio.remedyAction || 'Chưa có biện pháp cụ thể, đang theo dõi nề nếp.'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REWARDS */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Khen thưởng, Điểm tốt & Thành tích</h4>
              {studentRewards.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                  Chưa có khen thưởng nào được ghi nhận.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {studentRewards.map(rew => (
                    <div key={rew.id} className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">{rew.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            +{rew.bonusPoints}đ
                          </span>
                          {canManageActivities && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingReward(rew)}
                                className="p-1 bg-white hover:bg-amber-50 text-amber-700 border border-emerald-200 rounded-md transition-colors"
                                title="Sửa khen thưởng này hoặc đổi học sinh"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {deleteConfirmRewardId === rew.id ? (
                                <div className="flex items-center gap-1 bg-rose-100 p-0.5 rounded-md border border-rose-300">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteReward(rew.id);
                                      setDeleteConfirmRewardId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Xóa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmRewardId(null)}
                                    className="px-1.5 py-0.5 bg-white text-slate-700 rounded text-[10px]"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmRewardId(rew.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="Xóa khen thưởng nếu ghi nhầm"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px]">Danh mục: {rew.category}</p>
                      <p className="text-slate-500 text-[11px]">Người ghi: {rew.recordedBy} • {rew.date}</p>
                      {rew.evidence && (
                        <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-md border border-emerald-100">
                          <strong>Minh chứng:</strong> {rew.evidence}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACADEMIC */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Theo dõi học tập theo từng bộ môn</h4>
              {studentAcademic.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                  Chưa có ghi nhận đặc biệt về học tập.
                </div>
              ) : (
                <div className="space-y-2">
                  {studentAcademic.map(ac => (
                    <div key={ac.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Môn {ac.subject}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ac.type === 'Điểm tốt (9-10)' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ac.type}
                          </span>
                          <span className="text-slate-400 text-[11px]">{ac.date}</span>
                        </div>
                        {ac.note && <p className="text-slate-600 text-[11px] mt-0.5">{ac.note}</p>}
                      </div>
                      {ac.score !== undefined && (
                        <span className="text-lg font-black text-emerald-600">{ac.score}đ</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SELF EVALUATION */}
          {activeTab === 'evaluation' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Bản tự đánh giá cuối tuần của học sinh</h4>
              {studentEvaluations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                  Học sinh chưa nộp bản tự đánh giá tuần nào.
                </div>
              ) : (
                studentEvaluations.map(ev => (
                  <div key={ev.id} className="p-4 bg-indigo-50/30 border border-indigo-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 text-sm">Tự đánh giá Tuần {ev.week}</span>
                      <span className="text-slate-400 text-[11px]">{ev.submittedAt.slice(0, 10)}</span>
                    </div>

                    <div className="space-y-2 bg-white p-3 rounded-xl border border-indigo-100">
                      <div>
                        <span className="font-semibold text-emerald-700">1. Điều em làm tốt: </span>
                        <span className="text-slate-700">{ev.goodDeeds}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-700">2. Điều em chưa làm tốt: </span>
                        <span className="text-slate-700">{ev.weaknesses}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-blue-700">3. Việc em sẽ cải thiện tuần tới: </span>
                        <span className="text-slate-700">{ev.nextWeekPlan}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-700 text-[11px]">Tổ trưởng nhận xét:</span>
                        <p className="text-slate-600 mt-1 italic">{ev.leaderRemark || 'Chưa có nhận xét.'}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="font-bold text-emerald-800 text-[11px]">GVCN nhận xét & Động viên:</span>
                        <p className="text-slate-600 mt-1 italic">{ev.teacherRemark || 'Chưa có nhận xét.'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: EDIT & TEACHER NOTES */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              {/* Full profile edit banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Chỉnh sửa toàn bộ thông tin học sinh</h4>
                  <p className="text-slate-600 text-xs mt-0.5">
                    Điều chỉnh nếu sai họ tên, sai tổ (hiện tại: Tổ {student.groupId}), sai chức vụ, sai số điện thoại hoặc thông tin phụ huynh.
                  </p>
                </div>
                {canEditStudent && (
                  <button
                    type="button"
                    onClick={() => setIsEditingStudent(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Sửa thông tin HS</span>
                  </button>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Ghi chú riêng của GVCN (Bảo mật)</h4>
                  {isGVCN && (
                    !editingNotes ? (
                      <button
                        onClick={() => {
                          setTeacherNoteText(student.teacherNotes);
                          setEditingNotes(true);
                        }}
                        className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold"
                      >
                        Chỉnh sửa ghi chú
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Lưu ghi chú
                      </button>
                    )
                  )}
                </div>

                {editingNotes ? (
                  <textarea
                    rows={4}
                    value={teacherNoteText}
                    onChange={e => setTeacherNoteText(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Nhập ghi chú đặc biệt về tính cách, gia cảnh, năng khiếu, học lực..."
                  />
                ) : (
                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80 italic">
                    "{student.teacherNotes || 'Chưa có ghi chú đặc biệt từ giáo viên.'}"
                  </p>
                )}
              </div>

              {/* Contact info card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 text-sm">Thông tin liên lạc & Địa chỉ</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>SĐT Phụ huynh: <strong className="text-slate-900">{student.parentPhone}</strong> ({student.parentName})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>Địa chỉ: <strong className="text-slate-900">{student.address}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setSelectedStudentIdForDetail(null)}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Đóng hồ sơ
          </button>

          {canManageActivities && (
            <button
              onClick={() => {
                setSelectedStudentIdForDetail(null);
                setQuickActionModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-600/20"
            >
              Ghi nhận vi phạm / Khen thưởng cho HS này
            </button>
          )}
        </div>

        {/* Modals for editing student, violation, and reward */}
        <EditStudentModal
          student={student}
          isOpen={isEditingStudent}
          onClose={() => setIsEditingStudent(false)}
        />

        <EditViolationModal
          violation={editingViolation}
          isOpen={!!editingViolation}
          onClose={() => setEditingViolation(null)}
        />

        <EditRewardModal
          reward={editingReward}
          isOpen={!!editingReward}
          onClose={() => setEditingReward(null)}
        />
      </div>
    </div>
  );
};
