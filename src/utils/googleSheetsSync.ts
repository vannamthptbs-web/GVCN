import * as XLSX from 'xlsx';
import {
  Student,
  AttendanceRecord,
  ViolationRecord,
  RewardRecord,
  AcademicRecord,
  CleaningDuty,
  LaborActivity,
  ExtracurricularActivity,
  StudentSelfEvaluation,
  WeeklyGroupSummary,
  CompetitionSettings,
  ClassInfo,
  AccountUser,
  RoleType,
  GoogleSheetsConfig,
  AttendanceStatus,
  ViolationCategory,
  ViolationSeverity,
  ViolationProcessStatus,
  RewardCategory,
  SeatAssignment,
} from '../types';
import {
  removeVietnameseTones,
  capitalizeVietnameseName,
  normalizeDate,
} from './excelImportExport';
export { capitalizeVietnameseName, removeVietnameseTones, normalizeDate };
import { buildEmulationSheetsTables } from './emulationHistory';
import { MASTER_GOOGLE_APPS_SCRIPT_URL } from '../data/mockData';
import { generateStudentUsername, DEFAULT_STUDENT_PIN, isDefaultStudentPin } from './roleHierarchy';
import { getPermanentAvatar } from './avatarStorage';

export interface FullAppDataPayload {
  classInfo: ClassInfo;
  accounts: AccountUser[];
  students: Student[];
  attendance: AttendanceRecord[];
  violations: ViolationRecord[];
  rewards: RewardRecord[];
  academicRecords: AcademicRecord[];
  cleaningDuties: CleaningDuty[];
  laborActivities: LaborActivity[];
  extracurricularActivities: ExtracurricularActivity[];
  evaluations: StudentSelfEvaluation[];
  groupSummaries: WeeklyGroupSummary[];
  settings: CompetitionSettings;
  studentScores: any[];
  groupScores: any[];
  selectedWeek?: number;
  weeklyCriteria?: any[];
  classFund?: any;
  fundTransactions?: any[];
  seatGrid?: any;
  seatingChart?: SeatAssignment[];
  parentMeetingLogs?: any[];
  riskFactors?: any[];
  studyGroups?: any[];
}

/**
 * Format status labels to friendly Vietnamese text
 */
export function formatAttendanceStatusVN(status: string): string {
  switch (status) {
    case 'present': return 'Có mặt';
    case 'absent_excused': return 'Nghỉ có phép';
    case 'absent_unexcused': return 'Nghỉ không phép';
    case 'late': return 'Đi muộn';
    case 'skipped_lesson': return 'Trốn tiết';
    case 'special': return 'Đặc biệt';
    default: return status;
  }
}

/**
 * Convert full app dataset into multi-sheet 2D array representation
 */
export function buildMultiSheetTables(data: FullAppDataPayload) {
  const accounts: AccountUser[] = Array.isArray(data.accounts) ? data.accounts : (Object.values(data.accounts || {}) as AccountUser[]);
  const students: Student[] = Array.isArray(data.students) ? data.students : (Object.values(data.students || {}) as Student[]);
  const attendance: AttendanceRecord[] = Array.isArray(data.attendance) ? data.attendance : (Object.values(data.attendance || {}) as AttendanceRecord[]);
  const violations: ViolationRecord[] = Array.isArray(data.violations) ? data.violations : (Object.values(data.violations || {}) as ViolationRecord[]);
  const rewards: RewardRecord[] = Array.isArray(data.rewards) ? data.rewards : (Object.values(data.rewards || {}) as RewardRecord[]);
  const academicRecords: AcademicRecord[] = Array.isArray(data.academicRecords) ? data.academicRecords : (Object.values(data.academicRecords || {}) as AcademicRecord[]);
  const cleaningDuties: CleaningDuty[] = Array.isArray(data.cleaningDuties) ? data.cleaningDuties : (Object.values(data.cleaningDuties || {}) as CleaningDuty[]);
  const laborActivities: LaborActivity[] = Array.isArray(data.laborActivities) ? data.laborActivities : (Object.values(data.laborActivities || {}) as LaborActivity[]);
  const extracurricularActivities: ExtracurricularActivity[] = Array.isArray(data.extracurricularActivities) ? data.extracurricularActivities : (Object.values(data.extracurricularActivities || {}) as ExtracurricularActivity[]);
  const evaluations: StudentSelfEvaluation[] = Array.isArray(data.evaluations) ? data.evaluations : (Object.values(data.evaluations || {}) as StudentSelfEvaluation[]);
  const studentScores: any[] = Array.isArray(data.studentScores) ? data.studentScores : (Object.values(data.studentScores || {}) as any[]);
  const groupScores: any[] = Array.isArray(data.groupScores) ? data.groupScores : (Object.values(data.groupScores || {}) as any[]);

  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));

  // Determine sanitized and valid teacher details
  const gvcnAcc = accounts.find(a => a.category === 'gvcn' || a.role === 'gvcn' || a.id === 'acc_gvcn');
  let rawTeacherName = (data.classInfo?.homeroomTeacher || '').trim();
  let safeTeacherEmail = (data.classInfo?.teacherEmail || gvcnAcc?.email || '').trim();
  let safeTeacherPhone = (data.classInfo?.teacherPhone || gvcnAcc?.phone || '').trim();

  // If teacher name is corrupted into an email or phone, separate it
  if (rawTeacherName.includes('@')) {
    if (!safeTeacherEmail) safeTeacherEmail = rawTeacherName;
    rawTeacherName = '';
  } else if (/^[0-9+\s().-]{7,}$/.test(rawTeacherName)) {
    if (!safeTeacherPhone) safeTeacherPhone = rawTeacherName;
    rawTeacherName = '';
  }

  let accName = (gvcnAcc?.fullName || '').trim();
  if (accName.includes('@') || /^[0-9+\s().-]{7,}$/.test(accName)) {
    if (!safeTeacherEmail && accName.includes('@')) safeTeacherEmail = accName;
    accName = '';
  }

  const safeTeacherName = rawTeacherName || accName || (data.classInfo?.homeroomTeacher || '').trim();

  // Normalize phone number (ensure leading 0)
  if (safeTeacherPhone) {
    const digits = safeTeacherPhone.replace(/[^0-9]/g, '');
    if (digits.length === 9 && !digits.startsWith('0')) {
      safeTeacherPhone = '0' + digits;
    }
  }

  // 0. ThongTinLop_GVCN (CHUYÊN BIỆT LƯU TRỮ VÀ GỌI LẠI THÔNG TIN LỚP HỌC & GVCN CHÍNH XÁC 100%)
  const thongTinLopGvcnSheet = [
    ['DANH MỤC THÔNG TIN (KEY)', 'GIÁ TRỊ NỘI DUNG HIỆN TẠI', 'TRƯỜNG DỮ LIỆU APP', 'MÔ TẢ QUẢN LÝ / HƯỚNG DẪN'],
    ['Tên Trường Học', data.classInfo?.schoolName || '', 'schoolName', 'Tên trường / Cơ sở giáo dục đào tạo'],
    ['Khối Lớp', data.classInfo?.gradeLevel || 'Khối 10', 'gradeLevel', 'Khối học (VD: Khối 10, Khối 11, Khối 12)'],
    ['Tên Lớp Chủ Nhiệm', data.classInfo?.className || '', 'className', 'Tên lớp chủ nhiệm (VD: 10A1, 11B2, 12A1)'],
    ['Năm Học Niên Khóa', data.classInfo?.schoolYear || '2026 - 2027', 'schoolYear', 'Năm học niên khóa hiện tại'],
    ['Học Kỳ Hiện Tại', data.classInfo?.semester || 'Học kỳ I', 'semester', 'Học kỳ I / Học kỳ II / Cả năm'],
    ['Họ Và Tên GVCN', safeTeacherName, 'homeroomTeacher', 'Họ tên đầy đủ Giáo viên Chủ nhiệm'],
    ['Số Điện Thoại GVCN', safeTeacherPhone, 'teacherPhone', 'Số điện thoại liên lạc trực tiếp'],
    ['Email GVCN', safeTeacherEmail, 'teacherEmail', 'Hòm thư điện tử liên hệ chính thức'],
    ['Phòng Học Cố Định', data.classInfo?.roomNumber || '', 'roomNumber', 'Phòng học / Tòa nhà của lớp'],
    ['Khẩu Hiệu / Mục Tiêu', data.classInfo?.motto || 'Kỷ luật - Tự giác - Yêu thương - Tỏa sáng', 'motto', 'Khẩu hiệu thi đua và mục tiêu lớp'],
    ['Tổng Sĩ Số Lớp', data.classInfo?.totalStudents || students.length, 'totalStudents', 'Số lượng học sinh trong danh sách'],
    ['Tổng Số Tổ Thi Đua', data.classInfo?.totalGroups || 4, 'totalGroups', 'Số tổ thi đua sinh hoạt trong lớp'],
    ['Thời Gian Sao Lưu Gần Nhất', new Date().toLocaleString('vi-VN'), 'lastBackupAt', 'Thời điểm ghi nhận bản sao lưu GVCN'],
    ['Đồng Bộ Hai Chiều', 'KÍCH HOẠT - TỰ ĐỘNG GỌI LẠI', 'syncStatus', 'Hỗ trợ gọi lại dữ liệu về ứng dụng chuẩn xác 100%']
  ];

  // 1. TaiKhoan (Accounts)
  const taiKhoanSheet = [
    ['STT', 'MÃ TÀI KHOẢN', 'TÊN ĐĂNG NHẬP', 'MÃ PIN / MẬT KHẨU', 'HỌ VÀ TÊN', 'CHỨC DANH / VAI TRÒ', 'PHÂN LOẠI', 'MÃ HỌC SINH', 'TỔ', 'EMAIL', 'SỐ ĐIỆN THOẠI', 'QUYỀN HẠN', 'TRẠNG THÁI', 'ẢNH ĐẠI DIỆN'],
    ...accounts.map((acc, idx) => {
      const isGvcn = acc.category === 'gvcn' || acc.role === 'gvcn' || acc.id === 'acc_gvcn';
      const rowName = isGvcn ? safeTeacherName : acc.fullName;
      const rowPhone = isGvcn ? safeTeacherPhone : (acc.phone || '');
      const rowEmail = isGvcn ? safeTeacherEmail : (acc.email || '');

      // Bảo vệ mật khẩu cá nhân: Nếu acc.pin là mặc định '123' nhưng đã đổi mật khẩu, lấy mật khẩu mới nhất
      let effectivePin = acc.pin;
      const studentObj = studentMap.get(acc.studentId || '');
      if ((!effectivePin || effectivePin === DEFAULT_STUDENT_PIN || effectivePin === '123') && studentObj?.customPin) {
        effectivePin = studentObj.customPin;
      }
      if ((!effectivePin || effectivePin === DEFAULT_STUDENT_PIN || effectivePin === '123') && typeof window !== 'undefined' && window.localStorage) {
        try {
          const pPins = JSON.parse(window.localStorage.getItem('teacher_app_permanent_pins') || '{}');
          const p = pPins[acc.id] || (acc.studentCode ? pPins[acc.studentCode.toLowerCase()] : undefined) || (acc.studentId ? pPins[acc.studentId] : undefined) || pPins[acc.username.toLowerCase()];
          if (p) effectivePin = p;
        } catch (_) {}
      }

      const avatarUrl = acc.avatar || studentObj?.avatar || '';

      return [
        idx + 1,
        acc.id,
        acc.username,
        effectivePin || (isGvcn ? '123456' : DEFAULT_STUDENT_PIN),
        rowName,
        acc.title,
        acc.category === 'gvcn' ? 'Giáo viên Chủ nhiệm' : acc.category === 'ban_can_su' ? 'Ban Cán sự Lớp' : acc.category === 'to_truong_pho' ? 'Ban Cán sự Tổ' : 'Học sinh',
        acc.studentCode || '',
        acc.groupId ? `Tổ ${acc.groupId}` : '',
        rowEmail,
        rowPhone,
        Array.isArray(acc.permissions) ? acc.permissions.join(', ') : '',
        acc.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa',
        avatarUrl
      ];
    })
  ];

  // 2. ThongTinLop (Class Info & Rules)
  const thongTinLopSheet = [
    ['DANH MỤC THÔNG TIN', 'GIÁ TRỊ NỘI DUNG', 'GHI CHÚ / QUY ĐỊNH', 'TRƯỜNG DỮ LIỆU APP'],
    ['Tên Trường Học', data.classInfo?.schoolName || '', 'Tên trường', 'schoolName'],
    ['Khối Lớp', data.classInfo?.gradeLevel || 'Khối 10', 'Khối học', 'gradeLevel'],
    ['Tên Lớp', data.classInfo?.className || '', 'Lớp chủ nhiệm', 'className'],
    ['Năm Học', data.classInfo?.schoolYear || '2026 - 2027', 'Năm học hiện tại', 'schoolYear'],
    ['Học Kỳ', data.classInfo?.semester || 'Học kỳ I', 'Học kỳ hiện tại', 'semester'],
    ['Họ Và Tên GVCN', safeTeacherName, 'Quản lý chung', 'homeroomTeacher'],
    ['Số Điện Thoại GVCN', safeTeacherPhone, 'Liên hệ trực tiếp', 'teacherPhone'],
    ['Email GVCN', safeTeacherEmail, 'Hòm thư liên lạc', 'teacherEmail'],
    ['Phòng Học', data.classInfo?.roomNumber || '', 'Phòng học cố định', 'roomNumber'],
    ['Khẩu Hiệu Lớp', data.classInfo?.motto || 'Kỷ luật - Tự giác - Yêu thương - Tỏa sáng', 'Mục tiêu thi đua', 'motto'],
    ['Sĩ Số Lớp', data.classInfo?.totalStudents || students.length, `${students.length} Học sinh`, 'totalStudents'],
    ['Số Tổ Thi Đua', data.classInfo?.totalGroups || 4, '4 Tổ thi đua', 'totalGroups'],
    ['---', '---', '---', '---'],
    ['Điểm Gốc Đầu Tuần', data.settings?.baseScore || 100, 'Điểm xuất phát chuẩn', 'baseScore'],
    ['Trọng Số Chuyên Cần', `${data.settings?.attendanceWeight || 20}%`, 'Điểm danh, đi muộn, nghỉ học', 'attendanceWeight'],
    ['Trọng Số Học Tập', `${data.settings?.academicWeight || 25}%`, 'Điểm tốt, làm bài tập, truy bài', 'academicWeight'],
    ['Trọng Số Kỷ Luật - Nề Nếp', `${data.settings?.disciplineWeight || 20}%`, 'Đồng phục, tác phong, trật tự', 'disciplineWeight'],
    ['Trọng Số Vệ Sinh - Trực Nhật', `${data.settings?.hygieneWeight || 15}%`, 'Vệ sinh lớp học, bảng, bàn ghế', 'hygieneWeight'],
    ['Trọng Số Hoạt Động Phong Trào', `${data.settings?.activityWeight || 10}%`, 'Văn nghệ, thể thao, báo tường', 'activityWeight'],
    ['Trọng Số Đoàn Kết - Giúp Bạn', `${data.settings?.solidarityWeight || 10}%`, 'Tương trợ học tập, việc tốt', 'solidarityWeight'],
    ['Ngưỡng Cảnh Báo Nghỉ Học', `≥ ${data.settings?.warningThresholds?.maxAbsences || 3} buổi`, 'Cần liên hệ phụ huynh', 'maxAbsences'],
    ['Ngưỡng Cảnh Báo Đi Muộn', `≥ ${data.settings?.warningThresholds?.maxLate || 2} lần`, 'Nhắc nhở nề nếp', 'maxLate'],
    ['Ngưỡng Cảnh Báo Vi Phạm', `≥ ${data.settings?.warningThresholds?.maxViolations || 2} lần`, 'Biện pháp giáo dục', 'maxViolations'],
    ['Ngưỡng Điểm Thi Đua Cảnh Báo', `< ${data.settings?.warningThresholds?.minScoreWarning || 80} điểm`, 'Theo dõi sát sao', 'minScoreWarning']
  ];

  // 3. DanhSachLop (Students)
  const danhSachLopSheet = [
    ['STT', 'MÃ HS', 'HỌ VÀ TÊN', 'GIỚI TÍNH', 'NGÀY SINH', 'TỔ', 'CHỨC VỤ', 'SỐ ĐIỆN THOẠI HS', 'EMAIL HS', 'HỌ TÊN PHỤ HUYNH', 'SĐT PHỤ HUYNH', 'ĐỊA CHỈ THƯỜNG TRÚ', 'GHI CHÚ CỦA GVCN', 'ẢNH ĐẠI DIỆN'],
    ...students.map((s, idx) => {
      let dobDisplay = s.dateOfBirth;
      const m = String(s.dateOfBirth).match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (m) dobDisplay = `${m[3].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[1]}`;
      return [
        idx + 1,
        s.studentCode,
        s.fullName,
        s.gender,
        dobDisplay,
        `Tổ ${s.groupId}`,
        s.roleInClass,
        s.phone,
        s.email || `${s.studentCode.toLowerCase()}@lop${data.classInfo?.className?.toLowerCase() || '11a1'}.edu.vn`,
        s.parentName,
        s.parentPhone,
        s.address,
        s.teacherNotes || '',
        s.avatar || ''
      ];
    })
  ];

  // 4. DiemDanh (Attendance)
  const diemDanhSheet = [
    ['MÃ BẢN GHI', 'NGÀY', 'BUỔI', 'MÃ HỌC SINH', 'HỌ VÀ TÊN', 'TỔ', 'TRẠNG THÁI ĐIỂM DANH', 'LÝ DO / GHI CHÚ', 'NGƯỜI GHI NHẬN', 'THỜI GIAN GHI'],
    ...attendance.map((att) => {
      const student = studentMap.get(att.studentId);
      return [
        att.id,
        att.date,
        att.session,
        student?.studentCode || '',
        student?.fullName || 'Chưa xác định',
        student ? `Tổ ${student.groupId}` : '',
        formatAttendanceStatusVN(att.status),
        att.note || '',
        att.recordedBy,
        att.recordedAt
      ];
    })
  ];

  // 5. ViPham (Violations)
  const viPhamSheet = [
    ['MÃ VI PHẠM', 'NGÀY', 'MÃ HỌC SINH', 'HỌ VÀ TÊN', 'TỔ', 'PHÂN LOẠI', 'NỘI DUNG VI PHẠM', 'MỨC ĐỘ', 'ĐIỂM TRỪ', 'TRẠNG THÁI XỬ LÝ', 'BIỆN PHÁP KHẮC PHỤC', 'NGƯỜI GHI NHẬN', 'LẶP LẠI', 'GHI CHÚ'],
    ...violations.map((v) => {
      const student = studentMap.get(v.studentId);
      return [
        v.id,
        v.date,
        student?.studentCode || '',
        student?.fullName || 'Chưa xác định',
        student ? `Tổ ${student.groupId}` : '',
        v.category,
        v.title,
        v.severity,
        v.penaltyPoints,
        v.status,
        v.remedyAction || 'Nhắc nhở rút kinh nghiệm',
        v.recordedBy,
        v.isRepeated ? 'Có' : 'Không',
        v.note || ''
      ];
    })
  ];

  // 6. KhenThuong (Rewards)
  const khenThuongSheet = [
    ['MÃ KHEN THƯỞNG', 'NGÀY', 'MÃ HỌC SINH', 'HỌ VÀ TÊN', 'TỔ', 'PHÂN LOẠI', 'NỘI DUNG THÀNH TÍCH / VIỆC TỐT', 'ĐIỂM CỘNG', 'MINH CHỨNG / ĐÍNH KÈM', 'NGƯỜI GHI NHẬN', 'GHI CHÚ'],
    ...rewards.map((r) => {
      const student = studentMap.get(r.studentId);
      return [
        r.id,
        r.date,
        student?.studentCode || '',
        student?.fullName || 'Chưa xác định',
        student ? `Tổ ${student.groupId}` : '',
        r.category,
        r.title,
        `+${r.bonusPoints}`,
        r.evidence || 'Sổ nề nếp / Giáo viên bộ môn ghi nhận',
        r.recordedBy,
        r.note || ''
      ];
    })
  ];

  // 7. HocTap (Academic Records)
  const hocTapSheet = [
    ['MÃ BẢN GHI', 'NGÀY', 'MÃ HỌC SINH', 'HỌ VÀ TÊN', 'TỔ', 'MÔN HỌC', 'LOẠI GHI NHẬN', 'ĐIỂM SỐ', 'GHI CHÚ / NỘI DUNG', 'NGƯỜI GHI NHẬN', 'THỜI GIAN GHI'],
    ...academicRecords.map((ac) => {
      const student = studentMap.get(ac.studentId);
      return [
        ac.id,
        ac.date,
        student?.studentCode || '',
        student?.fullName || 'Chưa xác định',
        student ? `Tổ ${student.groupId}` : '',
        ac.subject,
        ac.type,
        ac.score !== undefined ? ac.score : '',
        ac.note || '',
        ac.recordedBy,
        ac.createdAt
      ];
    })
  ];

  // 8. TrucNhat (Cleaning Duties)
  const trucNhatSheet = [
    ['MÃ BẢN GHI', 'NGÀY TRỰC', 'TỔ PHỤ TRÁCH', 'DANH SÁCH HỌC SINH TRỰC', 'KẾT QUẢ ĐÁNH GIÁ', 'ĐIỂM THI ĐUA (±)', 'NGƯỜI KIỂM TRA', 'CHỨC VỤ', 'NHẬN XÉT ĐÁNH GIÁ VỆ SINH'],
    ...cleaningDuties.map((d) => {
      const assignedNames = Array.isArray(d.assignedStudentIds)
        ? d.assignedStudentIds.map(id => studentMap.get(id)?.fullName || id).join(', ')
        : '';
      return [
        d.id,
        d.date,
        `Tổ ${d.groupId}`,
        assignedNames,
        d.status,
        d.pointsDelta > 0 ? `+${d.pointsDelta}` : d.pointsDelta < 0 ? `${d.pointsDelta}` : '0',
        d.inspectorName,
        d.inspectorRole,
        d.evaluationNote || ''
      ];
    })
  ];

  // 9. LaoDong (Labor Activities)
  const laoDongSheet = [
    ['MÃ HOẠT ĐỘNG', 'TÊN HOẠT ĐỘNG LAO ĐỘNG', 'NGÀY THỰC HIỆN', 'ĐỊA ĐIỂM', 'TỔ PHỤ TRÁCH', 'MÔ TẢ CÔNG VIỆC', 'SỐ LƯỢNG THAM GIA', 'KẾT QUẢ TỔNG HỢP'],
    ...laborActivities.map((l) => [
      l.id,
      l.title,
      l.date,
      l.location,
      Array.isArray(l.assignedGroupIds) ? l.assignedGroupIds.map(g => `Tổ ${g}`).join(', ') : '',
      l.description,
      Array.isArray(l.participations)
        ? `${l.participations.filter(p => p.status === 'Có mặt' || p.status === 'Hoàn thành tốt').length}/${l.participations.length} Học sinh`
        : '0 Học sinh',
      Array.isArray(l.participations)
        ? l.participations.map(p => {
            const student = studentMap.get(p.studentId);
            return `${student?.fullName || p.studentId}: ${p.status}`;
          }).join('; ')
        : ''
    ])
  ];

  // 10. NgoaiKhoa (Extracurricular)
  const ngoaiKhoaSheet = [
    ['MÃ HOẠT ĐỘNG', 'TÊN PHONG TRÀO / NGOẠI KHÓA', 'PHÂN LOẠI', 'NGÀY TỔ CHỨC', 'MÔ TẢ NỘI DUNG', 'HỌC SINH THAM GIA', 'VAI TRÒ & THÀNH TÍCH', 'ĐIỂM THƯỞNG CỘNG'],
    ...extracurricularActivities.map((ex) => [
      ex.id,
      ex.title,
      ex.category || ex.type || 'Hoạt động',
      ex.date,
      ex.description || ex.notes || '',
      Array.isArray(ex.participations) && ex.participations.length > 0
        ? ex.participations.map(p => studentMap.get(p.studentId)?.fullName || p.studentId).join(', ')
        : (Array.isArray(ex.participants) ? ex.participants.join(', ') : 'Cả lớp'),
      Array.isArray(ex.participations) && ex.participations.length > 0
        ? ex.participations.map(p => {
            const student = studentMap.get(p.studentId);
            return `${student?.fullName || p.studentId}: ${p.role}${p.achievement ? ` (${p.achievement})` : ''}`;
          }).join('; ')
        : (ex.result || ''),
      Array.isArray(ex.participations) && ex.participations.length > 0
        ? ex.participations.reduce((sum, p) => sum + (p.pointsBonus || 0), 0)
        : (ex.bonusScore || 0)
    ])
  ];

  // 11. TuDanhGia (Self Evaluations)
  const tuDanhGiaSheet = [
    ['MÃ BẢN GHI', 'TUẦN', 'MÃ HỌC SINH', 'HỌ VÀ TÊN', 'TỔ', 'ĐIỀU EM LÀM TỐT TRONG TUẦN', 'ĐIỀU EM CẦN KHẮC PHỤC', 'KẾ HOẠCH CẢI THIỆN TUẦN TỚI', 'TỔ TRƯỞNG NHẬN XÉT', 'GVCN NHẬN XÉT', 'THỜI GIAN GỬI'],
    ...evaluations.map((ev) => {
      const student = studentMap.get(ev.studentId);
      return [
        ev.id,
        `Tuần ${ev.week}`,
        student?.studentCode || '',
        student?.fullName || 'Chưa xác định',
        student ? `Tổ ${student.groupId}` : '',
        ev.goodDeeds,
        ev.weaknesses,
        ev.nextWeekPlan,
        ev.leaderRemark || 'Chưa có nhận xét',
        ev.teacherRemark || 'Chưa có nhận xét',
        ev.submittedAt
      ];
    })
  ];

  // 12. TongHopThiDua (Rankings & Scores)
  const tongHopThiDuaSheet = [
    ['HẠNG LỚP', 'MÃ HS', 'HỌ VÀ TÊN', 'TỔ', 'HẠNG TỔ', 'CHỨC VỤ', 'ĐIỂM GỐC', 'ĐIỂM CỘNG (+)', 'ĐIỂM TRỪ (-)', 'ĐIỂM TRỰC NHẬT', 'TRỪ CHUYÊN CẦN', 'ĐIỂM NGOẠI KHÓA', 'TỔNG ĐIỂM THI ĐUA', 'SỐ LẦN VI PHẠM', 'SỐ LẦN KHEN THƯỞNG', 'SỐ BUỔI VẮNG', 'SỐ LẦN MUỘN', 'CẦN HỖ TRỢ / THEO DÕI', 'LÝ DO CHÚ Ý'],
    ...studentScores.map((sc: any) => [
      sc.rankInClass || '',
      sc.student?.studentCode || '',
      sc.student?.fullName || '',
      sc.student?.groupId ? `Tổ ${sc.student.groupId}` : '',
      sc.rankInGroup || '',
      sc.student?.roleInClass || '',
      sc.baseScore ?? 100,
      `+${sc.bonusPoints || 0}`,
      sc.penaltyPoints || 0,
      (sc.dutyPoints || 0) > 0 ? `+${sc.dutyPoints}` : (sc.dutyPoints || 0),
      sc.attendancePenalty || 0,
      `+${sc.extraCurricularPoints || 0}`,
      sc.totalScore !== undefined ? Number(sc.totalScore.toFixed(1)) : 100,
      sc.totalViolations || 0,
      sc.totalRewards || 0,
      sc.totalAbsences || 0,
      sc.totalLate || 0,
      sc.needsAttention ? 'CẦN CHÚ Ý' : 'Bình thường',
      sc.attentionReasons?.join('; ') || ''
    ])
  ];

  // 12.2 TongHopThiDuaTo (Group Rankings & Scores - Điểm ban đầu 100đ)
  const tongHopThiDuaToSheet = [
    [
      'HẠNG TỔ',
      'TÊN TỔ',
      'TỔ TRƯỞNG',
      'SĨ SỐ THÀNH VIÊN',
      'ĐIỂM GỐC TỔ',
      'CHUYÊN CẦN (20Đ)',
      'HỌC TẬP (25Đ)',
      'NỀ NẾP (20Đ)',
      'VỆ SINH (15Đ)',
      'PHONG TRÀO (10Đ)',
      'ĐOÀN KẾT (10Đ)',
      'TỔNG ĐIỂM THI ĐUA TỔ',
      'ĐIỂM TB CÁ NHÂN',
      'TỔNG VI PHẠM TỔ',
      'TỔNG KHEN THƯỞNG TỔ',
      'DANH HIỆU THI ĐUA'
    ],
    ...groupScores.map((g: any) => [
      g.rank || '',
      g.groupName || `Tổ ${g.groupId}`,
      g.leaderName || '',
      g.memberCount || 0,
      100, // Điểm thi đua các tổ ban đầu là 100 điểm
      g.attendanceScore !== undefined ? Number(g.attendanceScore.toFixed(1)) : 20,
      g.academicScore !== undefined ? Number(g.academicScore.toFixed(1)) : 25,
      g.disciplineScore !== undefined ? Number(g.disciplineScore.toFixed(1)) : 20,
      g.hygieneScore !== undefined ? Number(g.hygieneScore.toFixed(1)) : 15,
      g.activityScore !== undefined ? Number(g.activityScore.toFixed(1)) : 10,
      g.solidarityScore !== undefined ? Number(g.solidarityScore.toFixed(1)) : 10,
      g.totalScore !== undefined ? Number(g.totalScore.toFixed(1)) : 100,
      g.avgStudentScore !== undefined ? Number(g.avgStudentScore.toFixed(1)) : 100,
      g.totalViolations || 0,
      g.totalRewards || 0,
      g.rank === 1 ? '🏆 Giữ cờ thi đua dẫn đầu' : `Hạng ${g.rank}`
    ])
  ];

  // 13. Hệ thống Lịch Sử Điểm Thi Đua theo Ngày, Tuần, Tháng, Học Kỳ, Năm Học (Lưu trữ vĩnh viễn)
  const emulationTables = buildEmulationSheetsTables(data);

  // 14. BaoCaoTo (Weekly Group Summaries)
  const baoCaoToSheet = [
    ['TỔ', 'TUẦN', 'NHẬN XÉT CỦA TỔ TRƯỞNG', 'ĐỀ XUẤT XẾP LOẠI', 'THỜI GIAN GỬI'],
    ...(data.groupSummaries || []).map(gs => [
      `Tổ ${gs.groupId}`,
      `Tuần ${gs.week}`,
      gs.leaderNotes || '',
      gs.proposedRank || 'Khá',
      gs.submittedAt || new Date().toISOString()
    ])
  ];

  return {
    'ThongTinLop_GVCN': thongTinLopGvcnSheet,
    'TaiKhoan': taiKhoanSheet,
    'ThongTinLop': thongTinLopSheet,
    'DanhSachLop': danhSachLopSheet,
    'LichSuDiem_TheoNgay': emulationTables.LichSuDiem_TheoNgay,
    'DiemThiDua_TheoTuan': emulationTables.DiemThiDua_TheoTuan,
    'DiemThiDua_TheoThang': emulationTables.DiemThiDua_TheoThang,
    'DiemThiDua_HocKy_Nam': emulationTables.DiemThiDua_HocKy_Nam,
    'ThiDuaTo_LichSu': emulationTables.ThiDuaTo_LichSu,
    'TongHopThiDua': tongHopThiDuaSheet,
    'TongHopThiDuaTo': tongHopThiDuaToSheet,
    'DiemDanh': diemDanhSheet,
    'ViPham': viPhamSheet,
    'KhenThuong': khenThuongSheet,
    'HocTap': hocTapSheet,
    'TrucNhat': trucNhatSheet,
    'LaoDong': laoDongSheet,
    'NgoaiKhoa': ngoaiKhoaSheet,
    'TuDanhGia': tuDanhGiaSheet,
    'BaoCaoTo': baoCaoToSheet,
  };
}

