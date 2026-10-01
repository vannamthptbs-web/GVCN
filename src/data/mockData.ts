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
  ActivityLog,
  UserRole,
  AccountUser,
  GoogleSheetsConfig,
  ClassInfo,
} from '../types';

export const MASTER_GOOGLE_APPS_SCRIPT_URL = '';

export const INITIAL_CLASS_INFO: ClassInfo = {
  className: '',
  schoolYear: '2026 - 2027',
  homeroomTeacher: '',
  teacherPhone: '',
  teacherEmail: '',
  totalStudents: 0,
  totalGroups: 4,
  roomNumber: '',
  motto: 'Mỗi ngày cố gắng 1 chút, thành công ngày càng sẽ gần hơn',
  gradeLevel: 'Khối 10',
  semester: 'Học kỳ I',
  schoolName: '',
  bannerUrl: '',
};

export const INITIAL_GOOGLE_SHEETS_CONFIG: GoogleSheetsConfig = {
  spreadsheetId: '',
  spreadsheetUrl: '',
  apiKey: '',
  appScriptUrl: '',
  autoSync: false,
  lastSyncedAt: null,
  syncStatus: 'idle',
  syncError: null,
  enabledSheets: {
    thongTinLopGVCN: true,
    taiKhoan: true,
    thongTinLop: true,
    danhSachLop: true,
    diemDanh: true,
    viPham: true,
    khenThuong: true,
    hocTap: true,
    trucNhat: true,
    laoDong: true,
    ngoaiKhoa: true,
    tuDanhGia: true,
    tongHopThiDua: true,
  },
};

export const GUEST_ROLE: UserRole = {
  role: 'khach',
  title: 'Khách (Chế độ xem)',
  name: 'Khách chưa đăng nhập',
  accountId: '',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
};

export const INITIAL_ROLES: UserRole[] = [
  GUEST_ROLE,
  {
    role: 'gvcn',
    title: 'Giáo viên Chủ nhiệm',
    name: 'Giáo viên Chủ nhiệm',
    accountId: 'acc_gvcn',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_ACCOUNTS: AccountUser[] = [
  {
    id: 'acc_gvcn',
    username: 'gvcn',
    pin: '123456',
    fullName: 'Giáo viên Chủ nhiệm',
    role: 'gvcn',
    title: 'Giáo viên Chủ nhiệm',
    category: 'gvcn',
    email: '',
    phone: '',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    permissions: [
      'Toàn quyền quản trị lớp',
      'Quản lý học sinh & cán sự',
      'Cấu hình thi đua',
      'Xuất/Nhập dữ liệu',
      'Đồng bộ Google Sheets',
    ],
    status: 'active',
    lastLoginAt: '',
    notes: 'Tài khoản quản trị viên tối cao của lớp (GVCN)',
  },
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_SETTINGS: CompetitionSettings = {
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
};

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_VIOLATIONS: ViolationRecord[] = [];
export const INITIAL_REWARDS: RewardRecord[] = [];
export const INITIAL_ACADEMIC: AcademicRecord[] = [];
export const INITIAL_DUTIES: CleaningDuty[] = [];
export const INITIAL_LABOR: LaborActivity[] = [];
export const INITIAL_EXTRACURRICULAR: ExtracurricularActivity[] = [];
export const INITIAL_EVALUATIONS: StudentSelfEvaluation[] = [];
export const INITIAL_GROUP_SUMMARIES: WeeklyGroupSummary[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
