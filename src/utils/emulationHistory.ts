import {
  Student,
  AttendanceRecord,
  ViolationRecord,
  RewardRecord,
  AcademicRecord,
  CleaningDuty,
  ExtracurricularActivity,
  EmulationDailyTransaction,
  StudentPeriodScore,
  GroupPeriodScore,
  EmulationPeriodSummary,
} from '../types';
import { FullAppDataPayload } from './googleSheetsSync';

/**
 * Standard baseline start of the school year (Monday of Week 1 - Sep 7th, 2026)
 * Đảm bảo tuần hiện tại (5/10 - 11/10/2026) chính xác là Tuần 5 theo phân phối chương trình
 */
export const SCHOOL_YEAR_START = '2026-09-07';

export interface DateTimelineInfo {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  week: number;
  weekLabel: string;
  month: number;
  monthLabel: string;
  semester: string;
  schoolYear: string;
}

/**
 * Extract timeline information (Day, Week, Month, Semester, School Year) from a date string
 */
export function getDateTimelineInfo(dateStr?: string, customStart: string = SCHOOL_YEAR_START): DateTimelineInfo {
  const safeDateStr = dateStr && dateStr.length >= 10 ? dateStr.slice(0, 10) : '2026-08-31';
  const parts = safeDateStr.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 8;
  const day = parts[2] || 31;

  const d = new Date(year, month - 1, day);

  // Day of week in Vietnamese
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeek = dayNames[d.getDay()] || 'Thứ Hai';

  // Calculate Week number from school year start
  const [syYear, syMonth, syDay] = customStart.split('-').map(Number);
  const startDate = new Date(syYear, syMonth - 1, syDay);
  const diffTime = d.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const week = Math.max(1, Math.floor(diffDays / 7) + 1);

  // Semester determination (Vietnam school calendar)
  // Semester 1: Late August / September to mid January
  // Semester 2: Mid January to May
  // Summer: June to August
  let semester = 'Học kỳ I';
  if ((month === 1 && day > 15) || (month >= 2 && month <= 5)) {
    semester = 'Học kỳ II';
  } else if (month >= 6 && month <= 7) {
    semester = 'Hè';
  } else {
    semester = 'Học kỳ I';
  }

  // School year determination (e.g. 2026 - 2027)
  const schoolYear = month >= 8 ? `${year} - ${year + 1}` : `${year - 1} - ${year}`;

  const monthLabel = `Tháng ${String(month).padStart(2, '0')}/${year}`;

  return {
    date: safeDateStr,
    dayOfWeek,
    week,
    weekLabel: `Tuần ${week}`,
    month,
    monthLabel,
    semester,
    schoolYear,
  };
}

/**
 * Get the current school week number based on today's date
 */
export function getCurrentSchoolWeek(customStart: string = SCHOOL_YEAR_START): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    return getDateTimelineInfo(today, customStart).week || 1;
  } catch (_) {
    return 1;
  }
}

/**
 * Build a complete chronological transaction log of all score changes (bonuses, penalties, attendance, duty, etc.)
 */