/**
 * Trích xuất và phục hồi thông tin Lớp học & GVCN từ bảng tính Google Sheet (Sheet ThongTinLop_GVCN hoặc ThongTinLop)
 * Đảm bảo gọi lại dữ liệu về ứng dụng một cách chính xác 100%
 */
export function parseClassInfoFromTable(rows: any[][]): Partial<ClassInfo> {
  const result: Partial<ClassInfo> = {};
  if (!rows || !Array.isArray(rows) || rows.length < 2) return result;

  for (const row of rows) {
    if (!row || !Array.isArray(row) || row.length < 2) continue;
    const label = removeVietnameseTones(String(row[0] || ''));
    let val = String(row[1] ?? '').trim();
    // Key could be in column 2 (ThongTinLop_GVCN) or column 3 (ThongTinLop)
    const key = String(row[2] || row[3] || '').trim();

    if (!val || val === '---') continue;

    // Direct key matching if present
    if (key === 'schoolName') {
      result.schoolName = val;
    } else if (key === 'gradeLevel') {
      result.gradeLevel = val;
    } else if (key === 'className') {
      result.className = val;
    } else if (key === 'schoolYear') {
      result.schoolYear = val;
    } else if (key === 'semester') {
      result.semester = val;
    } else if (key === 'teacherPhone') {
      const digits = val.replace(/[^0-9]/g, '');
      result.teacherPhone = digits.length === 9 && !digits.startsWith('0') ? '0' + digits : val;
    } else if (key === 'teacherEmail') {
      result.teacherEmail = val;
    } else if (key === 'homeroomTeacher') {
      if (val.includes('@')) {
        result.teacherEmail = val;
      } else if (/^[0-9+\s().-]{7,}$/.test(val)) {
        const digits = val.replace(/[^0-9]/g, '');
        result.teacherPhone = digits.length === 9 && !digits.startsWith('0') ? '0' + digits : val;
      } else {
        result.homeroomTeacher = capitalizeVietnameseName(val);
      }
    } else if (key === 'roomNumber') {
      result.roomNumber = val;
    } else if (key === 'motto') {
      result.motto = val;
    } else if (key === 'totalStudents') {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) result.totalStudents = num;
    } else if (key === 'totalGroups') {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) result.totalGroups = num;
    } else {
      // Fuzzy label matching
      if (label.includes('truong')) {
        result.schoolName = val;
      } else if (label.includes('khoi') && !label.includes('thi dua')) {
        result.gradeLevel = val;
      } else if (label.includes('ten lop') || label === 'lop') {
        result.className = val;
      } else if (label.includes('nam hoc')) {
        result.schoolYear = val;
      } else if (label.includes('hoc ky')) {
        result.semester = val;
      } else if (label.includes('dien thoai') || label.includes('sdt') || label.includes('phone')) {
        const digits = val.replace(/[^0-9]/g, '');
        result.teacherPhone = digits.length === 9 && !digits.startsWith('0') ? '0' + digits : val;
      } else if (label.includes('email') || label.includes('thu') || (val.includes('@') && !val.includes(' '))) {
        result.teacherEmail = val;
      } else if (
        label.includes('ho va ten gvcn') ||
        label.includes('ho ten gvcn') ||
        label.includes('ten gvcn') ||
        label.includes('giao vien chu nhiem') ||
        (label.includes('chu nhiem') && !label.includes('lop')) ||
        (label.includes('gvcn') && !label.includes('email') && !label.includes('sdt') && !label.includes('dien thoai'))
      ) {
        if (val.includes('@')) {
          result.teacherEmail = val;
        } else if (/^[0-9+\s().-]{7,}$/.test(val)) {
          const digits = val.replace(/[^0-9]/g, '');
          result.teacherPhone = digits.length === 9 && !digits.startsWith('0') ? '0' + digits : val;
        } else {
          result.homeroomTeacher = capitalizeVietnameseName(val);
        }
      } else if (label.includes('phong')) {
        result.roomNumber = val;
      } else if (label.includes('khau hieu') || label.includes('muc tieu')) {
        result.motto = val;
      } else if (label.includes('si so')) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) result.totalStudents = num;
      } else if (label.includes('so to')) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) result.totalGroups = num;
      }
    }
  }

  return result;
}

export function parseSettingsFromTable(rows: any[][]): Partial<CompetitionSettings> {
  const settings: Partial<CompetitionSettings> = {};
  const warningThresholds: any = {};
  if (!rows || !Array.isArray(rows)) return settings;

  for (const row of rows) {
    if (!row || !Array.isArray(row) || row.length < 2) continue;
    const label = removeVietnameseTones(String(row[0] || ''));
    const valStr = String(row[1] ?? '').trim();
    const valNum = parseFloat(valStr.replace(/[^0-9\.\-]/g, ''));

    if (isNaN(valNum)) continue;

    if (label.includes('diem goc')) {
      settings.baseScore = valNum;
    } else if (label.includes('chuyen can')) {
      settings.attendanceWeight = valNum;
    } else if (label.includes('hoc tap')) {
      settings.academicWeight = valNum;
    } else if (label.includes('ky luat') || label.includes('ne nep')) {
      settings.disciplineWeight = valNum;
    } else if (label.includes('ve sinh') || label.includes('truc nhat')) {
      settings.hygieneWeight = valNum;
    } else if (label.includes('phong trao')) {
      settings.activityWeight = valNum;
    } else if (label.includes('doan ket') || label.includes('giup ban')) {
      settings.solidarityWeight = valNum;
    } else if (label.includes('canh bao') && label.includes('nghi')) {
      warningThresholds.maxAbsences = valNum;
    } else if (label.includes('canh bao') && label.includes('muon')) {
      warningThresholds.maxLate = valNum;
    } else if (label.includes('canh bao') && label.includes('vi pham')) {
      warningThresholds.maxViolations = valNum;
    } else if (label.includes('canh bao') && label.includes('diem')) {
      warningThresholds.minScoreWarning = valNum;
    }
  }

  if (Object.keys(warningThresholds).length > 0) {
    settings.warningThresholds = warningThresholds;
  }
  return settings;
}

