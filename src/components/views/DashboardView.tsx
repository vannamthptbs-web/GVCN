import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Award,
  Sparkles,
  Trophy,
  Star,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  CalendarCheck,
  PlusCircle,
  FileText,
  ChevronRight,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavTab } from '../Sidebar';
import { BannerModal } from '../BannerModal';
import { isHomeroomTeacher, canViewStudentViolations } from '../../utils/permissionUtils';
import { isDateInRange } from '../../utils/timeFilter';

interface DashboardViewProps {
  setActiveTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const {
    students,
    attendance,
    violations,
    rewards,
    cleaningDuties,
    extracurricularActivities,
    rankedGroups,
    rankedStudents,
    studentsNeedingAttention,
    setSelectedStudentIdForDetail,
    setQuickActionModalOpen,
    currentUserRole,
    activityLogs,
    undoLastAction,
    classInfo,
  } = useApp();

  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const isGVCN = isHomeroomTeacher(currentUserRole.role);

  // Quick stats calculations
  const totalCount = students.length;
  const maleCount = students.filter(s => s.gender === 'Nam').length;
  const femaleCount = students.filter(s => s.gender === 'Nữ').length;

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendance.filter(a => a.date === today && a.session === 'Sáng');
  const hasAttendanceToday = todayAttendance.length > 0;
  const todayAbsent = todayAttendance.filter(a => a.status.includes('absent')).length;
  const excusedAbsent = todayAttendance.filter(a => a.status === 'absent_excused').length;
  const unexcusedAbsent = todayAttendance.filter(a => a.status === 'absent_unexcused').length;
  const todayPresent = hasAttendanceToday ? Math.max(0, totalCount - todayAbsent) : 0;
  const todayLate = todayAttendance.filter(a => a.status === 'late').length;
  const attendanceRate = totalCount > 0 && hasAttendanceToday ? Math.round((todayPresent / totalCount) * 100) : 0;

  const resolvedViolations = violations.filter(v => v.status === 'Đã giải quyết').length;