export function buildAllDailyTransactions(data: Partial<FullAppDataPayload>): EmulationDailyTransaction[] {
  const students = data.students || [];
  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));

  const list: EmulationDailyTransaction[] = [];

  // 1. Rewards (Điểm cộng)
  (data.rewards || []).forEach(r => {
    const stu = studentMap.get(r.studentId);
    const tl = getDateTimelineInfo(r.date);
    list.push({
      id: `trans_rew_${r.id}`,
      date: tl.date,
      dayOfWeek: tl.dayOfWeek,
      week: tl.week,
      month: tl.month,
      monthLabel: tl.monthLabel,
      semester: tl.semester,
      schoolYear: tl.schoolYear,
      studentId: r.studentId,
      studentCode: stu?.studentCode || '',
      fullName: stu?.fullName || 'Học sinh',
      groupId: stu?.groupId || 1,
      categoryType: 'Khen thưởng (+)',
      content: `${r.title}${r.category ? ` (${r.category})` : ''}`,
      pointsDelta: Number(r.bonusPoints) || 0,
      recordedBy: r.recordedBy || 'GVCN',
      notes: r.evidence ? `Minh chứng: ${r.evidence}` : '',
    });
  });

  // 2. Violations (Điểm trừ)
  (data.violations || []).forEach(v => {
    const stu = studentMap.get(v.studentId);
    const tl = getDateTimelineInfo(v.date);
    const penalty = -Math.abs(Number(v.penaltyPoints) || 0);
    list.push({
      id: `trans_vio_${v.id}`,
      date: tl.date,
      dayOfWeek: tl.dayOfWeek,
      week: tl.week,
      month: tl.month,
      monthLabel: tl.monthLabel,
      semester: tl.semester,
      schoolYear: tl.schoolYear,
      studentId: v.studentId,
      studentCode: stu?.studentCode || '',
      fullName: stu?.fullName || 'Học sinh',
      groupId: stu?.groupId || 1,
      categoryType: 'Vi phạm (-)',
      content: `${v.title}${v.category ? ` (${v.category})` : ''}`,
      pointsDelta: penalty,
      recordedBy: v.recordedBy || 'Sao đỏ',
      status: v.status,
      notes: v.remedyAction ? `Khắc phục: ${v.remedyAction}` : '',
    });
  });

  // 3. Attendance (Chuyên cần)
  (data.attendance || []).forEach(a => {
    const stu = studentMap.get(a.studentId);
    const tl = getDateTimelineInfo(a.date);
    let penalty = 0;
    let label = '';

    if (a.status === 'absent_unexcused') {
      penalty = -3;
      label = `Vắng không phép buổi ${a.session || 'học'}`;
    } else if (a.status === 'skipped_lesson') {
      penalty = -3;
      label = `Bỏ tiết / trốn tiết buổi ${a.session || 'học'}`;
    } else if (a.status === 'absent_excused') {
      penalty = -0.5;
      label = `Vắng có phép buổi ${a.session || 'học'}`;
    } else if (a.status === 'late') {
      penalty = -1;
      label = `Đi học muộn buổi ${a.session || 'học'}`;
    }

    if (penalty !== 0) {
      list.push({
        id: `trans_att_${a.id}`,
        date: tl.date,
        dayOfWeek: tl.dayOfWeek,
        week: tl.week,
        month: tl.month,
        monthLabel: tl.monthLabel,
        semester: tl.semester,
        schoolYear: tl.schoolYear,
        studentId: a.studentId,
        studentCode: stu?.studentCode || '',
        fullName: stu?.fullName || 'Học sinh',
        groupId: stu?.groupId || 1,
        categoryType: 'Chuyên cần',
        content: label,
        pointsDelta: penalty,
        recordedBy: a.recordedBy || 'Cán sự điểm danh',
        notes: a.note || '',
      });
    }
  });

  // 4. Academic Records (Học tập)
  (data.academicRecords || []).forEach(ac => {
    const stu = studentMap.get(ac.studentId);
    const tl = getDateTimelineInfo(ac.date);
    let delta = 0;
    let desc = '';

    if (ac.type === 'Điểm tốt (9-10)') {
      delta = +1;
      desc = `Hoa điểm tốt (${ac.score ? `${ac.score}đ` : '9-10'}) môn ${ac.subject}`;
    } else if (ac.type === 'Chưa làm bài' || ac.type === 'Chưa chuẩn bị bài') {
      delta = -1;
      desc = `${ac.type} môn ${ac.subject}`;
    }

    if (delta !== 0) {
      list.push({
        id: `trans_acad_${ac.id}`,
        date: tl.date,
        dayOfWeek: tl.dayOfWeek,
        week: tl.week,
        month: tl.month,
        monthLabel: tl.monthLabel,
        semester: tl.semester,
        schoolYear: tl.schoolYear,
        studentId: ac.studentId,
        studentCode: stu?.studentCode || '',
        fullName: stu?.fullName || 'Học sinh',
        groupId: stu?.groupId || 1,
        categoryType: 'Học tập',
        content: desc,
        pointsDelta: delta,
        recordedBy: ac.recordedBy || 'Lớp phó học tập',
        notes: ac.note || '',
      });
    }
  });

  // 5. Cleaning Duties (Trực nhật)
  (data.cleaningDuties || []).forEach(d => {
    const tl = getDateTimelineInfo(d.date);
    let delta = 0;
    if (d.status === 'Hoàn thành tốt') delta = +2;
    else if (d.status === 'Chưa hoàn thành') delta = -2;
    else if (d.status === 'Không thực hiện') delta = -5;

    if (delta !== 0 && Array.isArray(d.assignedStudentIds)) {
      d.assignedStudentIds.forEach(stId => {
        const stu = studentMap.get(stId);
        list.push({
          id: `trans_duty_${d.id}_${stId}`,
          date: tl.date,
          dayOfWeek: tl.dayOfWeek,
          week: tl.week,
          month: tl.month,
          monthLabel: tl.monthLabel,
          semester: tl.semester,
          schoolYear: tl.schoolYear,
          studentId: stId,
          studentCode: stu?.studentCode || '',
          fullName: stu?.fullName || 'Học sinh',
          groupId: stu?.groupId || 1,
          categoryType: 'Trực nhật',
          content: `Trực nhật (${d.status})${d.evaluationNote ? `: ${d.evaluationNote}` : ''}`,
          pointsDelta: delta,
          recordedBy: d.inspectorName || 'Lớp phó lao động',
          notes: d.evaluationNote || '',
        });
      });
    }
  });

  // 6. Extracurricular (Ngoại khóa)
  (data.extracurricularActivities || []).forEach(act => {
    const tl = getDateTimelineInfo(act.date);
    if (Array.isArray(act.participations)) {
      act.participations.forEach(p => {
        const pts = Number(p.pointsBonus) || 0;
        if (pts > 0) {
          const stu = studentMap.get(p.studentId);
          list.push({
            id: `trans_extra_${act.id}_${p.studentId}`,
            date: tl.date,
            dayOfWeek: tl.dayOfWeek,
            week: tl.week,
            month: tl.month,
            monthLabel: tl.monthLabel,
            semester: tl.semester,
            schoolYear: tl.schoolYear,
            studentId: p.studentId,
            studentCode: stu?.studentCode || '',
            fullName: stu?.fullName || 'Học sinh',
            groupId: stu?.groupId || 1,
            categoryType: 'Ngoại khóa',
            content: `Tham gia ${act.title}${p.achievement ? ` - ${p.achievement}` : ''}`,
            pointsDelta: pts,
            recordedBy: 'Bí thư Chi đoàn',
            notes: p.role ? `Vai trò: ${p.role}` : (act.notes || ''),
          });
        }
      });
    }
  });

  // 7. Labor Activities (Lao động công ích - CHỈ TÍNH ĐIỂM KHI ĐÃ HOÀN THÀNH & ĐƯỢC NGHIỆM THU)
  (data.laborActivities || []).forEach(act => {
    // Nếu chưa xác nhận nghiệm thu hoặc đang ở trạng thái 'Chờ thực hiện' -> Tuyệt đối không sinh transaction điểm!
    const isConfirmed = act.isConfirmed || (act.status && act.status !== 'Chờ thực hiện');
    if (!isConfirmed) return;

    const tl = getDateTimelineInfo(act.date);
    if (Array.isArray(act.participations)) {
      act.participations.forEach(p => {
        let pts = 0;
        if (p.pointsDelta !== undefined) {
          pts = p.pointsDelta;
        } else if (p.status === 'Hoàn thành tốt') {
          pts = 2;
        } else if (p.status === 'Có mặt') {
          pts = 1;
        } else if (p.status === 'Vắng có phép') {
          pts = 0;
        } else if (p.status === 'Vắng không phép') {
          pts = -3;
        } else if (p.status === 'Chưa hoàn thành') {
          pts = -2;
        }

        if (pts !== 0) {
          const stu = studentMap.get(p.studentId);
          list.push({
            id: `trans_labor_${act.id}_${p.studentId}`,
            date: tl.date,
            dayOfWeek: tl.dayOfWeek,
            week: tl.week,
            month: tl.month,
            monthLabel: tl.monthLabel,
            semester: tl.semester,
            schoolYear: tl.schoolYear,
            studentId: p.studentId,
            studentCode: stu?.studentCode || '',
            fullName: stu?.fullName || 'Học sinh',
            groupId: stu?.groupId || 1,
            categoryType: 'Lao động',
            content: `Lao động: ${act.title} (${p.status})${p.note ? ` - ${p.note}` : ''}`,
            pointsDelta: pts,
            recordedBy: act.inspectorName || 'Lớp phó lao động',
            status: act.status,
            notes: act.evaluationNote || p.note || '',
          });
        }
      });
    }
  });

  // Sort descending by date, then by time
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