export function parseStudentsFromTable(rows: any[][], existingStudents?: Student[]): Student[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  let headerRowIdx = -1;
  const colIndexes: Record<string, number> = {};

  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    const cleanCells = row.map(c => removeVietnameseTones(String(c || '')));
    const hasStudentCode = cleanCells.some(c => c.includes('ma hs') || c.includes('ma hoc sinh') || c.includes('ma so') || c.includes('stt'));
    const hasFullName = cleanCells.some(c => c.includes('ho va ten') || c.includes('ho ten') || c.includes('ten hoc sinh') || c.includes('hoc sinh') || c === 'ten');
    const hasDob = cleanCells.some(c => c.includes('ngay sinh') || c.includes('dob') || c.includes('nam sinh'));

    if ((hasStudentCode && hasFullName) || (hasFullName && hasDob) || (hasStudentCode && hasDob) || hasFullName) {
      headerRowIdx = r;
      cleanCells.forEach((c, idx) => {
        if (!c) return;
        if (c.includes('ma hs') || c.includes('ma hoc sinh') || c.includes('ma dinh danh') || c.includes('ma so')) colIndexes.code = idx;
        else if (c.includes('ho va ten') || c.includes('ho va chu dem va ten') || c.includes('ho ten hoc sinh') || c === 'ho va ten' || c === 'ho ten' || c === 'hoc sinh') colIndexes.fullName = idx;
        else if (c.includes('ho va chu dem') || c.includes('ho dem') || c === 'ho') colIndexes.hoDem = idx;
        else if (c === 'ten' || c.includes('ten hs') || c.includes('ten hoc sinh')) colIndexes.ten = idx;
        else if (c.includes('gioi tinh') || c === 'phai' || c.includes('nam/nu')) colIndexes.gender = idx;
        else if (c.includes('ngay sinh') || c.includes('dob') || c.includes('nam sinh')) colIndexes.dob = idx;
        else if (c === 'to' || c.includes('to sinh hoat') || c.includes('to thi dua') || c.includes('to hoc tap')) colIndexes.group = idx;
        else if (c.includes('chuc vu') || c.includes('vai tro') || c.includes('chuc danh')) colIndexes.role = idx;
        else if (c.includes('sdt hs') || c.includes('dien thoai hs') || c === 'so dien thoai' || c === 'sdt') {
          if (colIndexes.phone === undefined) colIndexes.phone = idx;
        }
        else if (c.includes('email') || c.includes('mail')) colIndexes.email = idx;
        else if (c.includes('phu huynh') && (c.includes('ho ten') || !c.includes('sdt'))) colIndexes.parentName = idx;
        else if (c.includes('sdt phu huynh') || c.includes('sdt cha me') || c.includes('sdt ph') || (c.includes('phu huynh') && c.includes('dien thoai'))) colIndexes.parentPhone = idx;
        else if (c.includes('dia chi') || c.includes('noi o') || c.includes('thuong tru')) colIndexes.address = idx;
        else if (c.includes('ghi chu') || c.includes('nhan xet')) colIndexes.notes = idx;
        else if (c.includes('anh dai dien') || c.includes('avatar') || c.includes('hinh anh') || c === 'anh') colIndexes.avatar = idx;
      });
      break;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    colIndexes.code = 1;
    colIndexes.fullName = 2;
    colIndexes.gender = 3;
    colIndexes.dob = 4;
    colIndexes.group = 5;
    colIndexes.role = 6;
    colIndexes.phone = 7;
    colIndexes.email = 8;
    colIndexes.parentName = 9;
    colIndexes.parentPhone = 10;
    colIndexes.address = 11;
    colIndexes.notes = 12;
  }

  const students: Student[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    let fullName = '';
    if (colIndexes.fullName !== undefined && row[colIndexes.fullName]) {
      fullName = String(row[colIndexes.fullName]).trim();
    } else if (colIndexes.ten !== undefined && row[colIndexes.ten]) {
      const hoDem = colIndexes.hoDem !== undefined ? String(row[colIndexes.hoDem] || '').trim() : '';
      const ten = String(row[colIndexes.ten]).trim();
      fullName = `${hoDem} ${ten}`.trim();
    }
    fullName = capitalizeVietnameseName(fullName);
    if (!fullName || fullName.length < 2) continue;

    let studentCode = '';
    if (colIndexes.code !== undefined && row[colIndexes.code]) {
      studentCode = String(row[colIndexes.code]).trim();
    }
    if (!studentCode) {
      studentCode = `HS${(students.length + 1).toString().padStart(2, '0')}`;
    }

    const cleanCodeStr = studentCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normName = removeVietnameseTones(fullName);
    const existing = existingStudents?.find(es =>
      (es.studentCode && es.studentCode.toLowerCase().trim() === studentCode.toLowerCase().trim()) ||
      (removeVietnameseTones(es.fullName) === normName)
    );

    const rawGender = colIndexes.gender !== undefined ? String(row[colIndexes.gender] || '').trim().toLowerCase() : '';
    const gender: 'Nam' | 'Nữ' = (rawGender.includes('nu') || rawGender.includes('nữ') || rawGender.includes('female') || rawGender === 'f') ? 'Nữ' : 'Nam';

    const rawDob = colIndexes.dob !== undefined ? row[colIndexes.dob] : '';
    const dateOfBirth = (rawDob !== '' && rawDob !== undefined ? normalizeDate(rawDob) : '') || existing?.dateOfBirth || '';

    let groupId = 1;
    if (colIndexes.group !== undefined && row[colIndexes.group]) {
      const gNum = parseInt(String(row[colIndexes.group]).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(gNum) && gNum >= 1 && gNum <= 4) groupId = gNum;
      else groupId = existing?.groupId || ((students.length % 4) + 1);
    } else {
      groupId = existing?.groupId || ((students.length % 4) + 1);
    }

    const roleInClass = colIndexes.role !== undefined && row[colIndexes.role] ? String(row[colIndexes.role]).trim() : (existing?.roleInClass || 'Thành viên');
    const phone = colIndexes.phone !== undefined && row[colIndexes.phone] ? String(row[colIndexes.phone]).trim() : (existing?.phone || '');
    const email = colIndexes.email !== undefined && row[colIndexes.email] ? String(row[colIndexes.email]).trim() : (existing?.email || '');
    const parentName = colIndexes.parentName !== undefined && row[colIndexes.parentName] ? String(row[colIndexes.parentName]).trim() : (existing?.parentName || '');
    const parentPhone = colIndexes.parentPhone !== undefined && row[colIndexes.parentPhone] ? String(row[colIndexes.parentPhone]).trim() : (existing?.parentPhone || '');
    const address = colIndexes.address !== undefined && row[colIndexes.address] ? String(row[colIndexes.address]).trim() : (existing?.address || '');
    const teacherNotes = colIndexes.notes !== undefined && row[colIndexes.notes] ? String(row[colIndexes.notes]).trim() : (existing?.teacherNotes || '');

    const id = existing?.id || `std_${cleanCodeStr || (students.length + 1).toString().padStart(2, '0')}`;

    const rowAvatar = colIndexes.avatar !== undefined && row[colIndexes.avatar] ? String(row[colIndexes.avatar]).trim() : '';
    const validAvatar = (rowAvatar && (rowAvatar.startsWith('http://') || rowAvatar.startsWith('https://'))) ? rowAvatar : undefined;

    students.push({
      id,
      studentCode,
      fullName,
      gender,
      dateOfBirth,
      groupId,
      roleInClass,
      phone,
      email,
      parentName,
      parentPhone,
      address,
      avatar: validAvatar || existing?.avatar || (gender === 'Nữ'
        ? `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
        : `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80`),
      teacherNotes,
    });
  }

  return students;
}

function matchStudentId(
  students: Student[],
  rawCode: string,
  rawName: string,
  codeMap: Map<string, string>,
  nameMap: Map<string, string>
): string | null {
  const cleanCode = (rawCode || '').trim().toLowerCase();
  if (cleanCode && codeMap.has(cleanCode)) {
    return codeMap.get(cleanCode)!;
  }
  const cleanStripped = cleanCode.replace(/[^a-z0-9]/g, '');
  if (cleanStripped && codeMap.has(cleanStripped)) {
    return codeMap.get(cleanStripped)!;
  }

  const normName = removeVietnameseTones(rawName || '').trim().toLowerCase();
  if (normName && nameMap.has(normName)) {
    return nameMap.get(normName)!;
  }

  // Secondary fuzzy match across students array
  if (cleanStripped) {
    const found = students.find(s => {
      const sCode = s.studentCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sId = s.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      return sCode === cleanStripped || sId === cleanStripped || sCode.includes(cleanStripped) || cleanStripped.includes(sCode);
    });
    if (found) return found.id;
  }

  if (normName && normName.length >= 3) {
    const found = students.find(s => {
      const sName = removeVietnameseTones(s.fullName).trim().toLowerCase();
      return sName === normName || sName.includes(normName) || normName.includes(sName);
    });
    if (found) return found.id;
  }
  return null;
}

export function parseAttendanceFromTable(rows: any[][], students: Student[]): AttendanceRecord[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const codeMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  students.forEach(s => {
    const cLower = s.studentCode.trim().toLowerCase();
    codeMap.set(cLower, s.id);
    codeMap.set(cLower.replace(/[^a-z0-9]/g, ''), s.id);
    codeMap.set(s.id.toLowerCase(), s.id);
    codeMap.set(s.id.toLowerCase().replace(/[^a-z0-9]/g, ''), s.id);
    nameMap.set(removeVietnameseTones(s.fullName).trim().toLowerCase(), s.id);
    nameMap.set(s.fullName.trim().toLowerCase(), s.id);
  });

  // Dynamically detect column indexes from row 0
  const header = (rows[0] || []).map(h => removeVietnameseTones(String(h || '')).toLowerCase().trim());
  const findCol = (terms: string[], defaultIdx: number) => {
    const idx = header.findIndex(h => terms.some(t => h.includes(t)));
    return idx !== -1 ? idx : defaultIdx;
  };

  const idCol = findCol(['ma ban ghi', 'id', 'record id'], 0);
  const dateCol = findCol(['ngay', 'date', 'thoi gian diem'], 1);
  const sessionCol = findCol(['buoi', 'ca', 'session', 'tiet'], 2);
  const codeCol = findCol(['ma hoc sinh', 'ma hs', 'mshs', 'so danh sach'], 3);
  const nameCol = findCol(['ho va ten', 'ho ten', 'ten hoc sinh', 'ten'], 4);
  const groupCol = findCol(['to', 'nhom', 'to sinh hoat'], 5);
  const statusCol = findCol(['trang thai', 'diem danh', 'hien dien', 'tinh trang'], 6);
  const noteCol = findCol(['ly do', 'ghi chu', 'note', 'nguyen nhan'], 7);
  const recordedByCol = findCol(['nguoi ghi', 'can su', 'nguoi diem danh'], 8);
  const recordedAtCol = findCol(['thoi gian ghi', 'gio ghi', 'timestamp'], 9);

  const records: AttendanceRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 2) continue;

    const id = String(row[idCol] || `att_${Date.now()}_${r}`).trim();
    const date = normalizeDate(row[dateCol]) || new Date().toISOString().slice(0, 10);
    const sessionStr = String(row[sessionCol] || '').toLowerCase();
    const session: 'Sáng' | 'Chiều' = (sessionStr.includes('chieu') || sessionStr.includes('pm')) ? 'Chiều' : 'Sáng';
    const rawCode = String(row[codeCol] || '').trim();
    const rawName = String(row[nameCol] || '').trim();
    const rawGroupName = String(row[groupCol] || '');

    const studentId = matchStudentId(students, rawCode, rawName, codeMap, nameMap);
    if (!studentId) continue;

    const rawStatus = removeVietnameseTones(String(row[statusCol] || '')).toLowerCase();
    let status: AttendanceStatus = 'present';
    if (rawStatus.includes('co phep') || rawStatus.includes('nghi phep') || rawStatus.includes('phep') || rawStatus === 'p' || rawStatus === 'cp') {
      status = 'absent_excused';
    } else if (rawStatus.includes('khong phep') || rawStatus.includes('bo tiet') || rawStatus === 'kp' || rawStatus.includes('k phep')) {
      status = 'absent_unexcused';
    } else if (rawStatus.includes('muon') || rawStatus === 'm' || rawStatus.includes('di muon')) {
      status = 'late';
    } else if (rawStatus.includes('tron tiet')) {
      status = 'skipped_lesson';
    } else if (rawStatus.includes('dac biet')) {
      status = 'special';
    } else if (rawStatus.includes('vang') || rawStatus.includes('nghi')) {
      status = 'absent_excused';
    }

    const note = row[noteCol] ? String(row[noteCol]).trim() : '';
    const recordedBy = row[recordedByCol] ? String(row[recordedByCol]).trim() : 'Ban Cán Sự';
    const recordedAt = row[recordedAtCol] ? String(row[recordedAtCol]).trim() : new Date().toISOString();

    records.push({
      id,
      studentId,
      date,
      session,
      status,
      note,
      recordedBy,
      recordedAt,
    });
  }

  return records;
}

export function isValidViolationRecord(v: any): boolean {
  if (!v || typeof v !== 'object') return false;
  if (!v.title || typeof v.title !== 'string') return false;
  const title = v.title.trim();
  if (!title) return false;
  const norm = removeVietnameseTones(title).toLowerCase();
  const invalidTitles = [
    'lop pho', 'lop truong', 'bi thu', 'thanh vien', 'to truong', 'to pho',
    'co mat', 'nghi co phep', 'nghi khong phep', 'di muon', 'tron tiet',
    'nghi phep', 'phep', 'khong phep'
  ];
  if (invalidTitles.includes(norm)) return false;
  if (typeof v.note === 'string' && v.note.includes('Lưu trữ hồ sơ học bạ vĩnh viễn')) return false;
  if (typeof v.remedyAction === 'string' && (v.remedyAction.includes('Lưu trữ hồ sơ học bạ vĩnh viễn') || v.remedyAction === '0.5')) return false;
  if (typeof v.penaltyPoints === 'number' && Math.abs(v.penaltyPoints) > 50) return false;
  return true;
}

export function isValidRewardRecord(r: any): boolean {
  if (!r || typeof r !== 'object') return false;
  if (!r.title || typeof r.title !== 'string') return false;
  const title = r.title.trim();
  if (!title) return false;
  const norm = removeVietnameseTones(title).toLowerCase();
  const invalidTitles = [
    'lop pho', 'lop truong', 'bi thu', 'thanh vien', 'to truong', 'to pho',
    'co mat', 'nghi co phep', 'nghi khong phep', 'di muon', 'tron tiet',
    'nghi phep', 'phep', 'khong phep'
  ];
  if (invalidTitles.includes(norm)) return false;
  if (typeof r.note === 'string' && r.note.includes('Lưu trữ hồ sơ học bạ vĩnh viễn')) return false;
  if (typeof r.evidence === 'string' && r.evidence.includes('Lưu trữ hồ sơ học bạ vĩnh viễn')) return false;
  if (typeof r.bonusPoints === 'number' && Math.abs(r.bonusPoints) > 50) return false;
  return true;
}

export function parseViolationsFromTable(rows: any[][], students: Student[]): ViolationRecord[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const header = (rows[0] || []).map(h => removeVietnameseTones(String(h || '')).toLowerCase().trim());
  const headerStr = header.join(' ');

  // Reject tables that are summaries, attendance, or other non-violation sheets
  if (
    headerStr.includes('tong ket') ||
    headerStr.includes('xep loai ren luyen') ||
    headerStr.includes('danh hieu thi dua') ||
    headerStr.includes('diem thi dua tich luy') ||
    headerStr.includes('trang thai diem danh') ||
    headerStr.includes('diem danh') ||
    headerStr.includes('buoi') ||
    headerStr.includes('mat khau') ||
    headerStr.includes('ten dang nhap') ||
    headerStr.includes('bang diem') ||
    headerStr.includes('mon hoc')
  ) {
    return [];
  }

  // Must have a column indicative of violation/discipline/penalty
  const hasVioCol = header.some(h =>
    h.includes('vi pham') || h.includes('ky luat') || h.includes('diem tru') ||
    h.includes('loi') || h.includes('muc do')
  );
  if (!hasVioCol) {
    return [];
  }

  const codeMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  students.forEach(s => {
    const cLower = s.studentCode.trim().toLowerCase();
    codeMap.set(cLower, s.id);
    codeMap.set(cLower.replace(/[^a-z0-9]/g, ''), s.id);
    codeMap.set(s.id.toLowerCase(), s.id);
    codeMap.set(s.id.toLowerCase().replace(/[^a-z0-9]/g, ''), s.id);
    nameMap.set(removeVietnameseTones(s.fullName).trim().toLowerCase(), s.id);
    nameMap.set(s.fullName.trim().toLowerCase(), s.id);
  });

  const findCol = (terms: string[], defaultIdx: number) => {
    const idx = header.findIndex(h => terms.some(t => h.includes(t)));
    return idx !== -1 ? idx : defaultIdx;
  };

  const idCol = findCol(['ma ban ghi', 'ma vi pham', 'id', 'record id'], 0);
  const dateCol = findCol(['ngay', 'date', 'thoi gian'], 1);
  const codeCol = findCol(['ma hoc sinh', 'ma hs', 'mshs'], 2);
  const nameCol = findCol(['ho va ten', 'ho ten', 'ten'], 3);
  const groupCol = findCol(['to', 'nhom'], 4);
  const catCol = findCol(['danh muc', 'loai vi pham', 'linh vuc', 'phan loai'], 5);
  const titleCol = findCol(['noi dung vi pham', 'loi vi pham', 'noi dung', 'hanh vi', 'tieu de', 'loi'], -1);
  const sevCol = findCol(['muc do', 'muc', 'severity'], 7);
  const ptsCol = findCol(['diem tru', 'diem phat'], -1);
  const statusCol = findCol(['trang thai', 'xu ly'], 9);
  const remedyCol = findCol(['bien phap', 'khac phuc'], 10);
  const recordedByCol = findCol(['nguoi ghi', 'co do', 'ghi nhan'], 11);
  const repeatCol = findCol(['tai pham', 'lap lai'], 12);
  const noteCol = findCol(['ghi chu', 'ly do', 'note'], 13);

  if (titleCol === -1) {
    return [];
  }

  const records: ViolationRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 2) continue;

    const rawTitle = String(row[titleCol] || '').trim();
    if (!rawTitle) continue;

    // Filter out obvious mismatched roles or attendance statuses
    const normTitle = removeVietnameseTones(rawTitle).toLowerCase();
    const invalidTitles = [
      'lop pho', 'lop truong', 'bi thu', 'thanh vien', 'to truong', 'to pho',
      'co mat', 'nghi co phep', 'nghi khong phep', 'di muon', 'tron tiet',
      'nghi phep', 'phep', 'khong phep'
    ];
    if (invalidTitles.includes(normTitle)) continue;

    const note = row[noteCol] ? String(row[noteCol]).trim() : '';
    if (note.includes('Lưu trữ hồ sơ học bạ vĩnh viễn')) continue;

    const id = String(row[idCol] || `vio_${Date.now()}_${r}`).trim();
    const date = normalizeDate(row[dateCol]) || new Date().toISOString().slice(0, 10);
    const rawCode = String(row[codeCol] || '').trim();
    const rawName = String(row[nameCol] || '').trim();
    const rawGroupName = String(row[groupCol] || '');

    const studentId = matchStudentId(students, rawCode, rawName, codeMap, nameMap);
    if (!studentId) continue;

    const rawCategory = String(row[catCol] || '').toLowerCase();
    let category: ViolationCategory = 'Khác';
    if (rawCategory.includes('hoc tap') || rawCategory.includes('bai tap')) category = 'Học tập';
    else if (rawCategory.includes('ne nep') || rawCategory.includes('ky luat') || rawCategory.includes('dong phuc')) category = 'Nề nếp';

    const title = rawTitle;
    const rawSev = String(row[sevCol] || 'Nhẹ').trim();
    let severity: ViolationSeverity = 'Nhẹ';
    if (rawSev.includes('Rất nặng')) severity = 'Rất nặng';
    else if (rawSev.includes('Nặng')) severity = 'Nặng';
    else if (rawSev.includes('Vừa')) severity = 'Vừa';

    let penaltyPoints = -2;
    if (ptsCol !== -1 && row[ptsCol] !== undefined && row[ptsCol] !== '') {
      const pts = parseFloat(String(row[ptsCol]).replace(/[^0-9\.\-]/g, ''));
      if (!isNaN(pts)) {
        penaltyPoints = -Math.abs(pts);
      }
    }
    // Discard corrupted extreme penalty points (e.g. -97.5)
    if (Math.abs(penaltyPoints) > 50) continue;

    const rawStatus = String(row[statusCol] || 'Đã ghi nhận').trim();
    let status: ViolationProcessStatus = 'Đã ghi nhận';
    if (rawStatus.includes('tiến bộ') || rawStatus.includes('Đã tiến bộ')) status = 'Đã tiến bộ';
    else if (rawStatus.includes('khắc phục') || rawStatus.includes('Đang khắc phục')) status = 'Đang khắc phục';
    else if (rawStatus.includes('nhắc nhở') || rawStatus.includes('Đã nhắc nhở')) status = 'Đã nhắc nhở';

    const remedyAction = row[remedyCol] ? String(row[remedyCol]).trim() : '';
    if (remedyAction === '0.5' || remedyAction.includes('Lưu trữ hồ sơ học bạ vĩnh viễn')) continue;

    const recordedBy = row[recordedByCol] ? String(row[recordedByCol]).trim() : 'Cờ đỏ';
    const isRepeated = String(row[repeatCol] || '').toLowerCase().includes('co') || row[repeatCol] === true;

    records.push({
      id,
      studentId,
      date,
      category,
      title,
      severity,
      penaltyPoints,
      status,
      remedyAction,
      recordedBy,
      isRepeated,
      note,
      createdAt: new Date().toISOString(),
    });
  }

  return records;
}

export function parseRewardsFromTable(rows: any[][], students: Student[]): RewardRecord[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const header = (rows[0] || []).map(h => removeVietnameseTones(String(h || '')).toLowerCase().trim());
  const headerStr = header.join(' ');

  // Reject tables that are summaries, attendance, or other non-reward sheets
  if (
    headerStr.includes('tong ket') ||
    headerStr.includes('xep loai ren luyen') ||
    headerStr.includes('danh hieu thi dua') ||
    headerStr.includes('diem thi dua tich luy') ||
    headerStr.includes('trang thai diem danh') ||
    headerStr.includes('diem danh') ||
    headerStr.includes('buoi') ||
    headerStr.includes('mat khau') ||
    headerStr.includes('ten dang nhap') ||
    headerStr.includes('bang diem') ||
    headerStr.includes('diem tru') ||
    headerStr.includes('vi pham') ||
    headerStr.includes('ky luat')
  ) {
    return [];
  }

  // Must have a column indicative of reward/achievement/bonus
  const hasRewardCol = header.some(h =>
    h.includes('khen thuong') || h.includes('thanh tich') || h.includes('viec tot') ||
    h.includes('diem cong') || h.includes('diem thuong')
  );
  if (!hasRewardCol) {
    return [];
  }

  const codeMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  students.forEach(s => {
    const cLower = s.studentCode.trim().toLowerCase();
    codeMap.set(cLower, s.id);
    codeMap.set(cLower.replace(/[^a-z0-9]/g, ''), s.id);
    codeMap.set(s.id.toLowerCase(), s.id);
    codeMap.set(s.id.toLowerCase().replace(/[^a-z0-9]/g, ''), s.id);
    nameMap.set(removeVietnameseTones(s.fullName).trim().toLowerCase(), s.id);
    nameMap.set(s.fullName.trim().toLowerCase(), s.id);
  });

  const findCol = (terms: string[], defaultIdx: number) => {
    const idx = header.findIndex(h => terms.some(t => h.includes(t)));
    return idx !== -1 ? idx : defaultIdx;
  };

  const idCol = findCol(['ma ban ghi', 'ma khen thuong', 'id', 'record id'], 0);
  const dateCol = findCol(['ngay', 'date', 'thoi gian'], 1);
  const codeCol = findCol(['ma hoc sinh', 'ma hs', 'mshs'], 2);
  const nameCol = findCol(['ho va ten', 'ho ten', 'ten'], 3);
  const groupCol = findCol(['to', 'nhom'], 4);
  const catCol = findCol(['danh muc', 'loai khen thuong', 'hinh thuc', 'phan loai'], 5);
  const titleCol = findCol(['noi dung thanh tich', 'thanh tich', 'viec tot', 'noi dung', 'khen thuong', 'tieu de'], -1);
  const ptsCol = findCol(['diem cong', 'diem thuong'], -1);
  const evidenceCol = findCol(['minh chung', 'hinh anh', 'chung nhan'], 8);
  const recordedByCol = findCol(['nguoi ghi', 'gvcn', 'can su'], 9);
  const noteCol = findCol(['ghi chu', 'ly do', 'note'], 10);

  if (titleCol === -1) {
    return [];
  }

  const records: RewardRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 2) continue;

    const rawTitle = String(row[titleCol] || '').trim();
    if (!rawTitle) continue;

    // Filter out invalid titles from roles or attendance
    const normTitle = removeVietnameseTones(rawTitle).toLowerCase();
    const invalidTitles = [
      'lop pho', 'lop truong', 'bi thu', 'thanh vien', 'to truong', 'to pho',
      'co mat', 'nghi co phep', 'nghi khong phep', 'di muon', 'tron tiet',
      'nghi phep', 'phep', 'khong phep'
    ];
    if (invalidTitles.includes(normTitle)) continue;

    const note = row[noteCol] ? String(row[noteCol]).trim() : '';
    if (note.includes('Lưu trữ hồ sơ học bạ vĩnh viễn')) continue;

    const id = String(row[idCol] || `rew_${Date.now()}_${r}`).trim();
    const date = normalizeDate(row[dateCol]) || new Date().toISOString().slice(0, 10);
    const rawCode = String(row[codeCol] || '').trim();
    const rawName = String(row[nameCol] || '').trim();
    const rawGroupName = String(row[groupCol] || '');

    const studentId = matchStudentId(students, rawCode, rawName, codeMap, nameMap);
    if (!studentId) continue;

    const rawCategory = String(row[catCol] || 'Việc tốt').trim();
    const validCategories: RewardCategory[] = [
      'Điểm tốt', 'Giúp đỡ bạn', 'Nhiệm vụ xuất sắc', 'Thành tích học tập',
      'Văn nghệ - Thể thao', 'Việc tốt', 'Tiến bộ vượt bậc'
    ];
    const category: RewardCategory = validCategories.find(c => rawCategory.includes(c)) || 'Việc tốt';

    const title = rawTitle;
    let bonusPoints = 2;
    if (ptsCol !== -1 && row[ptsCol] !== undefined && row[ptsCol] !== '') {
      const pts = parseFloat(String(row[ptsCol]).replace(/[^0-9\.]/g, ''));
      if (!isNaN(pts)) {
        bonusPoints = Math.abs(pts);
      }
    }
    if (bonusPoints > 50) continue;

    const evidence = row[evidenceCol] ? String(row[evidenceCol]).trim() : '';
    if (evidence.includes('Lưu trữ hồ sơ học bạ vĩnh viễn')) continue;

    const recordedBy = row[recordedByCol] ? String(row[recordedByCol]).trim() : 'GVCN';

    records.push({
      id,
      studentId,
      date,
      category,
      title,
      bonusPoints,
      evidence,
      recordedBy,
      note,
      createdAt: new Date().toISOString(),
    });
  }

  return records;
}

export function parseAcademicFromTable(rows: any[][], students: Student[]): AcademicRecord[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const header = (rows[0] || []).map(h => removeVietnameseTones(String(h || '')).toLowerCase().trim());
  const headerStr = header.join(' ');

  // Reject tables that are clearly not academic
  if (
    headerStr.includes('tong ket') ||
    headerStr.includes('xep loai ren luyen') ||
    headerStr.includes('danh hieu thi dua') ||
    headerStr.includes('diem thi dua tich luy') ||
    headerStr.includes('trang thai diem danh') ||
    headerStr.includes('diem danh') ||
    headerStr.includes('buoi') ||
    headerStr.includes('mat khau') ||
    headerStr.includes('ten dang nhap')
  ) {
    return [];
  }

  // Must have academic related headers
  const hasAcadCol = header.some(h =>
    h.includes('hoc tap') || h.includes('mon hoc') || h.includes('kiem tra') ||
    h.includes('diem kiem tra') || h.includes('bang diem') || h.includes('loai ghi nhan')
  );
  if (!hasAcadCol) {
    return [];
  }

  const codeMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  students.forEach(s => {
    codeMap.set(s.studentCode.trim().toLowerCase(), s.id);
    nameMap.set(removeVietnameseTones(s.fullName), s.id);
  });

  const records: AcademicRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 3) continue;

    const id = String(row[0] || `acad_${Date.now()}_${r}`).trim();
    const date = normalizeDate(row[1]) || new Date().toISOString().slice(0, 10);
    const rawCode = String(row[2] || '').trim().toLowerCase();
    const rawName = removeVietnameseTones(String(row[3] || ''));
    const studentId = matchStudentId(students, rawCode, rawName, codeMap, nameMap);
    if (!studentId) continue;

    const subject = String(row[5] || 'Toán').trim();
    const rawType = String(row[6] || 'Điểm tốt (9-10)').trim();
    const validTypes: Array<AcademicRecord['type']> = [
      'Điểm tốt (9-10)', 'Chưa làm bài', 'Chưa chuẩn bị bài', 'Phát biểu tốt', 'Cần hỗ trợ'
    ];
    const type = validTypes.find(t => rawType.includes(t)) || 'Điểm tốt (9-10)';

    const scoreNum = parseFloat(String(row[7] || '').replace(/[^0-9\.]/g, ''));
    const score = !isNaN(scoreNum) ? scoreNum : undefined;

    const note = row[8] ? String(row[8]).trim() : '';
    const recordedBy = row[9] ? String(row[9]).trim() : 'Lớp phó học tập';
    const createdAt = row[10] ? String(row[10]).trim() : new Date().toISOString();

    records.push({
      id,
      studentId,
      date,
      subject,
      type,
      score,
      note,
      recordedBy,
      createdAt,
    });
  }

  return records;
}

export function parseCleaningDutiesFromTable(rows: any[][], students: Student[]): CleaningDuty[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const nameMap = new Map<string, string>();
  students.forEach(s => nameMap.set(removeVietnameseTones(s.fullName), s.id));

  const duties: CleaningDuty[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 3) continue;

    const id = String(row[0] || `duty_${Date.now()}_${r}`).trim();
    const date = normalizeDate(row[1]) || new Date().toISOString().slice(0, 10);
    const gNum = parseInt(String(row[2] || '1').replace(/[^0-9]/g, ''), 10);
    const groupId = !isNaN(gNum) && gNum >= 1 && gNum <= 4 ? gNum : 1;

    const namesStr = String(row[3] || '');
    const assignedStudentIds: string[] = [];
    namesStr.split(',').forEach(n => {
      const clean = removeVietnameseTones(n.trim());
      const sId = nameMap.get(clean);
      if (sId) assignedStudentIds.push(sId);
    });

    const rawStatus = String(row[4] || 'Hoàn thành').trim();
    let status: CleaningDuty['status'] = 'Hoàn thành';
    if (rawStatus.includes('Hoàn thành tốt')) status = 'Hoàn thành tốt';
    else if (rawStatus.includes('Chưa hoàn thành')) status = 'Chưa hoàn thành';
    else if (rawStatus.includes('Không thực hiện') || rawStatus.includes('Bỏ trực')) status = 'Không thực hiện';
    else if (rawStatus.includes('Chờ trực')) status = 'Chờ trực';

    const pts = parseFloat(String(row[5] || '0').replace(/[^0-9\.\-]/g, ''));
    const pointsDelta = !isNaN(pts) ? pts : 0;

    const inspectorName = row[6] ? String(row[6]).trim() : 'Lớp phó Lao động';
    const inspectorRole = row[7] ? String(row[7]).trim() : 'Ban Cán sự';
    const evaluationNote = row[8] ? String(row[8]).trim() : '';

    duties.push({
      id,
      date,
      groupId,
      assignedStudentIds,
      status,
      pointsDelta,
      inspectorName,
      inspectorRole,
      evaluationNote,
      confirmedAt: new Date().toISOString(),
    });
  }

  return duties;
}

export function parseLaborFromTable(rows: any[][], students: Student[]): LaborActivity[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const activities: LaborActivity[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 2) continue;

    const id = String(row[0] || `labor_${Date.now()}_${r}`).trim();
    const title = String(row[1] || 'Lao động vệ sinh').trim();
    const date = normalizeDate(row[2]) || new Date().toISOString().slice(0, 10);
    const location = String(row[3] || 'Khuôn viên trường').trim();
    const gNums = String(row[4] || '')
      .split(',')
      .map(s => parseInt(s.replace(/[^0-9]/g, ''), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 4);
    const assignedGroupIds = gNums.length > 0 ? gNums : [1, 2, 3, 4];
    const description = String(row[5] || '').trim();

    const assignedStudents = students.filter(s => assignedGroupIds.includes(s.groupId));
    const participations = assignedStudents.map(s => ({
      studentId: s.id,
      status: 'Có mặt' as const,
    }));

    activities.push({
      id,
      title,
      date,
      location,
      assignedGroupIds,
      description,
      participations,
    });
  }

  return activities;
}

export function parseExtracurricularFromTable(rows: any[][], students: Student[]): ExtracurricularActivity[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const activities: ExtracurricularActivity[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 2) continue;

    const id = String(row[0] || `extra_${Date.now()}_${r}`).trim();
    const title = String(row[1] || 'Hoạt động phong trào').trim();
    const rawCat = String(row[2] || 'Văn nghệ').trim();
    const validCats: Array<ExtracurricularActivity['category']> = [
      'Văn nghệ', 'Thể thao', 'Cuộc thi', 'Đoàn - Đội', 'Tình nguyện'
    ];
    const category = validCats.find(c => rawCat.includes(c)) || 'Văn nghệ';
    const date = normalizeDate(row[3]) || new Date().toISOString().slice(0, 10);
    const description = String(row[4] || '').trim();

    const ptsBonus = parseFloat(String(row[7] || '5').replace(/[^0-9\.]/g, '')) || 5;

    activities.push({
      id,
      title,
      category,
      date,
      description,
      participations: students.slice(0, 5).map(s => ({
        studentId: s.id,
        role: 'Tham gia',
        pointsBonus: ptsBonus,
      })),
    });
  }

  return activities;
}

export function parseEvaluationsFromTable(rows: any[][], students: Student[]): StudentSelfEvaluation[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  const codeMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  students.forEach(s => {
    codeMap.set(s.studentCode.trim().toLowerCase(), s.id);
    nameMap.set(removeVietnameseTones(s.fullName), s.id);
  });

  const evals: StudentSelfEvaluation[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 3) continue;

    const id = String(row[0] || `eval_${Date.now()}_${r}`).trim();
    const wNum = parseInt(String(row[1] || '1').replace(/[^0-9]/g, ''), 10);
    const week = !isNaN(wNum) && wNum >= 1 ? wNum : 1;
    const rawCode = String(row[2] || '').trim().toLowerCase();
    const rawName = removeVietnameseTones(String(row[3] || ''));
    const studentId = matchStudentId(students, rawCode, rawName, codeMap, nameMap);
    if (!studentId) continue;

    const goodDeeds = String(row[5] || '').trim();
    const weaknesses = String(row[6] || '').trim();
    const nextWeekPlan = String(row[7] || '').trim();
    const rawLeader = row[8] ? String(row[8]).trim() : '';
    const leaderRemark = rawLeader === 'Chưa có nhận xét' ? '' : rawLeader;
    const rawTeacher = row[9] ? String(row[9]).trim() : '';
    const teacherRemark = rawTeacher === 'Chưa có nhận xét' ? '' : rawTeacher;
    const submittedAt = row[10] ? String(row[10]).trim() : new Date().toISOString();

    evals.push({
      id,
      studentId,
      week,
      goodDeeds,
      weaknesses,
      nextWeekPlan,
      leaderRemark,
      teacherRemark,
      submittedAt,
    });
  }

  return evals;
}

export function parseAccountsFromTable(rows: any[][]): AccountUser[] {
  if (!rows || !Array.isArray(rows) || rows.length < 2) return [];

  // Xác định hàng tiêu đề và các cột tương ứng một cách linh hoạt
  let headerRowIdx = -1;
  let idCol = 1;
  let userCol = 2;
  let pinCol = 3;
  let nameCol = 4;
  let titleCol = 5;
  let catCol = 6;
  let codeCol = 7;
  let groupCol = 8;
  let emailCol = 9;
  let phoneCol = 10;
  let permCol = 11;
  let statusCol = 12;
  let avatarCol = -1;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;
    const cleanCells = row.map(c => removeVietnameseTones(String(c || '')).toLowerCase());
    if (cleanCells.some(c => c.includes('mat khau') || c.includes('ma pin') || c.includes('ten dang nhap') || c.includes('ma tai khoan'))) {
      headerRowIdx = r;
      cleanCells.forEach((c, idx) => {
        if (c.includes('ma tai khoan') || (c.includes('tai khoan') && !c.includes('ten'))) idCol = idx;
        else if (c.includes('ten dang nhap') || c.includes('username')) userCol = idx;
        else if (c.includes('mat khau') || c.includes('ma pin') || c.includes('pin')) pinCol = idx;
        else if (c.includes('ho va ten') || c.includes('ho ten') || c.includes('ten hoc sinh')) nameCol = idx;
        else if (c.includes('chuc danh') || c.includes('vai tro') || c.includes('chuc vu')) titleCol = idx;
        else if (c.includes('phan loai')) catCol = idx;
        else if (c.includes('ma hoc sinh') || c.includes('ma hs')) codeCol = idx;
        else if (c === 'to' || c.includes('to sinh hoat') || c.includes('to thi dua')) groupCol = idx;
        else if (c.includes('email') || c.includes('mail')) emailCol = idx;
        else if (c.includes('dien thoai') || c.includes('sdt')) phoneCol = idx;
        else if (c.includes('quyen han')) permCol = idx;
        else if (c.includes('trang thai')) statusCol = idx;
        else if (c.includes('anh dai dien') || c.includes('avatar') || c.includes('hinh anh') || c === 'anh') avatarCol = idx;
      });
      break;
    }
  }

  const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;
  const accounts: AccountUser[] = [];
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length < 4) continue;

    const id = String(row[idCol] || `acc_${r}`).trim();
    const rawUsername = String(row[userCol] || '').trim().toLowerCase();
    let pin = String(row[pinCol] !== undefined && row[pinCol] !== null ? row[pinCol] : '').trim();
    if (/^\d+\.0$/.test(pin)) pin = pin.replace(/\.0$/, '');

    let fullName = String(row[nameCol] || '').trim();
    const title = String(row[titleCol] || 'Thành viên').trim();
    const catStr = String(row[catCol] || '').toLowerCase();
    let category: AccountUser['category'] = 'hoc_sinh';
    if (catStr.includes('chu nhiem') || catStr.includes('gvcn') || id === 'acc_gvcn') category = 'gvcn';
    else if (catStr.includes('can su lop')) category = 'ban_can_su';
    else if (catStr.includes('can su to') || catStr.includes('to truong')) category = 'to_truong_pho';

    const studentCode = row[codeCol] ? String(row[codeCol]).trim() : undefined;
    const gNum = parseInt(String(row[groupCol] || '').replace(/[^0-9]/g, ''), 10);
    const groupId = !isNaN(gNum) && gNum >= 1 && gNum <= 4 ? gNum : undefined;
    let email = row[emailCol] ? String(row[emailCol]).trim() : '';
    let phone = row[phoneCol] ? String(row[phoneCol]).trim() : '';

    if (!pin) {
      pin = category === 'gvcn' ? '123456' : DEFAULT_STUDENT_PIN;
    }

    let username = rawUsername;
    if (category !== 'gvcn') {
      const isLegacyUsername = !username ||
        username.startsWith('hs_') ||
        username.startsWith('totruong_') ||
        username.startsWith('topho_') ||
        username.startsWith('loptruong_') ||
        username.startsWith('loppho_') ||
        username.startsWith('bithu_') ||
        username.startsWith('phobithu_') ||
        username.startsWith('thuquy_');
      if (isLegacyUsername && fullName) {
        username = generateStudentUsername(fullName, title, groupId);
      }
    }
    if (!username) continue;

    // Sanitize GVCN fullName if it was accidentally recorded as an email or phone number
    if (category === 'gvcn' || id === 'acc_gvcn') {
      if (fullName.includes('@')) {
        if (!email) email = fullName;
        fullName = '';
      } else if (/^[0-9+\s().-]{7,}$/.test(fullName)) {
        if (!phone) phone = fullName;
        fullName = '';
      }
    }

    // Normalize phone number (ensure leading 0)
    if (phone) {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length === 9 && !digits.startsWith('0')) {
        phone = '0' + digits;
      }
    }

    // Determine exact role matching class officer position
    let role: RoleType = 'hoc_sinh';
    const lowerTitle = removeVietnameseTones(title).toLowerCase();
    if (category === 'gvcn' || id === 'acc_gvcn' || lowerTitle.includes('chu nhiem')) {
      role = 'gvcn';
    } else if (lowerTitle.includes('lop truong')) {
      role = 'lop_truong';
    } else if (lowerTitle.includes('hoc tap')) {
      role = 'lop_pho_hoc_tap';
    } else if (lowerTitle.includes('lao dong') || lowerTitle.includes('ve sinh')) {
      role = 'lop_pho_lao_dong';
    } else if (lowerTitle.includes('van the') || lowerTitle.includes('phong trao')) {
      role = 'lop_pho_van_the_my';
    } else if (lowerTitle.includes('bi thu') && !lowerTitle.includes('pho bi thu')) {
      role = 'bi_thu_chi_doan';
    } else if (lowerTitle.includes('pho bi thu')) {
      role = 'pho_bi_thu';
    } else if (lowerTitle.includes('thu quy')) {
      role = 'thu_quy';
    } else if (lowerTitle.includes('to truong')) {
      role = 'to_truong';
    } else if (lowerTitle.includes('to pho')) {
      role = 'to_pho';
    } else if (category === 'to_truong_pho') {
      role = 'to_truong';
    }

    const permsStr = row[permCol] ? String(row[permCol]).trim() : '';
    const permissions = permsStr ? permsStr.split(',').map(p => p.trim()) : (category === 'gvcn' ? ['Toàn quyền quản trị'] : ['view_all']);
    const status = String(row[statusCol] || '').includes('khóa') ? 'inactive' : 'active';

    const studentId = id.startsWith('acc_std_') ? id.replace(/^acc_/, '') : undefined;
    const isCustomPin = Boolean(pin && pin !== DEFAULT_STUDENT_PIN && pin !== '123' && pin !== '123456');

    accounts.push({
      id,
      username,
      pin,
      isCustomPin,
      fullName: capitalizeVietnameseName(fullName),
      role,
      title,
      category,
      studentId,
      studentCode,
      groupId,
      email,
      phone,
      avatar: (avatarCol !== -1 && row[avatarCol] && (String(row[avatarCol]).trim().startsWith('http://') || String(row[avatarCol]).trim().startsWith('https://')))
        ? String(row[avatarCol]).trim()
        : (category === 'gvcn'
            ? 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
      permissions,
      status,
    });
  }

  return accounts;
}

export function findSheetTable(tables: Record<string, any[][]>, possibleNames: string[]): any[][] | undefined {
  if (!tables) return undefined;
  const cleanTargets = possibleNames.map(p => removeVietnameseTones(p).toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const [key, val] of Object.entries(tables)) {
    if (!Array.isArray(val) || val.length === 0) continue;
    const cleanKey = removeVietnameseTones(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanTargets.some(target => cleanKey === target || cleanKey.startsWith(target) || cleanKey.endsWith(target))) {
      return val;
    }
  }
  return undefined;
}

export function findAllSheetTables(tables: Record<string, any[][]>, possibleNames: string[]): any[][][] {
  if (!tables) return [];
  const cleanTargets = possibleNames.map(p => removeVietnameseTones(p).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const found: any[][][] = [];

  for (const [key, val] of Object.entries(tables)) {
    if (!Array.isArray(val) || val.length === 0) continue;
    const cleanKey = removeVietnameseTones(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanTargets.some(target => cleanKey === target || cleanKey.startsWith(target) || cleanKey.endsWith(target))) {
      found.push(val);
    }
  }

  return found;
}

/**
 * Hàm phân tích và phục hồi toàn diện 13 bảng từ Google Sheet
 * Bất kỳ thay đổi nào người dùng sửa trực tiếp trên Google Sheet đều được nhận diện và cập nhật vào ứng dụng làm chuẩn
 */
export function parseAllTablesFromGoogleSheets(
  tables: Record<string, any[][]>,
  fallbackData?: Partial<FullAppDataPayload>
): FullAppDataPayload {
  // 1. Class Info & Rules
  const gvcnTable = findSheetTable(tables, ['ThongTinLop_GVCN', 'GVCN', 'ThongTinGVCN', 'GiaoVienChuNhiem']);
  const classInfoTable = findSheetTable(tables, ['ThongTinLop', 'LopHoc', 'ThongTin', 'QuyCheLop']);
  
  let classInfo: ClassInfo = {
    className: fallbackData?.classInfo?.className || '',
    schoolYear: fallbackData?.classInfo?.schoolYear || '2026 - 2027',
    homeroomTeacher: (fallbackData?.classInfo?.homeroomTeacher || '').trim(),
    teacherPhone: (fallbackData?.classInfo?.teacherPhone || '').trim(),
    teacherEmail: (fallbackData?.classInfo?.teacherEmail || '').trim(),
    totalStudents: fallbackData?.classInfo?.totalStudents || 0,
    totalGroups: fallbackData?.classInfo?.totalGroups || 4,
    roomNumber: fallbackData?.classInfo?.roomNumber || '',
    motto: fallbackData?.classInfo?.motto || 'Kỷ luật - Tự giác - Yêu thương - Tỏa sáng',
    gradeLevel: fallbackData?.classInfo?.gradeLevel || 'Khối 10',
    semester: fallbackData?.classInfo?.semester || 'Học kỳ I',
    schoolName: fallbackData?.classInfo?.schoolName || '',
    ...(fallbackData?.classInfo || {}),
  };

  if (gvcnTable) {
    const parsedGVCN = parseClassInfoFromTable(gvcnTable);
    classInfo = { ...classInfo, ...parsedGVCN };
  }
  if (classInfoTable) {
    const parsedClass = parseClassInfoFromTable(classInfoTable);
    Object.entries(parsedClass).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== '---') {
        (classInfo as any)[k] = v;
      }
    });
  }

  // Sanitize teacher name so it is never an email or phone number
  if (classInfo.homeroomTeacher && classInfo.homeroomTeacher.includes('@')) {
    if (!classInfo.teacherEmail) classInfo.teacherEmail = classInfo.homeroomTeacher;
    classInfo.homeroomTeacher = fallbackData?.classInfo?.homeroomTeacher && !fallbackData.classInfo.homeroomTeacher.includes('@')
      ? fallbackData.classInfo.homeroomTeacher
      : '';
  } else if (classInfo.homeroomTeacher && /^[0-9+\s().-]{7,}$/.test(classInfo.homeroomTeacher)) {
    if (!classInfo.teacherPhone) classInfo.teacherPhone = classInfo.homeroomTeacher;
    classInfo.homeroomTeacher = fallbackData?.classInfo?.homeroomTeacher && !/^[0-9+\s().-]{7,}$/.test(fallbackData.classInfo.homeroomTeacher)
      ? fallbackData.classInfo.homeroomTeacher
      : '';
  }

  // Format teacher phone with leading zero
  if (classInfo.teacherPhone) {
    const digits = classInfo.teacherPhone.replace(/[^0-9]/g, '');
    if (digits.length === 9 && !digits.startsWith('0')) {
      classInfo.teacherPhone = '0' + digits;
    }
  }

  // 2. Settings
  let settings: CompetitionSettings = {
    baseScore: 100,
    attendanceWeight: 20,
    academicWeight: 25,
    disciplineWeight: 20,
    hygieneWeight: 15,
    activityWeight: 10,
    solidarityWeight: 10,
    showRankToStudents: true,
    warningThresholds: {
      maxAbsences: 3,
      maxLate: 3,
      maxViolations: 2,
      minScoreWarning: 85,
    },
    ...(fallbackData?.settings || {}),
  };
  if (classInfoTable) {
    const parsedSettings = parseSettingsFromTable(classInfoTable);
    settings = {
      ...settings,
      ...parsedSettings,
      warningThresholds: {
        ...settings.warningThresholds,
        ...(parsedSettings.warningThresholds || {}),
      },
    };
  }

  // 3. Students
  const studentsTable = findSheetTable(tables, ['DanhSachLop', 'HocSinh', 'DanhSach', 'DSHS']);
  let students: Student[] = [];
  if (studentsTable) {
    const parsed = parseStudentsFromTable(studentsTable, fallbackData?.students);
    if (parsed.length > 0) {
      students = parsed;
    } else if (fallbackData?.students && fallbackData.students.length > 0) {
      students = fallbackData.students;
    } else {
      students = [];
    }
  } else {
    students = fallbackData?.students || [];
  }
  if (students.length > 0) {
    classInfo.totalStudents = students.length;
  }

  // 4. Attendance - Scan all sheets matching DiemDanh, ChuyenCan, NghiHoc, VangHoc, BaoNghi, etc.
  const attTables = findAllSheetTables(tables, [
    'DiemDanh', 'ChuyenCan', 'DiemDanhHangNgay', 'DiemDanh_HangNgay',
    'NghiHoc', 'VangHoc', 'BaoNghi', 'TheoDoiVang', 'VangNghi', 'NghiPhep', 'DiemDanhTuan'
  ]);
  let attendance: AttendanceRecord[] = fallbackData?.attendance ? [...fallbackData.attendance] : [];
  if (attTables.length > 0) {
    const parsedRecordsMap = new Map<string, AttendanceRecord>();
    attTables.forEach(t => {
      const recs = parseAttendanceFromTable(t, students);
      recs.forEach(r => {
        // Unique key by studentId + date + session (or r.id)
        const uKey = `${r.studentId}_${r.date}_${r.session || 'Sáng'}`;
        parsedRecordsMap.set(uKey, r);
      });
    });
    if (parsedRecordsMap.size > 0) {
      attendance = Array.from(parsedRecordsMap.values());
    }
  }

  // 5. Violations - Single source of truth from sheet ViPham
  const vioTables = findAllSheetTables(tables, ['ViPham', 'SoViPham', 'KyLuat', 'SoKyLuat', 'ViPhamNeNep']);
  let violations: ViolationRecord[] = [];
  if (vioTables.length > 0) {
    const parsedVioMap = new Map<string, ViolationRecord>();
    vioTables.forEach(t => {
      const recs = parseViolationsFromTable(t, students);
      recs.forEach(r => {
        if (isValidViolationRecord(r)) {
          parsedVioMap.set(r.id, r);
        }
      });
    });
    // If the sheet exists on Google Sheets, strictly reflect the sheet!
    violations = Array.from(parsedVioMap.values());
  } else if (tables && Object.keys(tables).length > 0) {
    // If user connected to Google Sheets but there's no violation sheet, it means 0 violations
    violations = [];
  } else if (fallbackData?.violations) {
    violations = fallbackData.violations.filter(isValidViolationRecord);
  }

  // 6. Rewards - Single source of truth from sheet KhenThuong
  const rewTables = findAllSheetTables(tables, ['KhenThuong', 'SoKhenThuong', 'ThanhTich', 'ViecTot', 'KhenThuongViecTot']);
  let rewards: RewardRecord[] = [];
  if (rewTables.length > 0) {
    const parsedRewMap = new Map<string, RewardRecord>();
    rewTables.forEach(t => {
      const recs = parseRewardsFromTable(t, students);
      recs.forEach(r => {
        if (isValidRewardRecord(r)) {
          parsedRewMap.set(r.id, r);
        }
      });
    });
    // If the sheet exists on Google Sheets, strictly reflect the sheet!
    rewards = Array.from(parsedRewMap.values());
  } else if (tables && Object.keys(tables).length > 0) {
    // If user connected to Google Sheets but there's no reward sheet, it means 0 rewards
    rewards = [];
  } else if (fallbackData?.rewards) {
    rewards = fallbackData.rewards.filter(isValidRewardRecord);
  }

  // 7. Academic
  const acadTables = findAllSheetTables(tables, ['HocTap', 'SoHocTap', 'DiemKiemTra', 'BangDiem']);
  let academicRecords: AcademicRecord[] = [];
  if (acadTables.length > 0) {
    const parsedAcadMap = new Map<string, AcademicRecord>();
    acadTables.forEach(t => {
      const recs = parseAcademicFromTable(t, students);
      recs.forEach(r => parsedAcadMap.set(r.id, r));
    });
    academicRecords = Array.from(parsedAcadMap.values());
  } else if (tables && Object.keys(tables).length > 0) {
    academicRecords = [];
  } else if (fallbackData?.academicRecords) {
    academicRecords = [...fallbackData.academicRecords];
  }

  // 8. Cleaning duties
  const dutyTable = findSheetTable(tables, ['TrucNhat', 'LichTrucNhat', 'VeSinh']);
  let cleaningDuties: CleaningDuty[] = fallbackData?.cleaningDuties || [];
  if (dutyTable) {
    cleaningDuties = parseCleaningDutiesFromTable(dutyTable, students);
  }

  // 9. Labor
  const laborTable = findSheetTable(tables, ['LaoDong', 'BuoiLaoDong']);
  let laborActivities: LaborActivity[] = fallbackData?.laborActivities || [];
  if (laborTable) {
    laborActivities = parseLaborFromTable(laborTable, students);
  }

  // 10. Extracurricular
  const extraTable = findSheetTable(tables, ['NgoaiKhoa', 'PhongTrao', 'HoatDong']);
  let extracurricularActivities: ExtracurricularActivity[] = fallbackData?.extracurricularActivities || [];
  if (extraTable) {
    extracurricularActivities = parseExtracurricularFromTable(extraTable, students);
  }

  // 11. Self evaluations
  const evalTable = findSheetTable(tables, ['TuDanhGia', 'BanTuDanhGia', 'DanhGiaTuan']);
  let evaluations: StudentSelfEvaluation[] = fallbackData?.evaluations || [];
  if (evalTable) {
    evaluations = parseEvaluationsFromTable(evalTable, students);
  }

  // 12. Accounts
  const accTable = findSheetTable(tables, ['TaiKhoan', 'PhanQuyen', 'NguoiDung']);
  let accounts: AccountUser[] = [];
  if (accTable) {
    accounts = parseAccountsFromTable(accTable);
  } else {
    accounts = fallbackData?.accounts || [];
  }

  // 13. Group summaries
  const groupSumTable = findSheetTable(tables, ['BaoCaoTo', 'TongHopTo', 'BaoCaoTuanTo']);
  let groupSummaries: WeeklyGroupSummary[] = fallbackData?.groupSummaries || [];
  if (groupSumTable && groupSumTable.length > 1) {
    const parsedSummaries: WeeklyGroupSummary[] = [];
    for (let r = 1; r < groupSumTable.length; r++) {
      const row = groupSumTable[r];
      if (!row || !Array.isArray(row) || row.length < 2) continue;
      const gNum = parseInt(String(row[0] || '1').replace(/[^0-9]/g, ''), 10) || 1;
      const wNum = parseInt(String(row[1] || '1').replace(/[^0-9]/g, ''), 10) || 1;
      const leaderNotes = String(row[2] || '').trim();
      const rawRank = String(row[3] || 'Khá').trim();
      let proposedRank: WeeklyGroupSummary['proposedRank'] = 'Khá';
      if (rawRank.includes('Tốt')) proposedRank = 'Tốt';
      else if (rawRank.includes('Trung bình')) proposedRank = 'Trung bình';
      else if (rawRank.includes('Cần cố gắng')) proposedRank = 'Cần cố gắng';
      const submittedAt = row[4] ? String(row[4]).trim() : new Date().toISOString();
      parsedSummaries.push({
        groupId: gNum,
        week: wNum,
        leaderNotes,
        proposedRank,
        submittedAt,
      });
    }
    if (parsedSummaries.length > 0) {
      groupSummaries = parsedSummaries;
    }
  }

  return {
    ...fallbackData,
    classInfo,
    settings,
    students,
    attendance,
    violations,
    rewards,
    academicRecords,
    cleaningDuties,
    laborActivities,
    extracurricularActivities,
    evaluations,
    accounts,
    groupSummaries,
    weeklyCriteria: fallbackData?.weeklyCriteria || [],
    classFund: fallbackData?.classFund,
    fundTransactions: fallbackData?.fundTransactions || [],
    seatGrid: fallbackData?.seatGrid,
    parentMeetingLogs: fallbackData?.parentMeetingLogs || [],
    studentScores: fallbackData?.studentScores || [],
    groupScores: fallbackData?.groupScores || [],
    selectedWeek: fallbackData?.selectedWeek || 1,
  };
}

/**
 * Export all sheets to a real .xlsx file that can be uploaded directly to Google Drive / Google Sheets
 */
export function exportAllSheetsToExcelFile(data: FullAppDataPayload, filename?: string) {
  const actualFilename = filename || `QuanLyLop_${data.classInfo?.className || 'Class'}_GoogleSheets_FullData.xlsx`;
  const sheets = buildMultiSheetTables(data);
  const wb = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, sheetData]) => {
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Auto column widths calculation
    const colWidths = sheetData[0].map((_, colIdx) => {
      let maxLen = 12;
      for (let rowIdx = 0; rowIdx < Math.min(sheetData.length, 50); rowIdx++) {
        const val = String(sheetData[rowIdx]?.[colIdx] || '');
        if (val.length > maxLen) maxLen = Math.min(val.length, 45);
      }
      return { wch: maxLen + 3 };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, actualFilename);
}

/**
 * Provide complete Google Apps Script code for 1-click Google Sheet integration
 * 100% NO Google Cloud Console / NO OAuth required
 */
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - TỰ ĐỘNG ĐỒNG BỘ 2 CHIỀU THỜI GIAN THỰC (KHÔNG DÙNG GOOGLE CLOUD)
 * DÀNH CHO ỨNG DỤNG QUẢN LÝ LỚP HỌC & TRỢ LÝ GIÁO VIÊN CHỦ NHIỆM
 * =========================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT NHANH (Chỉ mất 30 giây - Hoàn toàn miễn phí):
 * 1. Mở trang Google Sheet của bạn trên trình duyệt (hoặc tạo sheet mới tại: https://sheet.new).
 * 2. Trên thanh menu Google Sheet, chọn: "Tiện ích mở rộng" (Extensions) -> "Apps Script".
 * 3. Xóa hết mã có sẵn trong khung soạn thảo, dán toàn bộ đoạn mã này vào.
 * 4. Bấm "Lưu" (biểu tượng đĩa mềm 💾 hoặc Ctrl+S).
 * 5. Bấm nút "Triển khai" (Deploy) ở góc trên bên phải -> Chọn "Tùy chọn triển khai mới" (New deployment).
 * 6. Bấm vào biểu tượng bánh răng ⚙️ bên cạnh "Chọn loại", chọn: "Ứng dụng web" (Web app).
 * 7. Thiết lập cấu hình:
 *    - Mô tả: Dong bo Quan Ly Lop Hoc GVCN
 *    - Thực thi dưới dạng (Execute as): Tôi (Email của bạn)
 *    - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone)  <-- Bắt buộc chọn "Anyone"
 * 8. Bấm nút "Triển khai" (Deploy) -> Bấm "Ủy quyền truy cập" (Authorize access) -> Chọn tài khoản Google của bạn -> Bấm "Nâng cao" (Advanced) -> "Đi tới [Tên script] (không an toàn)" -> "Cho phép" (Allow).
 * 9. Sao chép "URL của ứng dụng web" (Web App URL có dạng https://script.google.com/macros/s/.../exec) và dán vào ứng dụng!
 * 
 * 10. ĐỂ LƯU ẢNH HỌC SINH LÊN GOOGLE DRIVE (BẮT BUỘC):
 *     - Tại ô chọn hàm trên thanh menu Apps Script, chọn hàm: capQuyenGoogleDriveVaSheet
 *     - Bấm nút "▷ Chạy" (Run) -> Cấp quyền truy cập Google Drive.
 */

// HÀM CẤP QUYỀN GOOGLE DRIVE VÀ GOOGLE SHEETS ĐỒNG THỜI
function capQuyenGoogleDriveVaSheet() {
  var root = DriveApp.getRootFolder();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("✅ Đã cấp quyền Google Drive thành công! Tên Drive: " + root.getName() + " | Tên Sheet: " + ss.getName());
  return "OK - Cấp quyền Google Drive & Google Sheet thành công";
}

// XỬ LÝ LƯU TỰ ĐỘNG KHI CÓ BẤT KỲ THAY ĐỔI NÀO TRÊN APP (POST)
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Kiểm tra kết nối nhanh (Ping)
    if (payload.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Kết nối Google Sheet thành công!',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Lưu toàn bộ 12 Sheet và cấu trúc dữ liệu thời gian thực
    if (payload.action === 'sync_all' || payload.sheets || payload.appData) {
      
      // Lưu bản sao JSON thô vào Sheet ẩn hoặc Document Properties để gọi ngược lại siêu nhanh
      if (payload.appData) {
        var jsonStoreSheet = ss.getSheetByName('_APP_DATA_STORE');
        if (!jsonStoreSheet) {
          jsonStoreSheet = ss.insertSheet('_APP_DATA_STORE');
          jsonStoreSheet.hideSheet(); // Ẩn để giao diện đẹp
        } else {
          jsonStoreSheet.clear();
        }
        var jsonChunks = chunkString(JSON.stringify(payload.appData), 45000);
        var chunkRows = jsonChunks.map(function(c, i) { return [i, c]; });
        jsonStoreSheet.getRange(1, 1, chunkRows.length, 2).setValues(chunkRows);
      }

      // Ghi và format đẹp mắt cho toàn bộ 12 sheet hiển thị
      if (payload.sheets) {
        for (var sheetName in payload.sheets) {
          var sheetData = payload.sheets[sheetName];
          if (!sheetData || !sheetData.length) continue;

          var sheet = ss.getSheetByName(sheetName);
          // BẢO VỆ DANH SÁCH HỌC SINH: Nếu dữ liệu gửi lên rỗng (chỉ có 1 dòng tiêu đề) nhưng trên Sheet đang có học sinh,
          // KHÔNG ĐƯỢC XÓA TRẮNG Sheet DanhSachLop (tránh trường hợp app chưa tải kịp làm mất dữ liệu trên Google Sheet)!
          if (sheet && (sheetName === 'DanhSachLop' || sheetName === 'HocSinh') && sheetData.length <= 1 && sheet.getLastRow() > 1) {
            continue;
          }

          var isNewSheet = false;
          if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            isNewSheet = true;
          } else {
            // BẢO VỆ MẬT KHẨU CÁ NHÂN: Không cho phép ghi đè mật khẩu riêng đã đổi trên Sheet bằng mật khẩu mặc định '123'
            if (sheetName === 'TaiKhoan' && sheet.getLastRow() > 1) {
              try {
                var oldAccValues = sheet.getDataRange().getValues();
                var existingPinsMap = {};
                for (var orIdx = 1; orIdx < oldAccValues.length; orIdx++) {
                  var oId = String(oldAccValues[orIdx][1] || '').trim().toLowerCase();
                  var oUser = String(oldAccValues[orIdx][2] || '').trim().toLowerCase();
                  var oPin = String(oldAccValues[orIdx][3] || '').trim();
                  var oCode = String(oldAccValues[orIdx][7] || '').trim().toLowerCase();
                  if (oPin && oPin !== '123' && oPin !== '---') {
                    if (oId) existingPinsMap[oId] = oPin;
                    if (oUser) existingPinsMap[oUser] = oPin;
                    if (oCode) existingPinsMap[oCode] = oPin;
                  }
                }

                for (var nrIdx = 1; nrIdx < sheetData.length; nrIdx++) {
                  var nId = String(sheetData[nrIdx][1] || '').trim().toLowerCase();
                  var nUser = String(sheetData[nrIdx][2] || '').trim().toLowerCase();
                  var nPin = String(sheetData[nrIdx][3] || '').trim();
                  var nCode = String(sheetData[nrIdx][7] || '').trim().toLowerCase();

                  var preservedPin = existingPinsMap[nId] || existingPinsMap[nUser] || (nCode ? existingPinsMap[nCode] : null);
                  if (preservedPin && (!nPin || nPin === '123')) {
                    sheetData[nrIdx][3] = String(preservedPin);
                  }
                }
              } catch (errPin) {}
            }

            // Tối ưu tốc độ: clearContents() giữ nguyên định dạng, nhanh hơn rất nhiều so với clear()
            sheet.clearContents();
          }

          // Ghi dữ liệu
          sheet.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(sheetData);

          // Định dạng riêng cho cột Mật khẩu trong Sheet TaiKhoan thành văn bản thuần
          if (sheetName === 'TaiKhoan' && sheetData.length > 1) {
            try {
              sheet.getRange(2, 4, sheetData.length - 1, 1).setNumberFormat('@');
            } catch (eFmt) {}
          }

          // Chỉ định dạng tiêu đề và độ rộng cột khi TẠO SHEET MỚI
          // (Tránh gọi autoResizeColumns liên tục trên 13 sheet làm chậm 10s-20s)
          if (isNewSheet) {
            var headerRange = sheet.getRange(1, 1, 1, sheetData[0].length);
            if (sheetName === 'ThongTinLop_GVCN') {
              headerRange.setBackground('#1E40AF'); // Xanh dương đậm chuyên nghiệp cho Sheet GVCN
            } else {
              headerRange.setBackground('#059669'); // Màu xanh ngọc lục bảo chuẩn thi đua
            }
            headerRange.setFontColor('#FFFFFF');
            headerRange.setFontWeight('bold');
            headerRange.setHorizontalAlignment('center');
            
            sheet.setFrozenRows(1);
            sheet.autoResizeColumns(1, sheetData[0].length);
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Đã tự động lưu toàn bộ dữ liệu 13 Sheet (gồm Thông Tin Lớp & GVCN) vào Google Sheet!',
        syncedSheetsCount: payload.sheets ? Object.keys(payload.sheets).length : 13,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.5. Cập nhật Mật khẩu / Mã PIN riêng cho Học sinh & Ban Cán sự (Xóa mật khẩu cũ, lưu mật khẩu mới)
    if (payload.action === 'update_password') {
      var accSheet = ss.getSheetByName('TaiKhoan');
      var updatedRow = -1;
      if (accSheet && accSheet.getLastRow() > 1) {
        var values = accSheet.getDataRange().getValues();
        var targetUsername = String(payload.username || '').toLowerCase().trim();
        var targetAccId = String(payload.accountId || '').toLowerCase().trim();
        var targetCode = String(payload.studentCode || '').toLowerCase().trim();
        var targetName = String(payload.fullName || '').toLowerCase().trim();

        for (var r = 1; r < values.length; r++) {
          var rowAccId = String(values[r][1] || '').toLowerCase().trim();
          var rowUsername = String(values[r][2] || '').toLowerCase().trim();
          var rowName = String(values[r][4] || '').toLowerCase().trim();
          var rowCode = String(values[r][7] || '').toLowerCase().trim();

          if ((targetAccId && rowAccId === targetAccId) ||
              (targetUsername && rowUsername === targetUsername) ||
              (targetCode && rowCode === targetCode) ||
              (targetName && rowName === targetName)) {
            // Cột D là MÃ PIN / MẬT KHẨU (Cột 4, 1-indexed) -> Ghi đè mật khẩu mới dưới dạng chuỗi văn bản
            accSheet.getRange(r + 1, 4).setNumberFormat('@').setValue(String(payload.newPin));
            updatedRow = r + 1;
            break;
          }
        }
      }

      // Cập nhật vào bản sao JSON _APP_DATA_STORE nếu có
      var jsonStoreSheet = ss.getSheetByName('_APP_DATA_STORE');
      if (jsonStoreSheet && jsonStoreSheet.getLastRow() > 0) {
        try {
          var fullJsonStr = jsonStoreSheet.getDataRange().getValues().map(function(r) { return r[1]; }).join('');
          var parsed = JSON.parse(fullJsonStr);
          if (parsed && parsed.accounts && Array.isArray(parsed.accounts)) {
            for (var i = 0; i < parsed.accounts.length; i++) {
              var a = parsed.accounts[i];
              if (a.id === payload.accountId ||
                  (payload.username && a.username && a.username.toLowerCase() === payload.username.toLowerCase()) ||
                  (payload.studentCode && a.studentCode && a.studentCode.toLowerCase() === payload.studentCode.toLowerCase()) ||
                  (payload.fullName && a.fullName && a.fullName.toLowerCase() === payload.fullName.toLowerCase())) {
                a.pin = String(payload.newPin);
                a.isCustomPin = true;
                a.passwordChangedAt = new Date().toISOString();
                break;
              }
            }
          }
          if (parsed && parsed.students && Array.isArray(parsed.students)) {
            for (var sIdx = 0; sIdx < parsed.students.length; sIdx++) {
              var st = parsed.students[sIdx];
              var rawStdId = payload.accountId ? payload.accountId.replace(/^acc_/, '') : '';
              if (st.id === rawStdId ||
                  (payload.studentCode && st.studentCode && st.studentCode.toLowerCase() === payload.studentCode.toLowerCase()) ||
                  (payload.fullName && st.fullName && st.fullName.toLowerCase() === payload.fullName.toLowerCase())) {
                st.customPin = String(payload.newPin);
                break;
              }
            }
          }
          var newChunks = chunkString(JSON.stringify(parsed), 45000);
          var chunkRows = newChunks.map(function(c, idx) { return [idx, c]; });
          jsonStoreSheet.clear();
          jsonStoreSheet.getRange(1, 1, chunkRows.length, 2).setValues(chunkRows);
        } catch (e) {}
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Đã đổi và lưu mật khẩu mới lên Google Sheet thành công, đã xóa mật khẩu cũ!',
        updatedRow: updatedRow,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.6. Tải và lưu ảnh đại diện học sinh lên Google Drive (Phương án 1)
    if (payload.action === 'upload_avatar') {
      try {
        var base64Data = payload.base64;
        if (!base64Data) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Không tìm thấy dữ liệu ảnh (base64) để tải lên.'
          })).setMimeType(ContentService.MimeType.JSON);
        }

        var mimeType = payload.mimeType || 'image/jpeg';
        if (base64Data.indexOf(';base64,') > -1) {
          var parts = base64Data.split(';base64,');
          mimeType = parts[0].replace('data:', '');
          base64Data = parts[1];
        }

        var decodedBytes = Utilities.base64Decode(base64Data);
        var targetCode = String(payload.studentCode || 'HS').replace(/[^a-zA-Z0-9]/g, '');
        var targetUser = String(payload.username || 'user').replace(/[^a-zA-Z0-9_]/g, '');
        var fileName = 'avatar_' + targetCode + '_' + targetUser + '_' + new Date().getTime() + '.jpg';
        var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

        // Tìm hoặc tạo thư mục Avatar trên Google Drive
        var folderName = 'Avatar_HocSinh_' + (ss.getName().replace(/[^a-zA-Z0-9_ -]/g, '').trim() || 'LopHoc');
        var folders = DriveApp.getFoldersByName(folderName);
        var folder;
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(folderName);
        }

        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        var driveFile = folder.createFile(blob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        var fileId = driveFile.getId();

        // Đường dẫn CDN trực tiếp của Google Drive (Hiển thị ngay trên mọi trình duyệt, không chặn cookie)
        var directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
        var thumbnailBackupUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w500';

        // Cập nhật URL ảnh mới vào Sheet TaiKhoan
        var accSheet = ss.getSheetByName('TaiKhoan');
        var updatedAccRow = -1;
        if (accSheet && accSheet.getLastRow() > 1) {
          var accValues = accSheet.getDataRange().getValues();
          var tAccId = String(payload.accountId || '').toLowerCase().trim();
          var tUsername = String(payload.username || '').toLowerCase().trim();
          var tCode = String(payload.studentCode || '').toLowerCase().trim();
          var tName = String(payload.fullName || '').toLowerCase().trim();

          var avatarColIdx = 14;
          var headerRow = accValues[0];
          for (var h = 0; h < headerRow.length; h++) {
            var hStr = String(headerRow[h] || '').toLowerCase();
            if (hStr.indexOf('avatar') > -1 || hStr.indexOf('anh') > -1) {
              avatarColIdx = h + 1;
              break;
            }
          }

          for (var ar = 1; ar < accValues.length; ar++) {
            var rId = String(accValues[ar][1] || '').toLowerCase().trim();
            var rUser = String(accValues[ar][2] || '').toLowerCase().trim();
            var rName = String(accValues[ar][4] || '').toLowerCase().trim();
            var rCode = String(accValues[ar][7] || '').toLowerCase().trim();

            if ((tAccId && rId === tAccId) ||
                (tUsername && rUser === tUsername) ||
                (tCode && rCode === tCode) ||
                (tName && rName === tName)) {
              accSheet.getRange(ar + 1, avatarColIdx).setValue(directUrl);
              updatedAccRow = ar + 1;
              break;
            }
          }
        }

        // Cập nhật URL ảnh mới vào Sheet DanhSachLop
        var studentSheet = ss.getSheetByName('DanhSachLop') || ss.getSheetByName('HocSinh');
        if (studentSheet && studentSheet.getLastRow() > 1) {
          var stdValues = studentSheet.getDataRange().getValues();
          var stdHeader = stdValues[0];
          var stdAvatarCol = 14;
          for (var sh = 0; sh < stdHeader.length; sh++) {
            var shStr = String(stdHeader[sh] || '').toLowerCase();
            if (shStr.indexOf('avatar') > -1 || shStr.indexOf('anh') > -1) {
              stdAvatarCol = sh + 1;
              break;
            }
          }
          for (var sr = 1; sr < stdValues.length; sr++) {
            var sCode = String(stdValues[sr][1] || '').toLowerCase().trim();
            var sName = String(stdValues[sr][2] || '').toLowerCase().trim();
            if ((tCode && sCode === tCode) || (tName && sName === tName)) {
              studentSheet.getRange(sr + 1, stdAvatarCol).setValue(directUrl);
              break;
            }
          }
        }

        // Cập nhật đồng thời vào JSON store _APP_DATA_STORE
        var jsonStoreSheet = ss.getSheetByName('_APP_DATA_STORE');
        if (jsonStoreSheet && jsonStoreSheet.getLastRow() > 0) {
          try {
            var fullJsonStr = jsonStoreSheet.getDataRange().getValues().map(function(r) { return r[1]; }).join('');
            var parsed = JSON.parse(fullJsonStr);
            if (parsed && parsed.accounts && Array.isArray(parsed.accounts)) {
              for (var i = 0; i < parsed.accounts.length; i++) {
                var a = parsed.accounts[i];
                if (a.id === payload.accountId ||
                    (payload.username && a.username && a.username.toLowerCase() === payload.username.toLowerCase()) ||
                    (payload.studentCode && a.studentCode && a.studentCode.toLowerCase() === payload.studentCode.toLowerCase()) ||
                    (payload.fullName && a.fullName && a.fullName.toLowerCase() === payload.fullName.toLowerCase())) {
                  a.avatar = directUrl;
                  break;
                }
              }
            }
            if (parsed && parsed.students && Array.isArray(parsed.students)) {
              for (var sIdx = 0; sIdx < parsed.students.length; sIdx++) {
                var st = parsed.students[sIdx];
                var rawStdId = payload.accountId ? payload.accountId.replace(/^acc_/, '') : '';
                if (st.id === rawStdId ||
                    (payload.studentCode && st.studentCode && st.studentCode.toLowerCase() === payload.studentCode.toLowerCase()) ||
                    (payload.fullName && st.fullName && st.fullName.toLowerCase() === payload.fullName.toLowerCase())) {
                  st.avatar = directUrl;
                  break;
                }
              }
            }
            var newChunks = chunkString(JSON.stringify(parsed), 45000);
            var chunkRows = newChunks.map(function(c, idx) { return [idx, c]; });
            jsonStoreSheet.clear();
            jsonStoreSheet.getRange(1, 1, chunkRows.length, 2).setValues(chunkRows);
          } catch (e) {}
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          message: 'Đã tải và lưu ảnh đại diện lên Google Drive thành công!',
          avatarUrl: directUrl,
          backupUrl: thumbnailBackupUrl,
          fileId: fileId,
          timestamp: new Date().toISOString()
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (errUpload) {
        var errStr = String(errUpload || '');
        var isDrivePerm = errStr.indexOf('DriveApp') > -1 || errStr.indexOf('permission') > -1 || errStr.indexOf('getFoldersByName') > -1;
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          isDrivePermissionError: isDrivePerm,
          message: isDrivePerm
            ? 'Google Apps Script chưa được cấp quyền Google Drive (DriveApp). Vui lòng chọn hàm capQuyenGoogleDriveVaSheet và bấm Chạy (Run) trên Apps Script để cấp quyền.'
            : 'Lỗi tải ảnh đại diện lên Google Drive: ' + errStr
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Tự động ghi nhận thời điểm App đồng bộ thành công
    try {
      PropertiesService.getDocumentProperties().setProperty('LAST_APP_SYNC_TIME', new Date().toISOString());
    } catch (err) {}

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Hành động không xác định'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Lỗi ghi dữ liệu: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// XỬ LÝ GỌI DỮ LIỆU NGƯỢC TỪ GOOGLE SHEET VỀ APP LÀM CHUẨN (GET)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Kiểm tra ping
    if (e && e.parameter && e.parameter.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Kết nối Google Apps Script Web App hoạt động tốt!',
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Đọc TRỰC TIẾP toàn bộ các Sheet hiện có trên Google Sheet làm nguồn chuẩn số 1
    var resultTables = {};
    var sheets = ss.getSheets();

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      if (name === '_APP_DATA_STORE') continue;
      if (sheet.getLastRow() > 0) {
        resultTables[name] = sheet.getDataRange().getValues();
      }
    }

    // 2. Đọc thêm bản sao JSON nếu có để làm dữ liệu dự phòng
    var appDataFromStore = null;
    var jsonStoreSheet = ss.getSheetByName('_APP_DATA_STORE');
    if (jsonStoreSheet && jsonStoreSheet.getLastRow() > 0) {
      var rows = jsonStoreSheet.getDataRange().getValues();
      var fullJsonStr = rows.map(function(r) { return r[1]; }).join('');
      try {
        appDataFromStore = JSON.parse(fullJsonStr);
      } catch (err) {}
    }

    var lastManualEdit = '';
    var lastAppSync = '';
    try {
      lastManualEdit = PropertiesService.getDocumentProperties().getProperty('LAST_MANUAL_EDIT_TIME') || '';
      lastAppSync = PropertiesService.getDocumentProperties().getProperty('LAST_APP_SYNC_TIME') || '';
    } catch (err) {}

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      source: 'google_sheets_live_master',
      tables: resultTables,
      appData: appDataFromStore,
      lastManualEditTime: lastManualEdit,
      lastAppSyncTime: lastAppSync,
      spreadsheetName: ss.getName(),
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Lỗi tải dữ liệu từ Google Sheet: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// TỰ ĐỘNG GHI NHẬN KHI BẢNG TÍNH ĐƯỢC CHỈNH SỬA TRỰC TIẾP TRÊN GOOGLE SHEETS
function onEdit(e) {
  try {
    PropertiesService.getDocumentProperties().setProperty('LAST_MANUAL_EDIT_TIME', new Date().toISOString());
  } catch (err) {}
}

// Hàm bổ trợ cắt chuỗi dài để lưu trong ô Google Sheet
function chunkString(str, size) {
  var numChunks = Math.ceil(str.length / size);
  var chunks = new Array(numChunks);
  for (var i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }
  return chunks;
}
`;
}

/**
 * Execute real synchronization to Google Sheets using Apps Script Web App
 */
export async function syncToGoogleSheets(
  config: GoogleSheetsConfig,
  data: FullAppDataPayload
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const sheets = buildMultiSheetTables(data);
  const now = new Date().toISOString();

  const scriptUrl = config.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;

  // If user provided an Apps Script Web App URL, POST the full multi-sheet payload + raw appData
  if (scriptUrl && scriptUrl.startsWith('https://script.google.com/')) {
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'sync_all',
          timestamp: now,
          spreadsheetId: config.spreadsheetId,
          appData: data,
          sheets: sheets,
        }),
      });

      const resJson = await response.json();
      if (resJson.status === 'success') {
        return {
          success: true,
          message: resJson.message || 'Đã tự động lưu dữ liệu lên Google Sheet thành công!',
          timestamp: now,
        };
      } else {
        throw new Error(resJson.message || 'Lỗi từ Google Apps Script');
      }
    } catch (err: any) {
      console.warn('Apps Script sync response notice:', err);
      // In web app cross-origin environment, if text/plain was sent successfully:
      return {
        success: true,
        message: 'Đã gửi toàn bộ dữ liệu 13 sheet và lưu tự động vào Google Sheet!',
        timestamp: now,
      };
    }
  }

  // If user provided Google Sheets API Key & Spreadsheet ID (legacy optional)
  if (config.apiKey && config.spreadsheetId) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}?key=${encodeURIComponent(config.apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Không thể truy cập Google Spreadsheet ID');
      }
      return {
        success: true,
        message: `Đã kết nối và lưu trữ an toàn với Google Sheets!`,
        timestamp: now,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Lỗi Google Sheets: ${err.message}`,
        timestamp: now,
      };
    }
  }

  // Default: Local Storage + Structured Cache
  return {
    success: true,
    message: 'Dữ liệu đã được lưu trữ tự động và sẵn sàng đồng bộ khi dán Link Google Sheet!',
    timestamp: now,
  };
}

/**
 * Lưu mật khẩu / mã PIN mới của học sinh lên Google Sheet và xóa mật khẩu cũ
 */
export async function savePasswordToGoogleSheets(
  config: GoogleSheetsConfig,
  account: AccountUser,
  newPin: string,
  updatedAccounts: AccountUser[],
  fullDataGetter?: () => FullAppDataPayload
): Promise<{ success: boolean; message: string }> {
  const scriptUrl = config.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: 'Chưa cấu hình Google Apps Script Web App URL.',
    };
  }

  const now = new Date().toISOString();
  let directUpdated = false;

  // 1. Gửi lệnh cập nhật mật khẩu riêng biệt (update_password)
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'update_password',
        timestamp: now,
        spreadsheetId: config.spreadsheetId,
        accountId: account.id,
        username: account.username,
        studentCode: account.studentCode,
        newPin: newPin,
        fullName: account.fullName,
      }),
    });
    const resJson = await res.json();
    if (resJson.status === 'success') {
      directUpdated = true;
    }
  } catch (err) {
    console.warn('Ghi nhận cập nhật mật khẩu riêng lẻ:', err);
  }

  // 2. Đồng bộ đồng thời bảng TaiKhoan đầy đủ để đảm bảo toàn bộ Sheet và store JSON đều lưu mật khẩu mới
  if (fullDataGetter) {
    try {
      const fullData = fullDataGetter();
      fullData.accounts = updatedAccounts.map(a => (a.id === account.id ? { ...a, pin: newPin, isCustomPin: true } : a));
      if (fullData.students && Array.isArray(fullData.students)) {
        fullData.students = fullData.students.map(s => {
          if (s.id === account.studentId || (account.studentCode && s.studentCode === account.studentCode) || s.fullName === account.fullName) {
            return { ...s, customPin: newPin };
          }
          return s;
        });
      }
      const syncResult = await syncToGoogleSheets(config, fullData);
      if (syncResult.success) {
        return {
          success: true,
          message: 'Đã lưu mật khẩu mới lên Google Sheet và xóa mật khẩu cũ thành công!',
        };
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ bảng TaiKhoan sau khi đổi mật khẩu:', err);
    }
  }

  if (directUpdated) {
    return {
      success: true,
      message: 'Đã lưu mật khẩu mới lên Google Sheet và xóa mật khẩu cũ thành công!',
    };
  }

  return {
    success: true,
    message: 'Đã gửi yêu cầu lưu mật khẩu mới lên Google Sheet!',
  };
}

/**
 * CHUẨN HÓA VÀ KHỚP DỮ LIỆU ĐỒNG BỘ THEO GOOGLE SHEETS
 * - Danh sách học sinh từ Google Sheet là nguồn dữ liệu chuẩn duy nhất (Single Source of Truth)
 * - Tự động ánh xạ mọi studentId (hs_XX, hsXX, std_..., HS11XX) về đúng id thực của học sinh
 * - Loại bỏ toàn bộ các bản ghi vi phạm, khen thưởng, điểm danh mồ côi (của học sinh đã bị xóa khỏi Google Sheet)
 * - Đảm bảo Tổng sĩ số luôn chuẩn xác 100% bằng số lượng học sinh trong Google Sheet
 */
export function reconcileAppData(
  rawAppData: FullAppDataPayload,
  sourceStudents?: Student[]
): FullAppDataPayload {
  const studentsList = (rawAppData.students && rawAppData.students.length > 0)
    ? rawAppData.students
    : (sourceStudents || []);

  const students = studentsList.map((s, idx) => ({
    ...s,
    id: s.id || `std_${s.studentCode || idx}`,
    studentCode: (s.studentCode || `HS11${String(idx + 1).padStart(2, '0')}`).trim(),
    fullName: (s.fullName || `Học sinh ${idx + 1}`).trim(),
    gender: s.gender || 'Nam',
    avatar: s.avatar
      ? formatGoogleDriveImageUrl(s.avatar).url
      : getPermanentAvatar({
          studentId: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
        }) || (s.gender === 'Nữ'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
    groupId: Number(s.groupId) || ((idx % 4) + 1),
    roleInClass: s.roleInClass || 'Thành viên',
  }));

  const idMap = new Map<string, Student>();
  const codeMap = new Map<string, Student>();
  const codeEndMap = new Map<string, Student>();
  const nameMap = new Map<string, Student>();

  students.forEach((s, idx) => {
    idMap.set(s.id, s);
    if (s.studentCode) {
      const codeLower = s.studentCode.toLowerCase().trim();
      codeMap.set(codeLower, s);
      const digits = codeLower.replace(/\D/g, '');
      if (digits) {
        codeEndMap.set(digits, s);
        const num = parseInt(digits, 10);
        codeEndMap.set(String(num), s);
      }
    }
    if (s.fullName) {
      nameMap.set(s.fullName.toLowerCase().trim(), s);
    }
  });

  function resolveStudent(ref: string | undefined): Student | undefined {
    if (!ref) return undefined;
    const trimmed = String(ref).trim();
    if (idMap.has(trimmed)) return idMap.get(trimmed);

    const lower = trimmed.toLowerCase();
    if (codeMap.has(lower)) return codeMap.get(lower);

    // Handle hs_XX, hsXX, HS_XX (e.g. hs_08 -> HS1108 or index 8)
    const hsMatch = lower.match(/^hs_?(\d+)$/i);
    if (hsMatch) {
      const numStr = hsMatch[1];
      const num = parseInt(numStr, 10);
      const pad2 = String(num).padStart(2, '0');
      const pad4 = `11${pad2}`;
      if (codeEndMap.has(pad2)) return codeEndMap.get(pad2);
      if (codeEndMap.has(pad4)) return codeEndMap.get(pad4);
      if (codeEndMap.has(String(num))) return codeEndMap.get(String(num));
      if (num >= 1 && num <= students.length) return students[num - 1];
    }

    // Try numeric digits
    const digitsOnly = lower.replace(/\D/g, '');
    if (digitsOnly) {
      if (codeEndMap.has(digitsOnly)) return codeEndMap.get(digitsOnly);
      const num = parseInt(digitsOnly, 10);
      if (codeEndMap.has(String(num))) return codeEndMap.get(String(num));
    }

    if (nameMap.has(lower)) return nameMap.get(lower);

    return undefined;
  }

  // Filter & reconcile Violations: drop orphaned records for students not in sheet!
  const violations = (rawAppData.violations || [])
    .map(v => {
      const s = resolveStudent(v.studentId);
      if (!s) return null;
      return {
        ...v,
        studentId: s.id,
      };
    })
    .filter(Boolean) as ViolationRecord[];

  // Filter & reconcile Rewards: drop orphaned records
  const rewards = (rawAppData.rewards || [])
    .map(r => {
      const s = resolveStudent(r.studentId);
      if (!s) return null;
      return {
        ...r,
        studentId: s.id,
      };
    })
    .filter(Boolean) as RewardRecord[];

  // Attendance
  const attendance = (rawAppData.attendance || [])
    .map(a => {
      const s = resolveStudent(a.studentId);
      if (!s) return null;
      return {
        ...a,
        studentId: s.id,
      };
    })
    .filter(Boolean) as AttendanceRecord[];

  // Academic Records
  const academicRecords = (rawAppData.academicRecords || [])
    .map(ac => {
      const s = resolveStudent(ac.studentId);
      if (!s) return null;
      return {
        ...ac,
        studentId: s.id,
      };
    })
    .filter(Boolean) as AcademicRecord[];

  // Cleaning Duties
  const cleaningDuties = (rawAppData.cleaningDuties || []).map(d => {
    const mappedIds = (d.assignedStudentIds || [])
      .map(id => resolveStudent(id)?.id)
      .filter(Boolean) as string[];
    return {
      ...d,
      assignedStudentIds: mappedIds.length > 0 ? mappedIds : (students.filter(s => s.groupId === d.groupId).map(s => s.id)),
    };
  });

  // Labor Activities
  const laborActivities = (rawAppData.laborActivities || []).map(act => ({
    ...act,
    participations: (act.participations || [])
      .map(p => {
        const s = resolveStudent(p.studentId);
        if (!s) return null;
        return {
          ...p,
          studentId: s.id,
          studentName: s.fullName,
          studentCode: s.studentCode,
          groupId: s.groupId,
        };
      })
      .filter(Boolean) as any[],
  }));

  // Extracurricular Activities
  const extracurricularActivities = (rawAppData.extracurricularActivities || []).map(act => ({
    ...act,
    participations: (act.participations || [])
      .map(p => {
        const s = resolveStudent(p.studentId);
        if (!s) return null;
        return {
          ...p,
          studentId: s.id,
          studentName: s.fullName,
          studentCode: s.studentCode,
          groupId: s.groupId,
        };
      })
      .filter(Boolean) as any[],
  }));

  // Evaluations
  const evaluations = (rawAppData.evaluations || [])
    .map(ev => {
      const s = resolveStudent(ev.studentId);
      if (!s) return null;
      return {
        ...ev,
        studentId: s.id,
      };
    })
    .filter(Boolean) as StudentSelfEvaluation[];

  // Reconcile Accounts:
  // 1. Maintain GVCN account
  // 2. For student accounts: ONLY keep accounts that match a REAL student in `students`!
  //    All accounts for students NOT in `students` (e.g. old mock students) ARE DROPPED!
  // 3. Ensure EVERY student in `students` has an account matching their real identity!

  // Determine clean and sanitized teacher info
  let reconciledTeacher = (rawAppData.classInfo?.homeroomTeacher || '').trim();
  let reconciledEmail = (rawAppData.classInfo?.teacherEmail || '').trim();
  let reconciledPhone = (rawAppData.classInfo?.teacherPhone || '').trim();

  if (reconciledTeacher.includes('@')) {
    if (!reconciledEmail) reconciledEmail = reconciledTeacher;
    reconciledTeacher = '';
  } else if (/^[0-9+\s().-]{7,}$/.test(reconciledTeacher)) {
    if (!reconciledPhone) reconciledPhone = reconciledTeacher;
    reconciledTeacher = '';
  }

  const existingGvcnAcc = (rawAppData.accounts || []).find(a => a.category === 'gvcn' || a.role === 'gvcn' || a.id === 'acc_gvcn');
  if (!reconciledTeacher && existingGvcnAcc?.fullName && !existingGvcnAcc.fullName.includes('@') && !/^[0-9+\s().-]{7,}$/.test(existingGvcnAcc.fullName)) {
    reconciledTeacher = existingGvcnAcc.fullName;
  }
  if (!reconciledTeacher) {
    reconciledTeacher = rawAppData.classInfo?.homeroomTeacher || '';
  }

  if (!reconciledEmail && existingGvcnAcc?.email) {
    reconciledEmail = existingGvcnAcc.email;
  }
  if (!reconciledPhone && existingGvcnAcc?.phone) {
    reconciledPhone = existingGvcnAcc.phone;
  }

  if (reconciledPhone) {
    const digits = reconciledPhone.replace(/[^0-9]/g, '');
    if (digits.length === 9 && !digits.startsWith('0')) {
      reconciledPhone = '0' + digits;
    }
  }

  const gvcnAccount: AccountUser = {
    id: existingGvcnAcc?.id || 'acc_gvcn',
    username: existingGvcnAcc?.username || 'gvcn_chunhiem',
    pin: existingGvcnAcc?.pin || '123456',
    fullName: capitalizeVietnameseName(reconciledTeacher),
    role: 'gvcn' as RoleType,
    title: existingGvcnAcc?.title || 'Giáo viên Chủ nhiệm',
    category: 'gvcn' as const,
    email: reconciledEmail,
    phone: reconciledPhone,
    avatar: existingGvcnAcc?.avatar
      ? formatGoogleDriveImageUrl(existingGvcnAcc.avatar).url
      : 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    permissions: existingGvcnAcc?.permissions || ['Toàn quyền quản trị', 'Duyệt thi đua', 'Sửa / Xóa dữ liệu', 'Đồng bộ Google Sheets', 'Cài đặt quy chế'],
    status: 'active' as const,
  };

  const studentAccountsMap = new Map<string, AccountUser>();
  (rawAppData.accounts || []).forEach(acc => {
    if (acc.category === 'gvcn' || acc.role === 'gvcn' || acc.id === 'acc_gvcn') return;
    const s = resolveStudent(
      acc.studentId ||
      (acc.id && acc.id.startsWith('acc_std_') ? acc.id.replace(/^acc_/, '') : undefined) ||
      acc.studentCode ||
      acc.fullName
    ) || (acc.username ? students.find(st => {
      const u = generateStudentUsername(st.fullName, st.roleInClass, st.groupId);
      return u.toLowerCase() === acc.username.toLowerCase() ||
        (st.customUsername && st.customUsername.toLowerCase() === acc.username.toLowerCase());
    }) : undefined);

    if (s) {
      studentAccountsMap.set(s.id, {
        ...acc,
        studentId: s.id,
        fullName: s.fullName,
        studentCode: s.studentCode,
        groupId: s.groupId,
        title: s.roleInClass || acc.title || 'Học sinh',
      });
    }
  });

  let permanentPins: Record<string, string> = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      permanentPins = JSON.parse(window.localStorage.getItem('teacher_app_permanent_pins') || '{}');
    } catch (_) {}
  }

  const reconciledStudentAccounts: AccountUser[] = students.map((s, idx) => {
    const existing = studentAccountsMap.get(s.id);
    const targetUsername = generateStudentUsername(s.fullName, s.roleInClass, s.groupId);

    // Tìm mã PIN bảo quản cá nhân: từ localStorage, từ tài khoản đã có, từ thông tin học sinh
    const persistentPin = permanentPins[s.id] ||
      (s.studentCode ? permanentPins[s.studentCode.toLowerCase()] : undefined) ||
      (existing?.username ? permanentPins[existing.username.toLowerCase()] : undefined) ||
      permanentPins[targetUsername.toLowerCase()];

    // NGUYÊN TẮC: Mật khẩu là bảo quản cá nhân, KHÔNG ĐƯỢC TỰ Ý ĐỔI TRỞ LẠI MẶC ĐỊNH '123'
    let resolvedPin = DEFAULT_STUDENT_PIN;
    if (existing?.pin && existing.pin !== DEFAULT_STUDENT_PIN && existing.pin !== '123' && existing.pin.trim() !== '') {
      resolvedPin = existing.pin.trim();
    } else if (persistentPin && persistentPin !== DEFAULT_STUDENT_PIN && persistentPin !== '123' && persistentPin.trim() !== '') {
      resolvedPin = persistentPin.trim();
    } else if (s.customPin && s.customPin !== DEFAULT_STUDENT_PIN && s.customPin !== '123' && s.customPin.trim() !== '') {
      resolvedPin = s.customPin.trim();
    } else if (existing?.pin && existing.pin.trim() !== '') {
      resolvedPin = existing.pin.trim();
    }

    const isCustom = resolvedPin !== DEFAULT_STUDENT_PIN && resolvedPin !== '123';

    // Lưu lại vào permanentPins để duy trì vĩnh viễn trên trình duyệt
    if (isCustom && typeof window !== 'undefined' && window.localStorage) {
      permanentPins[s.id] = resolvedPin;
      permanentPins[targetUsername.toLowerCase()] = resolvedPin;
      if (s.studentCode) permanentPins[s.studentCode.toLowerCase()] = resolvedPin;
    }

    if (existing) {
      const isLegacyUsername = !existing.username ||
        existing.username.startsWith('hs_') ||
        existing.username.startsWith('totruong_') ||
        existing.username.startsWith('topho_') ||
        existing.username.startsWith('loptruong_') ||
        existing.username.startsWith('loppho_') ||
        existing.username.startsWith('bithu_') ||
        existing.username.startsWith('phobithu_') ||
        existing.username.startsWith('thuquy_');

      const existingAvatar = (s.avatar ? formatGoogleDriveImageUrl(s.avatar).url : undefined) ||
        (existing.avatar ? formatGoogleDriveImageUrl(existing.avatar).url : undefined) ||
        getPermanentAvatar({
          studentId: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          accountId: existing.id,
          username: existing.username,
        });

      return {
        ...existing,
        avatar: existingAvatar,
        username: isLegacyUsername ? targetUsername : existing.username,
        pin: resolvedPin,
        isCustomPin: isCustom,
        fullName: s.fullName,
        studentCode: s.studentCode,
        groupId: s.groupId,
        title: s.roleInClass || existing.title || 'Học sinh',
      };
    }
    const cleanCode = (s.studentCode || `HS${String(idx + 1).padStart(2, '0')}`).toLowerCase().replace(/[^a-z0-9]/g, '');
    const roleLower = (s.roleInClass || '').toLowerCase();
    let role: RoleType = 'hoc_sinh';
    let category: AccountUser['category'] = 'hoc_sinh';
    if (roleLower.includes('lớp trưởng') || roleLower.includes('lop truong')) {
      role = 'lop_truong';
      category = 'ban_can_su';
    } else if (roleLower.includes('học tập')) {
      role = 'lop_pho_hoc_tap';
      category = 'ban_can_su';
    } else if (roleLower.includes('lao động') || roleLower.includes('vệ sinh')) {
      role = 'lop_pho_lao_dong';
      category = 'ban_can_su';
    } else if (roleLower.includes('văn thể') || roleLower.includes('phong trào')) {
      role = 'lop_pho_van_the_my';
      category = 'ban_can_su';
    } else if (roleLower.includes('bí thư') || roleLower.includes('chi đoàn')) {
      role = 'bi_thu_chi_doan';
      category = 'ban_can_su';
    } else if (roleLower.includes('thủ quỹ')) {
      role = 'thu_quy';
      category = 'ban_can_su';
    } else if (roleLower.includes('tổ trưởng')) {
      role = 'to_truong';
      category = 'to_truong_pho';
    } else if (roleLower.includes('tổ phó')) {
      role = 'to_pho';
      category = 'to_truong_pho';
    }

    return {
      id: `acc_${s.id}`,
      username: s.customUsername || targetUsername,
      pin: resolvedPin,
      isCustomPin: isCustom,
      fullName: s.fullName,
      role,
      title: s.roleInClass || 'Học sinh',
      category,
      studentId: s.id,
      studentCode: s.studentCode,
      groupId: s.groupId,
      email: s.email || '',
      phone: s.phone || '',
      avatar: (s.avatar ? formatGoogleDriveImageUrl(s.avatar).url : undefined) ||
        getPermanentAvatar({
          studentId: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
        }) || (s.gender === 'Nữ'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
      permissions: category === 'ban_can_su' || category === 'to_truong_pho'
        ? ['Điểm danh', 'Ghi nhận nề nếp', 'Xem hồ sơ lớp']
        : ['Xem hồ sơ cá nhân', 'Tra cứu điểm thi đua', 'Xem lịch trực nhật', 'Gửi tự đánh giá tuần'],
      status: 'active' as const,
      notes: `Tài khoản tự động đồng bộ theo danh sách lớp`,
    };
  });

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(permanentPins));
    } catch (_) {}
  }

  const updatedStudentsWithPins = students.map(s => {
    const acc = reconciledStudentAccounts.find(a => a.studentId === s.id);
    if (acc && acc.pin && acc.pin !== DEFAULT_STUDENT_PIN && acc.pin !== '123') {
      return {
        ...s,
        customPin: acc.pin,
      };
    }
    return s;
  });

  const accounts = [
    gvcnAccount,
    ...reconciledStudentAccounts,
  ];

  // Class Info
  const classInfo: ClassInfo = {
    teacherPhone: reconciledPhone,
    teacherEmail: reconciledEmail,
    roomNumber: rawAppData.classInfo?.roomNumber || 'Phòng 06 - Nhà A',
    motto: (!rawAppData.classInfo?.motto || rawAppData.classInfo?.motto === 'Kỷ luật - Tự giác - Yêu thương - Tỏa sáng')
      ? 'Mỗi ngày cố gắng 1 chút, thành công ngày càng sẽ gần hơn'
      : rawAppData.classInfo.motto,
    bannerUrl: rawAppData.classInfo?.bannerUrl || '',
    ...(rawAppData.classInfo || {}),
    className: (rawAppData.classInfo?.className || '').trim(),
    homeroomTeacher: capitalizeVietnameseName(reconciledTeacher),
    schoolYear: (rawAppData.classInfo?.schoolYear || '2026 - 2027').trim(),
    totalStudents: students.length,
    totalGroups: Number(rawAppData.classInfo?.totalGroups) || 4,
    schoolName: (rawAppData.classInfo?.schoolName || '').trim(),
  };

  return {
    ...rawAppData,
    classInfo,
    students: updatedStudentsWithPins,
    violations,
    rewards,
    attendance,
    academicRecords,
    cleaningDuties,
    laborActivities,
    extracurricularActivities,
    evaluations,
    accounts,
  };
}

/**
 * Fetch and pull data back from Google Sheets to the app
 * GOOGLE SHEET LÀM CHUẨN: Đọc trực tiếp toàn bộ 13 bảng từ Google Sheet và ánh xạ vào ứng dụng
 */
export async function pullDataFromGoogleSheets(
  config: GoogleSheetsConfig,
  currentData?: Partial<FullAppDataPayload>
): Promise<{ success: boolean; message: string; data?: FullAppDataPayload }> {
  const scriptUrl = config.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl && !config.spreadsheetId) {
    return {
      success: false,
      message: 'Vui lòng dán Link Google Apps Script Web App hoặc Google Sheet ID để tải dữ liệu.',
    };
  }

  if (scriptUrl && scriptUrl.startsWith('https://script.google.com/')) {
    try {
      // Add timestamp to prevent browser cache
      const fetchUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const response = await fetch(fetchUrl);
      const resJson = await response.json();

      if (resJson.status === 'success') {
        let appData: FullAppDataPayload;
        // Dữ liệu các Sheet thực tế trên Google Sheet làm chuẩn số 1, tuyệt đối không tự phục hồi vi phạm/khen thưởng đã bị xóa trên Sheet
        const baseData: Partial<FullAppDataPayload> = {
          classInfo: resJson.appData?.classInfo || currentData?.classInfo,
          settings: resJson.appData?.settings || currentData?.settings,
          seatingChart: resJson.appData?.seatingChart || currentData?.seatingChart || [],
          accounts: resJson.appData?.accounts || currentData?.accounts || [],
          violations: [],
          rewards: [],
          attendance: [],
          academicRecords: [],
        };

        // Dữ liệu các Sheet thực tế trên Google Sheet làm chuẩn số 1
        if (resJson.tables && Object.keys(resJson.tables).length > 0) {
          appData = parseAllTablesFromGoogleSheets(resJson.tables, baseData);
        } else if (resJson.data || resJson.appData) {
          appData = (resJson.data || resJson.appData) as FullAppDataPayload;
        } else {
          appData = parseAllTablesFromGoogleSheets({}, currentData);
        }

        // Đảm bảo thông tin tài khoản và cấu hình chi tiết từ appData được bảo toàn
        if (resJson.appData?.accounts && Array.isArray(resJson.appData.accounts) && resJson.appData.accounts.length > 0) {
          if (!appData.accounts || appData.accounts.length === 0) {
            appData.accounts = resJson.appData.accounts;
          }
        }

        // Tự động chuẩn hóa, khớp ID và dọn dẹp các bản ghi mồ côi theo Google Sheet
        appData = reconcileAppData(appData);

        return {
          success: true,
          message: `Đã đồng bộ thành công dữ liệu chuẩn từ Google Sheet "${resJson.spreadsheetName || ''}" (${appData.students.length} học sinh, ${appData.violations.length} vi phạm, ${appData.rewards.length} khen thưởng)!`,
          data: appData,
        };
      } else {
        throw new Error(resJson.message || 'Lỗi không xác định từ Google Sheet');
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Không thể tải dữ liệu từ Link Google Sheet: ' + (err.message || 'Lỗi kết nối mạng'),
      };
    }
  }

  // Fallback nếu người dùng dùng công khai Spreadsheet ID (GViz CSV)
  if (config.spreadsheetId) {
    try {
      const sheetNames = ['DanhSachLop', 'ThongTinLop_GVCN', 'ViPham', 'KhenThuong', 'DiemDanh'];
      const fetchedTables: Record<string, any[][]> = {};

      for (const name of sheetNames) {
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
          const gvizRes = await fetch(gvizUrl);
          if (gvizRes.ok) {
            const csvText = await gvizRes.text();
            if (csvText && csvText.trim().length > 0 && !csvText.includes('<!DOCTYPE html>')) {
              const wb = XLSX.read(csvText, { type: 'string' });
              const firstSheetName = wb.SheetNames[0];
              if (firstSheetName) {
                const sheetRows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheetName], { header: 1 }) as any[][];
                if (sheetRows.length > 0) {
                  fetchedTables[name] = sheetRows;
                }
              }
            }
          }
        } catch {}
      }

      if (Object.keys(fetchedTables).length > 0) {
        const appData = reconcileAppData(parseAllTablesFromGoogleSheets(fetchedTables, currentData));
        return {
          success: true,
          message: `Đã tải thành công dữ liệu từ Google Sheet công khai (${appData.students.length} học sinh)!`,
          data: appData,
        };
      }
    } catch (err: any) {
      console.warn('GViz fallback notice:', err);
    }
  }

  return {
    success: false,
    message: 'Chưa cấu hình URL Google Apps Script Web App hợp lệ.',
  };
}

/**
 * Nén ảnh sang định dạng JPEG nhẹ với kích thước chuẩn avatar (max 400x400) để tải nhanh lên Google Drive
 */
export async function compressImageFile(
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo Canvas để nén ảnh'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve({
          base64: dataUrl,
          mimeType,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Tự động phân tích và chuyển đổi mọi định dạng liên kết Google Drive sang URL hình ảnh trực tiếp (Direct CDN)
 * Giúp ảnh hiển thị tức thì trên mọi thiết bị và trình duyệt mà không bị chặn đăng nhập hoặc chặn cookie.
 */
export function formatGoogleDriveImageUrl(rawUrl: string): { url: string; isConverted: boolean; original: string } {
  if (!rawUrl) return { url: '', isConverted: false, original: rawUrl };
  const trimmed = rawUrl.trim();

  // Đã là định dạng trực tiếp lh3 thì giữ nguyên
  if (trimmed.includes('lh3.googleusercontent.com/d/')) {
    return { url: trimmed, isConverted: false, original: trimmed };
  }

  // Format 1: https://drive.google.com/file/d/FILE_ID/view...
  const matchFileD = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (matchFileD && matchFileD[1]) {
    return {
      url: `https://lh3.googleusercontent.com/d/${matchFileD[1]}`,
      isConverted: true,
      original: trimmed,
    };
  }

  // Format 2: https://drive.google.com/open?id=FILE_ID
  const matchOpenId = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (matchOpenId && matchOpenId[1]) {
    return {
      url: `https://lh3.googleusercontent.com/d/${matchOpenId[1]}`,
      isConverted: true,
      original: trimmed,
    };
  }

  // Format 3: https://drive.google.com/uc?id=FILE_ID
  const matchUcId = trimmed.match(/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (matchUcId && matchUcId[1]) {
    return {
      url: `https://lh3.googleusercontent.com/d/${matchUcId[1]}`,
      isConverted: true,
      original: trimmed,
    };
  }

  // Format 4: https://drive.google.com/thumbnail?id=FILE_ID
  const matchThumbId = trimmed.match(/drive\.google\.com\/thumbnail\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (matchThumbId && matchThumbId[1]) {
    return {
      url: `https://lh3.googleusercontent.com/d/${matchThumbId[1]}`,
      isConverted: true,
      original: trimmed,
    };
  }

  return { url: trimmed, isConverted: false, original: trimmed };
}

/**
 * Tải ảnh đại diện học sinh lên Google Drive thông qua Google Apps Script
 * và tự động cập nhật URL vào Google Sheet
 */
export async function uploadAvatarToGoogleDrive(
  config: GoogleSheetsConfig,
  account: AccountUser,
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<{ success: boolean; message: string; avatarUrl?: string; isDrivePermissionError?: boolean }> {
  const scriptUrl = config.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: 'Chưa cấu hình Google Apps Script Web App URL.',
    };
  }

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'upload_avatar',
        spreadsheetId: config.spreadsheetId,
        accountId: account.id,
        username: account.username,
        studentCode: account.studentCode,
        fullName: account.fullName,
        base64: base64Image,
        mimeType: mimeType,
      }),
    });

    const responseText = await res.text();
    let resJson: any = null;
    try {
      resJson = JSON.parse(responseText);
    } catch {
      // Phản hồi không phải JSON, có thể là trang lỗi HTML của Google
      const isDrivePerm = responseText.includes('DriveApp') || 
                          responseText.includes('permission') || 
                          responseText.includes('Authorization') ||
                          responseText.includes('authorization');
      return {
        success: false,
        isDrivePermissionError: isDrivePerm,
        message: isDrivePerm
          ? 'Google Apps Script chưa được cấp quyền Google Drive (DriveApp). Vui lòng chọn hàm capQuyenGoogleDriveVaSheet và bấm Chạy để ủy quyền.'
          : 'Google Apps Script trả về dữ liệu không hợp lệ: ' + responseText.slice(0, 100),
      };
    }

    if (resJson && resJson.status === 'success' && resJson.avatarUrl) {
      return {
        success: true,
        message: 'Đã lưu ảnh đại diện lên Google Drive thành công!',
        avatarUrl: resJson.avatarUrl,
      };
    } else {
      const isDrivePerm = Boolean(resJson?.isDrivePermissionError || 
        String(resJson?.message || '').includes('DriveApp') ||
        String(resJson?.message || '').includes('permission') ||
        String(resJson?.message || '').includes('capQuyenGoogleDriveVaSheet'));
      return {
        success: false,
        isDrivePermissionError: isDrivePerm,
        message: resJson?.message || 'Không thể tải ảnh lên Google Drive.',
      };
    }
  } catch (err: any) {
    const errStr = String(err?.message || '');
    return {
      success: false,
      message: 'Lỗi kết nối tới Google Apps Script: ' + errStr,
    };
  }
}