  // Lọc thông tin tuần hiện tại và bảo mật theo quyền xem
  const studentMap = React.useMemo(() => {
    const map: Record<string, typeof students[0]> = {};
    students.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  const weekViolations = React.useMemo(() => {
    return violations.filter(v => {
      if (!isDateInRange(v.date, 'this_week')) return false;
      const stu = studentMap[v.studentId];
      if (!stu) return false;
      return canViewStudentViolations(currentUserRole, { id: stu.id, groupId: stu.groupId });
    });
  }, [violations, studentMap, currentUserRole]);

  const weekRewards = React.useMemo(() => {
    return rewards.filter(r => isDateInRange(r.date, 'this_week'));
  }, [rewards]);

  // Group stats & equal rank detection
  const allGroupScores = rankedGroups.map(g => g.totalScore);
  const maxGroupScore = allGroupScores.length > 0 ? Math.max(...allGroupScores) : 0;
  const minGroupScore = allGroupScores.length > 0 ? Math.min(...allGroupScores) : 0;
  const areAllGroupsEqual = allGroupScores.length > 0 && Math.abs(maxGroupScore - minGroupScore) < 0.05;
  const topGroups = rankedGroups.filter(g => Math.abs(g.totalScore - maxGroupScore) < 0.05);

  // Student stats & equal rank detection
  const allStudentScores = rankedStudents.map(s => s.totalScore);
  const maxStudentScore = allStudentScores.length > 0 ? Math.max(...allStudentScores) : 100;
  const minStudentScore = allStudentScores.length > 0 ? Math.min(...allStudentScores) : 100;
  const areAllStudentsEqual = allStudentScores.length > 0 && Math.abs(maxStudentScore - minStudentScore) < 0.05;
  const topStudents = rankedStudents.filter(s => Math.abs(s.totalScore - maxStudentScore) < 0.05);

  // Cleaning duties
  const hasCleaningDuties = cleaningDuties.length > 0;
  const successfulDuties = cleaningDuties.filter(d => d.status === 'Hoàn thành tốt' || d.status === 'Hoàn thành').length;
  const dutyRate = hasCleaningDuties ? Math.round((successfulDuties / cleaningDuties.length) * 100) : 0;

  // Extracurricular activities
  const hasExtracurricular = Boolean(extracurricularActivities && extracurricularActivities.length > 0);
  const extracurricularCount = hasExtracurricular ? extracurricularActivities.length : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Homeroom greeting */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl group/banner">
        {/* Custom background image banner if uploaded or configured */}
        {classInfo.bannerUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{ backgroundImage: `url(${classInfo.bannerUrl})` }}
          >
            {/* Multi-stop dark gradient overlay for optimal legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-emerald-950/75 to-slate-900/80 backdrop-blur-[0.5px]" />
          </div>
        ) : null}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold px-3 py-0.5 rounded-full">
                Năm học {classInfo.schoolYear} • {classInfo.semester || 'Học kỳ I'}
              </span>
              <span className="bg-white/15 text-emerald-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-white/10">
                GVCN: {classInfo.homeroomTeacher}
              </span>
              <span className="text-slate-300 text-xs">Thứ Hai, {today}</span>

              {/* Banner customizer button for Homeroom Teacher (GVCN) */}
              {isGVCN && (
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(true)}
                  className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1 border border-white/25 shadow-xs"
                  title="Tải ảnh hoặc chọn ảnh mẫu làm banner Trang chủ"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Đổi ảnh banner</span>
                </button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bảng Điều Khiển Lớp {classInfo.className}
            </h1>
            <p className="text-emerald-100/95 text-xs sm:text-sm mt-1.5 max-w-xl font-medium tracking-wide">
              {classInfo.motto || 'Mỗi ngày cố gắng 1 chút, thành công ngày càng sẽ gần hơn'}
            </p>
          </div>

          {/* Quick Action Shortcut Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Điểm danh ngay</span>
            </button>
            <button
              onClick={() => setQuickActionModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ghi nhận nhanh</span>
            </button>
            <button
              onClick={() => setActiveTab('weekly_report')}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Báo cáo tuần</span>
            </button>
          </div>
        </div>

        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 10 Quick Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Students */}
        <div 
          onClick={() => setActiveTab('students')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tổng sĩ số</span>
            <Users className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">{maleCount} Nam • {femaleCount} Nữ</p>
        </div>

        {/* Present Today */}
        <div 
          onClick={() => setActiveTab('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Có mặt hôm nay</span>
            <UserCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {hasAttendanceToday ? `${todayPresent}/${totalCount}` : '—'}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {hasAttendanceToday ? `Đạt ${attendanceRate}% sĩ số` : 'Chưa có ghi nhận'}
          </p>
        </div>

        {/* Absent */}
        <div 
          onClick={() => setActiveTab('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Vắng hôm nay</span>
            <UserX className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {hasAttendanceToday ? todayAbsent : 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasAttendanceToday ? `${excusedAbsent} có phép • ${unexcusedAbsent} không phép` : 'Chưa có ghi nhận'}
          </p>
        </div>

        {/* Late */}
        <div 
          onClick={() => setActiveTab('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đi muộn</span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {hasAttendanceToday ? todayLate : 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasAttendanceToday ? (todayLate > 0 ? `${todayLate} học sinh` : 'Nề nếp tốt') : 'Chưa có ghi nhận'}
          </p>
        </div>

        {/* Violations */}
        <div 
          onClick={() => setActiveTab('violations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Vi phạm tuần</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-600">{weekViolations.length}</div>
          <p className="text-[11px] text-rose-700 mt-1">
            {weekViolations.length > 0
              ? `${weekViolations.length} ghi nhận trong tuần`
              : 'Chưa có ghi nhận'}
          </p>
        </div>

        {/* Merits / Good deeds */}
        <div 
          onClick={() => setActiveTab('rewards')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Việc tốt / Điểm 10</span>
            <Award className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{weekRewards.length}</div>
          <p className="text-[11px] text-emerald-700 mt-1">{weekRewards.length > 0 ? `${weekRewards.length} tuyên dương tuần này` : 'Chưa có ghi nhận'}</p>
        </div>

        {/* Cleaning rate */}
        <div 
          onClick={() => setActiveTab('duty')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Vệ sinh trực nhật</span>
            <Sparkles className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-blue-600">
            {hasCleaningDuties ? `${dutyRate}%` : '0'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasCleaningDuties ? `${successfulDuties}/${cleaningDuties.length} buổi đạt chuẩn` : 'Chưa có ghi nhận'}
          </p>
        </div>

        {/* Extracurricular rate */}
        <div 
          onClick={() => setActiveTab('extracurricular')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Phong trào</span>
            <TrendingUp className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {hasExtracurricular ? `${extracurricularCount}` : '0'}
          </div>
          <p className="text-[11px] text-indigo-700 mt-1 truncate" title={hasExtracurricular ? extracurricularActivities[0]?.title : undefined}>
            {hasExtracurricular ? (extracurricularActivities[0]?.title || `${extracurricularCount} hoạt động`) : 'Chưa có ghi nhận'}
          </p>
        </div>

        {/* Leading Group */}
        <div 
          onClick={() => setActiveTab('group_competition')}
          className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">Tổ dẫn đầu 🏆</span>
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          {rankedGroups.length === 0 ? (
            <>
              <div className="text-base font-black text-amber-900">Chưa có dữ liệu</div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">Chưa có ghi nhận</p>
            </>
          ) : areAllGroupsEqual ? (
            <>
              <div className="text-xl sm:text-2xl font-black text-amber-900">Đồng hạng 1</div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1 truncate" title="Cả 4 tổ bằng điểm nhau">
                {maxGroupScore.toFixed(1)}đ • 4 tổ bằng điểm nhau
              </p>
            </>
          ) : topGroups.length > 1 ? (
            <>
              <div className="text-base sm:text-lg font-black text-amber-900 truncate" title={topGroups.map(g => g.groupName).join(', ')}>
                {topGroups.map(g => g.groupName).join(', ')}
              </div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">
                Đồng hạng 1 • {maxGroupScore.toFixed(1)}đ
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-black text-amber-900">{topGroups[0]?.groupName}</div>
              <p className="text-[11px] text-amber-700 font-semibold mt-1">
                {topGroups[0]?.totalScore.toFixed(1)} điểm thi đua
              </p>
            </>
          )}
        </div>

        {/* Leading Student */}
        <div 
          onClick={() => {
            if (topStudents[0] && !areAllStudentsEqual) setSelectedStudentIdForDetail(topStudents[0].student.id);
            else setActiveTab('individual_competition');
          }}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold">Hạng 1 Cá nhân ⭐</span>
            <Star className="w-4 h-4 text-emerald-600" />
          </div>
          {rankedStudents.length === 0 ? (
            <>
              <div className="text-base font-black text-emerald-950">Chưa có dữ liệu</div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">Chưa có ghi nhận</p>
            </>
          ) : areAllStudentsEqual ? (
            <>
              <div className="text-lg sm:text-xl font-black text-emerald-950">Đồng hạng 1</div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 truncate" title="Tất cả học sinh bằng điểm nhau">
                {maxStudentScore.toFixed(1)}đ • Tất cả {rankedStudents.length} HS bằng điểm
              </p>
            </>
          ) : topStudents.length > 5 ? (
            <>
              <div className="text-sm sm:text-base font-black text-emerald-950 truncate">
                Đồng hạng 1 ({topStudents.length} HS)
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 truncate">
                {maxStudentScore.toFixed(1)}đ • Nhiều hơn 5 HS bằng điểm
              </p>
            </>
          ) : topStudents.length > 1 ? (
            <>
              <div className="text-sm sm:text-base font-black text-emerald-950 truncate" title={topStudents.map(s => s.student.fullName).join(', ')}>
                {topStudents.map(s => s.student.fullName).join(', ')}
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 truncate">
                {maxStudentScore.toFixed(1)}đ • {topStudents.length} HS đồng hạng
              </p>
            </>
          ) : (
            <>
              <div className="text-base sm:text-lg font-black text-emerald-950 truncate">
                {topStudents[0]?.student.fullName}
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                {topStudents[0]?.totalScore.toFixed(1)}đ • Tổ {topStudents[0]?.student.groupId}
              </p>
            </>
          )}
        </div>
      </div>

      {/* SMART WARNINGS: "HỌC SINH CẦN QUAN TÂM" */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Cảnh Báo Thông Minh: Học Sinh Cần Quan Tâm
              </h3>
              <p className="text-xs text-slate-500">
                Tự động phát hiện học sinh nghỉ nhiều, đi muộn, vi phạm lặp lại hoặc giảm điểm thi đua (Chỉ GVCN & Cán sự nhìn thấy)
              </p>
            </div>
          </div>
          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full">
            {studentsNeedingAttention.length} trường hợp
          </span>
        </div>

        {studentsNeedingAttention.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 text-emerald-800 text-xs font-medium">
            ✨ Tuyệt vời! Hiện tại cả {students.length} học sinh lớp {classInfo.className} đều duy trì nề nếp tốt, không có trường hợp cần cảnh báo đặc biệt.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {studentsNeedingAttention.map(item => (
              <div
                key={item.student.id}
                onClick={() => setSelectedStudentIdForDetail(item.student.id)}
                className="p-3.5 bg-rose-50/40 hover:bg-rose-50/80 border border-rose-200/80 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={item.student.avatar}
                      alt={item.student.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-rose-200"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs group-hover:text-rose-700 transition-colors">
                        {item.student.fullName}
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        {item.student.studentCode} • Tổ {item.student.groupId}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">
                    {item.totalScore.toFixed(1)}đ
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-rose-100 space-y-1 text-xs">
                  {item.attentionReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-rose-700 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Phụ huynh: {item.student.parentPhone}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Xem hồ sơ <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Columns: Group Leaderboard Summary & Live Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Group Competition Snapshot */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Bảng Xếp Hạng Thi Đua 4 Tổ</h3>
            </div>
            <button
              onClick={() => setActiveTab('group_competition')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Xem chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {rankedGroups.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Chưa có ghi nhận</div>
            ) : (
              rankedGroups.map(g => (
                <div
                  key={g.groupId}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                        g.rank === 1
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : g.rank === 2
                          ? 'bg-slate-300 text-slate-900'
                          : g.rank === 3
                          ? 'bg-amber-700/60 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      #{g.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{g.groupName}</h4>
                        {areAllGroupsEqual && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                            Đồng hạng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">Tổ trưởng: {g.leaderName} • {g.memberCount} thành viên</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base sm:text-lg font-black text-emerald-600">{g.totalScore.toFixed(1)}đ</div>
                    <span className="text-[10px] text-slate-500">
                      {hasCleaningDuties ? `Trực nhật: ${g.cleanRate.toFixed(0)}%` : 'Trực nhật: Chưa có ghi nhận'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Live Activity Log & Quick Undo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Nhật Ký Hoạt Động Thời Gian Thực</h3>
            </div>
            {currentUserRole.role === 'gvcn' && activityLogs.length > 0 && (
              <button
                onClick={undoLastAction}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Hoàn tác gần nhất</span>
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {activityLogs.slice(0, 8).map((log, idx) => (
              <div key={`${log.id || 'log'}-${idx}`} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                      {log.actorName}
                    </span>
                  </div>
                  <p className="text-slate-600">{log.target}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Cài đặt / Đổi ảnh Banner Trang chủ */}
      <BannerModal
        isOpen={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
      />
    </div>
  );
};