export type EmulationFilterType = 'all' | 'day' | 'week' | 'month' | 'semester' | 'school_year';

export interface EmulationFilterOptions {
  type: EmulationFilterType;
  day?: string; // YYYY-MM-DD
  week?: number; // 1, 2, 3...
  month?: number; // 1 to 12
  year?: number; // 2026
  semester?: string; // 'Học kỳ I' | 'Học kỳ II'
  schoolYear?: string; // '2026 - 2027'
}

/**
 * Filter transactions based on period criteria
 */
export function filterTransactionsByPeriod(
  transactions: EmulationDailyTransaction[],
  filter: EmulationFilterOptions
): EmulationDailyTransaction[] {
  if (filter.type === 'all') return transactions;

  return transactions.filter(t => {
    if (filter.type === 'day' && filter.day) {
      return t.date === filter.day;
    }
    if (filter.type === 'week' && filter.week !== undefined) {
      return t.week === Number(filter.week);
    }
    if (filter.type === 'month' && filter.month !== undefined) {
      const matchMonth = t.month === Number(filter.month);
      const matchYear = filter.year ? t.date.startsWith(String(filter.year)) : true;
      return matchMonth && matchYear;
    }
    if (filter.type === 'semester' && filter.semester) {
      return t.semester === filter.semester;
    }
    if (filter.type === 'school_year' && filter.schoolYear) {
      return t.schoolYear === filter.schoolYear;
    }
    return true;
  });
}

/**
 * Calculate accurate emulation scores for all students and groups for a chosen period
 */
export function calculateEmulationScoresForPeriod(
  data: Partial<FullAppDataPayload>,
  filter: EmulationFilterOptions
): EmulationPeriodSummary {
  const students = data.students || [];
  const baseScore = data.settings?.baseScore ?? 100;
  const allTransactions = buildAllDailyTransactions(data);
  const periodTransactions = filterTransactionsByPeriod(allTransactions, filter);

  // Group transactions by student
  const studentTransMap = new Map<string, EmulationDailyTransaction[]>();
  students.forEach(s => studentTransMap.set(s.id, []));
  periodTransactions.forEach(t => {
    const list = studentTransMap.get(t.studentId) || [];
    list.push(t);
    studentTransMap.set(t.studentId, list);
  });

  // Calculate scores for each student
  const studentScores: StudentPeriodScore[] = students.map(student => {
    const trans = studentTransMap.get(student.id) || [];

    let bonusPoints = 0;
    let penaltyPoints = 0;
    let attendancePenalty = 0;
    let dutyPoints = 0;
    let laborPoints = 0;
    let academicBonus = 0;
    let extraCurricularPoints = 0;

    let totalViolations = 0;
    let totalRewards = 0;
    let totalAbsences = 0;
    let totalLate = 0;

    trans.forEach(t => {
      if (t.categoryType === 'Khen thưởng (+)') {
        bonusPoints += t.pointsDelta;
        totalRewards += 1;
      } else if (t.categoryType === 'Vi phạm (-)') {
        penaltyPoints += Math.abs(t.pointsDelta);
        totalViolations += 1;
      } else if (t.categoryType === 'Chuyên cần') {
        attendancePenalty += Math.abs(t.pointsDelta);
        if (t.content.includes('Vắng') || t.content.includes('tiết')) {
          totalAbsences += 1;
        } else if (t.content.includes('muộn')) {
          totalLate += 1;
        }
      } else if (t.categoryType === 'Trực nhật') {
        dutyPoints += t.pointsDelta;
      } else if (t.categoryType === 'Lao động') {
        laborPoints += t.pointsDelta;
      } else if (t.categoryType === 'Học tập') {
        academicBonus += t.pointsDelta;
      } else if (t.categoryType === 'Ngoại khóa') {
        extraCurricularPoints += t.pointsDelta;
      }
    });

    // Quy định: Trực nhật cộng điểm thi đua cho TỔ, không cộng/trừ cho CÁ NHÂN
    // Điểm cá nhân bao gồm: Khen thưởng (+), Vi phạm (-), Chuyên cần (-), Lao động (±), Học tập (±), Ngoại khóa (+)
    const netBonus = bonusPoints + extraCurricularPoints + Math.max(0, laborPoints) + Math.max(0, academicBonus);
    const netPenalty = penaltyPoints + attendancePenalty + Math.abs(Math.min(0, laborPoints)) + Math.abs(Math.min(0, academicBonus));

    const totalScore = Math.max(0, baseScore + netBonus - netPenalty);

    let tier: StudentPeriodScore['tier'] = 'Cần cố gắng';
    if (totalScore >= 95) tier = 'Xuất sắc';
    else if (totalScore >= 85) tier = 'Tốt';
    else if (totalScore >= 70) tier = 'Khá';
    else if (totalScore >= 50) tier = 'Đạt';

    const trend: StudentPeriodScore['trend'] =
      totalViolations > 1 || attendancePenalty > 2 ? 'down' : totalRewards > 0 ? 'up' : 'steady';

    return {
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      groupId: student.groupId,
      roleInClass: student.roleInClass,
      avatar: student.avatar,
      baseScore,
      bonusPoints,
      penaltyPoints,
      attendancePenalty,
      dutyPoints,
      laborPoints,
      academicBonus,
      extraCurricularPoints,
      totalScore: Number(totalScore.toFixed(1)),
      rankInClass: 0,
      rankInGroup: 0,
      tier,
      totalViolations,
      totalRewards,
      totalAbsences,
      totalLate,
      trend,
    };
  });

  // Assign class ranks (equal score -> equal rank)
  studentScores.sort((a, b) => b.totalScore - a.totalScore);
  let curRank = 1;
  studentScores.forEach((s, idx) => {
    if (idx > 0 && Math.abs(s.totalScore - studentScores[idx - 1].totalScore) >= 0.05) {
      curRank = idx + 1;
    }
    s.rankInClass = curRank;
  });

  // Assign group ranks (equal score -> equal rank)
  [1, 2, 3, 4].forEach(gId => {
    const groupMembers = studentScores.filter(s => s.groupId === gId);
    groupMembers.sort((a, b) => b.totalScore - a.totalScore);
    let curGroupRank = 1;
    groupMembers.forEach((s, idx) => {
      if (idx > 0 && Math.abs(s.totalScore - groupMembers[idx - 1].totalScore) >= 0.05) {
        curGroupRank = idx + 1;
      }
      s.rankInGroup = curGroupRank;
    });
  });

  // Lọc danh sách trực nhật và chuyên cần theo kỳ thi đua đã chọn
  const periodDuties = (data.cleaningDuties || []).filter(d => {
    const tl = getDateTimelineInfo(d.date);
    if (filter.type === 'day' && filter.day) return d.date === filter.day;
    if (filter.type === 'week' && filter.week !== undefined) return tl.week === Number(filter.week);
    if (filter.type === 'month' && filter.month !== undefined) return tl.month === Number(filter.month);
    if (filter.type === 'semester' && filter.semester) return tl.semester === filter.semester;
    if (filter.type === 'school_year' && filter.schoolYear) return tl.schoolYear === filter.schoolYear;
    return true;
  });

  const periodAttendance = (data.attendance || []).filter(a => {
    const tl = getDateTimelineInfo(a.date);
    if (filter.type === 'day' && filter.day) return a.date === filter.day;
    if (filter.type === 'week' && filter.week !== undefined) return tl.week === Number(filter.week);
    if (filter.type === 'month' && filter.month !== undefined) return tl.month === Number(filter.month);
    if (filter.type === 'semester' && filter.semester) return tl.semester === filter.semester;
    if (filter.type === 'school_year' && filter.schoolYear) return tl.schoolYear === filter.schoolYear;
    return true;
  });

  // Calculate Group Scores
  const groupScores: GroupPeriodScore[] = [1, 2, 3, 4].map(groupId => {
    const groupStudents = studentScores.filter(s => s.groupId === groupId);
    const count = groupStudents.length || 1;

    const leader = students.find(s => s.groupId === groupId && s.roleInClass.toLowerCase().includes('tổ trưởng'));
    const leaderName = leader ? leader.fullName : `Tổ trưởng Tổ ${groupId}`;

    const totalViolations = groupStudents.reduce((sum, s) => sum + s.totalViolations, 0);
    const totalRewards = groupStudents.reduce((sum, s) => sum + s.totalRewards, 0);
    const totalAbsences = groupStudents.reduce((sum, s) => sum + s.totalAbsences, 0);
    const totalLate = groupStudents.reduce((sum, s) => sum + s.totalLate, 0);

    const avgStudentScore = groupStudents.reduce((sum, s) => sum + s.totalScore, 0) / count;

    // Quy định: Vắng trừ điểm tổ mỗi lượt là có phép 1 điểm, không phép 2 điểm, đi trễ 0.5 điểm
    const groupStudentIds = new Set(groupStudents.map(s => s.studentId));
    const groupAttRecords = periodAttendance.filter(a => groupStudentIds.has(a.studentId));
    const excusedAbsences = groupAttRecords.filter(a => a.status === 'absent_excused').length;
    const unexcusedAbsences = groupAttRecords.filter(a => a.status === 'absent_unexcused' || a.status === 'skipped_lesson').length;
    const groupLateCount = groupAttRecords.filter(a => a.status === 'late').length;

    const groupAttendancePenalty = (excusedAbsences * 1) + (unexcusedAbsences * 2) + (groupLateCount * 0.5);
    const attendanceScore = Math.max(0, 20 - groupAttendancePenalty);

    // Quy định: Trực nhật cộng điểm thi đua cho TỔ (Hoàn thành tốt +2, Chưa hoàn thành -2, Không thực hiện -5)
    const groupDutyDelta = periodDuties
      .filter(d => d.groupId === groupId && d.status !== 'Chờ trực')
      .reduce((sum, d) => sum + (Number(d.pointsDelta) || 0), 0);
    const hygieneScore = Math.max(0, 15 + groupDutyDelta);

    const disciplineScore = Math.max(0, 20 - totalViolations * 2);
    const academicScore = Math.min(25, Math.max(0, 25 + totalRewards * 1));
    const activityScore = Math.min(10, Math.max(0, 10 + totalRewards * 0.5));
    const solidarityScore = 10;

    const totalScore = Number((attendanceScore + disciplineScore + academicScore + hygieneScore + activityScore + solidarityScore).toFixed(1));

    return {
      groupId,
      groupName: `Tổ ${groupId}`,
      leaderName,
      memberCount: count,
      attendanceScore,
      academicScore,
      disciplineScore,
      hygieneScore,
      activityScore,
      solidarityScore,
      totalScore,
      rank: 0,
      totalViolations,
      totalRewards,
      avgStudentScore: Number(avgStudentScore.toFixed(1)),
    };
  });

  // Assign group ranks (equal score -> equal rank)
  groupScores.sort((a, b) => b.totalScore - a.totalScore);
  let curGroupScoreRank = 1;
  groupScores.forEach((g, idx) => {
    if (idx > 0 && Math.abs(g.totalScore - groupScores[idx - 1].totalScore) >= 0.05) {
      curGroupScoreRank = idx + 1;
    }
    g.rank = curGroupScoreRank;
  });

  // Generate period label
  let periodLabel = 'Toàn bộ thời gian (Lũy kế)';
  let periodKey = 'all';

  if (filter.type === 'day' && filter.day) {
    const tl = getDateTimelineInfo(filter.day);
    periodLabel = `Ngày ${tl.date} (${tl.dayOfWeek} - ${tl.weekLabel})`;
    periodKey = `day_${filter.day}`;
  } else if (filter.type === 'week' && filter.week !== undefined) {
    periodLabel = `Tuần ${filter.week}`;
    periodKey = `week_${filter.week}`;
  } else if (filter.type === 'month' && filter.month !== undefined) {
    periodLabel = `Tháng ${filter.month}/${filter.year || 2026}`;
    periodKey = `month_${filter.year || 2026}_${filter.month}`;
  } else if (filter.type === 'semester' && filter.semester) {
    periodLabel = `${filter.semester}`;
    periodKey = `semester_${filter.semester}`;
  } else if (filter.type === 'school_year' && filter.schoolYear) {
    periodLabel = `Năm học ${filter.schoolYear}`;
    periodKey = `year_${filter.schoolYear}`;
  }

  return {
    periodType: filter.type,
    periodKey,
    periodLabel,
    studentScores,
    groupScores,
  };
}

/**
 * Build 5 comprehensive permanent emulation sheets for Google Sheets and Excel
 */
export function buildEmulationSheetsTables(data: Partial<FullAppDataPayload>) {
  const allDailyTrans = buildAllDailyTransactions(data);

  // 1. LichSuDiem_TheoNgay (Lưu vết chi tiết từng điểm cộng, trừ theo ngày)
  const lichSuDiemTheoNgaySheet: any[][] = [
    [
      'MÃ GIAO DỊCH',
      'NGÀY GHI NHẬN',
      'THỨ TRONG TUẦN',
      'TUẦN HỌC',
      'THÁNG',
      'HỌC KỲ',
      'NĂM HỌC',
      'MÃ HỌC SINH',
      'HỌ VÀ TÊN',
      'TỔ',
      'LOẠI ĐIỂM BIẾN ĐỘNG',
      'NỘI DUNG CHI TIẾT',
      'ĐIỂM SỐ (±)',
      'NGƯỜI GHI NHẬN / BÁO CÁO',
      'TRẠNG THÁI / BIỆN PHÁP',
      'GHI CHÚ MINH CHỨNG'
    ],
    ...allDailyTrans.map(t => [
      t.id,
      t.date,
      t.dayOfWeek,
      `Tuần ${t.week}`,
      t.monthLabel,
      t.semester,
      t.schoolYear,
      t.studentCode,
      t.fullName,
      `Tổ ${t.groupId}`,
      t.categoryType,
      t.content,
      t.pointsDelta > 0 ? `+${t.pointsDelta}` : t.pointsDelta,
      t.recordedBy,
      t.status || 'Đã ghi nhận',
      t.notes || ''
    ])
  ];

  // Detect all distinct weeks present in dataset
  const weeksPresent = Array.from(new Set(allDailyTrans.map(t => t.week))).sort((a, b) => a - b);
  if (weeksPresent.length === 0) weeksPresent.push(1);

  // 2. DiemThiDua_TheoTuan (Bảng tổng hợp điểm thi đua học sinh theo từng TUẦN)
  const diemThiDuaTheoTuanRows: any[][] = [];
  weeksPresent.forEach(w => {
    const summary = calculateEmulationScoresForPeriod(data, { type: 'week', week: w });
    summary.studentScores.forEach(sc => {
      diemThiDuaTheoTuanRows.push([
        data.classInfo?.schoolYear || '2026 - 2027',
        sc.totalScore >= 95 ? 'Học kỳ I' : 'Học kỳ I',
        `Tuần ${w}`,
        sc.rankInClass,
        sc.studentCode,
        sc.fullName,
        `Tổ ${sc.groupId}`,
        sc.rankInGroup,
        sc.roleInClass,
        sc.baseScore,
        `+${sc.bonusPoints}`,
        sc.penaltyPoints,
        sc.attendancePenalty,
        sc.dutyPoints > 0 ? `+${sc.dutyPoints}` : sc.dutyPoints,
        sc.academicBonus > 0 ? `+${sc.academicBonus}` : sc.academicBonus,
        `+${sc.extraCurricularPoints}`,
        sc.totalScore,
        sc.tier,
        sc.totalViolations,
        sc.totalRewards,
        sc.totalAbsences,
        sc.totalLate,
        sc.tier === 'Xuất sắc' ? 'Khen ngợi toàn diện' : sc.totalViolations > 0 ? 'Cần chấn chỉnh nền nếp' : 'Duy trì tốt'
      ]);
    });
  });

  const diemThiDuaTheoTuanSheet = [
    [
      'NĂM HỌC',
      'HỌC KỲ',
      'TUẦN THI ĐUA',
      'HẠNG LỚP',
      'MÃ HỌC SINH',
      'HỌ VÀ TÊN',
      'TỔ',
      'HẠNG TỔ',
      'CHỨC VỤ',
      'ĐIỂM GỐC TUẦN',
      'ĐIỂM CỘNG (+)',
      'ĐIỂM TRỪ VI PHẠM (-)',
      'TRỪ CHUYÊN CẦN (-)',
      'ĐIỂM TRỰC NHẬT (±)',
      'ĐIỂM HỌC TẬP (±)',
      'ĐIỂM NGOẠI KHÓA (+)',
      'TỔNG ĐIỂM THI ĐUA TUẦN',
      'XẾP LOẠI TUẦN',
      'SỐ VI PHẠM',
      'SỐ KHEN THƯỞNG',
      'SỐ BUỔI VẮNG',
      'SỐ LẦN MUỘN',
      'NHẬN XÉT CỦA GVCN / BAN CÁN SỰ'
    ],
    ...diemThiDuaTheoTuanRows
  ];

  // Detect distinct months present in dataset
  const monthsPresent = Array.from(new Set(allDailyTrans.map(t => `${t.date.slice(0, 7)}`))).sort();
  if (monthsPresent.length === 0) monthsPresent.push('2026-08', '2026-09');

  // 3. DiemThiDua_TheoThang (Bảng tổng hợp điểm thi đua học sinh theo từng THÁNG)
  const diemThiDuaTheoThangRows: any[][] = [];
  monthsPresent.forEach(ym => {
    const [yStr, mStr] = ym.split('-');
    const summary = calculateEmulationScoresForPeriod(data, {
      type: 'month',
      year: Number(yStr),
      month: Number(mStr),
    });

    summary.studentScores.forEach(sc => {
      diemThiDuaTheoThangRows.push([
        data.classInfo?.schoolYear || '2026 - 2027',
        'Học kỳ I',
        `Tháng ${mStr}/${yStr}`,
        sc.rankInClass,
        sc.studentCode,
        sc.fullName,
        `Tổ ${sc.groupId}`,
        sc.rankInGroup,
        sc.totalScore,
        `+${sc.bonusPoints}`,
        sc.penaltyPoints,
        sc.attendancePenalty,
        sc.dutyPoints,
        sc.academicBonus,
        `+${sc.extraCurricularPoints}`,
        sc.tier,
        sc.totalViolations,
        sc.totalRewards,
        sc.totalAbsences,
        sc.totalLate,
        sc.rankInClass <= 3 ? '👑 Học sinh Tiêu biểu của Tháng' : sc.tier === 'Xuất sắc' ? '⭐ Học sinh Xuất sắc' : 'Đạt chuẩn'
      ]);
    });
  });

  const diemThiDuaTheoThangSheet = [
    [
      'NĂM HỌC',
      'HỌC KỲ',
      'THÁNG ĐÁNH GIÁ',
      'HẠNG THÁNG (LỚP)',
      'MÃ HỌC SINH',
      'HỌ VÀ TÊN',
      'TỔ',
      'HẠNG THÁNG (TỔ)',
      'ĐIỂM THI ĐUA TRUNG BÌNH THÁNG',
      'TỔNG ĐIỂM CỘNG (+)',
      'TỔNG ĐIỂM TRỪ (-)',
      'TRỪ CHUYÊN CẦN',
      'ĐIỂM TRỰC NHẬT',
      'ĐIỂM HỌC TẬP',
      'ĐIỂM NGOẠI KHÓA',
      'XẾP LOẠI THÁNG',
      'TỔNG SỐ VI PHẠM',
      'TỔNG SỐ KHEN THƯỞNG',
      'TỔNG SỐ BUỔI VẮNG',
      'TỔNG SỐ LẦN MUỘN',
      'DANH HIỆU THI ĐUA THÁNG'
    ],
    ...diemThiDuaTheoThangRows
  ];

  // 4. DiemThiDua_HocKy_Nam (Bảng tổng hợp điểm theo HỌC KỲ I, HỌC KỲ II và CẢ NĂM HỌC)
  const semestersToEval = [
    { type: 'semester' as const, semester: 'Học kỳ I', label: 'Học kỳ I' },
    { type: 'semester' as const, semester: 'Học kỳ II', label: 'Học kỳ II' },
    { type: 'school_year' as const, schoolYear: data.classInfo?.schoolYear || '2026 - 2027', label: 'Cả năm học' }
  ];

  const diemThiDuaHocKyNamRows: any[][] = [];
  semestersToEval.forEach(period => {
    const summary = calculateEmulationScoresForPeriod(data, period);
    summary.studentScores.forEach(sc => {
      const conduct = sc.totalScore >= 90 ? 'Tốt' : sc.totalScore >= 75 ? 'Khá' : sc.totalScore >= 60 ? 'Đạt' : 'Chưa đạt';
      const award = sc.rankInClass <= 3 ? 'Học sinh Xuất Sắc Toàn Diện' : sc.totalScore >= 95 ? 'Học sinh Tiêu biểu' : 'Khen thưởng chuyên cần';

      diemThiDuaHocKyNamRows.push([
        data.classInfo?.schoolYear || '2026 - 2027',
        period.label,
        sc.rankInClass,
        sc.studentCode,
        sc.fullName,
        `Tổ ${sc.groupId}`,
        sc.roleInClass,
        sc.totalScore,
        `+${sc.bonusPoints}`,
        sc.penaltyPoints,
        sc.attendancePenalty,
        sc.dutyPoints,
        sc.academicBonus,
        `+${sc.extraCurricularPoints}`,
        conduct,
        award,
        sc.totalViolations,
        sc.totalRewards,
        sc.totalAbsences,
        sc.totalLate,
        'Lưu trữ hồ sơ học bạ vĩnh viễn'
      ]);
    });
  });

  const diemThiDuaHocKyNamSheet = [
    [
      'NĂM HỌC',
      'KỲ ĐÁNH GIÁ (KỲ / CẢ NĂM)',
      'HẠNG TỔNG KẾT',
      'MÃ HỌC SINH',
      'HỌ VÀ TÊN',
      'TỔ',
      'CHỨC VỤ',
      'ĐIỂM THI ĐUA TÍCH LŨY',
      'TỔNG ĐIỂM CỘNG (+)',
      'TỔNG ĐIỂM TRỪ (-)',
      'TRỪ CHUYÊN CẦN',
      'ĐIỂM TRỰC NHẬT',
      'ĐIỂM HỌC TẬP',
      'ĐIỂM NGOẠI KHÓA',
      'DỰ KIẾN XẾP LOẠI RÈN LUYỆN',
      'DANH HIỆU THI ĐUA ĐỀ NGHỊ',
      'TỔNG VI PHẠM',
      'TỔNG KHEN THƯỞNG',
      'TỔNG NGHỈ HỌC',
      'TỔNG ĐI MUỘN',
      'GHI CHÚ HỌC BẠ'
    ],
    ...diemThiDuaHocKyNamRows
  ];

  // 5. ThiDuaTo_LichSu (Bảng tổng hợp thi đua 4 Tổ theo Tuần, Tháng, Học kỳ, Năm)
  const thiDuaToLichSuRows: any[][] = [];

  // Groups by Week
  weeksPresent.forEach(w => {
    const summary = calculateEmulationScoresForPeriod(data, { type: 'week', week: w });
    summary.groupScores.forEach(g => {
      thiDuaToLichSuRows.push([
        data.classInfo?.schoolYear || '2026 - 2027',
        'Theo Tuần',
        `Tuần ${w}`,
        g.rank,
        g.groupName,
        g.leaderName,
        g.memberCount,
        g.totalScore,
        g.attendanceScore,
        g.academicScore,
        g.disciplineScore,
        g.hygieneScore,
        g.activityScore,
        g.solidarityScore,
        g.avgStudentScore,
        g.totalViolations,
        g.totalRewards,
        g.rank === 1 ? '🏆 Nhận Cờ Thi Đua Luân Lưu Tuần' : 'Đạt chuẩn tuần'
      ]);
    });
  });

  // Groups by Month
  monthsPresent.forEach(ym => {
    const [yStr, mStr] = ym.split('-');
    const summary = calculateEmulationScoresForPeriod(data, {
      type: 'month',
      year: Number(yStr),
      month: Number(mStr),
    });
    summary.groupScores.forEach(g => {
      thiDuaToLichSuRows.push([
        data.classInfo?.schoolYear || '2026 - 2027',
        'Theo Tháng',
        `Tháng ${mStr}/${yStr}`,
        g.rank,
        g.groupName,
        g.leaderName,
        g.memberCount,
        g.totalScore,
        g.attendanceScore,
        g.academicScore,
        g.disciplineScore,
        g.hygieneScore,
        g.activityScore,
        g.solidarityScore,
        g.avgStudentScore,
        g.totalViolations,
        g.totalRewards,
        g.rank === 1 ? '👑 Tổ Xuất Sắc Nhất Tháng' : 'Hoàn thành nhiệm vụ'
      ]);
    });
  });

  const thiDuaToLichSuSheet = [
    [
      'NĂM HỌC',
      'PHÂN LOẠI THỜI GIAN',
      'MỐC THỜI GIAN (TUẦN / THÁNG / KỲ)',
      'HẠNG TỔ',
      'TÊN TỔ THI ĐUA',
      'TỔ TRƯỞNG',
      'SĨ SỐ THÀNH VIÊN',
      'TỔNG ĐIỂM THI ĐUA TỔ (THANG 100)',
      'ĐIỂM CHUYÊN CẦN (20Đ)',
      'ĐIỂM HỌC TẬP (25Đ)',
      'ĐIỂM NỀ NẾP (20Đ)',
      'ĐIỂM VỆ SINH (15Đ)',
      'ĐIỂM PHONG TRÀO (10Đ)',
      'ĐIỂM ĐOÀN KẾT (10Đ)',
      'ĐIỂM TRUNG BÌNH THÀNH VIÊN',
      'TỔNG VI PHẠM TỔ',
      'TỔNG KHEN THƯỞNG TỔ',
      'KHEN THƯỞNG / DANH HIỆU TỔ'
    ],
    ...thiDuaToLichSuRows
  ];

  return {
    LichSuDiem_TheoNgay: lichSuDiemTheoNgaySheet,
    DiemThiDua_TheoTuan: diemThiDuaTheoTuanSheet,
    DiemThiDua_TheoThang: diemThiDuaTheoThangSheet,
    DiemThiDua_HocKy_Nam: diemThiDuaHocKyNamSheet,
    ThiDuaTo_LichSu: thiDuaToLichSuSheet,
  };
}
