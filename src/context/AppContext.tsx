import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Student,
  AttendanceRecord,
  ViolationRecord,
  RewardRecord,
  AcademicRecord,
  CleaningDuty,
  LaborActivity,
  LaborStatus,
  LaborStudentStatus,
  ExtracurricularActivity,
  StudentSelfEvaluation,
  WeeklyGroupSummary,
  CompetitionSettings,
  ActivityLog,
  UserRole,
  RoleType,
  DutyStatus,
  ViolationProcessStatus,
  AccountUser,
  GoogleSheetsConfig,
  ClassInfo,
  CleanDataOptions,
  GVCNBackupSnapshot,
  SeatAssignment,
  SeatingChartConfig,
  TeacherRegistrationData,
} from '../types';
import { getGoogleInitialAvatar } from '../utils/googleAuth';
import {
  savePermanentAvatar,
  getPermanentAvatar,
  applyPermanentAvatarsToStudents,
  applyPermanentAvatarsToAccounts,
  hydrateAvatarsFromIndexedDB,
} from '../utils/avatarStorage';
import {
  INITIAL_ROLES,
  INITIAL_STUDENTS,
  INITIAL_SETTINGS,
  INITIAL_ATTENDANCE,
  INITIAL_VIOLATIONS,
  INITIAL_REWARDS,
  INITIAL_ACADEMIC,
  INITIAL_DUTIES,
  INITIAL_LABOR,
  INITIAL_EXTRACURRICULAR,
  INITIAL_EVALUATIONS,
  INITIAL_GROUP_SUMMARIES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ACCOUNTS,
  INITIAL_CLASS_INFO,
  INITIAL_GOOGLE_SHEETS_CONFIG,
  MASTER_GOOGLE_APPS_SCRIPT_URL,
  GUEST_ROLE,
} from '../data/mockData';
import {
  exportAllSheetsToExcelFile,
  syncToGoogleSheets,
  pullDataFromGoogleSheets,
  FullAppDataPayload,
  isValidViolationRecord,
  isValidRewardRecord,
} from '../utils/googleSheetsSync';
import { exportStudentAccountsListExcel } from '../utils/excelImportExport';
import { isDateInRange } from '../utils/timeFilter';
import {
  isGuestUser,
  isHomeroomTeacher,
  isClassPresident,
  isClassAdmin,
  isClassCadre,
  isRegularStudent,
  isReadOnlyUser,
  canManageClassActivities,
  canManageStudentMaster,
  canManageSystemSettings,
  canAdministerAllAccounts,
  canEditTargetAccount,
  canViewTargetAccountPin,
  canSubmitSelfEvaluation,
  canManageDuty,
  canManageLabor,
  canManageAcademics,
  canManageExtracurricular,
  canManageAttendance,
  getPermissionDeniedMessage,
} from '../utils/permissionUtils';
import {
  getRoleRank,
  isStudentCadre,
  sortCadres,
  reconcileRoleAssignment,
  mapRoleInClassToAccountInfo,
  sortAccountsByHierarchy,
  compareStudentsByRoleHierarchy,
  compareStudentsByGroupHierarchy,
  generateStudentUsername,
  DEFAULT_STUDENT_PIN,
  isDefaultStudentPin,
} from '../utils/roleHierarchy';
import {
  savePasswordToGoogleSheets,
  compressImageFile,
  uploadAvatarToGoogleDrive,
} from '../utils/googleSheetsSync';

export interface StudentScoreStats {
  student: Student;
  baseScore: number;
  bonusPoints: number;
  penaltyPoints: number;
  dutyPoints: number;
  laborPoints?: number;
  attendancePenalty: number;
  extraCurricularPoints: number;
  totalScore: number;
  rankInClass: number;
  rankInGroup: number;
  totalAbsences: number;
  totalLate: number;
  totalViolations: number;
  totalRewards: number;
  trend: 'up' | 'down' | 'steady';
  needsAttention: boolean;
  attentionReasons: string[];
}

export interface GroupScoreStats {
  groupId: number;
  groupName: string;
  leaderName: string;
  memberCount: number;
  attendanceScore: number; // Max 20
  academicScore: number; // Max 25
  disciplineScore: number; // Max 20
  hygieneScore: number; // Max 15
  activityScore: number; // Max 10
  solidarityScore: number; // Max 10
  totalScore: number; // Max 100
  rank: number;
  totalViolations: number;
  totalRewards: number;
  cleanRate: number; // Percentage
  avgStudentScore: number;
}

export interface SyncNotificationState {
  visible: boolean;
  status: 'idle' | 'pending' | 'saving' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  actor?: string;
  actionDetails?: string;
  spreadsheetUrl?: string;
}

interface AppContextType {
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  availableRoles: UserRole[];
  
  accounts: AccountUser[];
  classInfo: ClassInfo;
  googleSheetsConfig: GoogleSheetsConfig;
  
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
  activityLogs: ActivityLog[];
  
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  
  selectedStudentIdForDetail: string | null;
  setSelectedStudentIdForDetail: (id: string | null) => void;
  
  quickActionModalOpen: boolean;
  setQuickActionModalOpen: (open: boolean) => void;
  
  googleSheetsModalOpen: boolean;
  setGoogleSheetsModalOpen: (open: boolean) => void;
  
  accountModalOpen: boolean;
  setAccountModalOpen: (open: boolean) => void;
  
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  
  changePasswordModalOpen: boolean;
  setChangePasswordModalOpen: (open: boolean) => void;

  changeAvatarModalOpen: boolean;
  targetAvatarAccount: AccountUser | null;
  targetAvatarStudent: Student | null;
  setChangeAvatarModalOpen: (open: boolean, targetAccount?: AccountUser | null, targetStudent?: Student | null) => void;
  
  loginTargetUsername: string | null;
  setLoginTargetUsername: (username: string | null) => void;
  
  openLoginModal: (targetUsername?: string) => void;
  
  studentScores: Record<string, StudentScoreStats>;
  rankedStudents: StudentScoreStats[];
  groupScores: Record<number, GroupScoreStats>;
  rankedGroups: GroupScoreStats[];
  studentsNeedingAttention: StudentScoreStats[];
  
  // Actions
  addAttendance: (record: Omit<AttendanceRecord, 'id' | 'recordedAt'>) => void;
  bulkMarkAttendance: (records: Omit<AttendanceRecord, 'id' | 'recordedAt'>[]) => void;
  deleteAttendance: (id: string) => void;
  addViolation: (record: Omit<ViolationRecord, 'id' | 'createdAt'>) => void;
  batchAddViolations: (records: Omit<ViolationRecord, 'id' | 'createdAt'>[]) => { success: boolean; count: number };
  updateViolation: (record: ViolationRecord) => void;
  updateViolationStatus: (id: string, status: ViolationProcessStatus, remedyAction?: string) => void;
  deleteViolation: (id: string) => void;
  addReward: (record: Omit<RewardRecord, 'id' | 'createdAt'>) => void;
  batchAddRewards: (records: Omit<RewardRecord, 'id' | 'createdAt'>[]) => { success: boolean; count: number };
  updateReward: (record: RewardRecord) => void;
  deleteReward: (id: string) => void;
  addAcademicRecord: (record: Omit<AcademicRecord, 'id' | 'createdAt'>) => void;
  batchAddAcademicRecords: (records: Omit<AcademicRecord, 'id' | 'createdAt'>[]) => { success: boolean; count: number };
  deleteAcademicRecord: (id: string) => void;
  updateDutyStatus: (dutyId: string, status: DutyStatus, note?: string) => void;
  updateDuty: (duty: CleaningDuty) => void;
  addDuty: (duty: Omit<CleaningDuty, 'id'>) => void;
  deleteDuty: (id: string) => void;
  addLaborActivity: (activity: Omit<LaborActivity, 'id'>) => void;
  updateLaborActivity: (id: string, updates: Partial<LaborActivity>) => void;
  confirmLaborActivity: (
    id: string,
    evaluation: {
      status: LaborStatus;
      inspectorName: string;
      inspectorRole: string;
      evaluationNote?: string;
      participations: {
        studentId: string;
        status: LaborStudentStatus;
        note?: string;
        pointsDelta?: number;
      }[];
    }
  ) => void;
  deleteLaborActivity: (id: string) => void;
  updateLaborParticipation: (activityId: string, studentId: string, status: LaborStudentStatus, note?: string) => void;
  addExtracurricular: (activity: Omit<ExtracurricularActivity, 'id'>) => void;
  deleteExtracurricular: (id: string) => void;
  submitSelfEvaluation: (evaluation: Omit<StudentSelfEvaluation, 'id' | 'submittedAt'>) => void;
  deleteEvaluation: (id: string) => void;
  updateEvaluationRemarks: (evalId: string, leaderRemark?: string, teacherRemark?: string) => void;
  submitGroupSummary: (summary: Omit<WeeklyGroupSummary, 'submittedAt'>) => void;
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  batchDeleteStudents: (ids: string[]) => { success: boolean; message: string; count: number };
  batchDeleteViolations: (ids: string[]) => { success: boolean; message: string; count: number };
  batchDeleteRewards: (ids: string[]) => { success: boolean; message: string; count: number };
  batchDeleteAttendance: (ids: string[]) => { success: boolean; message: string; count: number };
  batchImportStudents: (newStudents: Array<Omit<Student, 'id'>>, replaceAll?: boolean) => { success: boolean; message: string; count: number };
  batchUpdateStudentsFromExcel: (
    parsedStudents: Array<Omit<Student, 'id'>>,
    mode: 'update' | 'append' | 'replace'
  ) => Promise<{ success: boolean; message: string; updatedCount: number; addedCount: number }>;
  clearAllStudents: () => Promise<{ success: boolean; message: string; count: number }>;
  exportStudentAccountsList: () => void;
  updateSettings: (settings: CompetitionSettings) => void;
  updateClassInfo: (info: ClassInfo) => void;
  cleanData: (options: CleanDataOptions) => { success: boolean; message: string; count: number };
  normalizeAndFixData: () => { success: boolean; message: string; fixes: string[] };
  resetToDefaultData: () => void;
  exportClassDataToExcel: () => void;
  undoLastAction: () => void;
  logout: () => void;
  
  // Google Sheets Actions
  updateGoogleSheetsConfig: (newConfig: Partial<GoogleSheetsConfig>) => void;
  syncAllToGoogleSheets: (customPayload?: Partial<FullAppDataPayload>, force?: boolean) => Promise<{ success: boolean; message: string }>;
  pullFromGoogleSheets: (options?: { silent?: boolean }) => Promise<{ success: boolean; message: string }>;
  testGoogleSheetsConnection: () => Promise<{ success: boolean; message: string }>;
  
  // GVCN Backup & Restore Actions
  backupGVCNData: (options?: {
    exportExcel?: boolean;
    exportJson?: boolean;
    note?: string;
  }) => Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    snapshotId?: string;
    sheetsSynced?: boolean;
  }>;
  exportDataToJson: () => { success: boolean; message: string; filename?: string };
  importDataFromJson: (jsonContent: string | object) => { success: boolean; message: string };
  restoreGVCNBackup: (snapshotIdOrData: string | any) => { success: boolean; message: string };
  deleteGVCNBackup: (snapshotId: string) => void;
  gvcnBackupHistory: GVCNBackupSnapshot[];
  lastGVCNBackupAt: string | null;
  
  // Account Actions
  switchAccount: (accountId: string) => boolean;
  loginWithCredentials: (username: string, pin: string) => { success: boolean; message: string; user?: AccountUser };
  loginWithGoogle: (profile: { email: string; name: string; avatar?: string; googleId?: string }) => Promise<{ success: boolean; message: string; user?: AccountUser; needsRegistration?: boolean }>;
  registerTeacherAccount: (data: TeacherRegistrationData) => Promise<{ success: boolean; message: string; account?: AccountUser }>;
  clearAllOldBackgroundData: () => void;
  changePassword: (oldPin: string, newPin: string, confirmPin: string) => Promise<{ success: boolean; message: string }>;
  adminResetPin: (accountId: string, newPin: string) => Promise<{ success: boolean; message: string }>;
  changeAvatar: (newAvatarUrl: string, targetAccount?: AccountUser | null, targetStudent?: Student | null) => Promise<{ success: boolean; message: string }>;
  uploadAvatar: (file: File, targetAccount?: AccountUser | null, targetStudent?: Student | null) => Promise<{ success: boolean; message: string; avatarUrl?: string; isDrivePermissionError?: boolean; compressedBase64?: string }>;
  addAccount: (account: Omit<AccountUser, 'id'>) => void;
  updateAccount: (account: AccountUser) => void;
  deleteAccount: (id: string) => void;

  // Sơ đồ lớp học (Seating Chart Actions & State)
  seatingChart: SeatAssignment[];
  assignSeat: (column: number, row: number, deskPosition: 1 | 2, studentId: string | null) => void;
  swapSeats: (from: { column: number; row: number; deskPosition: 1 | 2 }, to: { column: number; row: number; deskPosition: 1 | 2 }) => void;
  autoAssignSeats: (mode: 'alphabetical' | 'by_group' | 'random' | 'gender') => void;
  rotateColumns: (direction?: 'next' | 'prev') => void;
  clearSeatingChart: () => void;
  saveSeatingChart: (newChart: SeatAssignment[]) => void;

  // Real-time Cloud Sync indicators & controls
  isInitialLoadingData: boolean;
  isSyncingData: boolean;
  scheduleAutoSync: (delayMs?: number) => void;
  syncNotification: SyncNotificationState | null;
  dismissSyncNotification: () => void;
  triggerManualSyncWithConfirmation: (reason?: string) => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_PREFIX = 'gvcn_app_';

function capitalizeVietnameseName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error loading key ${key} from storage:`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key ${key} to storage:`, e);
  }
}

let globalIdCounter = 0;
function createUniqueId(prefix: string): string {
  globalIdCounter = (globalIdCounter + 1) % 1000000;
  return `${prefix}_${Date.now()}_${globalIdCounter}_${Math.random().toString(36).substring(2, 7)}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    // Không tự động đăng nhập GVCN khi mở link lần đầu.
    // Chỉ duy trì đăng nhập nếu người dùng đã có phiên đăng nhập xác thực trong sessionStorage
    try {
      const sessionActive = typeof window !== 'undefined' ? sessionStorage.getItem('gvcn_session_active') : null;
      if (!sessionActive) {
        return GUEST_ROLE;
      }
      return loadFromStorage<UserRole>('currentUserRole', GUEST_ROLE);
    } catch (_) {
      return GUEST_ROLE;
    }
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const loaded = loadFromStorage<Student[]>('students', INITIAL_STUDENTS);
    // Tự động phát hiện và xóa sạch dữ liệu học sinh mẫu ban đầu (hs_01, HS1101, Trần Minh Hoàng...) nếu còn sót lại ở thiết bị người dùng
    const hasOldMock = Array.isArray(loaded) && loaded.some(s => s.id?.startsWith('hs_') || s.studentCode?.startsWith('HS11') || s.fullName === 'Trần Minh Hoàng');
    if (hasOldMock) {
      try {
        localStorage.removeItem('gvcn_app_students');
        localStorage.removeItem('gvcn_app_accounts');
        localStorage.removeItem('gvcn_app_attendance');
        localStorage.removeItem('gvcn_app_violations');
        localStorage.removeItem('gvcn_app_rewards');
        localStorage.removeItem('gvcn_app_academicRecords');
        localStorage.removeItem('gvcn_app_cleaningDuties');
        localStorage.removeItem('gvcn_app_laborActivities');
        localStorage.removeItem('gvcn_app_extracurricularActivities');
        localStorage.removeItem('gvcn_app_evaluations');
        localStorage.removeItem('gvcn_app_groupSummaries');
        localStorage.removeItem('gvcn_app_activityLogs');
      } catch (_) {}
      return [];
    }
    const studentList = Array.isArray(loaded) ? loaded : [];
    return applyPermanentAvatarsToStudents(studentList);
  });

  const [accounts, setAccounts] = useState<AccountUser[]>(() => {
    const loaded = loadFromStorage<AccountUser[]>('accounts', INITIAL_ACCOUNTS);
    // Nếu danh sách tài khoản lưu cục bộ còn chứa các tài khoản học sinh mẫu (acc_lt, studentId hs_...), chỉ giữ lại tài khoản GVCN
    if (Array.isArray(loaded) && loaded.some(a => a.studentId?.startsWith('hs_') || a.id === 'acc_lt')) {
      const gvcn = loaded.find(a => a.category === 'gvcn' || a.role === 'gvcn' || a.id === 'acc_gvcn') || INITIAL_ACCOUNTS[0];
      return applyPermanentAvatarsToAccounts([gvcn]);
    }
    const accList = Array.isArray(loaded) && loaded.length > 0 ? loaded : INITIAL_ACCOUNTS;
    return applyPermanentAvatarsToAccounts(accList);
  });

  const [classInfo, setClassInfo] = useState<ClassInfo>(() => {
    const loaded = loadFromStorage('classInfo', INITIAL_CLASS_INFO);
    // Nếu dữ liệu lớp cũ là 12C7/11A1 hoặc chứa thông tin mẫu của giáo viên trước, tự động dọn sạch để giáo viên mới có lớp trống
    if (loaded && (
      loaded.className === '12C7' ||
      loaded.className === '11A1' ||
      loaded.teacherEmail === 'vannamthptbs@gmail.com' ||
      loaded.homeroomTeacher === 'Nguyễn Văn Nam' ||
      (!loaded.teacherEmail && loaded.homeroomTeacher === 'Giáo viên Chủ nhiệm')
    )) {
      saveToStorage('classInfo', INITIAL_CLASS_INFO);
      return INITIAL_CLASS_INFO;
    }
    return loaded || INITIAL_CLASS_INFO;
  });
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    const loaded = loadFromStorage('googleSheetsConfig', INITIAL_GOOGLE_SHEETS_CONFIG);
    let needsSave = false;
    // Ngắt kết nối tuyệt đối khỏi Google Sheet mẫu cũ để không tải dữ liệu lớp của người khác
    if (loaded.spreadsheetId === '1szjTU26ybOsfMaanFjzXJMCs2JnqAnxWOLUAj_uISBA' || loaded.spreadsheetUrl?.includes('1szjTU26ybOsfMaanFjzXJMCs2JnqAnxWOLUAj_uISBA')) {
      loaded.spreadsheetId = '';
      loaded.spreadsheetUrl = '';
      loaded.autoSync = false;
      needsSave = true;
    }
    if (loaded.appScriptUrl && (
      loaded.appScriptUrl.includes('AKfycbxnoetIi5SJdok9kLXC520cfxDq6pNuCgJkOTcFAtfqJ272GaT2Z-bLY6-HS3StAdI') ||
      loaded.appScriptUrl.includes('AKfycbyb16L3fR_Qd38') ||
      loaded.appScriptUrl.includes('AKfycb')
    )) {
      loaded.appScriptUrl = '';
      loaded.autoSync = false;
      needsSave = true;
    }
    if (loaded.autoSync === undefined) {
      loaded.autoSync = false;
      needsSave = true;
    }
    if (needsSave) {
      saveToStorage('googleSheetsConfig', loaded);
    }
    return loaded;
  });

  // Trạng thái thông báo xác nhận lưu Google Sheets
  const [syncNotification, setSyncNotification] = useState<SyncNotificationState | null>(null);
  const lastActionRef = useRef<{ action: string; target?: string; actor?: string; time?: string } | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const loaded = loadFromStorage<AttendanceRecord[]>('attendance', INITIAL_ATTENDANCE);
    return Array.isArray(loaded) && !loaded.some(a => a.studentId?.startsWith('hs_')) ? loaded : [];
  });
  const [violations, setViolations] = useState<ViolationRecord[]>(() => {
    const loaded = loadFromStorage<ViolationRecord[]>('violations', INITIAL_VIOLATIONS);
    if (!Array.isArray(loaded)) return [];
    const sanitized = loaded.filter(v => !v.studentId?.startsWith('hs_') && isValidViolationRecord(v));
    if (sanitized.length !== loaded.length) {
      saveToStorage('violations', sanitized);
    }
    return sanitized;
  });
  const [rewards, setRewards] = useState<RewardRecord[]>(() => {
    // Không tự động tạo dữ liệu: khởi tạo trống và chỉ nạp khi Google Sheet có hoặc tài khoản thật thêm
    return [];
  });
  const [academicRecords, setAcademicRecords] = useState<AcademicRecord[]>(() => {
    const loaded = loadFromStorage<AcademicRecord[]>('academicRecords', INITIAL_ACADEMIC);
    return Array.isArray(loaded) && !loaded.some(ac => ac.studentId?.startsWith('hs_')) ? loaded : [];
  });
  const [cleaningDuties, setCleaningDuties] = useState<CleaningDuty[]>(() => {
    const loaded = loadFromStorage<CleaningDuty[]>('cleaningDuties', INITIAL_DUTIES);
    return Array.isArray(loaded) ? loaded : [];
  });
  const [laborActivities, setLaborActivities] = useState<LaborActivity[]>(() => {
    const loaded = loadFromStorage<LaborActivity[]>('laborActivities', INITIAL_LABOR);
    return Array.isArray(loaded) ? loaded : [];
  });
  const [extracurricularActivities, setExtracurricularActivities] = useState<ExtracurricularActivity[]>(() => {
    const loaded = loadFromStorage<ExtracurricularActivity[]>('extracurricularActivities', INITIAL_EXTRACURRICULAR);
    return Array.isArray(loaded) ? loaded : [];
  });
  const [evaluations, setEvaluations] = useState<StudentSelfEvaluation[]>(() => {
    const loaded = loadFromStorage<StudentSelfEvaluation[]>('evaluations', INITIAL_EVALUATIONS);
    return Array.isArray(loaded) && !loaded.some(e => e.studentId?.startsWith('hs_')) ? loaded : [];
  });
  const [groupSummaries, setGroupSummaries] = useState<WeeklyGroupSummary[]>(() => {
    const loaded = loadFromStorage<WeeklyGroupSummary[]>('groupSummaries', INITIAL_GROUP_SUMMARIES);
    return Array.isArray(loaded) ? loaded : [];
  });
  const [settings, setSettings] = useState<CompetitionSettings>(() => loadFromStorage('settings', INITIAL_SETTINGS));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const rawLogs = loadFromStorage<ActivityLog[]>('activityLogs', INITIAL_ACTIVITY_LOGS);
    if (!Array.isArray(rawLogs)) return [];
    return rawLogs.filter(l => !l.target?.includes('Trần Minh Hoàng') && !l.target?.includes('Vũ Tuấn Kiệt'));
  });
  const [gvcnBackupHistory, setGvcnBackupHistory] = useState<GVCNBackupSnapshot[]>(() => {
    const rawBackups = loadFromStorage<GVCNBackupSnapshot[]>('gvcnBackupHistory', []);
    if (!Array.isArray(rawBackups)) return [];
    const seenIds = new Set<string>();
    return rawBackups.map((snap, index) => {
      let uniqueId = snap.id;
      if (!uniqueId || seenIds.has(uniqueId)) {
        uniqueId = `backup_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`;
      }
      seenIds.add(uniqueId);
      return { ...snap, id: uniqueId };
    });
  });
  const [lastGVCNBackupAt, setLastGVCNBackupAt] = useState<string | null>(() => loadFromStorage('lastGVCNBackupAt', null));

  // Sơ đồ lớp học (Chỗ ngồi học sinh 4 cột x 8 hàng x 2 vị trí)
  const [seatingChart, setSeatingChart] = useState<SeatAssignment[]>(() => {
    const loaded = loadFromStorage<SeatAssignment[]>('seatingChart', []);
    return Array.isArray(loaded) ? loaded : [];
  });
  const seatingChartRef = useRef<SeatAssignment[]>(seatingChart);
  useEffect(() => {
    seatingChartRef.current = seatingChart;
  }, [seatingChart]);

  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedStudentIdForDetail, setSelectedStudentIdForDetail] = useState<string | null>(null);
  const [quickActionModalOpen, setQuickActionModalOpen] = useState<boolean>(false);
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState<boolean>(false);
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);
  const [changeAvatarModalOpen, setChangeAvatarModalOpenState] = useState<boolean>(false);
  const [targetAvatarAccount, setTargetAvatarAccount] = useState<AccountUser | null>(null);
  const [targetAvatarStudent, setTargetAvatarStudent] = useState<Student | null>(null);

  const setChangeAvatarModalOpen = (open: boolean, targetAccount?: AccountUser | null, targetStudent?: Student | null) => {
    if (open) {
      setTargetAvatarAccount(targetAccount || null);
      setTargetAvatarStudent(targetStudent || null);
    } else {
      setTargetAvatarAccount(null);
      setTargetAvatarStudent(null);
    }
    setChangeAvatarModalOpenState(open);
  };

  // Hydrate persistent avatars from IndexedDB on startup
  useEffect(() => {
    hydrateAvatarsFromIndexedDB().then((map) => {
      if (map && Object.keys(map).length > 0) {
        setStudents(prev => applyPermanentAvatarsToStudents(prev));
        setAccounts(prev => applyPermanentAvatarsToAccounts(prev));
        setCurrentUserRole(prev => {
          const permanent = getPermanentAvatar({
            studentId: prev.studentId,
            accountId: prev.accountId,
            fullName: prev.name,
          });
          if (permanent && permanent !== prev.avatar) {
            const updated = { ...prev, avatar: permanent };
            saveToStorage('currentUserRole', updated);
            return updated;
          }
          return prev;
        });
      }
    });
  }, []);
  const [loginTargetUsername, setLoginTargetUsername] = useState<string | null>(null);

  // Real-time Cloud Synchronization status
  const [isInitialLoadingData, setIsInitialLoadingData] = useState<boolean>(false);
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);

  const openLoginModal = (targetUsername?: string) => {
    if (targetUsername) {
      setLoginTargetUsername(targetUsername);
    } else {
      setLoginTargetUsername(null);
    }
    setLoginModalOpen(true);
  };

  // Sync to local storage
  useEffect(() => saveToStorage('currentUserRole', currentUserRole), [currentUserRole]);
  useEffect(() => saveToStorage('accounts', accounts), [accounts]);
  useEffect(() => saveToStorage('classInfo', classInfo), [classInfo]);
  useEffect(() => saveToStorage('googleSheetsConfig', googleSheetsConfig), [googleSheetsConfig]);
  useEffect(() => saveToStorage('students', students), [students]);
  useEffect(() => saveToStorage('attendance', attendance), [attendance]);
  useEffect(() => saveToStorage('violations', violations), [violations]);
  useEffect(() => saveToStorage('rewards', rewards), [rewards]);
  useEffect(() => saveToStorage('academicRecords', academicRecords), [academicRecords]);
  useEffect(() => saveToStorage('cleaningDuties', cleaningDuties), [cleaningDuties]);
  useEffect(() => saveToStorage('laborActivities', laborActivities), [laborActivities]);
  useEffect(() => saveToStorage('extracurricularActivities', extracurricularActivities), [extracurricularActivities]);
  useEffect(() => saveToStorage('evaluations', evaluations), [evaluations]);
  useEffect(() => saveToStorage('groupSummaries', groupSummaries), [groupSummaries]);
  useEffect(() => saveToStorage('settings', settings), [settings]);
  useEffect(() => saveToStorage('activityLogs', activityLogs), [activityLogs]);
  useEffect(() => saveToStorage('gvcnBackupHistory', gvcnBackupHistory), [gvcnBackupHistory]);
  useEffect(() => saveToStorage('lastGVCNBackupAt', lastGVCNBackupAt), [lastGVCNBackupAt]);

  // Synchronization safety locks and change tracking
  // Lock to prevent pushing back to Google Sheets when reading/pulling remote data
  const isRemotePullingRef = useRef<boolean>(false);
  // Ensures initial hydration and startup pull have settled before allowing auto-push
  const isAppReadyRef = useRef<boolean>(false);
  // Tracks whether local user changes are pending push
  const hasPendingLocalUserChangesRef = useRef<boolean>(false);
  // Prevent parallel sync executions
  const isSyncingRef = useRef<boolean>(false);
  // Queue follow-up sync if mutations happen during in-flight network sync
  const hasQueuedSyncRef = useRef<boolean>(false);
  const pendingAutoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hash để kiểm tra dữ liệu có thay đổi hay không (CHỈ cập nhật khi có thay đổi)
  const lastSyncedHashRef = useRef<string>('');

  // Synchronized refs to prevent stale closure issues in auto-sync, callbacks, and exports
  const studentsRef = useRef<Student[]>(students);
  studentsRef.current = students;
  const accountsRef = useRef<AccountUser[]>(accounts);
  accountsRef.current = accounts;
  const classInfoRef = useRef<ClassInfo>(classInfo);
  classInfoRef.current = classInfo;
  const attendanceRef = useRef<AttendanceRecord[]>(attendance);
  attendanceRef.current = attendance;
  const violationsRef = useRef<ViolationRecord[]>(violations);
  violationsRef.current = violations;
  const rewardsRef = useRef<RewardRecord[]>(rewards);
  rewardsRef.current = rewards;
  const academicRecordsRef = useRef<AcademicRecord[]>(academicRecords);
  academicRecordsRef.current = academicRecords;
  const cleaningDutiesRef = useRef<CleaningDuty[]>(cleaningDuties);
  cleaningDutiesRef.current = cleaningDuties;
  const laborActivitiesRef = useRef<LaborActivity[]>(laborActivities);
  laborActivitiesRef.current = laborActivities;
  const extracurricularActivitiesRef = useRef<ExtracurricularActivity[]>(extracurricularActivities);
  extracurricularActivitiesRef.current = extracurricularActivities;
  const evaluationsRef = useRef<StudentSelfEvaluation[]>(evaluations);
  evaluationsRef.current = evaluations;
  const groupSummariesRef = useRef<WeeklyGroupSummary[]>(groupSummaries);
  groupSummariesRef.current = groupSummaries;
  const settingsRef = useRef<CompetitionSettings>(settings);
  settingsRef.current = settings;

  // Hàm tính toán chữ ký dữ liệu hoàn chỉnh để phát hiện chính xác khi CÓ BẤT KỲ THAY ĐỔI NÀO
  const computeDataHash = useCallback((dataPayload?: Partial<FullAppDataPayload>): string => {
    try {
      const p = dataPayload || {
        classInfo: classInfoRef.current,
        students: studentsRef.current,
        attendance: attendanceRef.current,
        violations: violationsRef.current,
        rewards: rewardsRef.current,
        academicRecords: academicRecordsRef.current,
        cleaningDuties: cleaningDutiesRef.current,
        laborActivities: laborActivitiesRef.current,
        extracurricularActivities: extracurricularActivitiesRef.current,
        evaluations: evaluationsRef.current,
        groupSummaries: groupSummariesRef.current,
        settings: settingsRef.current,
        accounts: accountsRef.current,
      };

      const jsonStr = JSON.stringify([
        p.classInfo,
        p.students,
        p.attendance,
        p.violations,
        p.rewards,
        p.academicRecords,
        p.cleaningDuties,
        p.laborActivities,
        p.extracurricularActivities,
        p.evaluations,
        p.groupSummaries,
        p.settings,
        p.accounts,
      ]);

      let hash = 2166136261;
      for (let i = 0; i < jsonStr.length; i++) {
        hash ^= jsonStr.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36) + `_${jsonStr.length}`;
    } catch (_) {
      return Date.now().toString();
    }
  }, []);

  // Helper to schedule an auto sync (debounced & queued) - Tự động lưu và hiện xác nhận
  const scheduleAutoSync = useCallback((delayMs = 800, actionContext?: { action: string; target?: string }) => {
    if (isRemotePullingRef.current) return;
    hasPendingLocalUserChangesRef.current = true;

    // Bỏ thông báo đang lưu lên Google Sheets gây gián đoạn theo yêu cầu người dùng
    // Việc lưu tự động diễn ra êm ái, yên lặng dưới nền

    // If currently syncing over network, mark queue so it triggers immediately after
    if (isSyncingRef.current) {
      hasQueuedSyncRef.current = true;
      return;
    }

    const url = googleSheetsConfig.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
    if (!url || googleSheetsConfig.autoSync === false) return;

    // QUAN TRỌNG: Chỉ đồng bộ khi có thao tác THỰC SỰ từ tài khoản người dùng trên ứng dụng
    if (!hasPendingLocalUserChangesRef.current) {
      return;
    }

    if (pendingAutoSyncTimerRef.current) {
      clearTimeout(pendingAutoSyncTimerRef.current);
    }
    pendingAutoSyncTimerRef.current = setTimeout(() => {
      pendingAutoSyncTimerRef.current = null;
      if (!isRemotePullingRef.current && hasPendingLocalUserChangesRef.current) {
        // Kiểm tra xem dữ liệu có thực sự khác so với lần đã lưu gần nhất không
        const currentHash = computeDataHash();
        if (lastSyncedHashRef.current && currentHash === lastSyncedHashRef.current) {
          hasPendingLocalUserChangesRef.current = false;
          return;
        }
        hasPendingLocalUserChangesRef.current = false;
        syncAllToGoogleSheets();
      }
    }, delayMs);
  }, [googleSheetsConfig.appScriptUrl, googleSheetsConfig.autoSync, googleSheetsConfig.spreadsheetUrl, computeDataHash, currentUserRole]);

  // Helper to mark that user or student initiated an explicit change
  const notifyLocalMutation = useCallback((action?: string, target?: string) => {
    if (isAppReadyRef.current && !isRemotePullingRef.current) {
      hasPendingLocalUserChangesRef.current = true;
      if (action) {
        lastActionRef.current = {
          action,
          target,
          actor: `${currentUserRole.title} (${currentUserRole.name})`,
          time: new Date().toLocaleTimeString('vi-VN'),
        };
      }
      scheduleAutoSync(1000, action ? { action, target } : undefined);
    }
  }, [scheduleAutoSync, currentUserRole]);

  // Synchronize accounts with current students:
  // Purge any accounts belonging to students not in the current student list
  // Ensure every student in students has an active account matching their real information
  // Apply standard username structure (role+name for cadres, initials+name for members) and default PIN 123
  useEffect(() => {
    setAccounts(prevAccounts => {
      // 1. Keep GVCN account
      const gvcnAccount = prevAccounts.find(acc => acc.category === 'gvcn' || acc.role === 'gvcn' || acc.id === 'acc_gvcn');

      // 2. Map existing student accounts by studentId, studentCode, and fullName
      const studentAccountsMap = new Map<string, AccountUser>();
      prevAccounts.forEach(acc => {
        if (acc.category === 'gvcn' || acc.role === 'gvcn' || acc.id === 'acc_gvcn') return;
        if (acc.studentId) studentAccountsMap.set(acc.studentId, acc);
        if (acc.studentCode) studentAccountsMap.set(acc.studentCode.toLowerCase().trim(), acc);
        if (acc.fullName) studentAccountsMap.set(acc.fullName.toLowerCase().trim(), acc);
      });

      const usedUsernames = new Set<string>();
      if (gvcnAccount) {
        usedUsernames.add(gvcnAccount.username.toLowerCase());
      }

      // 3. Reconcile each student
      const reconciledStudentsAccounts: AccountUser[] = [];
      students.forEach(s => {
        const existing = studentAccountsMap.get(s.id) ||
          (s.studentCode ? studentAccountsMap.get(s.studentCode.toLowerCase().trim()) : undefined) ||
          studentAccountsMap.get(s.fullName.toLowerCase().trim());

        const accInfo = mapRoleInClassToAccountInfo(s.roleInClass, s.groupId);
        const baseUsername = s.customUsername || generateStudentUsername(s.fullName, s.studentCode);

        let finalUsername = baseUsername;
        let suffix = 2;
        while (usedUsernames.has(finalUsername)) {
          finalUsername = `${baseUsername}${suffix}`;
          suffix++;
        }
        usedUsernames.add(finalUsername);

        let persistentPin: string | undefined;
        try {
          const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
          persistentPin = permanentPins[s.id] ||
            (s.studentCode ? permanentPins[s.studentCode.toLowerCase()] : undefined) ||
            (existing?.username ? permanentPins[existing.username.toLowerCase()] : undefined);
        } catch (_) {}

        let persistentAvatar: string | undefined;
        try {
          const permanentAvatars = JSON.parse(localStorage.getItem('teacher_app_permanent_avatars') || '{}');
          persistentAvatar = permanentAvatars[s.id] ||
            (s.studentCode ? permanentAvatars[s.studentCode.toLowerCase()] : undefined) ||
            (existing?.username ? permanentAvatars[existing.username.toLowerCase()] : undefined) ||
            (s.fullName ? permanentAvatars[s.fullName.toLowerCase().trim()] : undefined);
        } catch (_) {}

        const finalAvatar = persistentAvatar || existing?.avatar || s.avatar || (s.gender === 'Nữ'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80');

        if (finalAvatar && s.avatar !== finalAvatar) {
          s.avatar = finalAvatar;
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
            existing.username.startsWith('thuquy_') ||
            existing.title !== accInfo.title; // If role changed, re-sync username to match new role!

          const resolvedPin = persistentPin || existing.pin || s.customPin || DEFAULT_STUDENT_PIN;
          const isCustom = existing.isCustomPin || (resolvedPin !== DEFAULT_STUDENT_PIN);

          reconciledStudentsAccounts.push({
            ...existing,
            username: isLegacyUsername ? finalUsername : existing.username,
            pin: resolvedPin,
            isCustomPin: isCustom,
            fullName: s.fullName,
            role: accInfo.role,
            title: accInfo.title,
            category: accInfo.category,
            studentId: s.id,
            studentCode: s.studentCode,
            groupId: s.groupId,
            avatar: finalAvatar,
            permissions: accInfo.permissions,
            status: existing.status || 'active',
          });
        } else {
          const resolvedPin = persistentPin || s.customPin || DEFAULT_STUDENT_PIN;
          reconciledStudentsAccounts.push({
            id: `acc_${s.id}`,
            username: s.customUsername || finalUsername,
            pin: resolvedPin,
            isCustomPin: resolvedPin !== DEFAULT_STUDENT_PIN,
            fullName: s.fullName,
            role: accInfo.role,
            title: accInfo.title,
            category: accInfo.category,
            studentId: s.id,
            studentCode: s.studentCode,
            groupId: s.groupId,
            email: s.email || '',
            phone: s.phone || '',
            avatar: finalAvatar,
            permissions: accInfo.permissions,
            status: 'active',
            notes: 'Tài khoản tự động đồng bộ theo danh sách lớp',
          });
        }
      });

      const updated = sortAccountsByHierarchy(
        gvcnAccount ? [gvcnAccount, ...reconciledStudentsAccounts] : reconciledStudentsAccounts
      );

      // Check if anything actually changed to avoid superfluous re-renders
      const isDifferent = updated.length !== prevAccounts.length ||
        updated.some((acc, i) => {
          const prev = prevAccounts[i];
          return !prev || prev.id !== acc.id || prev.username !== acc.username || prev.pin !== acc.pin || prev.role !== acc.role || prev.avatar !== acc.avatar;
        });

      if (isDifferent) {
        saveToStorage('accounts', updated);
        return updated;
      }
      return prevAccounts;
    });
  }, [students]);

  // Dynamically compute available roles strictly matching real teacher and real students
  const availableRoles = useMemo<UserRole[]>(() => {
    const roles: UserRole[] = [];

    // 1. GVCN
    const gvcnAccount = accounts.find(a => a.category === 'gvcn' || a.role === 'gvcn' || a.id === 'acc_gvcn');
    roles.push({
      role: 'gvcn',
      title: 'Giáo viên Chủ nhiệm',
      name: classInfo.homeroomTeacher || gvcnAccount?.fullName || 'Giáo viên Chủ nhiệm',
      accountId: gvcnAccount?.id || 'acc_gvcn',
      avatar: gvcnAccount?.avatar || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    });

    // 2. Guest
    roles.push(GUEST_ROLE);

    // 3. Cadres from current real students sorted strictly by standard hierarchy
    const sortedCadres = sortCadres(students);
    const addedStudentIds = new Set<string>();

    for (const cadre of sortedCadres) {
      addedStudentIds.add(cadre.id);
      const accInfo = mapRoleInClassToAccountInfo(cadre.roleInClass, cadre.groupId);
      const acc = accounts.find(a => a.studentId === cadre.id || a.studentCode === cadre.studentCode);
      roles.push({
        role: accInfo.role,
        title: accInfo.title,
        name: cadre.fullName,
        studentId: cadre.id,
        accountId: acc?.id || `acc_${cadre.id}`,
        groupId: cadre.groupId,
        avatar: cadre.avatar || (cadre.gender === 'Nữ'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
      });
    }

    // 4. If fewer than 6 roles, add standard student representatives with role 'hoc_sinh'
    if (roles.length < 6 && students.length > 0) {
      students.forEach(s => {
        if (!addedStudentIds.has(s.id) && roles.length < 8) {
          addedStudentIds.add(s.id);
          const acc = accounts.find(a => a.studentId === s.id || a.studentCode === s.studentCode);
          roles.push({
            role: 'hoc_sinh',
            title: s.roleInClass && s.roleInClass !== 'Thành viên' ? s.roleInClass : `Học sinh (Tổ ${s.groupId})`,
            name: s.fullName,
            studentId: s.id,
            accountId: acc?.id || `acc_${s.id}`,
            groupId: s.groupId,
            avatar: s.avatar || (s.gender === 'Nữ'
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
          });
        }
      });
    }

    return roles;
  }, [students, accounts, classInfo.homeroomTeacher]);

  // Keep currentUserRole in sync with real teacher name or real student name
  useEffect(() => {
    if (currentUserRole.role === 'gvcn') {
      if (classInfo.homeroomTeacher && currentUserRole.name !== classInfo.homeroomTeacher) {
        setCurrentUserRole(prev => ({ ...prev, name: classInfo.homeroomTeacher }));
      }
    } else if (currentUserRole.studentId) {
      const currentStudent = students.find(s => s.id === currentUserRole.studentId);
      if (!currentStudent) {
        setCurrentUserRole(GUEST_ROLE);
      } else if (currentStudent.fullName !== currentUserRole.name) {
        setCurrentUserRole(prev => ({
          ...prev,
          name: currentStudent.fullName,
          title: currentStudent.roleInClass || prev.title,
          groupId: currentStudent.groupId,
        }));
      }
    }
  }, [students, classInfo.homeroomTeacher, availableRoles]);

  // Log an activity
  const logActivity = (action: string, target: string, undoable: boolean = true) => {
    if (undoable) {
      notifyLocalMutation(action, target);
    }
    const newLog: ActivityLog = {
      id: createUniqueId('log'),
      actorName: currentUserRole.name,
      actorRole: currentUserRole.title,
      action,
      target,
      timestamp: new Date().toISOString(),
      undoable,
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  // Student Score Calculations (Mặc định tính cho TUẦN HIỆN TẠI, sang tuần mới tính lại điểm mới)
  const studentScores = useMemo(() => {
    const scoresMap: Record<string, StudentScoreStats> = {};

    students.forEach(student => {
      // Violations trong tuần hiện tại
      const studentViolations = violations.filter(
        v => v.studentId === student.id && isDateInRange(v.date, 'this_week')
      );
      const totalViolations = studentViolations.length;
      const penaltyPoints = studentViolations.reduce((sum, v) => sum + Math.abs(v.penaltyPoints), 0);

      // Rewards trong tuần hiện tại
      const studentRewards = rewards.filter(
        r => r.studentId === student.id && isDateInRange(r.date, 'this_week')
      );
      const totalRewards = studentRewards.length;
      const bonusPoints = studentRewards.reduce((sum, r) => sum + r.bonusPoints, 0);

      // Attendance trong tuần hiện tại (Vi phạm cá nhân: vắng có phép -1đ, không phép -2đ, trễ -1đ)
      const studentAttendance = attendance.filter(
        a => a.studentId === student.id && isDateInRange(a.date, 'this_week')
      );
      const unexcusedAbsences = studentAttendance.filter(
        a => a.status === 'absent_unexcused' || a.status === 'skipped_lesson'
      ).length;
      const excusedAbsences = studentAttendance.filter(a => a.status === 'absent_excused').length;
      const lateCount = studentAttendance.filter(a => a.status === 'late').length;
      const attendancePenalty = unexcusedAbsences * 2 + excusedAbsences * 1 + lateCount * 1;

      // Duty: Quy định TRỰC NHẬT CỘNG ĐIỂM CHO TỔ, KHÔNG CỘNG CHO CÁ NHÂN
      // Điểm trực nhật của cá nhân bằng 0 để không ảnh hưởng thi đua cá nhân
      const dutyPoints = 0;

      // Extracurricular trong tuần
      let extraCurricularPoints = 0;
      extracurricularActivities.forEach(act => {
        if (!isDateInRange(act.date, 'this_week')) return;
        const part = act.participations.find(p => p.studentId === student.id);
        if (part) {
          extraCurricularPoints += part.pointsBonus || 0;
        }
      });

      // Labor Activities trong tuần - CHỈ TÍNH KHI ĐÃ HOÀN THÀNH & ĐƯỢC NGHIỆM THU
      let laborPoints = 0;
      laborActivities.forEach(act => {
        if (!isDateInRange(act.date, 'this_week')) return;
        const isConfirmed = act.isConfirmed || (act.status && act.status !== 'Chờ thực hiện');
        if (!isConfirmed) return;

        const part = act.participations?.find(p => p.studentId === student.id);
        if (part) {
          if (part.pointsDelta !== undefined) {
            laborPoints += part.pointsDelta;
          } else if (part.status === 'Hoàn thành tốt') {
            laborPoints += 2;
          } else if (part.status === 'Có mặt') {
            laborPoints += 1;
          } else if (part.status === 'Vắng có phép') {
            laborPoints += 0;
          } else if (part.status === 'Vắng không phép') {
            laborPoints -= 2;
          } else if (part.status === 'Chưa hoàn thành') {
            laborPoints -= 2;
          }
        }
      });

      // Academic Good Marks vs Missed trong tuần
      const studentAcademics = academicRecords.filter(
        ac => ac.studentId === student.id && isDateInRange(ac.date, 'this_week')
      );
      let academicBonus = 0;
      studentAcademics.forEach(ac => {
        if (ac.type === 'Điểm tốt (9-10)') academicBonus += 1;
        if (ac.type === 'Chưa làm bài' || ac.type === 'Chưa chuẩn bị bài') academicBonus -= 1;
      });

      const totalScore = Math.max(
        0,
        settings.baseScore + bonusPoints + extraCurricularPoints + laborPoints + academicBonus - penaltyPoints - attendancePenalty
      );

      // Attention Reasons
      const attentionReasons: string[] = [];
      if (unexcusedAbsences + excusedAbsences >= settings.warningThresholds.maxAbsences) {
        attentionReasons.push(`Nghỉ học ${unexcusedAbsences + excusedAbsences} buổi`);
      }
      if (lateCount >= settings.warningThresholds.maxLate) {
        attentionReasons.push(`Đi muộn ${lateCount} lần`);
      }
      if (totalViolations >= settings.warningThresholds.maxViolations) {
        attentionReasons.push(`Có ${totalViolations} vi phạm nề nếp`);
      }
      if (totalScore < settings.warningThresholds.minScoreWarning) {
        attentionReasons.push(`Điểm thi đua thấp (${totalScore.toFixed(1)}đ)`);
      }
      const hasRepeated = studentViolations.some(v => v.isRepeated);
      if (hasRepeated) {
        attentionReasons.push('Có vi phạm lặp lại');
      }

      scoresMap[student.id] = {
        student,
        baseScore: settings.baseScore,
        bonusPoints: bonusPoints + extraCurricularPoints + academicBonus,
        penaltyPoints,
        dutyPoints,
        laborPoints,
        attendancePenalty,
        extraCurricularPoints,
        totalScore,
        rankInClass: 0,
        rankInGroup: 0,
        totalAbsences: unexcusedAbsences + excusedAbsences,
        totalLate: lateCount,
        totalViolations,
        totalRewards,
        trend: totalViolations > 1 || attendancePenalty > 2 ? 'down' : totalRewards > 0 ? 'up' : 'steady',
        needsAttention: attentionReasons.length > 0,
        attentionReasons,
      };
    });

    return scoresMap;
  }, [students, violations, rewards, attendance, cleaningDuties, extracurricularActivities, laborActivities, academicRecords, settings]);

  // Ranked students in class & groups with tie handling (equal score -> equal rank)
  const rankedStudents = useMemo(() => {
    const list = (Object.values(studentScores) as StudentScoreStats[]).sort((a, b) => b.totalScore - a.totalScore);
    
    // Assign class ranks: equal score => equal rank
    let currentClassRank = 1;
    list.forEach((item, index) => {
      if (index > 0 && Math.abs(item.totalScore - list[index - 1].totalScore) >= 0.05) {
        currentClassRank = index + 1;
      }
      item.rankInClass = currentClassRank;
    });

    // Assign group ranks: equal score => equal rank
    [1, 2, 3, 4].forEach(groupId => {
      const groupStudents = list.filter(item => item.student.groupId === groupId);
      groupStudents.sort((a, b) => b.totalScore - a.totalScore);
      let currentGroupRank = 1;
      groupStudents.forEach((item, index) => {
        if (index > 0 && Math.abs(item.totalScore - groupStudents[index - 1].totalScore) >= 0.05) {
          currentGroupRank = index + 1;
        }
        item.rankInGroup = currentGroupRank;
      });
    });

    return list;
  }, [studentScores]);

  // Group Score Calculations (Mặc định tính cho TUẦN HIỆN TẠI, sang tuần mới tính lại điểm mới)
  const groupScores = useMemo(() => {
    const groupsMap: Record<number, GroupScoreStats> = {};

    [1, 2, 3, 4].forEach(groupId => {
      const groupStudents = students.filter(s => s.groupId === groupId);
      const count = groupStudents.length || 1;
      const studentIds = groupStudents.map(s => s.id);

      // Student average
      const studentScoresInGroup = groupStudents.map(s => studentScores[s.id]?.totalScore || 100);
      const avgStudentScore = studentScoresInGroup.reduce((a, b) => a + b, 0) / count;

      // Group Violations & Rewards trong tuần
      const groupViolations = violations.filter(
        v => studentIds.includes(v.studentId) && isDateInRange(v.date, 'this_week')
      );
      const groupRewards = rewards.filter(
        r => studentIds.includes(r.studentId) && isDateInRange(r.date, 'this_week')
      );

      // 1. Chuyên cần (Gốc 20đ)
      // Quy định: Vắng trừ điểm tổ: có phép 1 điểm, không phép 2 điểm, đi muộn 1 điểm
      const groupAttendance = attendance.filter(
        a => studentIds.includes(a.studentId) && isDateInRange(a.date, 'this_week')
      );
      const excusedCount = groupAttendance.filter(a => a.status === 'absent_excused').length;
      const unexcusedCount = groupAttendance.filter(
        a => a.status === 'absent_unexcused' || a.status === 'skipped_lesson'
      ).length;
      const lateCount = groupAttendance.filter(a => a.status === 'late').length;
      const attendanceScore = Math.max(0, 20 - excusedCount * 1 - unexcusedCount * 2 - lateCount * 1);

      // 2. Học tập (Gốc 25đ) trong tuần
      const groupAcademic = academicRecords.filter(
        a => studentIds.includes(a.studentId) && isDateInRange(a.date, 'this_week')
      );
      const goodMarks = groupAcademic.filter(a => a.type === 'Điểm tốt (9-10)').length;
      const badMarks = groupAcademic.filter(a => a.type === 'Chưa làm bài' || a.type === 'Chưa chuẩn bị bài').length;
      const academicScore = Math.min(25, Math.max(0, 25 + goodMarks * 1 - badMarks * 1.5));

      // 3. Nề nếp (Gốc 20đ) trong tuần
      const disciplineViolations = groupViolations.filter(v => v.category === 'Nề nếp').length;
      const disciplineScore = Math.max(0, 20 - disciplineViolations * 2);

      // 4. Vệ sinh - Trực nhật (Gốc 15đ) trong tuần
      // Quy định: Trực nhật CỘNG/TRỪ ĐIỂM CHO TỔ (Tốt +2đ, Chưa đạt -2đ, Không thực hiện -5đ)
      const evaluatedGroupDuties = cleaningDuties.filter(
        d => d.groupId === groupId && d.status !== 'Chờ trực' && isDateInRange(d.date, 'this_week')
      );
      let groupDutyDelta = 0;
      evaluatedGroupDuties.forEach(d => {
        if (d.status === 'Hoàn thành tốt') groupDutyDelta += 2;
        if (d.status === 'Chưa hoàn thành') groupDutyDelta -= 2;
        if (d.status === 'Không thực hiện') groupDutyDelta -= 5;
      });
      const hygieneScore = Math.max(0, Math.min(25, 15 + groupDutyDelta));
      const successfulDuties = evaluatedGroupDuties.filter(
        d => d.status === 'Hoàn thành tốt' || d.status === 'Hoàn thành'
      ).length;
      const cleanRate = evaluatedGroupDuties.length > 0 ? (successfulDuties / evaluatedGroupDuties.length) * 100 : 100;

      // 5. Hoạt động tập thể / Phong trào (Gốc 10đ) trong tuần
      const groupExtracurricular = groupRewards.filter(
        r => r.category === 'Văn nghệ - Thể thao' || r.category === 'Nhiệm vụ xuất sắc'
      ).length;
      const activityScore = Math.min(10, Math.max(0, 10 + groupExtracurricular * 1));

      // 6. Tinh thần đoàn kết (Gốc 10đ) trong tuần
      const peerHelp = groupRewards.filter(r => r.category === 'Giúp đỡ bạn').length;
      const solidarityScore = Math.min(10, Math.max(0, 10 + peerHelp * 0.5));

      // Total weighted base 100: 20 + 25 + 20 + 15 + 10 + 10 = 100 điểm ban đầu
      const totalScore = Number(
        (attendanceScore + academicScore + disciplineScore + hygieneScore + activityScore + solidarityScore).toFixed(1)
      );

      const groupLeader = groupStudents.find(s => s.roleInClass.includes('Tổ trưởng'))?.fullName || `Tổ trưởng Tổ ${groupId}`;

      groupsMap[groupId] = {
        groupId,
        groupName: `Tổ ${groupId}`,
        leaderName: groupLeader,
        memberCount: count,
        attendanceScore,
        academicScore,
        disciplineScore,
        hygieneScore,
        activityScore,
        solidarityScore,
        totalScore,
        rank: 0,
        totalViolations: groupViolations.length,
        totalRewards: groupRewards.length,
        cleanRate,
        avgStudentScore,
      };
    });

    return groupsMap;
  }, [students, studentScores, violations, rewards, attendance, academicRecords, cleaningDuties, laborActivities]);

  // Ranked groups with tie handling (equal score -> equal rank)
  const rankedGroups = useMemo(() => {
    const list = (Object.values(groupScores) as GroupScoreStats[]).sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 1;
    list.forEach((item, index) => {
      if (index > 0 && Math.abs(item.totalScore - list[index - 1].totalScore) >= 0.05) {
        currentRank = index + 1;
      }
      item.rank = currentRank;
    });
    return list;
  }, [groupScores]);

  // Students needing attention
  const studentsNeedingAttention = useMemo(() => {
    return rankedStudents.filter(item => item.needsAttention);
  }, [rankedStudents]);

  // ACTION HANDLERS
  const addAttendance = (record: Omit<AttendanceRecord, 'id' | 'recordedAt'>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền điểm danh!'));
      return;
    }
    const newRecord: AttendanceRecord = {
      ...record,
      id: createUniqueId('att'),
      recordedAt: new Date().toISOString(),
    };
    setAttendance(prev => [newRecord, ...prev]);
    const targetStudent = students.find(s => s.id === record.studentId)?.fullName || 'Học sinh';
    const statusText = record.status === 'present' ? 'Có mặt' : record.status === 'late' ? 'Đi muộn' : 'Vắng học';
    logActivity('Điểm danh', `${targetStudent} - ${statusText} (${record.session})`);
  };

  const bulkMarkAttendance = (records: Omit<AttendanceRecord, 'id' | 'recordedAt'>[]) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền điểm danh hàng loạt!'));
      return;
    }
    const timestamp = new Date().toISOString();
    const newRecords: AttendanceRecord[] = records.map((r, idx) => ({
      ...r,
      id: `${createUniqueId('att')}_${idx}`,
      recordedAt: timestamp,
    }));
    setAttendance(prev => [...newRecords, ...prev]);
    logActivity('Điểm danh hàng loạt', `Cập nhật điểm danh cho ${records.length} học sinh`);
  };

  const deleteAttendance = (id: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền xóa bản ghi điểm danh!'));
      return;
    }
    const att = attendance.find(a => a.id === id);
    setAttendance(prev => prev.filter(a => a.id !== id));
    logActivity('Xóa bản ghi điểm danh', `Xóa điểm danh ngày ${att?.date || ''} (${att?.session || ''})`);
  };

  const batchDeleteAttendance = (ids: string[]): { success: boolean; message: string; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền xóa điểm danh!'));
      return { success: false, message: 'Bạn không có quyền xóa điểm danh!', count: 0 };
    }
    if (!ids || ids.length === 0) return { success: false, message: 'Chưa chọn bản ghi nào để xóa!', count: 0 };
    const idSet = new Set(ids);
    const count = attendance.filter(a => idSet.has(a.id)).length;
    setAttendance(prev => prev.filter(a => !idSet.has(a.id)));
    logActivity('Xóa điểm danh hàng loạt', `Đã xóa ${count} bản ghi điểm danh`);
    return { success: true, message: `Đã xóa thành công ${count} bản ghi điểm danh!`, count };
  };

  const addViolation = (record: Omit<ViolationRecord, 'id' | 'createdAt'>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp (Cờ đỏ, Tổ trưởng) mới có quyền ghi nhận vi phạm!'));
      return;
    }
    const newViolation: ViolationRecord = {
      ...record,
      id: createUniqueId('vio'),
      createdAt: new Date().toISOString(),
    };
    setViolations(prev => [newViolation, ...prev]);
    const student = students.find(s => s.id === record.studentId);
    logActivity('Ghi nhận vi phạm', `${student?.fullName || 'HS'} - ${record.title} (${record.penaltyPoints}đ)`);
  };

  const batchAddViolations = (records: Omit<ViolationRecord, 'id' | 'createdAt'>[]): { success: boolean; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền ghi nhận vi phạm!'));
      return { success: false, count: 0 };
    }
    if (!records || records.length === 0) return { success: false, count: 0 };

    const newViolations: ViolationRecord[] = records.map((rec, index) => ({
      ...rec,
      id: createUniqueId(`vio_${index}`),
      createdAt: new Date(Date.now() + index * 10).toISOString(),
    }));

    setViolations(prev => [...newViolations, ...prev]);
    logActivity('Ghi nhận vi phạm đồng loạt', `Đã ghi nhận vi phạm cho ${newViolations.length} học sinh: ${records[0]?.title || ''}`);
    return { success: true, count: newViolations.length };
  };

  const updateViolation = (record: ViolationRecord) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền điều chỉnh vi phạm!'));
      return;
    }
    setViolations(prev => prev.map(v => (v.id === record.id ? record : v)));
    const student = students.find(s => s.id === record.studentId);
    logActivity('Điều chỉnh vi phạm', `${student?.fullName || 'HS'} - ${record.title} (${record.penaltyPoints}đ)`);
  };

  const updateViolationStatus = (id: string, status: ViolationProcessStatus, remedyAction?: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền cập nhật trạng thái vi phạm!'));
      return;
    }
    setViolations(prev =>
      prev.map(v => (v.id === id ? { ...v, status, ...(remedyAction ? { remedyAction } : {}) } : v))
    );
    const vio = violations.find(v => v.id === id);
    const student = students.find(s => s.id === vio?.studentId);
    logActivity('Cập nhật xử lý vi phạm', `${student?.fullName || 'HS'}: Chuyển trạng thái sang "${status}"`);
  };

  const deleteViolation = (id: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền xóa vi phạm!'));
      return;
    }
    const vio = violations.find(v => v.id === id);
    setViolations(prev => prev.filter(v => v.id !== id));
    logActivity('Xóa vi phạm', `Hủy ghi nhận vi phạm: ${vio?.title || id}`);
  };

  const batchDeleteViolations = (ids: string[]): { success: boolean; message: string; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền xóa vi phạm!'));
      return { success: false, message: 'Bạn không có quyền xóa vi phạm!', count: 0 };
    }
    if (!ids || ids.length === 0) return { success: false, message: 'Chưa chọn bản ghi vi phạm nào!', count: 0 };
    const idSet = new Set(ids);
    const count = violations.filter(v => idSet.has(v.id)).length;
    setViolations(prev => prev.filter(v => !idSet.has(v.id)));
    logActivity('Xóa vi phạm hàng loạt', `Đã xóa ${count} bản ghi vi phạm`);
    return { success: true, message: `Đã xóa thành công ${count} bản ghi vi phạm!`, count };
  };

  const addReward = (record: Omit<RewardRecord, 'id' | 'createdAt'>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền ghi nhận khen thưởng - việc tốt!'));
      return;
    }
    const newReward: RewardRecord = {
      ...record,
      id: createUniqueId('rew'),
      createdAt: new Date().toISOString(),
    };
    setRewards(prev => [newReward, ...prev]);
    const student = students.find(s => s.id === record.studentId);
    logActivity('Khen thưởng - Việc tốt', `${student?.fullName || 'HS'} - ${record.title} (+${record.bonusPoints}đ)`);
  };

  const batchAddRewards = (records: Omit<RewardRecord, 'id' | 'createdAt'>[]): { success: boolean; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền ghi nhận khen thưởng - việc tốt!'));
      return { success: false, count: 0 };
    }
    if (!records || records.length === 0) return { success: false, count: 0 };

    const newRewards: RewardRecord[] = records.map((rec, index) => ({
      ...rec,
      id: createUniqueId(`rew_${index}`),
      createdAt: new Date(Date.now() + index * 10).toISOString(),
    }));

    setRewards(prev => [...newRewards, ...prev]);
    logActivity('Khen thưởng đồng loạt', `Đã ghi nhận khen thưởng cho ${newRewards.length} học sinh: ${records[0]?.title || ''}`);
    return { success: true, count: newRewards.length };
  };

  const updateReward = (record: RewardRecord) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền điều chỉnh khen thưởng!'));
      return;
    }
    setRewards(prev => prev.map(r => (r.id === record.id ? record : r)));
    const student = students.find(s => s.id === record.studentId);
    logActivity('Điều chỉnh khen thưởng', `${student?.fullName || 'HS'} - ${record.title} (+${record.bonusPoints}đ)`);
  };

  const deleteReward = (id: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền xóa khen thưởng!'));
      return;
    }
    const rew = rewards.find(r => r.id === id);
    setRewards(prev => prev.filter(r => r.id !== id));
    logActivity('Xóa khen thưởng', `Hủy khen thưởng: ${rew?.title || id}`);
  };

  const batchDeleteRewards = (ids: string[]): { success: boolean; message: string; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Giáo viên Chủ nhiệm (GVCN) hoặc Ban Cán Sự lớp mới có quyền xóa khen thưởng!'));
      return { success: false, message: 'Bạn không có quyền xóa khen thưởng!', count: 0 };
    }
    if (!ids || ids.length === 0) return { success: false, message: 'Chưa chọn bản ghi khen thưởng nào!', count: 0 };
    const idSet = new Set(ids);
    const count = rewards.filter(r => idSet.has(r.id)).length;
    setRewards(prev => prev.filter(r => !idSet.has(r.id)));
    logActivity('Xóa khen thưởng hàng loạt', `Đã xóa ${count} bản ghi khen thưởng`);
    return { success: true, message: `Đã xóa thành công ${count} bản ghi khen thưởng!`, count };
  };

  const addAcademicRecord = (record: Omit<AcademicRecord, 'id' | 'createdAt'>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp phó học tập hoặc Tổ trưởng mới có quyền ghi nhận học tập!'));
      return;
    }
    const newRecord: AcademicRecord = {
      ...record,
      id: createUniqueId('acad'),
      createdAt: new Date().toISOString(),
    };
    setAcademicRecords(prev => [newRecord, ...prev]);
    const student = students.find(s => s.id === record.studentId);
    logActivity('Ghi nhận học tập', `${student?.fullName || 'HS'} - Môn ${record.subject}: ${record.type}`);
  };

  const batchAddAcademicRecords = (records: Omit<AcademicRecord, 'id' | 'createdAt'>[]): { success: boolean; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp phó học tập hoặc Tổ trưởng mới có quyền ghi nhận học tập!'));
      return { success: false, count: 0 };
    }
    if (!records || records.length === 0) return { success: false, count: 0 };

    const newRecords: AcademicRecord[] = records.map((rec, index) => ({
      ...rec,
      id: createUniqueId(`acad_${index}`),
      createdAt: new Date(Date.now() + index * 10).toISOString(),
    }));

    setAcademicRecords(prev => [...newRecords, ...prev]);
    logActivity('Ghi nhận học tập đồng loạt', `Ghi nhận cho ${newRecords.length} học sinh môn ${records[0]?.subject || ''} (${records[0]?.type || ''})`);
    return { success: true, count: newRecords.length };
  };

  const deleteAcademicRecord = (id: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp phó học tập hoặc Tổ trưởng mới có quyền xóa ghi nhận học tập!'));
      return;
    }
    const rec = academicRecords.find(r => r.id === id);
    setAcademicRecords(prev => prev.filter(r => r.id !== id));
    logActivity('Xóa ghi nhận học tập', `Xóa ghi nhận môn ${rec?.subject || ''} của HS`);
  };

  const updateDutyStatus = (dutyId: string, status: DutyStatus, note?: string) => {
    if (!canManageDuty(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp trưởng hoặc Lớp phó Lao động mới có quyền đánh giá mức độ hoàn thành trực nhật!'));
      return;
    }
    const pointsDelta = status === 'Hoàn thành tốt' ? 2 : status === 'Chưa hoàn thành' ? -2 : status === 'Không thực hiện' ? -5 : 0;
    setCleaningDuties(prev =>
      prev.map(d =>
        d.id === dutyId
          ? {
              ...d,
              status,
              pointsDelta,
              confirmedAt: status !== 'Chờ trực' ? new Date().toISOString() : undefined,
              inspectorName: currentUserRole.name,
              inspectorRole: currentUserRole.title,
              ...(note !== undefined ? { evaluationNote: note } : {}),
            }
          : d
      )
    );
    const duty = cleaningDuties.find(d => d.id === dutyId);
    logActivity('Xác nhận trực nhật', `Tổ ${duty?.groupId || '?'}: ${status} (${pointsDelta > 0 ? '+' : ''}${pointsDelta}đ)`);
  };

  const updateDuty = (duty: CleaningDuty) => {
    if (!canManageDuty(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp trưởng hoặc Lớp phó Lao động mới có quyền chỉnh sửa thông tin trực nhật!'));
      return;
    }
    const pointsDelta =
      duty.status === 'Hoàn thành tốt'
        ? 2
        : duty.status === 'Chưa hoàn thành'
        ? -2
        : duty.status === 'Không thực hiện'
        ? -5
        : 0;

    setCleaningDuties(prev =>
      prev.map(d =>
        d.id === duty.id
          ? {
              ...duty,
              pointsDelta,
              confirmedAt: duty.status !== 'Chờ trực' ? (d.confirmedAt || new Date().toISOString()) : undefined,
              inspectorName: currentUserRole.name || d.inspectorName,
              inspectorRole: currentUserRole.title || d.inspectorRole,
            }
          : d
      )
    );
    logActivity('Cập nhật trực nhật', `Sửa trực nhật ngày ${duty.date} cho Tổ ${duty.groupId} (${duty.status})`);
  };

  const addDuty = (duty: Omit<CleaningDuty, 'id'>) => {
    if (!canManageDuty(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp trưởng hoặc Lớp phó Lao động mới có quyền phân công lịch trực nhật!'));
      return;
    }
    const pointsDelta =
      duty.status === 'Hoàn thành tốt'
        ? 2
        : duty.status === 'Chưa hoàn thành'
        ? -2
        : duty.status === 'Không thực hiện'
        ? -5
        : 0;

    const newDuty: CleaningDuty = {
      ...duty,
      pointsDelta: duty.pointsDelta !== undefined ? duty.pointsDelta : pointsDelta,
      inspectorName: duty.inspectorName || currentUserRole.name,
      inspectorRole: duty.inspectorRole || currentUserRole.title,
      confirmedAt: duty.status !== 'Chờ trực' ? new Date().toISOString() : undefined,
      id: createUniqueId('duty'),
    };
    setCleaningDuties(prev => [newDuty, ...prev]);
    logActivity('Phân công trực nhật', `Lịch trực nhật ngày ${duty.date} cho Tổ ${duty.groupId} - ${duty.status}`);
  };

  const deleteDuty = (id: string) => {
    if (!canManageDuty(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp trưởng hoặc Lớp phó Lao động mới có quyền xóa lịch trực nhật!'));
      return;
    }
    const duty = cleaningDuties.find(d => d.id === id);
    setCleaningDuties(prev => prev.filter(d => d.id !== id));
    logActivity('Xóa lịch trực nhật', `Xóa trực nhật ngày ${duty?.date || ''} của Tổ ${duty?.groupId || ''}`);
  };

  const addLaborActivity = (activity: Omit<LaborActivity, 'id'>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp trưởng hoặc Lớp phó Lao động mới có quyền lên lịch phân công lao động!'));
      return;
    }
    const newActivity: LaborActivity = {
      ...activity,
      id: createUniqueId('labor'),
      status: activity.status || 'Chờ thực hiện',
      isConfirmed: false,
    };
    setLaborActivities(prev => [newActivity, ...prev]);
    logActivity('Phân công lao động', `Lên lịch buổi lao động: ${activity.title} (Chờ thực hiện, chưa tính điểm)`);
  };

  const updateLaborActivity = (id: string, updates: Partial<LaborActivity>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp trưởng hoặc Lớp phó Lao động mới có quyền chỉnh sửa kế hoạch lao động!'));
      return;
    }
    setLaborActivities(prev =>
      prev.map(act => (act.id === id ? { ...act, ...updates } : act))
    );
    logActivity('Cập nhật kế hoạch lao động', `Cập nhật: ${updates.title || id}`);
  };

  const confirmLaborActivity = (
    id: string,
    evaluation: {
      status: LaborStatus;
      inspectorName: string;
      inspectorRole: string;
      evaluationNote?: string;
      participations: {
        studentId: string;
        status: LaborStudentStatus;
        note?: string;
        pointsDelta?: number;
      }[];
    }
  ) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN, Lớp trưởng hoặc Lớp phó Lao động mới có quyền nghiệm thu và chấm điểm lao động!'));
      return;
    }
    const confirmedAt = new Date().toISOString();
    setLaborActivities(prev =>
      prev.map(act => {
        if (act.id !== id) return act;
        const isCompleted = evaluation.status !== 'Chờ thực hiện';
        return {
          ...act,
          status: evaluation.status,
          isConfirmed: isCompleted,
          confirmedAt: isCompleted ? confirmedAt : undefined,
          inspectorName: evaluation.inspectorName,
          inspectorRole: evaluation.inspectorRole,
          evaluationNote: evaluation.evaluationNote,
          participations: evaluation.participations,
        };
      })
    );
    logActivity(
      'Nghiệm thu lao động',
      `Xác nhận hoàn thành buổi lao động: ${evaluation.status} (${evaluation.inspectorName})`
    );
  };

  const deleteLaborActivity = (id: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN hoặc Lớp phó Lao động mới có quyền xóa buổi lao động!'));
      return;
    }
    const act = laborActivities.find(a => a.id === id);
    setLaborActivities(prev => prev.filter(a => a.id !== id));
    logActivity('Xóa buổi lao động', `Xóa buổi lao động: ${act?.title || id}`);
  };

  const updateLaborParticipation = (
    activityId: string,
    studentId: string,
    status: 'Có mặt' | 'Vắng có phép' | 'Vắng không phép' | 'Hoàn thành tốt' | 'Chưa hoàn thành',
    note?: string
  ) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN hoặc Lớp phó Lao động mới có quyền điểm danh lao động!'));
      return;
    }
    setLaborActivities(prev =>
      prev.map(act => {
        if (act.id !== activityId) return act;
        const exists = act.participations.some(p => p.studentId === studentId);
        const updatedParts = exists
          ? act.participations.map(p => (p.studentId === studentId ? { ...p, status, note } : p))
          : [...act.participations, { studentId, status, note }];
        return { ...act, participations: updatedParts };
      })
    );
    const student = students.find(s => s.id === studentId);
    logActivity('Cập nhật lao động', `${student?.fullName}: ${status}`);
  };

  const addExtracurricular = (activity: Omit<ExtracurricularActivity, 'id'>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN hoặc Ban Cán Sự lớp (Bí thư / Lớp phó VTM) mới có quyền thêm hoạt động ngoại khóa!'));
      return;
    }
    const newActivity: ExtracurricularActivity = {
      ...activity,
      id: createUniqueId('extra'),
    };
    setExtracurricularActivities(prev => [newActivity, ...prev]);
    logActivity('Tạo hoạt động phong trào', `${activity.title}`);
  };

  const deleteExtracurricular = (id: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN hoặc Ban Cán Sự lớp mới có quyền xóa hoạt động phong trào!'));
      return;
    }
    const act = extracurricularActivities.find(a => a.id === id);
    setExtracurricularActivities(prev => prev.filter(a => a.id !== id));
    logActivity('Xóa hoạt động phong trào', `Xóa hoạt động: ${act?.title || id}`);
  };

  const submitSelfEvaluation = (evaluation: Omit<StudentSelfEvaluation, 'id' | 'submittedAt'>) => {
    if (isGuestUser(currentUserRole.role)) {
      alert('Vui lòng đăng nhập với tài khoản học sinh để nộp bản tự đánh giá tuần!');
      return;
    }
    if (!canSubmitSelfEvaluation(currentUserRole, evaluation.studentId)) {
      alert('Học sinh chỉ có quyền nộp bản tự đánh giá của chính mình!');
      return;
    }
    const existingIndex = evaluations.findIndex(e => e.studentId === evaluation.studentId && e.week === evaluation.week);
    if (existingIndex >= 0) {
      setEvaluations(prev => {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          ...evaluation,
          submittedAt: new Date().toISOString(),
        };
        return copy;
      });
    } else {
      const newEval: StudentSelfEvaluation = {
        ...evaluation,
        id: createUniqueId('eval'),
        submittedAt: new Date().toISOString(),
      };
      setEvaluations(prev => [newEval, ...prev]);
    }
    const student = students.find(s => s.id === evaluation.studentId);
    logActivity('Tự đánh giá tuần', `${student?.fullName || 'Học sinh'} nộp bản tự đánh giá Tuần ${evaluation.week}`);
  };

  const deleteEvaluation = (id: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN hoặc Ban cán sự mới có quyền xóa bản tự đánh giá!'));
      return;
    }
    setEvaluations(prev => prev.filter(e => e.id !== id));
    logActivity('Xóa bản tự đánh giá', `Xóa bản tự đánh giá ID: ${id}`);
  };

  const updateEvaluationRemarks = (evalId: string, leaderRemark?: string, teacherRemark?: string) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ GVCN hoặc Tổ trưởng mới có quyền ghi nhận xét vào bản tự đánh giá!'));
      return;
    }
    setEvaluations(prev =>
      prev.map(e =>
        e.id === evalId
          ? {
              ...e,
              ...(leaderRemark !== undefined ? { leaderRemark } : {}),
              ...(teacherRemark !== undefined ? { teacherRemark } : {}),
            }
          : e
      )
    );
    logActivity('Nhận xét tự đánh giá', `Cập nhật nhận xét cho bản tự đánh giá học sinh`);
  };

  const submitGroupSummary = (summary: Omit<WeeklyGroupSummary, 'submittedAt'>) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert(getPermissionDeniedMessage('Chỉ Tổ trưởng, Tổ phó hoặc Ban cán sự mới có quyền nộp báo cáo tổng kết tổ!'));
      return;
    }
    const existingIndex = groupSummaries.findIndex(g => g.groupId === summary.groupId && g.week === summary.week);
    if (existingIndex >= 0) {
      setGroupSummaries(prev => {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          ...summary,
          submittedAt: new Date().toISOString(),
        };
        return copy;
      });
    } else {
      const newSummary: WeeklyGroupSummary = {
        ...summary,
        submittedAt: new Date().toISOString(),
      };
      setGroupSummaries(prev => [newSummary, ...prev]);
    }
    logActivity('Tổng kết tổ tuần', `Tổ ${summary.groupId} nộp báo cáo tổng kết Tuần ${summary.week}`);
  };

  const addStudent = (studentData: Omit<Student, 'id'>) => {
    if (!canManageStudentMaster(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền thêm học sinh mới vào danh sách lớp!');
      return;
    }
    const cleanCode = (studentData.studentCode || `HS${String(students.length + 1).padStart(2, '0')}`).trim();
    const newStudent: Student = {
      ...studentData,
      id: 'hs_' + cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString().slice(-4),
      studentCode: cleanCode,
      fullName: studentData.fullName.trim(),
    };

    const cleanCodeStr = newStudent.studentCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const { reconciledStudents, systemNotes: addNotes } = reconcileRoleAssignment(students, newStudent);
    const accInfo = mapRoleInClassToAccountInfo(newStudent.roleInClass, newStudent.groupId);

    const chosenUsername = (studentData.customUsername || '').trim() ||
      generateStudentUsername(newStudent.fullName, newStudent.studentCode) ||
      `hs_${cleanCodeStr}`;
    const chosenPin = (studentData.customPin || '').trim() || DEFAULT_STUDENT_PIN || '123456';
    const isCustom = chosenPin !== '123456' && chosenPin !== '123';

    const newAccount: AccountUser = {
      id: `acc_${newStudent.id}`,
      username: chosenUsername,
      pin: chosenPin,
      isCustomPin: isCustom,
      fullName: newStudent.fullName,
      role: accInfo.role,
      title: accInfo.title,
      category: accInfo.category,
      studentId: newStudent.id,
      studentCode: newStudent.studentCode,
      groupId: newStudent.groupId,
      email: newStudent.email || '',
      phone: newStudent.phone || '',
      avatar: newStudent.avatar || (newStudent.gender === 'Nữ'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
      permissions: accInfo.permissions,
      status: 'active',
      notes: 'Tài khoản cấp phát cho học sinh mới',
    };

    if (isCustom) {
      try {
        const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
        permanentPins[newStudent.id] = chosenPin;
        permanentPins[chosenUsername.toLowerCase()] = chosenPin;
        if (newStudent.studentCode) permanentPins[newStudent.studentCode.toLowerCase()] = chosenPin;
        localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(permanentPins));
      } catch (_) {}
    }

    const finalStudents = [...reconciledStudents.filter(s => s.id !== newStudent.id), newStudent];
    setStudents(finalStudents);
    saveToStorage('students', finalStudents);

    // Sync all accounts with reconciled roles
    setAccounts(prev => {
      const updatedAccounts = prev.map(acc => {
        const matchStudent = finalStudents.find(
          s => s.id === acc.studentId || (s.studentCode && s.studentCode === acc.studentCode)
        );
        if (matchStudent) {
          const info = mapRoleInClassToAccountInfo(matchStudent.roleInClass, matchStudent.groupId);
          return {
            ...acc,
            fullName: matchStudent.fullName,
            studentCode: matchStudent.studentCode,
            groupId: matchStudent.groupId,
            role: info.role,
            category: info.category,
            title: info.title,
            permissions: info.permissions,
            phone: matchStudent.phone || acc.phone,
          };
        }
        return acc;
      });
      const combined = sortAccountsByHierarchy([
        ...updatedAccounts.filter(a => a.studentId !== newStudent.id),
        newAccount
      ]);
      saveToStorage('accounts', combined);
      return combined;
    });

    setClassInfo(ci => ({ ...ci, totalStudents: finalStudents.length }));
    logActivity('Thêm học sinh mới', `${newStudent.fullName} (${newStudent.studentCode}) - Tổ ${newStudent.groupId} - Chức vụ: ${newStudent.roleInClass}`);
    if (addNotes.length > 0) {
      alert(`Đã thêm học sinh thành công!\n\nLưu ý phân công chức vụ:\n${addNotes.join('\n')}`);
    }
  };

  const updateStudent = (updatedStudent: Student) => {
    if (!isHomeroomTeacher(currentUserRole.role)) {
      // If student is updating their own record, allow updating phone, parentPhone, address only
      if (currentUserRole.studentId && currentUserRole.studentId === updatedStudent.id) {
        const existing = students.find(s => s.id === updatedStudent.id);
        if (existing) {
          updatedStudent.studentCode = existing.studentCode;
          updatedStudent.groupId = existing.groupId;
          updatedStudent.roleInClass = existing.roleInClass;
          updatedStudent.teacherNotes = existing.teacherNotes;
        }
      } else {
        alert('Bạn không có quyền chỉnh sửa hồ sơ của học sinh khác!');
        return;
      }
    }

    // Role reconciliation: Ensures 1 Lớp trưởng per class, 1 Tổ trưởng per group, etc.
    const { reconciledStudents, systemNotes } = reconcileRoleAssignment(students, updatedStudent);
    setStudents(reconciledStudents);
    saveToStorage('students', reconciledStudents);

    setAccounts(prev => {
      const updatedAccounts = prev.map(acc => {
        const matchStudent = reconciledStudents.find(
          s => s.id === acc.studentId || (s.studentCode && s.studentCode === acc.studentCode)
        );
        if (matchStudent) {
          const info = mapRoleInClassToAccountInfo(matchStudent.roleInClass, matchStudent.groupId);
          return {
            ...acc,
            fullName: matchStudent.fullName,
            studentCode: matchStudent.studentCode,
            groupId: matchStudent.groupId,
            role: info.role,
            category: info.category,
            title: info.title,
            permissions: info.permissions,
            phone: matchStudent.phone || acc.phone,
          };
        }
        return acc;
      });
      const sorted = sortAccountsByHierarchy(updatedAccounts);
      saveToStorage('accounts', sorted);
      return sorted;
    });

    const noteMsg = systemNotes.length > 0 ? ` (${systemNotes.join('. ')})` : '';
    logActivity('Chỉnh sửa thông tin', `Cập nhật hồ sơ học sinh: ${updatedStudent.fullName} - Chức vụ: ${updatedStudent.roleInClass}${noteMsg}`);
    if (systemNotes.length > 0) {
      alert(`Đã cập nhật phân công chức vụ thành công!\n\nLưu ý trật tự phân công chuẩn:\n${systemNotes.join('\n')}`);
    }
  };

  const deleteStudent = (id: string) => {
    if (!canManageStudentMaster(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền xóa học sinh khỏi danh sách lớp!');
      return;
    }
    const s = students.find(item => item.id === id);
    const updatedStudents = students.filter(item => item.id !== id);
    setStudents(updatedStudents);
    saveToStorage('students', updatedStudents);

    // Also remove their account
    setAccounts(prev => {
      const filtered = prev.filter(acc => acc.studentId !== id && (!s?.studentCode || acc.studentCode !== s.studentCode));
      saveToStorage('accounts', filtered);
      return filtered;
    });

    // Also clean up related records
    setAttendance(prev => {
      const filtered = prev.filter(a => a.studentId !== id);
      saveToStorage('attendance', filtered);
      return filtered;
    });
    setViolations(prev => {
      const filtered = prev.filter(v => v.studentId !== id);
      saveToStorage('violations', filtered);
      return filtered;
    });
    setRewards(prev => {
      const filtered = prev.filter(r => r.studentId !== id);
      saveToStorage('rewards', filtered);
      return filtered;
    });
    setAcademicRecords(prev => {
      const filtered = prev.filter(ac => ac.studentId !== id);
      saveToStorage('academicRecords', filtered);
      return filtered;
    });
    setCleaningDuties(prev => {
      const updated = prev.map(d => ({
        ...d,
        assignedStudentIds: (d.assignedStudentIds || []).filter(sid => sid !== id),
      }));
      saveToStorage('cleaningDuties', updated);
      return updated;
    });
    setEvaluations(prev => {
      const filtered = prev.filter(ev => ev.studentId !== id);
      saveToStorage('evaluations', filtered);
      return filtered;
    });

    setClassInfo(ci => {
      const updatedCi = { ...ci, totalStudents: updatedStudents.length };
      saveToStorage('classInfo', updatedCi);
      return updatedCi;
    });

    if (selectedStudentIdForDetail === id) {
      setSelectedStudentIdForDetail(null);
    }
    logActivity('Xóa học sinh', `Đã xóa học sinh: ${s?.fullName || id} và xóa tài khoản liên kết`);
  };

  const batchDeleteStudents = (ids: string[]): { success: boolean; message: string; count: number } => {
    if (!canManageStudentMaster(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền xóa học sinh khỏi danh sách lớp!');
      return { success: false, message: 'Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền xóa học sinh khỏi danh sách lớp!', count: 0 };
    }
    if (!ids || ids.length === 0) {
      return { success: false, message: 'Chưa chọn học sinh nào để xóa!', count: 0 };
    }
    const idSet = new Set(ids);
    const toDeleteStudents = students.filter(s => idSet.has(s.id));
    const toDeleteCodes = new Set(toDeleteStudents.map(s => s.studentCode).filter(Boolean));
    const countToDelete = toDeleteStudents.length;

    const remainingStudents = students.filter(s => !idSet.has(s.id));
    setStudents(remainingStudents);
    saveToStorage('students', remainingStudents);

    // Also remove their accounts
    setAccounts(prev => {
      const filtered = prev.filter(acc => (!acc.studentId || !idSet.has(acc.studentId)) && (!acc.studentCode || !toDeleteCodes.has(acc.studentCode)));
      saveToStorage('accounts', filtered);
      return filtered;
    });

    // Also clean up all related records
    setAttendance(prev => {
      const filtered = prev.filter(a => !idSet.has(a.studentId));
      saveToStorage('attendance', filtered);
      return filtered;
    });
    setViolations(prev => {
      const filtered = prev.filter(v => !idSet.has(v.studentId));
      saveToStorage('violations', filtered);
      return filtered;
    });
    setRewards(prev => {
      const filtered = prev.filter(r => !idSet.has(r.studentId));
      saveToStorage('rewards', filtered);
      return filtered;
    });
    setAcademicRecords(prev => {
      const filtered = prev.filter(ac => !idSet.has(ac.studentId));
      saveToStorage('academicRecords', filtered);
      return filtered;
    });
    setCleaningDuties(prev => {
      const updated = prev.map(d => ({
        ...d,
        assignedStudentIds: (d.assignedStudentIds || []).filter(sid => !idSet.has(sid)),
      }));
      saveToStorage('cleaningDuties', updated);
      return updated;
    });
    setEvaluations(prev => {
      const filtered = prev.filter(ev => !idSet.has(ev.studentId));
      saveToStorage('evaluations', filtered);
      return filtered;
    });

    setClassInfo(ci => {
      const updatedCi = { ...ci, totalStudents: remainingStudents.length };
      saveToStorage('classInfo', updatedCi);
      return updatedCi;
    });

    if (selectedStudentIdForDetail && idSet.has(selectedStudentIdForDetail)) {
      setSelectedStudentIdForDetail(null);
    }
    logActivity('Xóa học sinh hàng loạt', `Đã xóa ${countToDelete} học sinh và tài khoản tương ứng`);
    return {
      success: true,
      message: `Đã xóa thành công ${countToDelete} học sinh khỏi danh sách lớp!`,
      count: countToDelete,
    };
  };

  const batchImportStudents = (newStudentsData: Array<Omit<Student, 'id'>>, replaceAll = false): { success: boolean; message: string; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      return { success: false, message: 'Chỉ GVCN và Ban Cán Sự mới có quyền nhập danh sách học sinh!', count: 0 };
    }
    if (!newStudentsData || newStudentsData.length === 0) {
      return { success: false, message: 'Danh sách học sinh nhập vào trống!', count: 0 };
    }

    const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
    let pinsUpdated = false;

    const newAccountsToCreate: AccountUser[] = [];

    const formattedList: Student[] = newStudentsData.map((s, idx) => {
      const studentId = `std_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
      const cleanCode = (s.studentCode || `HS11${(idx + 1).toString().padStart(2, '0')}`).trim();
      const autoUsername = (s as any).username || s.customUsername || generateStudentUsername(s.fullName, cleanCode);
      const autoPin = (s as any).pin || s.customPin || DEFAULT_STUDENT_PIN || '123456';
      
      permanentPins[cleanCode.toLowerCase()] = String(autoPin).trim();
      permanentPins[autoUsername.toLowerCase()] = String(autoPin).trim();
      permanentPins[studentId] = String(autoPin).trim();
      pinsUpdated = true;

      const studentName = capitalizeVietnameseName(s.fullName || '');
      const grp = Number(s.groupId) >= 1 && Number(s.groupId) <= 4 ? Number(s.groupId) : ((idx % 4) + 1);
      const accInfo = mapRoleInClassToAccountInfo(s.roleInClass, grp);

      const avatar = s.avatar || (s.gender === 'Nữ'
        ? `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
        : `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80`);

      const studentAcc: AccountUser = {
        id: `acc_${studentId}`,
        username: autoUsername,
        pin: autoPin,
        fullName: studentName,
        role: accInfo.role,
        title: accInfo.title,
        category: accInfo.category,
        studentId: studentId,
        studentCode: cleanCode,
        groupId: grp,
        phone: s.phone || '',
        email: s.email || '',
        avatar: avatar,
        permissions: accInfo.permissions,
        status: 'active',
        isCustomPin: autoPin !== '123456' && autoPin !== '123',
        authProvider: 'credentials',
      };
      newAccountsToCreate.push(studentAcc);

      return {
        ...s,
        id: studentId,
        studentCode: cleanCode,
        fullName: studentName,
        groupId: grp,
        avatar: avatar,
        teacherNotes: s.teacherNotes || '',
        customUsername: autoUsername,
        customPin: autoPin,
      };
    });

    if (pinsUpdated) {
      try {
        localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(permanentPins));
      } catch (_) {}
    }

    if (replaceAll) {
      setStudents(formattedList);
      studentsRef.current = formattedList;
      saveToStorage('students', formattedList);
      setClassInfo(prev => ({ ...prev, totalStudents: formattedList.length }));
      setAccounts(prev => {
        const gvcnOnly = prev.filter(a => a.role === 'gvcn' || a.category === 'gvcn' || !a.studentId);
        const combined = [...gvcnOnly, ...newAccountsToCreate];
        accountsRef.current = combined;
        saveToStorage('accounts', combined);
        return combined;
      });
      logActivity('Nhập danh sách lớp', `Đã thay thế toàn bộ danh sách lớp bằng ${formattedList.length} học sinh mới và tự động tạo tài khoản đăng nhập`);
    } else {
      setStudents(prev => {
        const combined = [...prev, ...formattedList];
        studentsRef.current = combined;
        saveToStorage('students', combined);
        setClassInfo(ci => ({ ...ci, totalStudents: combined.length }));
        return combined;
      });
      setAccounts(prev => {
        const combinedAccs = [...prev, ...newAccountsToCreate];
        accountsRef.current = combinedAccs;
        saveToStorage('accounts', combinedAccs);
        return combinedAccs;
      });
      logActivity('Nhập danh sách lớp', `Đã thêm ${formattedList.length} học sinh mới vào danh sách lớp và tự động tạo tài khoản đăng nhập`);
    }

    // Đẩy ngay lập tức lên Google Sheets để lưu vĩnh viễn trên Cloud
    setTimeout(() => {
      syncAllToGoogleSheets({ students: studentsRef.current, accounts: accountsRef.current });
    }, 150);

    return {
      success: true,
      message: `Đã nhập thành công ${formattedList.length} học sinh vào lớp ${classInfo.className} và tự động cấp tài khoản đăng nhập cho toàn bộ học sinh!`,
      count: formattedList.length,
    };
  };

  const batchUpdateStudentsFromExcel = async (
    parsedStudents: Array<Omit<Student, 'id'>>,
    mode: 'update' | 'append' | 'replace'
  ): Promise<{ success: boolean; message: string; updatedCount: number; addedCount: number }> => {
    if (!canManageClassActivities(currentUserRole.role)) {
      return { success: false, message: 'Chỉ GVCN và Ban Cán Sự mới có quyền cập nhật danh sách học sinh!', updatedCount: 0, addedCount: 0 };
    }
    if (!parsedStudents || parsedStudents.length === 0) {
      return { success: false, message: 'Dữ liệu học sinh từ Excel trống!', updatedCount: 0, addedCount: 0 };
    }

    if (mode === 'replace') {
      // Auto snapshot before replace
      await backupGVCNData({ exportExcel: false, note: 'Tự động sao lưu an toàn trước khi thay thế danh sách HS bằng Excel' });
      const importRes = batchImportStudents(parsedStudents, true);
      return {
        success: importRes.success,
        message: importRes.message,
        updatedCount: 0,
        addedCount: importRes.count,
      };
    }

    let updatedCount = 0;
    let addedCount = 0;

    const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
    let pinsUpdated = false;

    setStudents(prev => {
      const codeMap = new Map<string, Student>();
      const nameMap = new Map<string, Student>();
      prev.forEach(s => {
        if (s.studentCode) codeMap.set(s.studentCode.trim().toLowerCase(), s);
        if (s.fullName) nameMap.set(s.fullName.trim().toLowerCase(), s);
      });

      const updatedList: Student[] = [...prev];
      const newlyAdded: Student[] = [];

      parsedStudents.forEach((newS, idx) => {
        const cKey = (newS.studentCode || '').trim().toLowerCase();
        const nKey = (newS.fullName || '').trim().toLowerCase();
        const existing = (cKey ? codeMap.get(cKey) : undefined) || (nKey ? nameMap.get(nKey) : undefined);

        const customUsername = (newS as any).username || newS.customUsername;
        const customPin = (newS as any).pin || newS.customPin;

        if (existing && mode === 'update') {
          // Merge & update existing student while preserving ID and core history links
          const indexInList = updatedList.findIndex(item => item.id === existing.id);
          if (indexInList !== -1) {
            const finalUsername = customUsername ? String(customUsername).trim() : (updatedList[indexInList].customUsername || generateStudentUsername(newS.fullName || updatedList[indexInList].fullName, newS.studentCode || updatedList[indexInList].studentCode));
            const finalPin = customPin ? String(customPin).trim() : (updatedList[indexInList].customPin || DEFAULT_STUDENT_PIN || '123456');

            if (customPin) {
              if (newS.studentCode || updatedList[indexInList].studentCode) {
                permanentPins[(newS.studentCode || updatedList[indexInList].studentCode).trim().toLowerCase()] = finalPin;
              }
              if (finalUsername) {
                permanentPins[finalUsername.toLowerCase()] = finalPin;
              }
              permanentPins[updatedList[indexInList].id] = finalPin;
              pinsUpdated = true;
            }

            updatedList[indexInList] = {
              ...updatedList[indexInList],
              studentCode: newS.studentCode || updatedList[indexInList].studentCode,
              fullName: capitalizeVietnameseName(newS.fullName || updatedList[indexInList].fullName),
              gender: newS.gender || updatedList[indexInList].gender,
              dateOfBirth: newS.dateOfBirth || updatedList[indexInList].dateOfBirth,
              groupId: Number(newS.groupId) >= 1 && Number(newS.groupId) <= 4 ? Number(newS.groupId) : updatedList[indexInList].groupId,
              roleInClass: newS.roleInClass || updatedList[indexInList].roleInClass,
              phone: newS.phone || updatedList[indexInList].phone,
              email: newS.email !== undefined ? newS.email : updatedList[indexInList].email,
              parentName: newS.parentName || updatedList[indexInList].parentName,
              parentPhone: newS.parentPhone || updatedList[indexInList].parentPhone,
              address: newS.address || updatedList[indexInList].address,
              teacherNotes: newS.teacherNotes !== undefined ? newS.teacherNotes : updatedList[indexInList].teacherNotes,
              customUsername: finalUsername,
              customPin: finalPin,
            };
            updatedCount++;
          }
        } else if (!existing) {
          // Insert new student
          const newStudentId = `std_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
          const cleanCode = (newS.studentCode || `HS11${(updatedList.length + newlyAdded.length + 1).toString().padStart(2, '0')}`).trim();
          const finalUsername = customUsername ? String(customUsername).trim() : generateStudentUsername(newS.fullName, cleanCode);
          const finalPin = customPin ? String(customPin).trim() : (DEFAULT_STUDENT_PIN || '123456');

          permanentPins[cleanCode.toLowerCase()] = finalPin;
          permanentPins[finalUsername.toLowerCase()] = finalPin;
          permanentPins[newStudentId] = finalPin;
          pinsUpdated = true;

          const newStudentObj: Student = {
            ...newS,
            id: newStudentId,
            studentCode: cleanCode,
            fullName: capitalizeVietnameseName(newS.fullName || ''),
            groupId: Number(newS.groupId) >= 1 && Number(newS.groupId) <= 4 ? Number(newS.groupId) : ((idx % 4) + 1),
            avatar: newS.avatar || (newS.gender === 'Nữ'
              ? `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
              : `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80`),
            teacherNotes: newS.teacherNotes || '',
            customUsername: finalUsername,
            customPin: finalPin,
          };
          newlyAdded.push(newStudentObj);
          addedCount++;
        }
      });

      const finalResult = [...updatedList, ...newlyAdded];
      studentsRef.current = finalResult;
      saveToStorage('students', finalResult);
      setClassInfo(ci => ({ ...ci, totalStudents: finalResult.length }));

      // Cập nhật và đồng bộ danh sách tài khoản tương ứng
      setAccounts(prev => {
        const gvcnAccounts = prev.filter(a => a.role === 'gvcn' || a.category === 'gvcn' || !a.studentId);
        const existingStudentAccsMap = new Map<string, AccountUser>();
        prev.filter(a => a.studentId).forEach(a => existingStudentAccsMap.set(a.studentId!, a));

        const updatedStudentAccs: AccountUser[] = finalResult.map(s => {
          const accInfo = mapRoleInClassToAccountInfo(s.roleInClass, s.groupId);
          const old = existingStudentAccsMap.get(s.id);
          const u = s.customUsername || (old ? old.username : generateStudentUsername(s.fullName, s.studentCode));
          const p = s.customPin || (old ? old.pin : (DEFAULT_STUDENT_PIN || '123456'));

          return {
            id: old?.id || `acc_${s.id}`,
            username: u,
            pin: p,
            fullName: s.fullName,
            role: accInfo.role,
            title: accInfo.title,
            category: accInfo.category,
            studentId: s.id,
            studentCode: s.studentCode,
            groupId: s.groupId,
            phone: s.phone || '',
            email: s.email || '',
            avatar: s.avatar,
            permissions: accInfo.permissions,
            status: 'active',
            isCustomPin: p !== '123456' && p !== '123',
            authProvider: 'credentials',
          };
        });

        const combinedAccs = [...gvcnAccounts, ...updatedStudentAccs];
        accountsRef.current = combinedAccs;
        saveToStorage('accounts', combinedAccs);
        return combinedAccs;
      });

      return finalResult;
    });

    if (pinsUpdated) {
      try {
        localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(permanentPins));
      } catch (_) {}
    }

    // Đẩy ngay lập tức lên Google Sheets để lưu vĩnh viễn trên Cloud
    setTimeout(() => {
      syncAllToGoogleSheets({ students: studentsRef.current });
    }, 150);

    logActivity(
      'Cập nhật HS từ Excel',
      `Đã cập nhật ${updatedCount} học sinh, thêm mới ${addedCount} học sinh từ file Excel`
    );

    return {
      success: true,
      message: `Cập nhật thành công! Đã cập nhật ${updatedCount} học sinh hiện có và thêm mới ${addedCount} học sinh vào danh sách lớp.`,
      updatedCount,
      addedCount,
    };
  };

  const cleanData = (options: CleanDataOptions): { success: boolean; message: string; count: number } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      return { success: false, message: 'Bạn không có quyền dọn dẹp hoặc xóa dữ liệu của lớp!', count: 0 };
    }
    let count = 0;
    const details: string[] = [];

    if (options.cleanViolations) {
      if (options.targetWeek && options.targetWeek !== 'all') {
        const tw = Number(options.targetWeek);
        const prevLen = violations.length;
        setViolations(prev => prev.filter(v => v.weekNumber !== tw));
        count += (prevLen - violations.filter(v => v.weekNumber !== tw).length);
        details.push(`vi phạm tuần ${tw}`);
      } else {
        count += violations.length;
        setViolations([]);
        details.push('toàn bộ vi phạm');
      }
    }

    if (options.cleanRewards) {
      if (options.targetWeek && options.targetWeek !== 'all') {
        const tw = Number(options.targetWeek);
        const prevLen = rewards.length;
        setRewards(prev => prev.filter(r => r.weekNumber !== tw));
        count += (prevLen - rewards.filter(r => r.weekNumber !== tw).length);
        details.push(`khen thưởng tuần ${tw}`);
      } else {
        count += rewards.length;
        setRewards([]);
        details.push('toàn bộ khen thưởng');
      }
    }

    if (options.cleanAttendance) {
      if (options.targetWeek && options.targetWeek !== 'all') {
        const tw = Number(options.targetWeek);
        const prevLen = attendance.length;
        setAttendance(prev => prev.filter(a => a.weekNumber !== tw));
        count += (prevLen - attendance.filter(a => a.weekNumber !== tw).length);
        details.push(`điểm danh tuần ${tw}`);
      } else {
        count += attendance.length;
        setAttendance([]);
        details.push('toàn bộ điểm danh');
      }
    }

    if (options.cleanAcademic) {
      if (options.targetWeek && options.targetWeek !== 'all') {
        const tw = Number(options.targetWeek);
        setAcademicRecords(prev => prev.filter(a => a.weekNumber !== tw));
        details.push(`học tập tuần ${tw}`);
      } else {
        count += academicRecords.length;
        setAcademicRecords([]);
        details.push('toàn bộ ghi nhận học tập');
      }
    }

    if (options.cleanDuties) {
      count += cleaningDuties.length;
      setCleaningDuties([]);
      details.push('lịch trực nhật');
    }

    if (options.cleanLabor) {
      count += laborActivities.length;
      setLaborActivities([]);
      details.push('hoạt động lao động');
    }

    if (options.cleanExtracurricular) {
      count += extracurricularActivities.length;
      setExtracurricularActivities([]);
      details.push('hoạt động ngoại khóa');
    }

    if (options.cleanEvaluations) {
      count += evaluations.length;
      setEvaluations([]);
      details.push('tự đánh giá học sinh');
    }

    if (options.cleanGroupSummaries) {
      count += groupSummaries.length;
      setGroupSummaries([]);
      details.push('báo cáo tổng kết tổ');
    }

    if (options.cleanAllStudents) {
      const studentCount = students.length;
      count += studentCount;
      setStudents([]);
      saveToStorage('students', []);
      setAccounts(prev => {
        const gvcnAccs = prev.filter(a => a.role === 'gvcn' || a.category === 'gvcn' || !a.studentId);
        saveToStorage('accounts', gvcnAccs);
        return gvcnAccs;
      });
      setClassInfo(ci => {
        const updated = { ...ci, totalStudents: 0 };
        saveToStorage('classInfo', updated);
        return updated;
      });
      setSelectedStudentIdForDetail(null);
      setSeatingChart([]);
      saveToStorage('seatingChart', []);
      details.push(`toàn bộ ${studentCount} học sinh và tài khoản`);
    }

    if (details.length === 0) {
      return { success: false, message: 'Chưa chọn mục dữ liệu nào để làm sạch!', count: 0 };
    }

    logActivity('Làm sạch dữ liệu', `Đã dọn dẹp: ${details.join(', ')}`);
    return {
      success: true,
      message: `Đã làm sạch dữ liệu thành công (${details.join(', ')})!`,
      count,
    };
  };

  const clearAllStudents = async (): Promise<{ success: boolean; message: string; count: number }> => {
    if (!canManageStudentMaster(currentUserRole.role)) {
      return { success: false, message: 'Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền xóa sạch danh sách học sinh!', count: 0 };
    }
    const count = students.length;
    if (count === 0) {
      return { success: false, message: 'Danh sách học sinh hiện tại đã trống!', count: 0 };
    }

    // Auto backup snapshot before wiping
    await backupGVCNData({ exportExcel: false, note: `Tự động sao lưu an toàn trước khi xóa sạch ${count} học sinh` });

    // 1. Wipe students
    setStudents([]);
    saveToStorage('students', []);

    // 2. Keep only GVCN / non-student accounts
    setAccounts(prev => {
      const gvcnOnly = prev.filter(a => a.role === 'gvcn' || a.category === 'gvcn' || !a.studentId);
      saveToStorage('accounts', gvcnOnly);
      return gvcnOnly;
    });

    // 3. Clear all student-dependent data
    setAttendance([]);
    saveToStorage('attendance', []);
    setViolations([]);
    saveToStorage('violations', []);
    setRewards([]);
    saveToStorage('rewards', []);
    setAcademicRecords([]);
    saveToStorage('academicRecords', []);
    setEvaluations([]);
    saveToStorage('evaluations', []);
    setCleaningDuties([]);
    saveToStorage('cleaningDuties', []);

    // 4. Update classInfo
    setClassInfo(ci => {
      const updated = { ...ci, totalStudents: 0 };
      saveToStorage('classInfo', updated);
      return updated;
    });

    setSelectedStudentIdForDetail(null);
    logActivity('Xóa sạch danh sách lớp', `GVCN đã xóa sạch ${count} học sinh và làm mới danh sách lớp`);

    hasPendingLocalUserChangesRef.current = true;
    try {
      await syncAllToGoogleSheets();
    } catch (e) {
      console.warn('Sync to sheets after clearAllStudents:', e);
    }

    return {
      success: true,
      message: `Đã xóa sạch thành công toàn bộ ${count} học sinh khỏi danh sách lớp!`,
      count,
    };
  };

  const exportStudentAccountsList = () => {
    exportStudentAccountsListExcel(students, accounts, classInfo);
    logActivity('Xuất file tài khoản', `Đã xuất danh sách lớp kèm tài khoản và mật khẩu học sinh`);
  };

  const normalizeAndFixData = (): { success: boolean; message: string; fixes: string[] } => {
    if (!canManageClassActivities(currentUserRole.role)) {
      return { success: false, message: 'Bạn không có quyền chuẩn hóa dữ liệu!', fixes: [] };
    }
    const fixes: string[] = [];

    // 1. Normalize student names & groups
    let fixedNamesCount = 0;
    let fixedGroupsCount = 0;
    const normalizedStudents = students.map((s, idx) => {
      const fixedName = capitalizeVietnameseName(s.fullName);
      if (fixedName !== s.fullName) fixedNamesCount++;
      
      let grp = Number(s.groupId);
      if (!grp || grp < 1 || grp > 4) {
        grp = (idx % 4) + 1;
        fixedGroupsCount++;
      }

      return {
        ...s,
        fullName: fixedName,
        groupId: grp,
      };
    });

    setStudents(normalizedStudents);
    if (fixedNamesCount > 0) fixes.push(`Chuẩn hóa viết hoa ${fixedNamesCount} tên học sinh`);
    if (fixedGroupsCount > 0) fixes.push(`Cân chỉnh phân tổ cho ${fixedGroupsCount} học sinh`);

    // 2. Sync totalStudents
    if (classInfo.totalStudents !== normalizedStudents.length) {
      setClassInfo(prev => ({ ...prev, totalStudents: normalizedStudents.length }));
      fixes.push(`Đồng bộ sĩ số thực tế: ${normalizedStudents.length} học sinh`);
    }

    // 3. Sync GVCN account with classInfo
    if (classInfo.homeroomTeacher) {
      const teacherName = classInfo.homeroomTeacher.trim();
      setAccounts(prev => prev.map(a => {
        if (a.role === 'gvcn' || a.category === 'gvcn') {
          return {
            ...a,
            fullName: teacherName,
            phone: classInfo.teacherPhone || a.phone,
            email: classInfo.teacherEmail || a.email,
          };
        }
        return a;
      }));
      fixes.push(`Đồng bộ tài khoản GVCN: ${teacherName}`);
    }

    logActivity('Chuẩn hóa dữ liệu', `Đã chuẩn hóa: ${fixes.join('; ')}`);
    return {
      success: true,
      message: fixes.length > 0 ? `Chuẩn hóa hoàn tất (${fixes.length} hạng mục được tối ưu)!` : 'Dữ liệu đã chuẩn và thông suốt!',
      fixes,
    };
  };

  const updateSettings = (newSettings: CompetitionSettings) => {
    if (!canManageSystemSettings(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền thay đổi quy chế thi đua và điểm tiêu chí!');
      return;
    }
    setSettings(newSettings);
    logActivity('Cập nhật cài đặt', 'Thay đổi trọng số và tiêu chí thi đua');
  };

  const resetToDefaultData = () => {
    if (!isHomeroomTeacher(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền khôi phục dữ liệu mẫu gốc!');
      return;
    }
    setStudents(INITIAL_STUDENTS);
    setAttendance(INITIAL_ATTENDANCE);
    setViolations(INITIAL_VIOLATIONS);
    setRewards(INITIAL_REWARDS);
    setAcademicRecords(INITIAL_ACADEMIC);
    setCleaningDuties(INITIAL_DUTIES);
    setLaborActivities(INITIAL_LABOR);
    setExtracurricularActivities(INITIAL_EXTRACURRICULAR);
    setEvaluations(INITIAL_EVALUATIONS);
    setGroupSummaries(INITIAL_GROUP_SUMMARIES);
    setSettings(INITIAL_SETTINGS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setAccounts(INITIAL_ACCOUNTS);
    setClassInfo(INITIAL_CLASS_INFO);
    setCurrentUserRole(INITIAL_ROLES[0]);
    setSeatingChart([]);
    saveToStorage('seatingChart', []);
    logActivity('Khôi phục dữ liệu mẫu', `Đã đặt lại toàn bộ ${INITIAL_STUDENTS.length} học sinh, thông tin lớp ${INITIAL_CLASS_INFO.className} và dữ liệu mẫu gốc`, false);
  };

  // --- Sơ đồ lớp học (Chỗ ngồi học sinh 4 cột x 8 hàng x 2 vị trí) ---
  const assignSeat = (column: number, row: number, deskPosition: 1 | 2, studentId: string | null) => {
    setSeatingChart(prev => {
      if (!studentId) {
        const next = prev.filter(s => !(s.column === column && s.row === row && s.deskPosition === deskPosition));
        saveToStorage('seatingChart', next);
        scheduleAutoSync(2500);
        return next;
      }

      // Gỡ chỗ ngồi cũ của học sinh này nếu đã được xếp chỗ trước đó
      const withoutStudent = prev.filter(s => s.studentId !== studentId);
      // Gỡ học sinh đang ngồi ở vị trí đích (nếu có)
      const next = withoutStudent.filter(s => !(s.column === column && s.row === row && s.deskPosition === deskPosition));

      next.push({
        column,
        row,
        deskPosition,
        studentId,
        assignedAt: new Date().toISOString(),
      });

      saveToStorage('seatingChart', next);
      scheduleAutoSync(2500);
      return next;
    });

    if (studentId) {
      const st = students.find(s => s.id === studentId);
      if (st) {
        logActivity('Xếp chỗ ngồi', `Đã xếp học sinh ${st.fullName} vào Dãy ${column} - Bàn ${row} (Ghế ${deskPosition === 1 ? 'Trái' : 'Phải'})`);
      }
    }
  };

  const swapSeats = (
    from: { column: number; row: number; deskPosition: 1 | 2 },
    to: { column: number; row: number; deskPosition: 1 | 2 }
  ) => {
    setSeatingChart(prev => {
      const fromSeat = prev.find(s => s.column === from.column && s.row === from.row && s.deskPosition === from.deskPosition);
      const toSeat = prev.find(s => s.column === to.column && s.row === to.row && s.deskPosition === to.deskPosition);

      if (!fromSeat && !toSeat) return prev;

      const next = prev.filter(s => 
        !(s.column === from.column && s.row === from.row && s.deskPosition === from.deskPosition) &&
        !(s.column === to.column && s.row === to.row && s.deskPosition === to.deskPosition)
      );

      if (fromSeat) {
        next.push({
          ...fromSeat,
          column: to.column,
          row: to.row,
          deskPosition: to.deskPosition,
          assignedAt: new Date().toISOString(),
        });
      }

      if (toSeat) {
        next.push({
          ...toSeat,
          column: from.column,
          row: from.row,
          deskPosition: from.deskPosition,
          assignedAt: new Date().toISOString(),
        });
      }

      saveToStorage('seatingChart', next);
      scheduleAutoSync(2500);
      return next;
    });

    logActivity('Đổi chỗ ngồi', `Đã hoán đổi vị trí chỗ ngồi giữa Dãy ${from.column} Bàn ${from.row} và Dãy ${to.column} Bàn ${to.row}`);
  };

  const autoAssignSeats = (mode: 'alphabetical' | 'by_group' | 'random' | 'gender') => {
    if (students.length === 0) return;

    let orderedStudents = [...students];

    if (mode === 'alphabetical') {
      orderedStudents.sort((a, b) => {
        const nameA = a.fullName.trim().split(/\s+/).pop() || '';
        const nameB = b.fullName.trim().split(/\s+/).pop() || '';
        return nameA.localeCompare(nameB, 'vi');
      });
    } else if (mode === 'random') {
      orderedStudents.sort(() => Math.random() - 0.5);
    } else if (mode === 'gender') {
      const males = students.filter(s => s.gender === 'Nam');
      const females = students.filter(s => s.gender === 'Nữ');
      const paired: Student[] = [];
      const maxLen = Math.max(males.length, females.length);
      for (let i = 0; i < maxLen; i++) {
        if (males[i]) paired.push(males[i]);
        if (females[i]) paired.push(females[i]);
      }
      orderedStudents = paired;
    }

    const newAssignments: SeatAssignment[] = [];

    if (mode === 'by_group') {
      // Mỗi tổ ngồi một cột: Cột 1 = Tổ 1, Cột 2 = Tổ 2, Cột 3 = Tổ 3, Cột 4 = Tổ 4
      for (let col = 1; col <= 4; col++) {
        const groupStudents = students.filter(s => s.groupId === col);
        groupStudents.sort((a, b) => {
          const nameA = a.fullName.trim().split(/\s+/).pop() || '';
          const nameB = b.fullName.trim().split(/\s+/).pop() || '';
          return nameA.localeCompare(nameB, 'vi');
        });

        let sIndex = 0;
        for (let row = 1; row <= 8; row++) {
          for (const pos of [1, 2] as const) {
            if (sIndex < groupStudents.length) {
              newAssignments.push({
                column: col,
                row,
                deskPosition: pos,
                studentId: groupStudents[sIndex].id,
                assignedAt: new Date().toISOString(),
              });
              sIndex++;
            }
          }
        }
      }
    } else {
      let sIndex = 0;
      for (let row = 1; row <= 8; row++) {
        for (let col = 1; col <= 4; col++) {
          for (const pos of [1, 2] as const) {
            if (sIndex < orderedStudents.length) {
              newAssignments.push({
                column: col,
                row,
                deskPosition: pos,
                studentId: orderedStudents[sIndex].id,
                assignedAt: new Date().toISOString(),
              });
              sIndex++;
            }
          }
        }
      }
    }

    setSeatingChart(newAssignments);
    saveToStorage('seatingChart', newAssignments);
    scheduleAutoSync(2500);
    logActivity('Tự động xếp chỗ', `Đã tự động sắp xếp lại toàn bộ sơ đồ lớp học (chế độ: ${mode})`);
  };

  const rotateColumns = (direction: 'next' | 'prev' = 'next') => {
    setSeatingChart(prev => {
      const next = prev.map(seat => {
        let newCol = seat.column;
        if (direction === 'next') {
          newCol = seat.column === 4 ? 1 : seat.column + 1;
        } else {
          newCol = seat.column === 1 ? 4 : seat.column - 1;
        }
        return {
          ...seat,
          column: newCol,
          assignedAt: new Date().toISOString(),
        };
      });

      saveToStorage('seatingChart', next);
      scheduleAutoSync(2500);
      return next;
    });

    logActivity('Luân chuyển dãy bàn', `Đã luân chuyển toàn bộ 4 dãy bàn cho tuần mới (${direction === 'next' ? 'Xoay tới Cột 1->2->3->4->1' : 'Xoay lùi Cột 4->3->2->1->4'})`);
  };

  const clearSeatingChart = () => {
    setSeatingChart([]);
    saveToStorage('seatingChart', []);
    scheduleAutoSync(2500);
    logActivity('Xóa sơ đồ lớp', 'Đã xóa toàn bộ phân công chỗ ngồi trên sơ đồ');
  };

  const saveSeatingChart = (newChart: SeatAssignment[]) => {
    setSeatingChart(newChart);
    saveToStorage('seatingChart', newChart);
    scheduleAutoSync(2500);
  };

  const exportClassDataToExcel = () => {
    // Student sheet
    const studentData = rankedStudents.map(item => ({
      'Xếp hạng': item.rankInClass,
      'Mã HS': item.student.studentCode,
      'Họ và tên': item.student.fullName,
      'Giới tính': item.student.gender,
      'Ngày sinh': item.student.dateOfBirth,
      'Tổ': `Tổ ${item.student.groupId}`,
      'Chức vụ': item.student.roleInClass,
      'Điểm thi đua': Number(item.totalScore.toFixed(1)),
      'Điểm cộng': item.bonusPoints,
      'Điểm trừ vi phạm': item.penaltyPoints,
      'Số lần vắng': item.totalAbsences,
      'Số lần đi muộn': item.totalLate,
      'Số vi phạm': item.totalViolations,
      'Số việc tốt': item.totalRewards,
      'Phụ huynh': item.student.parentName,
      'SĐT Phụ huynh': item.student.parentPhone,
      'Cần quan tâm': item.needsAttention ? (Array.isArray(item.attentionReasons) ? item.attentionReasons.join('; ') : '') : 'Bình thường',
    }));

    // Group sheet
    const groupData = rankedGroups.map(g => ({
      'Xếp hạng': g.rank,
      'Tổ': g.groupName,
      'Tổ trưởng': g.leaderName,
      'Sĩ số': g.memberCount,
      'Tổng điểm thi đua': Number(g.totalScore.toFixed(1)),
      'Điểm chuyên cần (20đ)': Number(g.attendanceScore.toFixed(1)),
      'Điểm học tập (25đ)': Number(g.academicScore.toFixed(1)),
      'Điểm nề nếp (20đ)': Number(g.disciplineScore.toFixed(1)),
      'Điểm vệ sinh (15đ)': Number(g.hygieneScore.toFixed(1)),
      'Điểm phong trào (10đ)': Number(g.activityScore.toFixed(1)),
      'Điểm đoàn kết (10đ)': Number(g.solidarityScore.toFixed(1)),
      'Tỷ lệ trực nhật sạch': `${g.cleanRate.toFixed(0)}%`,
    }));

    // Violations sheet
    const violationData = violations.map(v => {
      const stu = students.find(s => s.id === v.studentId);
      return {
        'Ngày': v.date,
        'Họ và tên': stu?.fullName || '',
        'Mã HS': stu?.studentCode || '',
        'Tổ': `Tổ ${stu?.groupId || ''}`,
        'Phân loại': v.category,
        'Nội dung vi phạm': v.title,
        'Mức độ': v.severity,
        'Điểm trừ': v.penaltyPoints,
        'Người ghi': v.recordedBy,
        'Trạng thái': v.status,
        'Biện pháp khắc phục': v.remedyAction || '',
      };
    });

    // Rewards sheet
    const rewardData = rewards.map(r => {
      const stu = students.find(s => s.id === r.studentId);
      return {
        'Ngày': r.date,
        'Họ và tên': stu?.fullName || '',
        'Mã HS': stu?.studentCode || '',
        'Tổ': `Tổ ${stu?.groupId || ''}`,
        'Danh mục': r.category,
        'Nội dung việc tốt / Thành tích': r.title,
        'Điểm cộng': r.bonusPoints,
        'Người ghi nhận': r.recordedBy,
        'Minh chứng': r.evidence || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const wsStudents = XLSX.utils.json_to_sheet(studentData);
    const wsGroups = XLSX.utils.json_to_sheet(groupData);
    const wsViolations = XLSX.utils.json_to_sheet(violationData);
    const wsRewards = XLSX.utils.json_to_sheet(rewardData);

    XLSX.utils.book_append_sheet(wb, wsStudents, 'Thi đua Học sinh');
    XLSX.utils.book_append_sheet(wb, wsGroups, 'Thi đua Tổ');
    XLSX.utils.book_append_sheet(wb, wsViolations, 'Sổ Vi phạm');
    XLSX.utils.book_append_sheet(wb, wsRewards, 'Sổ Khen thưởng');

    exportAllSheetsToExcelFile(
      {
        accounts,
        classInfo,
        students,
        attendance,
        violations,
        rewards,
        academicRecords,
        cleaningDuties,
        laborActivities,
        extracurricularActivities,
        evaluations,
        groupSummaries,
        settings,
        studentScores: rankedStudents,
        groupScores: rankedGroups,
        selectedWeek,
      },
      `So_Tay_Chu_Nhiem_${classInfo.className}_Tuan_${selectedWeek}.xlsx`
    );
    logActivity('Xuất 12 Sheet Excel', `Đã xuất toàn bộ 12 bảng dữ liệu lớp ${classInfo.className}`);
  };

  // Lưu và nạp kho dữ liệu riêng biệt cho từng tài khoản GVCN (mỗi GVCN một link và danh sách học sinh riêng biệt)
  const loadTeacherStore = (teacherUsername: string): boolean => {
    try {
      const cleanU = teacherUsername.trim().toLowerCase();
      const storeKey = `gvcn_teacher_store_${cleanU}`;
      const raw = localStorage.getItem(storeKey);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data) {
        if (data.classInfo) {
          setClassInfo(data.classInfo);
          classInfoRef.current = data.classInfo;
          saveToStorage('classInfo', data.classInfo);
        }
        if (data.googleSheetsConfig) {
          setGoogleSheetsConfig(data.googleSheetsConfig);
          saveToStorage('googleSheetsConfig', data.googleSheetsConfig);
        } else {
          const cleanCfg: GoogleSheetsConfig = {
            spreadsheetId: '',
            spreadsheetUrl: '',
            apiKey: '',
            appScriptUrl: '',
            autoSync: false,
            lastSyncedAt: null,
            syncStatus: 'idle',
            syncError: null,
            enabledSheets: {
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
            }
          };
          setGoogleSheetsConfig(cleanCfg);
          saveToStorage('googleSheetsConfig', cleanCfg);
        }
        if (Array.isArray(data.students)) {
          setStudents(data.students);
          studentsRef.current = data.students;
          saveToStorage('students', data.students);
        }
        if (Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
          accountsRef.current = data.accounts;
          saveToStorage('accounts', data.accounts);
        }
        if (Array.isArray(data.attendance)) {
          setAttendance(data.attendance);
          saveToStorage('attendance', data.attendance);
        }
        if (Array.isArray(data.violations)) {
          setViolations(data.violations);
          saveToStorage('violations', data.violations);
        }
        if (Array.isArray(data.rewards)) {
          setRewards(data.rewards);
          saveToStorage('rewards', data.rewards);
        }
        if (Array.isArray(data.academicRecords)) {
          setAcademicRecords(data.academicRecords);
          saveToStorage('academicRecords', data.academicRecords);
        }
        if (Array.isArray(data.cleaningDuties)) {
          setCleaningDuties(data.cleaningDuties);
          saveToStorage('cleaningDuties', data.cleaningDuties);
        }
        if (Array.isArray(data.laborActivities)) {
          setLaborActivities(data.laborActivities);
          saveToStorage('laborActivities', data.laborActivities);
        }
        if (Array.isArray(data.extracurricularActivities)) {
          setExtracurricularActivities(data.extracurricularActivities);
          saveToStorage('extracurricularActivities', data.extracurricularActivities);
        }
        if (Array.isArray(data.evaluations)) {
          setEvaluations(data.evaluations);
          saveToStorage('evaluations', data.evaluations);
        }
        if (Array.isArray(data.groupSummaries)) {
          setGroupSummaries(data.groupSummaries);
          saveToStorage('groupSummaries', data.groupSummaries);
        }
        if (Array.isArray(data.seatingChart)) {
          setSeatingChart(data.seatingChart);
          saveToStorage('seatingChart', data.seatingChart);
        }
        return true;
      }
    } catch (e) {
      console.error('Error loading teacher store:', e);
    }
    return false;
  };

  const saveTeacherStore = (teacherUsername?: string) => {
    try {
      const activeTeacher = accounts.find(a => a.role === 'gvcn' || a.category === 'gvcn') ||
        (currentUserRole.role === 'gvcn' ? accounts.find(a => a.id === currentUserRole.accountId) : undefined);
      const u = (teacherUsername || activeTeacher?.username)?.trim().toLowerCase();
      if (!u) return;
      const storeKey = `gvcn_teacher_store_${u}`;
      const payload = {
        classInfo: classInfoRef.current,
        googleSheetsConfig: googleSheetsConfig,
        students: studentsRef.current,
        accounts: accountsRef.current,
        attendance: attendanceRef.current,
        violations: violationsRef.current,
        rewards: rewardsRef.current,
        academicRecords: academicRecordsRef.current,
        cleaningDuties: cleaningDutiesRef.current,
        laborActivities: laborActivitiesRef.current,
        extracurricularActivities: extracurricularActivitiesRef.current,
        evaluations: evaluationsRef.current,
        groupSummaries: groupSummariesRef.current,
        seatingChart: seatingChartRef.current,
      };
      localStorage.setItem(storeKey, JSON.stringify(payload));
    } catch (_) {}
  };

  // Google Sheets Management
  const updateGoogleSheetsConfig = (newConfig: Partial<GoogleSheetsConfig>) => {
    setGoogleSheetsConfig(prev => {
      const updated = {
        ...prev,
        ...newConfig,
      };
      saveToStorage('googleSheetsConfig', updated);

      // Gắn link Google Sheet này trực tiếp vào tài khoản GVCN hiện tại
      const currentGVCN = accounts.find(a => a.role === 'gvcn' || a.category === 'gvcn' || a.id === currentUserRole.accountId);
      if (currentGVCN) {
        setAccounts(accs => {
          const updatedAccs = accs.map(a => a.id === currentGVCN.id ? { ...a, googleSheetsConfig: updated } : a);
          accountsRef.current = updatedAccs;
          saveToStorage('accounts', updatedAccs);
          return updatedAccs;
        });

        try {
          const storeKey = `gvcn_teacher_store_${currentGVCN.username.trim().toLowerCase()}`;
          const existing = JSON.parse(localStorage.getItem(storeKey) || '{}');
          existing.googleSheetsConfig = updated;
          localStorage.setItem(storeKey, JSON.stringify(existing));

          // Cập nhật cả trong danh sách GVCN đã đăng ký
          const regList: AccountUser[] = JSON.parse(localStorage.getItem('gvcn_registered_teachers') || '[]');
          const idx = regList.findIndex(t => t.username.toLowerCase() === currentGVCN.username.toLowerCase());
          if (idx >= 0) {
            regList[idx] = { ...regList[idx], googleSheetsConfig: updated };
            localStorage.setItem('gvcn_registered_teachers', JSON.stringify(regList));
          }
        } catch (_) {}
      }
      return updated;
    });
    logActivity('Cập nhật Google Sheets', 'Thay đổi cấu hình kết nối Google Sheet / Apps Script cá nhân');
  };

  const getFullAppData = (customData?: Partial<FullAppDataPayload>): FullAppDataPayload => {
    return {
      accounts: customData?.accounts || accountsRef.current,
      classInfo: customData?.classInfo || classInfoRef.current,
      students: customData?.students || studentsRef.current,
      attendance: customData?.attendance || attendanceRef.current,
      violations: customData?.violations || violationsRef.current,
      rewards: customData?.rewards || rewardsRef.current,
      academicRecords: customData?.academicRecords || academicRecordsRef.current,
      cleaningDuties: customData?.cleaningDuties || cleaningDutiesRef.current,
      laborActivities: customData?.laborActivities || laborActivitiesRef.current,
      extracurricularActivities: customData?.extracurricularActivities || extracurricularActivitiesRef.current,
      evaluations: customData?.evaluations || evaluationsRef.current,
      groupSummaries: customData?.groupSummaries || groupSummariesRef.current,
      settings: customData?.settings || settingsRef.current,
      studentScores: rankedStudents,
      groupScores: rankedGroups,
      selectedWeek,
      seatingChart: customData?.seatingChart || seatingChartRef.current || seatingChart,
      ...(customData || {}),
    };
  };

  const syncAllToGoogleSheets = async (customPayload?: Partial<FullAppDataPayload>, force: boolean = false): Promise<{ success: boolean; message: string }> => {
    if (isRemotePullingRef.current) {
      return { success: true, message: 'Đang tải dữ liệu từ Google Sheets, tạm hoãn lưu...' };
    }
    if (isSyncingRef.current) {
      hasQueuedSyncRef.current = true;
      return { success: true, message: 'Đang xử lý đồng bộ, đã thêm vào hàng đợi...' };
    }
    const data = getFullAppData(customPayload);

    // BẢO VỆ DỮ LIỆU TUYỆT ĐỐI:
    // Nếu data.students rỗng nhưng trong ref đang có học sinh, bảo tồn danh sách học sinh
    if ((!data.students || data.students.length === 0) && studentsRef.current.length > 0) {
      data.students = studentsRef.current;
    }

    // CHỈ CẬP NHẬT KHI CÓ THAY ĐỔI THỰC SỰ (Trừ khi người dùng bấm Lưu tức thì force = true):
    // Nếu không có customPayload và dữ liệu giống hệt lần đã lưu thành công trước đó, bỏ qua để tránh nghẽn mạng!
    const currentDataHash = computeDataHash(data);
    if (!force && !customPayload && lastSyncedHashRef.current && currentDataHash === lastSyncedHashRef.current) {
      hasPendingLocalUserChangesRef.current = false;
      return { success: true, message: 'Dữ liệu trên Google Sheet đã đồng bộ mới nhất (không có thay đổi mới)' };
    }

    isSyncingRef.current = true;
    hasQueuedSyncRef.current = false;
    setIsSyncingData(true);
    setGoogleSheetsConfig(prev => ({ ...prev, syncStatus: 'syncing', syncError: null }));

    // Bỏ thông báo đang lưu lên Google Sheets gây gián đoạn theo yêu cầu người dùng
    const isCadreOrTeacher = isHomeroomTeacher(currentUserRole.role) || isClassCadre(currentUserRole.role) || isClassAdmin(currentUserRole.role);

    try {
      const result = await syncToGoogleSheets(googleSheetsConfig, data);

      if (result.success) {
        lastSyncedHashRef.current = currentDataHash;
        const nowStr = new Date().toISOString();
        const timeStr = new Date().toLocaleTimeString('vi-VN');
        setGoogleSheetsConfig(prev => ({
          ...prev,
          syncStatus: 'success',
          lastSyncedAt: nowStr,
          syncError: null,
        }));
        hasPendingLocalUserChangesRef.current = false;

        // HIỆN THÔNG BÁO XÁC NHẬN LƯU THÀNH CÔNG CHO GVCN VÀ BAN CÁN SỰ LỚP
        if (isCadreOrTeacher) {
          const actionText = lastActionRef.current
            ? `${lastActionRef.current.action}${lastActionRef.current.target ? ': ' + lastActionRef.current.target : ''}`
            : 'Thay đổi thông tin lớp';
          setSyncNotification({
            visible: true,
            status: 'success',
            title: '✓ Đã xác nhận: Lưu thành công lên Google Sheets',
            message: `Toàn bộ dữ liệu của ${classInfoRef.current.className ? `Lớp ${classInfoRef.current.className}` : 'Lớp học'} đã được lưu an toàn vào Google Sheet.`,
            actor: lastActionRef.current?.actor || `${currentUserRole.title} (${currentUserRole.name})`,
            timestamp: timeStr,
            actionDetails: actionText,
            spreadsheetUrl: googleSheetsConfig.spreadsheetUrl,
          });
        }
      } else {
        setGoogleSheetsConfig(prev => ({
          ...prev,
          syncStatus: 'error',
          syncError: result.message,
        }));

        if (isCadreOrTeacher) {
          setSyncNotification({
            visible: true,
            status: 'error',
            title: '⚠️ Chưa thể lưu lên Google Sheets',
            message: result.message || 'Lỗi mạng hoặc liên kết Apps Script. Dữ liệu đã lưu an toàn trên máy.',
            actor: `${currentUserRole.title} (${currentUserRole.name})`,
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            actionDetails: lastActionRef.current?.action,
            spreadsheetUrl: googleSheetsConfig.spreadsheetUrl,
          });
        }
      }
      return result;
    } finally {
      isSyncingRef.current = false;
      setIsSyncingData(false);
      if (hasQueuedSyncRef.current) {
        hasQueuedSyncRef.current = false;
        const nextHash = computeDataHash();
        if (nextHash !== lastSyncedHashRef.current) {
          scheduleAutoSync(400);
        }
      }
    }
  };

  const dismissSyncNotification = useCallback(() => {
    setSyncNotification(prev => (prev ? { ...prev, visible: false } : null));
  }, []);

  const triggerManualSyncWithConfirmation = useCallback(async (reason?: string): Promise<{ success: boolean; message: string }> => {
    setSyncNotification({
      visible: true,
      status: 'saving',
      title: 'Đang lưu ngay lên Google Sheets...',
      message: reason ? `Đang thực hiện: ${reason}` : 'Đang gửi dữ liệu toàn bộ lớp lên Google Sheets...',
      actor: `${currentUserRole.title} (${currentUserRole.name})`,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      actionDetails: reason || 'Lưu ngay lập tức',
      spreadsheetUrl: googleSheetsConfig.spreadsheetUrl,
    });
    return await syncAllToGoogleSheets(undefined, true);
  }, [currentUserRole, googleSheetsConfig.spreadsheetUrl]);

  const applyClassInfo = (info: Partial<ClassInfo>, explicitTotalStudents?: number) => {
    const studentCount = explicitTotalStudents !== undefined
      ? explicitTotalStudents
      : (info.totalStudents ?? (students.length > 0 ? students.length : 33));

    let teacher = (info.homeroomTeacher || classInfo.homeroomTeacher || '').trim();
    let email = (info.teacherEmail || classInfo.teacherEmail || '').trim();
    let phone = (info.teacherPhone || classInfo.teacherPhone || '').trim();

    if (teacher.includes('@')) {
      if (!email) email = teacher;
      teacher = classInfo.homeroomTeacher && !classInfo.homeroomTeacher.includes('@') ? classInfo.homeroomTeacher : '';
    } else if (/^[0-9+\s().-]{7,}$/.test(teacher)) {
      if (!phone) phone = teacher;
      teacher = classInfo.homeroomTeacher && !/^[0-9+\s().-]{7,}$/.test(classInfo.homeroomTeacher) ? classInfo.homeroomTeacher : '';
    }
    if (!teacher) teacher = classInfo.homeroomTeacher || '';

    if (phone) {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length === 9 && !digits.startsWith('0')) {
        phone = '0' + digits;
      }
    }

    const cleanInfo: ClassInfo = {
      ...classInfo,
      ...info,
      className: (info.className || classInfo.className || '').trim(),
      homeroomTeacher: capitalizeVietnameseName(teacher),
      teacherPhone: phone,
      teacherEmail: email,
      schoolYear: (info.schoolYear || classInfo.schoolYear || '2026 - 2027').trim(),
      totalStudents: studentCount,
    };
    setClassInfo(cleanInfo);
    saveToStorage('classInfo', cleanInfo);

    if (cleanInfo.homeroomTeacher) {
      const trimmedTeacher = cleanInfo.homeroomTeacher;
      setAccounts(prev => prev.map(a => {
        if (a.role === 'gvcn' || a.category === 'gvcn' || a.id === 'acc_gvcn') {
          return {
            ...a,
            fullName: trimmedTeacher,
            phone: cleanInfo.teacherPhone || a.phone,
            email: cleanInfo.teacherEmail || a.email,
          };
        }
        return a;
      }));

      if (currentUserRole.role === 'gvcn' || currentUserRole.accountId === 'acc_gvcn') {
        setCurrentUserRole(prev => ({
          ...prev,
          name: trimmedTeacher,
        }));
      }
    }
    return cleanInfo;
  };

  const pullFromGoogleSheets = async (options?: { silent?: boolean }): Promise<{ success: boolean; message: string }> => {
    if (!googleSheetsConfig.spreadsheetId && !googleSheetsConfig.appScriptUrl) {
      return {
        success: false,
        message: 'Vui lòng dán Link Google Apps Script Web App hoặc Google Sheet ID trước khi tải dữ liệu!',
      };
    }

    isRemotePullingRef.current = true;
    try {
      const currentFullData = getFullAppData();
      const result = await pullDataFromGoogleSheets(googleSheetsConfig, currentFullData);
      if (result.success && result.data) {
        if (!options?.silent) {
          // Tự động tạo bản snapshot lưu vết trước khi cập nhật dữ liệu từ Google Sheets
          const beforeRestoreSnapshot: GVCNBackupSnapshot = {
            id: createUniqueId('auto_before_pull'),
            createdAt: new Date().toISOString(),
            className: classInfo?.className || '',
            homeroomTeacher: classInfo?.homeroomTeacher || '',
            schoolYear: classInfo?.schoolYear || '2026 - 2027',
            totalStudents: students.length,
            note: `Tự động lưu trước khi tải từ Google Sheets (${new Date().toLocaleTimeString('vi-VN')})`,
            type: 'before_restore',
            data: currentFullData,
          };
          setGvcnBackupHistory(prev => {
            const updated = [beforeRestoreSnapshot, ...prev.slice(0, 19)];
            saveToStorage('gvcnBackupHistory', updated);
            return updated;
          });
        }

        if (result.data.students && Array.isArray(result.data.students)) {
          // BẢO VỆ DỮ LIỆU TUYỆT ĐỐI:
          // Nếu Google Sheet trả về 0 học sinh nhưng ứng dụng đang có học sinh,
          // TUYỆT ĐỐI KHÔNG xóa học sinh trên ứng dụng!
          // Thay vào đó, giữ nguyên học sinh và đồng bộ ngay lên Google Sheets để lưu vĩnh viễn trên Cloud.
          if (result.data.students.length === 0 && studentsRef.current.length > 0) {
            console.warn('Google Sheets trả về 0 học sinh nhưng ứng dụng đang có học sinh. Bảo vệ dữ liệu hiện có và đồng bộ lên Google Sheets!');
            scheduleAutoSync(500);
          } else if (result.data.students.length > 0) {
            const protectedStudents = applyPermanentAvatarsToStudents(result.data.students);
            setStudents(protectedStudents);
            studentsRef.current = protectedStudents;
            saveToStorage('students', protectedStudents);
          }
        }
        if (result.data.accounts && Array.isArray(result.data.accounts)) {
          try {
            const pPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
            result.data.accounts.forEach(acc => {
              if (acc.pin && acc.pin !== DEFAULT_STUDENT_PIN && acc.pin !== '123' && acc.pin !== '123456') {
                pPins[acc.id] = acc.pin;
                if (acc.username) pPins[acc.username.toLowerCase()] = acc.pin;
                if (acc.studentCode) pPins[acc.studentCode.toLowerCase()] = acc.pin;
                if (acc.studentId) pPins[acc.studentId] = acc.pin;
              }
            });
            localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(pPins));
          } catch (_) {}
          const protectedAccounts = applyPermanentAvatarsToAccounts(result.data.accounts);
          setAccounts(protectedAccounts);
          saveToStorage('accounts', protectedAccounts);
        }
        if (result.data.attendance && Array.isArray(result.data.attendance)) {
          setAttendance(result.data.attendance);
          saveToStorage('attendance', result.data.attendance);
        }
        if (result.data.violations && Array.isArray(result.data.violations)) {
          const sanitizedVio = result.data.violations.filter(isValidViolationRecord);
          setViolations(sanitizedVio);
          saveToStorage('violations', sanitizedVio);
        }
        if (result.data.rewards && Array.isArray(result.data.rewards)) {
          const sanitizedRew = result.data.rewards.filter(isValidRewardRecord);
          setRewards(sanitizedRew);
          saveToStorage('rewards', sanitizedRew);
        }
        if (result.data.academicRecords && Array.isArray(result.data.academicRecords)) {
          setAcademicRecords(result.data.academicRecords);
          saveToStorage('academicRecords', result.data.academicRecords);
        }
        if (result.data.cleaningDuties && Array.isArray(result.data.cleaningDuties)) {
          setCleaningDuties(result.data.cleaningDuties);
          saveToStorage('cleaningDuties', result.data.cleaningDuties);
        }
        if (result.data.laborActivities && Array.isArray(result.data.laborActivities)) {
          setLaborActivities(result.data.laborActivities);
          saveToStorage('laborActivities', result.data.laborActivities);
        }
        if (result.data.extracurricularActivities && Array.isArray(result.data.extracurricularActivities)) {
          setExtracurricularActivities(result.data.extracurricularActivities);
          saveToStorage('extracurricularActivities', result.data.extracurricularActivities);
        }
        if (result.data.evaluations && Array.isArray(result.data.evaluations)) {
          setEvaluations(result.data.evaluations);
          saveToStorage('evaluations', result.data.evaluations);
        }
        if (result.data.groupSummaries && Array.isArray(result.data.groupSummaries)) {
          setGroupSummaries(result.data.groupSummaries);
          saveToStorage('groupSummaries', result.data.groupSummaries);
        }
        if (result.data.seatingChart && Array.isArray(result.data.seatingChart)) {
          setSeatingChart(result.data.seatingChart);
          saveToStorage('seatingChart', result.data.seatingChart);
        }
        if (result.data.classInfo) {
          applyClassInfo(result.data.classInfo, result.data.students?.length);
        } else if (result.data.students) {
          applyClassInfo({ totalStudents: result.data.students.length }, result.data.students.length);
        }
        if (result.data.settings && Object.keys(result.data.settings).length > 0) {
          setSettings(result.data.settings);
          saveToStorage('settings', result.data.settings);
        }

        const nowStr = new Date().toISOString();
        setGoogleSheetsConfig(prev => ({
          ...prev,
          syncStatus: 'success',
          lastSyncedAt: nowStr,
          syncError: null,
        }));
        if (!options?.silent) {
          logActivity('Tải dữ liệu Google Sheets', result.message);
        }
        hasPendingLocalUserChangesRef.current = false;
        // Cập nhật chữ ký dữ liệu ngay khi tải về để đánh dấu dữ liệu đã đồng bộ
        setTimeout(() => {
          lastSyncedHashRef.current = computeDataHash();
        }, 100);
        return { success: true, message: result.message };
      }
      return result;
    } catch (e: any) {
      return { success: false, message: 'Lỗi tải dữ liệu từ Google Sheets: ' + (e.message || 'Không thể kết nối') };
    } finally {
      setTimeout(() => {
        isRemotePullingRef.current = false;
      }, 500);
    }
  };

  // 1. Khởi động ứng dụng: Tải dữ liệu từ Google Sheets một lần duy nhất khi mở trang
  const isInitialPullDone = useRef(false);
  useEffect(() => {
    if (!isInitialPullDone.current) {
      isInitialPullDone.current = true;
      const url = googleSheetsConfig.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
      const sheetId = googleSheetsConfig.spreadsheetId?.trim();
      // CHỈ tải từ Google Sheets nếu giáo viên đã tự liên kết bảng tính riêng (khác rỗng và không phải bảng mẫu cũ)
      if (url && sheetId && sheetId !== '1szjTU26ybOsfMaanFjzXJMCs2JnqAnxWOLUAj_uISBA') {
        setIsInitialLoadingData(true);
        isRemotePullingRef.current = true;
        pullFromGoogleSheets({ silent: true })
          .then(res => {
            if (res && res.success) {
              lastSyncedHashRef.current = computeDataHash();
            }
          })
          .catch(e => {
            console.warn('Khởi động: Lỗi kết nối Google Sheets ban đầu:', e);
          })
          .finally(() => {
            setIsInitialLoadingData(false);
            setTimeout(() => {
              if (!lastSyncedHashRef.current) {
                lastSyncedHashRef.current = computeDataHash();
              }
              isRemotePullingRef.current = false;
              isAppReadyRef.current = true;
              hasPendingLocalUserChangesRef.current = false;
            }, 500);
          });
      } else {
        setIsInitialLoadingData(false);
        setTimeout(() => {
          lastSyncedHashRef.current = computeDataHash();
          isAppReadyRef.current = true;
        }, 500);
      }
    }
  }, [computeDataHash, googleSheetsConfig.spreadsheetId, googleSheetsConfig.appScriptUrl]);

  // ĐÃ LOẠI BỎ CHẠY LIÊN TỤC: Không còn setInterval 25s và không còn kéo dữ liệu liên tục khi chuyển tab.
  // Google Sheets CHỈ cập nhật khi người dùng có thay đổi thực tế trên ứng dụng.

  // Keep classInfo.totalStudents in sync with students.length
  useEffect(() => {
    if (students.length > 0 && classInfo.totalStudents !== students.length) {
      setClassInfo(prev => ({ ...prev, totalStudents: students.length }));
    }
  }, [students.length]);

  const testGoogleSheetsConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!googleSheetsConfig.spreadsheetId && !googleSheetsConfig.appScriptUrl) {
      return {
        success: false,
        message: 'Chưa có thông tin Spreadsheet ID hoặc URL Web App. Vui lòng nhập để kiểm tra.',
      };
    }
    try {
      if (googleSheetsConfig.appScriptUrl) {
        const res = await fetch(`${googleSheetsConfig.appScriptUrl}?action=ping`);
        const json = await res.json();
        if (json.status === 'ok' || json.message) {
          return { success: true, message: 'Kết nối Google Apps Script Web App thành công!' };
        }
      }
      if (googleSheetsConfig.apiKey && googleSheetsConfig.spreadsheetId) {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsConfig.spreadsheetId}?key=${googleSheetsConfig.apiKey}`);
        if (res.ok) {
          return { success: true, message: 'Kết nối Google Sheets API chính thức thành công (Key hợp lệ)!' };
        } else {
          const err = await res.json();
          return { success: false, message: err.error?.message || 'Google API Key hoặc Spreadsheet ID chưa đúng.' };
        }
      }
      return { success: true, message: 'Định dạng liên kết Google Sheet hợp lệ. Bạn có thể thực hiện đồng bộ ngay.' };
    } catch (e: any) {
      return { success: false, message: 'Lỗi kiểm tra kết nối: ' + (e.message || 'Không thể gửi yêu cầu') };
    }
  };

  // ==========================================
  // HỆ THỐNG SAO LƯU & GỌI LẠI DỮ LIỆU CHO GVCN
  // ==========================================
  const backupGVCNData = async (options?: {
    exportExcel?: boolean;
    exportJson?: boolean;
    note?: string;
  }): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
    snapshotId?: string;
    sheetsSynced?: boolean;
  }> => {
    const payload = getFullAppData();
    const now = new Date();
    const timestampStr = now.toISOString();
    const displayTime = now.toLocaleString('vi-VN');
    const snapshotId = createUniqueId('gvcn_backup');

    // 1. Lưu snapshot cục bộ an toàn
    const newSnapshot: GVCNBackupSnapshot = {
      id: snapshotId,
      createdAt: timestampStr,
      className: payload.classInfo?.className || '',
      homeroomTeacher: payload.classInfo?.homeroomTeacher || 'Giáo viên Chủ nhiệm',
      schoolYear: payload.classInfo?.schoolYear || '2026 - 2027',
      totalStudents: payload.students?.length || 0,
      note: options?.note || `Bản sao lưu GVCN lúc ${displayTime}`,
      type: 'manual',
      data: payload,
    };

    setGvcnBackupHistory(prev => {
      const updated = [newSnapshot, ...prev.slice(0, 19)];
      saveToStorage('gvcnBackupHistory', updated);
      return updated;
    });
    setLastGVCNBackupAt(timestampStr);
    saveToStorage('lastGVCNBackupAt', timestampStr);

    // 2. Đồng bộ tự động lên Google Sheets (Tạo và cập nhật sheet ThongTinLop_GVCN cùng 12 sheet)
    let sheetsSynced = false;
    let syncMsg = '';
    if (googleSheetsConfig.appScriptUrl || (googleSheetsConfig.spreadsheetId && googleSheetsConfig.apiKey)) {
      try {
        const syncRes = await syncAllToGoogleSheets();
        sheetsSynced = syncRes.success;
        if (syncRes.success) {
          syncMsg = ' • Đã lưu lên Google Sheet (Sheet ThongTinLop_GVCN)';
        }
      } catch (err) {
        console.warn('Backup auto sync warning:', err);
      }
    }

    // 3. Xuất file Excel 13 sheet nếu có yêu cầu
    if (options?.exportExcel) {
      try {
        const safeName = (payload.classInfo?.className || 'Class').replace(/[^a-zA-Z0-9]/g, '_');
        const dStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        exportAllSheetsToExcelFile(payload, `SaoLuu_GVCN_${safeName}_13Sheet_${dStr}.xlsx`);
      } catch (err) {
        console.error('Lỗi khi xuất file Excel sao lưu:', err);
      }
    }

    // 4. Xuất file JSON nếu có yêu cầu
    if (options?.exportJson) {
      try {
        const safeName = (payload.classInfo?.className || 'Class').replace(/[^a-zA-Z0-9]/g, '_');
        const dStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SaoLuu_GVCN_${safeName}_FullData_${dStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Lỗi khi xuất file JSON sao lưu:', err);
      }
    }

    const message = `Đã sao lưu an toàn toàn bộ dữ liệu lớp ${payload.classInfo?.className || ''} - GVCN: ${payload.classInfo?.homeroomTeacher || ''}${syncMsg}!`;
    logActivity('Sao lưu dữ liệu GVCN', message);

    return {
      success: true,
      message,
      timestamp: timestampStr,
      snapshotId,
      sheetsSynced,
    };
  };

  const restoreGVCNBackup = (snapshotIdOrData: string | any): { success: boolean; message: string } => {
    let payload: FullAppDataPayload | null = null;
    if (typeof snapshotIdOrData === 'string') {
      const found = gvcnBackupHistory.find(b => b.id === snapshotIdOrData);
      if (found && found.data) {
        payload = found.data;
      }
    } else if (snapshotIdOrData && typeof snapshotIdOrData === 'object') {
      payload = snapshotIdOrData;
    }

    if (!payload) {
      return { success: false, message: 'Không tìm thấy dữ liệu bản sao lưu để phục hồi!' };
    }

    try {
      if (payload.classInfo) applyClassInfo(payload.classInfo);
      if (Array.isArray(payload.students) && payload.students.length > 0) setStudents(payload.students);
      if (Array.isArray(payload.accounts) && payload.accounts.length > 0) setAccounts(payload.accounts);
      if (Array.isArray(payload.attendance)) setAttendance(payload.attendance);
      if (Array.isArray(payload.violations)) setViolations(payload.violations.filter(isValidViolationRecord));
      if (Array.isArray(payload.rewards)) setRewards(payload.rewards.filter(isValidRewardRecord));
      if (Array.isArray(payload.academicRecords)) setAcademicRecords(payload.academicRecords);
      if (Array.isArray(payload.cleaningDuties)) setCleaningDuties(payload.cleaningDuties);
      if (Array.isArray(payload.laborActivities)) setLaborActivities(payload.laborActivities);
      if (Array.isArray(payload.extracurricularActivities)) setExtracurricularActivities(payload.extracurricularActivities);
      if (Array.isArray(payload.evaluations)) setEvaluations(payload.evaluations);
      if (Array.isArray(payload.groupSummaries)) setGroupSummaries(payload.groupSummaries);
      if (Array.isArray((payload as any).seatingChart)) {
        setSeatingChart((payload as any).seatingChart);
        saveToStorage('seatingChart', (payload as any).seatingChart);
      }
      if (payload.settings && Object.keys(payload.settings).length > 0) setSettings(payload.settings);

      const msg = `Đã khôi phục thành công dữ liệu lớp ${payload.classInfo?.className || ''} - GVCN: ${payload.classInfo?.homeroomTeacher || ''}!`;
      logActivity('Khôi phục dữ liệu GVCN', msg);
      return { success: true, message: msg };
    } catch (err: any) {
      return { success: false, message: 'Lỗi khôi phục bản sao lưu: ' + (err.message || 'Lỗi không xác định') };
    }
  };

  const deleteGVCNBackup = (snapshotId: string) => {
    setGvcnBackupHistory(prev => {
      const updated = prev.filter(b => b.id !== snapshotId);
      saveToStorage('gvcnBackupHistory', updated);
      return updated;
    });
    logActivity('Xóa bản sao lưu GVCN', `Đã xóa bản sao lưu mã ${snapshotId}`);
  };

  const exportDataToJson = (): { success: boolean; message: string; filename?: string } => {
    try {
      const payload = getFullAppData();
      const now = new Date();
      const safeName = (payload.classInfo?.className || 'Lop').replace(/[^a-zA-Z0-9]/g, '_');
      const dStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `SaoLuu_ToanBoDuLieu_${safeName}_${dStr}.json`;

      const fullExport = {
        app: 'SoTayChuNhiem',
        version: '2.0',
        exportedAt: now.toISOString(),
        exportedBy: currentUserRole.name || classInfo.homeroomTeacher || 'GVCN',
        className: payload.classInfo?.className || '',
        homeroomTeacher: payload.classInfo?.homeroomTeacher || '',
        studentsCount: payload.students?.length || 0,
        data: payload,
      };

      const jsonStr = JSON.stringify(fullExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const msg = `Đã xuất toàn bộ dữ liệu lớp ${payload.classInfo?.className || ''} ra file JSON (${(jsonStr.length / 1024).toFixed(1)} KB) thành công!`;
      logActivity('Xuất file JSON', msg);
      return { success: true, message: msg, filename };
    } catch (err: any) {
      const msg = 'Lỗi khi xuất file JSON: ' + (err.message || 'Lỗi không xác định');
      return { success: false, message: msg };
    }
  };

  const importDataFromJson = (jsonContent: string | object): { success: boolean; message: string } => {
    try {
      let parsed: any;
      if (typeof jsonContent === 'string') {
        parsed = JSON.parse(jsonContent);
      } else {
        parsed = jsonContent;
      }

      const payload: FullAppDataPayload = parsed.data && typeof parsed.data === 'object' && (parsed.data.classInfo || parsed.data.students)
        ? parsed.data
        : parsed;

      if (!payload || typeof payload !== 'object') {
        return { success: false, message: 'Tệp JSON không hợp lệ hoặc không có dữ liệu lớp học.' };
      }

      // Lưu tự động một bản snapshot an toàn trước khi khôi phục
      backupGVCNData({ exportExcel: false, note: 'Tự động sao lưu an toàn trước khi khôi phục từ file JSON' });

      const restoreRes = restoreGVCNBackup(payload);
      if (restoreRes.success) {
        logActivity('Nạp file JSON', `Đã phục hồi dữ liệu từ file JSON lớp ${payload.classInfo?.className || ''}`);
        return { success: true, message: `Khôi phục thành công toàn bộ dữ liệu lớp học từ file JSON!` };
      } else {
        return restoreRes;
      }
    } catch (err: any) {
      return { success: false, message: 'Lỗi đọc file JSON: ' + (err.message || 'Tệp JSON không đúng định dạng') };
    }
  };

  // Account Management
  const switchAccount = (accountId: string): boolean => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return false;

    // Find or create matching UserRole
    const resolvedStudentId = acc.studentId ||
      students.find(s => s.fullName.toLowerCase().trim() === acc.fullName.toLowerCase().trim())?.id;
    const matchingRole = availableRoles.find(r => r.accountId === acc.id || r.role === acc.role);
    if (matchingRole) {
      setCurrentUserRole({
        ...matchingRole,
        name: acc.fullName,
        title: acc.title,
        avatar: acc.avatar || matchingRole.avatar,
        studentId: resolvedStudentId || matchingRole.studentId,
        groupId: acc.groupId || matchingRole.groupId,
        accountId: acc.id,
      });
    } else {
      setCurrentUserRole({
        role: acc.role,
        title: acc.title,
        name: acc.fullName,
        studentId: resolvedStudentId,
        groupId: acc.groupId,
        accountId: acc.id,
        avatar: acc.avatar,
      });
    }

    // If the switched account is GVCN, immediately synchronize classInfo homeroomTeacher and load teacher store
    if (acc.role === 'gvcn' || acc.category === 'gvcn' || acc.id === 'acc_gvcn') {
      loadTeacherStore(acc.username);
      setClassInfo(prev => ({
        ...prev,
        homeroomTeacher: acc.fullName,
        teacherPhone: acc.phone || prev.teacherPhone,
        teacherEmail: acc.email || prev.teacherEmail,
      }));
    }

    // Update lastLoginAt
    setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, lastLoginAt: new Date().toISOString() } : a));
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gvcn_session_active', 'true');
      }
    } catch (_) {}
    logActivity('Chuyển tài khoản', `Đăng nhập vai trò [${acc.title}] ${acc.fullName}`, false);
    return true;
  };

  const loginWithCredentials = (username: string, pin: string): { success: boolean; message: string; user?: AccountUser } => {
    const cleanU = username.trim().toLowerCase();

    // 1. Tìm trong danh sách tài khoản hiện thời
    let found = accounts.find(a => a.username.toLowerCase() === cleanU);
    if (!found) {
      found = accounts.find(a => a.studentCode && a.studentCode.trim().toLowerCase() === cleanU);
    }
    if (!found) {
      found = accounts.find(a => {
        const u = generateStudentUsername(a.fullName, a.studentCode);
        return u.toLowerCase() === cleanU;
      });
    }

    // 2. Nếu chưa thấy, tìm trong các bucket GVCN khác đã đăng ký trên máy
    if (!found) {
      try {
        const regList: AccountUser[] = JSON.parse(localStorage.getItem('gvcn_registered_teachers') || '[]');
        for (const teacher of regList) {
          if (teacher.username.toLowerCase() === cleanU) {
            saveTeacherStore();
            loadTeacherStore(teacher.username);
            found = teacher;
            break;
          }
          const storeKey = `gvcn_teacher_store_${teacher.username.toLowerCase()}`;
          const raw = localStorage.getItem(storeKey);
          if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data.accounts)) {
              const matchedStudent = data.accounts.find((a: AccountUser) =>
                a.username.toLowerCase() === cleanU ||
                (a.studentCode && a.studentCode.toLowerCase() === cleanU) ||
                generateStudentUsername(a.fullName, a.studentCode).toLowerCase() === cleanU
              );
              if (matchedStudent) {
                saveTeacherStore();
                loadTeacherStore(teacher.username);
                found = matchedStudent;
                break;
              }
            }
          }
        }
      } catch (_) {}
    }

    if (!found) {
      return { success: false, message: 'Tên đăng nhập hoặc Mã học sinh không tồn tại trong hệ thống!' };
    }

    // Nếu là GVCN thì nạp kho dữ liệu riêng của GVCN đó
    if (found.role === 'gvcn' || found.category === 'gvcn') {
      saveTeacherStore();
      loadTeacherStore(found.username);
    }

    let effectivePin = found.pin;
    try {
      const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
      const savedPin = permanentPins[found.id] ||
        permanentPins[found.username.toLowerCase()] ||
        (found.studentId ? permanentPins[found.studentId] : undefined) ||
        (found.studentCode ? permanentPins[found.studentCode.toLowerCase()] : undefined);
      if (savedPin) effectivePin = savedPin;
    } catch (_) {}

    const cleanInputPin = pin.trim();
    // Chấp nhận cả 123456 và 123 cho mật khẩu ban đầu
    const isPinMatch = effectivePin === cleanInputPin ||
      ((cleanInputPin === '123456' || cleanInputPin === '123') && (!effectivePin || effectivePin === '123' || effectivePin === '123456'));

    if (!isPinMatch) {
      return { success: false, message: 'Mật khẩu / Mã PIN bảo mật không chính xác!' };
    }
    switchAccount(found.id);
    return { success: true, message: `Chào mừng ${found.title} ${found.fullName}!`, user: found };
  };

  const loginWithGoogle = async (profile: {
    email: string;
    name: string;
    avatar?: string;
    googleId?: string;
  }): Promise<{ success: boolean; message: string; user?: AccountUser; needsRegistration?: boolean }> => {
    try {
      const cleanEmail = profile.email.trim().toLowerCase();
      let matchedAccount = accounts.find(
        a => (a.googleEmail && a.googleEmail.toLowerCase() === cleanEmail) ||
             (a.email && a.email.toLowerCase() === cleanEmail)
      );

      // Nếu chưa tìm thấy trong active accounts, tìm trong danh sách GVCN đã đăng ký
      if (!matchedAccount) {
        try {
          const regList: AccountUser[] = JSON.parse(localStorage.getItem('gvcn_registered_teachers') || '[]');
          const fromReg = regList.find(
            a => (a.googleEmail && a.googleEmail.toLowerCase() === cleanEmail) ||
                 (a.email && a.email.toLowerCase() === cleanEmail)
          );
          if (fromReg) {
            saveTeacherStore();
            loadTeacherStore(fromReg.username);
            matchedAccount = fromReg;
          }
        } catch (_) {}
      }

      if (matchedAccount) {
        if (matchedAccount.role === 'gvcn' || matchedAccount.category === 'gvcn') {
          saveTeacherStore();
          loadTeacherStore(matchedAccount.username);
        }
        const resolvedRole: UserRole = {
          role: matchedAccount.role,
          title: matchedAccount.title,
          name: matchedAccount.fullName,
          studentId: matchedAccount.studentId,
          groupId: matchedAccount.groupId,
          accountId: matchedAccount.id,
          avatar: matchedAccount.avatar || profile.avatar,
        };
        setCurrentUserRole(resolvedRole);
        saveToStorage('currentUserRole', resolvedRole);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('gvcn_session_active', 'true');
        }

        setAccounts(prev => prev.map(a => a.id === matchedAccount.id ? {
          ...a,
          lastLoginAt: new Date().toISOString(),
          avatar: profile.avatar || a.avatar,
          authProvider: 'google',
          googleEmail: cleanEmail,
          googleId: profile.googleId || a.googleId,
        } : a));

        if (matchedAccount.role === 'gvcn') {
          setClassInfo(prev => ({
            ...prev,
            homeroomTeacher: matchedAccount.fullName,
            teacherEmail: cleanEmail,
          }));
        }

        logActivity('Đăng nhập Google', `Đăng nhập qua Google: ${matchedAccount.fullName} (${cleanEmail})`, false);

        return {
          success: true,
          message: `Chào mừng Thầy/Cô ${matchedAccount.fullName}! Đăng nhập tài khoản Google thành công.`,
          user: matchedAccount,
        };
      } else {
        return {
          success: false,
          needsRegistration: true,
          message: `Tài khoản Google (${cleanEmail}) chưa đăng ký trong hệ thống. Vui lòng hoàn tất thông tin để khởi tạo lớp mới!`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Lỗi đăng nhập Google: ' + (err.message || 'Không thể xác thực'),
      };
    }
  };

  const registerTeacherAccount = async (data: TeacherRegistrationData): Promise<{ success: boolean; message: string; account?: AccountUser }> => {
    try {
      const cleanFullName = data.fullName.trim();
      if (!cleanFullName) {
        return { success: false, message: 'Vui lòng nhập Họ và tên Giáo viên Chủ nhiệm!' };
      }
      const cleanUsername = data.username.trim().toLowerCase();
      if (!cleanUsername) {
        return { success: false, message: 'Vui lòng nhập Tên đăng nhập mong muốn!' };
      }
      if (!data.pin || data.pin.trim().length < 3) {
        return { success: false, message: 'Mật khẩu / Mã PIN bảo mật phải có ít nhất 3 ký tự!' };
      }
      const cleanClassName = data.className.trim();
      if (!cleanClassName) {
        return { success: false, message: 'Vui lòng nhập Tên lớp chủ nhiệm (ví dụ: 10A1, 11B2, 12C7)!' };
      }

      // 1. Wipe all old background data so the new teacher starts 100% fresh!
      setStudents([]);
      setAttendance([]);
      setViolations([]);
      setRewards([]);
      setAcademicRecords([]);
      setCleaningDuties([]);
      setLaborActivities([]);
      setExtracurricularActivities([]);
      setEvaluations([]);
      setGroupSummaries([]);
      setSeatingChart([]);
      setGvcnBackupHistory([]);
      setLastGVCNBackupAt(null);

      // Clean local storage keys for old data
      try {
        localStorage.removeItem('gvcn_app_students');
        localStorage.removeItem('gvcn_app_attendance');
        localStorage.removeItem('gvcn_app_violations');
        localStorage.removeItem('gvcn_app_rewards');
        localStorage.removeItem('gvcn_app_academicRecords');
        localStorage.removeItem('gvcn_app_cleaningDuties');
        localStorage.removeItem('gvcn_app_laborActivities');
        localStorage.removeItem('gvcn_app_extracurricularActivities');
        localStorage.removeItem('gvcn_app_evaluations');
        localStorage.removeItem('gvcn_app_groupSummaries');
        localStorage.removeItem('gvcn_app_seatingChart');
        localStorage.removeItem('gvcn_app_gvcnBackupHistory');
        localStorage.removeItem('gvcn_app_lastGVCNBackupAt');
        localStorage.removeItem('teacher_app_permanent_pins');
      } catch (_) {}

      // Reset Google Sheets config to clean disconnected state
      const cleanSheetsConfig: GoogleSheetsConfig = {
        ...googleSheetsConfig,
        spreadsheetId: '',
        spreadsheetUrl: '',
        apiKey: '',
        appScriptUrl: '',
        autoSync: false,
        lastSyncedAt: null,
        syncStatus: 'idle',
        syncError: null,
      };
      setGoogleSheetsConfig(cleanSheetsConfig);
      saveToStorage('googleSheetsConfig', cleanSheetsConfig);

      // 2. Create the new ClassInfo
      const newClassInfo: ClassInfo = {
        className: cleanClassName,
        schoolYear: data.schoolYear?.trim() || '2026 - 2027',
        homeroomTeacher: cleanFullName,
        teacherPhone: data.phone?.trim() || '',
        teacherEmail: data.email?.trim() || '',
        totalStudents: 0,
        totalGroups: 4,
        roomNumber: '',
        motto: data.motto?.trim() || 'Mỗi ngày cố gắng 1 chút, thành công ngày càng sẽ gần hơn',
        gradeLevel: data.gradeLevel || 'Khối 10',
        semester: data.semester || 'Học kỳ I',
        schoolName: data.schoolName?.trim() || '',
        bannerUrl: '',
      };
      setClassInfo(newClassInfo);
      saveToStorage('classInfo', newClassInfo);

      // 3. Create new GVCN Account
      const newTeacherAccount: AccountUser = {
        id: `acc_gvcn_${Date.now()}`,
        username: cleanUsername,
        pin: data.pin.trim(),
        fullName: cleanFullName,
        role: 'gvcn',
        title: 'Giáo viên Chủ nhiệm',
        category: 'gvcn',
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        avatar: data.googleAvatar || (data.authProvider === 'google'
          ? getGoogleInitialAvatar(cleanFullName, data.email || '')
          : 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80'),
        permissions: [
          'Toàn quyền quản trị lớp',
          'Quản lý học sinh & cán sự',
          'Cấu hình thi đua',
          'Xuất/Nhập dữ liệu',
          'Đồng bộ Google Sheets',
        ],
        status: 'active',
        isCustomPin: true,
        authProvider: data.authProvider || 'credentials',
        googleId: data.googleId,
        googleEmail: data.email?.trim(),
        lastLoginAt: new Date().toISOString(),
        notes: data.authProvider === 'google'
          ? 'Tài khoản GVCN đăng ký bằng tài khoản Google thực tế'
          : 'Tài khoản GVCN đăng ký tiêu chuẩn',
        googleSheetsConfig: cleanSheetsConfig,
      };

      // Lưu vào danh sách các GVCN đã đăng ký để hỗ trợ nhiều GVCN độc lập
      try {
        const regList: AccountUser[] = JSON.parse(localStorage.getItem('gvcn_registered_teachers') || '[]');
        const idx = regList.findIndex(t => t.username.toLowerCase() === cleanUsername.toLowerCase());
        if (idx >= 0) regList[idx] = newTeacherAccount;
        else regList.push(newTeacherAccount);
        localStorage.setItem('gvcn_registered_teachers', JSON.stringify(regList));
      } catch (_) {}

      // Set accounts list: only the new teacher
      const newAccountsList = [newTeacherAccount];
      setAccounts(newAccountsList);
      saveToStorage('accounts', newAccountsList);

      // Lưu kho dữ liệu của GVCN này
      try {
        const storeKey = `gvcn_teacher_store_${cleanUsername.toLowerCase()}`;
        const payload = {
          classInfo: newClassInfo,
          googleSheetsConfig: cleanSheetsConfig,
          students: [],
          accounts: newAccountsList,
          attendance: [],
          violations: [],
          rewards: [],
          academicRecords: [],
          cleaningDuties: [],
          laborActivities: [],
          extracurricularActivities: [],
          evaluations: [],
          groupSummaries: [],
          seatingChart: [],
        };
        localStorage.setItem(storeKey, JSON.stringify(payload));
      } catch (_) {}

      // Save custom permanent pin if any
      try {
        const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
        permanentPins[newTeacherAccount.id] = data.pin.trim();
        permanentPins[newTeacherAccount.username.toLowerCase()] = data.pin.trim();
        localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(permanentPins));
      } catch (_) {}

      // 4. Set current role and activate session
      const teacherRole: UserRole = {
        role: 'gvcn',
        title: 'Giáo viên Chủ nhiệm',
        name: cleanFullName,
        accountId: newTeacherAccount.id,
        avatar: newTeacherAccount.avatar,
      };
      setCurrentUserRole(teacherRole);
      saveToStorage('currentUserRole', teacherRole);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gvcn_session_active', 'true');
      }

      // Reset hashes & mutation trackers
      lastSyncedHashRef.current = '';
      hasPendingLocalUserChangesRef.current = false;

      logActivity('Đăng ký tài khoản', `Giáo viên ${cleanFullName} đã đăng ký tài khoản GVCN và khởi tạo lớp ${cleanClassName}`);

      return {
        success: true,
        message: `Chúc mừng Thầy/Cô ${cleanFullName}! Đăng ký thành công và đã khởi tạo lớp ${cleanClassName}.`,
        account: newTeacherAccount,
      };
    } catch (err: any) {
      return { success: false, message: 'Đăng ký thất bại: ' + (err.message || 'Lỗi hệ thống') };
    }
  };

  const clearAllOldBackgroundData = () => {
    setStudents([]);
    setAttendance([]);
    setViolations([]);
    setRewards([]);
    setAcademicRecords([]);
    setCleaningDuties([]);
    setLaborActivities([]);
    setExtracurricularActivities([]);
    setEvaluations([]);
    setGroupSummaries([]);
    setSeatingChart([]);
    setGvcnBackupHistory([]);
    setLastGVCNBackupAt(null);

    try {
      localStorage.removeItem('gvcn_app_students');
      localStorage.removeItem('gvcn_app_attendance');
      localStorage.removeItem('gvcn_app_violations');
      localStorage.removeItem('gvcn_app_rewards');
      localStorage.removeItem('gvcn_app_academicRecords');
      localStorage.removeItem('gvcn_app_cleaningDuties');
      localStorage.removeItem('gvcn_app_laborActivities');
      localStorage.removeItem('gvcn_app_extracurricularActivities');
      localStorage.removeItem('gvcn_app_evaluations');
      localStorage.removeItem('gvcn_app_groupSummaries');
      localStorage.removeItem('gvcn_app_seatingChart');
      localStorage.removeItem('gvcn_app_gvcnBackupHistory');
      localStorage.removeItem('gvcn_app_lastGVCNBackupAt');
      localStorage.removeItem('teacher_app_permanent_pins');
    } catch (_) {}

    setGoogleSheetsConfig(prev => {
      const clean = {
        ...prev,
        spreadsheetId: '',
        spreadsheetUrl: '',
        apiKey: '',
        appScriptUrl: '',
        autoSync: false,
        lastSyncedAt: null,
      };
      saveToStorage('googleSheetsConfig', clean);
      return clean;
    });

    logActivity('Làm sạch dữ liệu', 'Đã xóa toàn bộ dữ liệu nền cũ để bắt đầu với lớp mới hoàn toàn sạch sẽ', false);
  };

  const changePassword = async (oldPin: string, newPin: string, confirmPin: string): Promise<{ success: boolean; message: string }> => {
    if (currentUserRole.role === 'khach') {
      return { success: false, message: 'Tài khoản Khách không thể đổi mật khẩu. Vui lòng đăng nhập tài khoản trước!' };
    }
    const currentAcc = accounts.find(a => a.id === currentUserRole.accountId || a.fullName === currentUserRole.name);
    if (!currentAcc) {
      return { success: false, message: 'Không tìm thấy thông tin tài khoản hiện tại!' };
    }

    let effectiveOldPin = currentAcc.pin;
    try {
      const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
      const saved = permanentPins[currentAcc.id] || permanentPins[currentAcc.username.toLowerCase()];
      if (saved) effectiveOldPin = saved;
    } catch (_) {}

    if (effectiveOldPin && effectiveOldPin !== oldPin.trim()) {
      return { success: false, message: 'Mật khẩu / Mã PIN hiện tại không chính xác!' };
    }
    if (newPin.trim().length < 3) {
      return { success: false, message: 'Mật khẩu mới phải có tối thiểu 3 ký tự!' };
    }
    if (newPin.trim() !== confirmPin.trim()) {
      return { success: false, message: 'Mật khẩu xác nhận không khớp với mật khẩu mới!' };
    }
    if (oldPin.trim() === newPin.trim()) {
      return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại!' };
    }

    const cleanNewPin = newPin.trim();

    // Check previous password history - forbid reuse of old passwords
    try {
      const historyMap = JSON.parse(localStorage.getItem('teacher_app_pw_history') || '{}');
      const userHistory: string[] = historyMap[currentAcc.id] || [];
      if (userHistory.includes(cleanNewPin) || cleanNewPin === oldPin.trim()) {
        return { success: false, message: 'Không được sử dụng lại mật khẩu cũ! Vui lòng chọn mật khẩu mới khác biệt.' };
      }
      userHistory.push(oldPin.trim());
      historyMap[currentAcc.id] = userHistory;
      localStorage.setItem('teacher_app_pw_history', JSON.stringify(historyMap));
    } catch (_) {}

    // Save permanently to local storage
    try {
      const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
      permanentPins[currentAcc.id] = cleanNewPin;
      permanentPins[currentAcc.username.toLowerCase()] = cleanNewPin;
      if (currentAcc.studentId) permanentPins[currentAcc.studentId] = cleanNewPin;
      if (currentAcc.studentCode) permanentPins[currentAcc.studentCode.toLowerCase()] = cleanNewPin;
      localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(permanentPins));
    } catch (_) {}

    const updated = {
      ...currentAcc,
      pin: cleanNewPin,
      isCustomPin: true,
      passwordChangedAt: new Date().toISOString(),
    };
    const updatedAccounts = accounts.map(a => (a.id === currentAcc.id ? updated : a));
    setAccounts(updatedAccounts);
    saveToStorage('accounts', updatedAccounts);

    // Cập nhật cả thông tin trong danh sách học sinh (students)
    setStudents(prev => {
      const updatedList = prev.map(s => {
        if (s.id === currentAcc.studentId || (currentAcc.studentCode && s.studentCode === currentAcc.studentCode) || s.fullName === currentAcc.fullName) {
          return { ...s, customPin: cleanNewPin };
        }
        return s;
      });
      studentsRef.current = updatedList;
      saveToStorage('students', updatedList);
      return updatedList;
    });

    logActivity('Đổi mật khẩu', `Tài khoản ${currentAcc.fullName} (${currentAcc.username}) đã đổi mật khẩu thành công`);

    hasPendingLocalUserChangesRef.current = true;

    // Lưu mật khẩu mới lên Google Sheets & xóa mật khẩu cũ
    let sheetSaved = false;
    const url = googleSheetsConfig.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
    if (url) {
      try {
        const res = await savePasswordToGoogleSheets(
          googleSheetsConfig,
          currentAcc,
          cleanNewPin,
          updatedAccounts,
          () => getFullAppData()
        );
        sheetSaved = res.success;
      } catch (err) {
        console.warn('Lỗi đồng bộ mật khẩu lên Google Sheets:', err);
      }

      try {
        await syncAllToGoogleSheets(undefined, true);
      } catch (err) {
        console.warn('Lỗi sync full app sau khi đổi mật khẩu:', err);
      }
    }

    return {
      success: true,
      message: sheetSaved
        ? 'Đổi mật khẩu thành công! Mật khẩu là bảo quản cá nhân đã được lưu vĩnh viễn trên Google Sheet và không bao giờ tự ý trở lại mặc định.'
        : 'Đổi mật khẩu thành công! Mật khẩu mới đã được lưu an toàn làm căn cứ đăng nhập cho các lần tiếp theo.',
    };
  };

  const adminResetPin = async (accountId: string, newPin: string): Promise<{ success: boolean; message: string }> => {
    if (!canAdministerAllAccounts(currentUserRole.role)) {
      return { success: false, message: 'Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền cấp lại mã PIN!' };
    }
    const target = accounts.find(a => a.id === accountId);
    if (!target) {
      return { success: false, message: 'Không tìm thấy tài khoản!' };
    }
    if (!newPin.trim() || newPin.trim().length < 3) {
      return { success: false, message: 'Mã PIN mới phải có tối thiểu 3 ký tự!' };
    }
    const cleanNewPin = newPin.trim();

    try {
      const permanentPins = JSON.parse(localStorage.getItem('teacher_app_permanent_pins') || '{}');
      permanentPins[target.id] = cleanNewPin;
      permanentPins[target.username.toLowerCase()] = cleanNewPin;
      if (target.studentId) permanentPins[target.studentId] = cleanNewPin;
      if (target.studentCode) permanentPins[target.studentCode.toLowerCase()] = cleanNewPin;
      localStorage.setItem('teacher_app_permanent_pins', JSON.stringify(permanentPins));
    } catch (_) {}

    const updated = {
      ...target,
      pin: cleanNewPin,
      isCustomPin: true,
      passwordChangedAt: new Date().toISOString(),
    };
    const updatedAccounts = accounts.map(a => (a.id === accountId ? updated : a));
    setAccounts(updatedAccounts);
    saveToStorage('accounts', updatedAccounts);

    setStudents(prev => {
      const updatedList = prev.map(s => {
        if (s.id === target.studentId || (target.studentCode && s.studentCode === target.studentCode) || s.fullName === target.fullName) {
          return { ...s, customPin: cleanNewPin };
        }
        return s;
      });
      studentsRef.current = updatedList;
      saveToStorage('students', updatedList);
      return updatedList;
    });

    logActivity('Cấp lại PIN', `GVCN đã cấp lại mã PIN mới cho tài khoản ${target.fullName} (${target.username})`);

    hasPendingLocalUserChangesRef.current = true;

    // Lưu mật khẩu mới lên Google Sheets
    const url = googleSheetsConfig.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
    if (url) {
      try {
        await savePasswordToGoogleSheets(
          googleSheetsConfig,
          target,
          cleanNewPin,
          updatedAccounts,
          () => getFullAppData()
        );
        await syncAllToGoogleSheets(undefined, true);
      } catch (err) {
        console.warn('Lỗi lưu mật khẩu khi reset PIN:', err);
      }
    }

    return { success: true, message: `Đã cấp lại mã PIN mới cho ${target.fullName} thành công và lưu lên Google Sheet!` };
  };

  const changeAvatar = async (
    newAvatarUrl: string,
    targetAccount?: AccountUser | null,
    targetStudent?: Student | null
  ): Promise<{ success: boolean; message: string }> => {
    // 1. Tìm thông tin học sinh và tài khoản mục tiêu
    const studentToUpdate: Student | null =
      targetStudent ||
      (targetAccount?.studentId ? students.find(s => s.id === targetAccount.studentId) : null) ||
      (targetAccount?.studentCode ? students.find(s => s.studentCode.toLowerCase() === targetAccount.studentCode?.toLowerCase()) : null) ||
      (currentUserRole.studentId ? students.find(s => s.id === currentUserRole.studentId) : null) ||
      (currentUserRole.role !== 'gvcn' ? students.find(s => s.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim()) : null) ||
      null;

    let acc: AccountUser | null =
      targetAccount ||
      (studentToUpdate ? accounts.find(a => a.studentId === studentToUpdate.id || (studentToUpdate.studentCode && a.studentCode === studentToUpdate.studentCode) || a.fullName.toLowerCase().trim() === studentToUpdate.fullName.toLowerCase().trim()) : null) ||
      (currentUserRole.accountId ? accounts.find(a => a.id === currentUserRole.accountId) : null) ||
      (currentUserRole.studentId ? accounts.find(a => a.studentId === currentUserRole.studentId) : null) ||
      null;

    if (!acc && !studentToUpdate) {
      return { success: false, message: 'Không tìm thấy thông tin học sinh hoặc tài khoản để cập nhật ảnh đại diện.' };
    }

    const studentId = studentToUpdate?.id || acc?.studentId;
    const studentCode = studentToUpdate?.studentCode || acc?.studentCode;
    const fullName = studentToUpdate?.fullName || acc?.fullName || '';
    const accountId = acc?.id;
    const username = acc?.username;

    // 2. LƯU VĨNH VIỄN VÀO BỘ NHỚ CỤC BỘ & INDEXEDDB
    savePermanentAvatar(
      {
        studentId,
        studentCode,
        fullName,
        accountId,
        username,
      },
      newAvatarUrl
    );

    // 3. Cập nhật danh sách tài khoản
    let updatedAccounts = [...accounts];
    if (acc) {
      const updatedAcc: AccountUser = {
        ...acc,
        avatar: newAvatarUrl,
      };
      updatedAccounts = accounts.map(a => (a.id === acc!.id ? updatedAcc : a));
    } else if (studentToUpdate) {
      // Nếu học sinh chưa có tài khoản, tự tạo tài khoản liên kết để lưu avatar
      const newAcc: AccountUser = {
        id: `acc_${studentToUpdate.id}`,
        username: studentToUpdate.studentCode ? studentToUpdate.studentCode.toLowerCase() : `hs_${studentToUpdate.id}`,
        pin: '123',
        fullName: studentToUpdate.fullName,
        role: 'hoc_sinh',
        title: studentToUpdate.roleInClass || 'Học sinh',
        category: 'hoc_sinh',
        studentId: studentToUpdate.id,
        studentCode: studentToUpdate.studentCode,
        groupId: studentToUpdate.groupId,
        email: '',
        phone: studentToUpdate.phone || '',
        avatar: newAvatarUrl,
        permissions: ['Xem hồ sơ cá nhân', 'Tra cứu điểm thi đua'],
        status: 'active',
      };
      updatedAccounts = [...accounts, newAcc];
      acc = newAcc;
    }
    setAccounts(updatedAccounts);
    saveToStorage('accounts', updatedAccounts);

    // 4. Cập nhật danh sách học sinh
    setStudents(prev => {
      const updatedList = prev.map(s => {
        const isMatch =
          (studentId && s.id === studentId) ||
          (studentCode && s.studentCode && s.studentCode.toLowerCase() === studentCode.toLowerCase()) ||
          (fullName && s.fullName.toLowerCase().trim() === fullName.toLowerCase().trim());
        if (isMatch) {
          return { ...s, avatar: newAvatarUrl };
        }
        return s;
      });
      studentsRef.current = updatedList;
      saveToStorage('students', updatedList);
      return updatedList;
    });

    // 5. Cập nhật vai trò người dùng hiện tại nếu người đang đăng nhập chính là học sinh / tài khoản này
    const isCurrentUser =
      (currentUserRole.studentId && studentId && currentUserRole.studentId === studentId) ||
      (currentUserRole.accountId && accountId && currentUserRole.accountId === accountId) ||
      (fullName && currentUserRole.name.toLowerCase().trim() === fullName.toLowerCase().trim());

    if (isCurrentUser) {
      const updatedRole: UserRole = {
        ...currentUserRole,
        avatar: newAvatarUrl,
      };
      setCurrentUserRole(updatedRole);
      saveToStorage('currentUserRole', updatedRole);
    }

    logActivity('Đổi ảnh đại diện', `Đã cập nhật ảnh đại diện cho ${fullName} thành công và lưu trữ vĩnh viễn`);
    hasPendingLocalUserChangesRef.current = true;

    // 6. Đồng bộ toàn bộ lên Google Sheets (nếu đã kết nối)
    try {
      await syncAllToGoogleSheets(undefined, true);
    } catch (err) {
      console.warn('Lỗi sync full app sau khi đổi ảnh:', err);
    }

    return {
      success: true,
      message: 'Cập nhật ảnh đại diện thành công và đã được lưu trữ vĩnh viễn!',
    };
  };

  const uploadAvatar = async (
    file: File,
    targetAccount?: AccountUser | null,
    targetStudent?: Student | null
  ): Promise<{ success: boolean; message: string; avatarUrl?: string; isDrivePermissionError?: boolean; compressedBase64?: string }> => {
    // 1. Xác định học sinh và tài khoản mục tiêu
    const studentToUpdate: Student | null =
      targetStudent ||
      (targetAccount?.studentId ? students.find(s => s.id === targetAccount.studentId) : null) ||
      (targetAccount?.studentCode ? students.find(s => s.studentCode.toLowerCase() === targetAccount.studentCode?.toLowerCase()) : null) ||
      (currentUserRole.studentId ? students.find(s => s.id === currentUserRole.studentId) : null) ||
      (currentUserRole.role !== 'gvcn' ? students.find(s => s.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim()) : null) ||
      null;

    const acc: AccountUser | null =
      targetAccount ||
      (studentToUpdate ? accounts.find(a => a.studentId === studentToUpdate.id || (studentToUpdate.studentCode && a.studentCode === studentToUpdate.studentCode) || a.fullName.toLowerCase().trim() === studentToUpdate.fullName.toLowerCase().trim()) : null) ||
      (currentUserRole.accountId ? accounts.find(a => a.id === currentUserRole.accountId) : null) ||
      (currentUserRole.studentId ? accounts.find(a => a.studentId === currentUserRole.studentId) : null) ||
      null;

    if (!acc && !studentToUpdate) {
      return { success: false, message: 'Không tìm thấy thông tin học sinh để tải ảnh.' };
    }

    try {
      // 1. Nén ảnh và chuyển sang kích thước avatar chuẩn 400x400 JPEG
      const compressed = await compressImageFile(file, 400, 400, 0.85);

      // 2. Lưu ngay lập tức ảnh nén chất lượng cao vào bộ nhớ vĩnh viễn để học sinh luôn thấy ảnh mới ngay lập tức
      await changeAvatar(compressed.base64, acc, studentToUpdate);

      // 3. Nếu đã cấu hình Google Apps Script, đồng thời tải lên Google Drive
      const scriptUrl = googleSheetsConfig.appScriptUrl || MASTER_GOOGLE_APPS_SCRIPT_URL;
      const effectiveAccForDrive: AccountUser = acc || {
        id: `acc_${studentToUpdate!.id}`,
        username: studentToUpdate!.studentCode ? studentToUpdate!.studentCode.toLowerCase() : studentToUpdate!.id,
        pin: '123',
        fullName: studentToUpdate!.fullName,
        role: 'hoc_sinh',
        title: studentToUpdate!.roleInClass || 'Học sinh',
        category: 'hoc_sinh',
        studentId: studentToUpdate!.id,
        studentCode: studentToUpdate!.studentCode,
        groupId: studentToUpdate!.groupId,
        email: '',
        phone: studentToUpdate!.phone || '',
        avatar: compressed.base64,
        permissions: [],
        status: 'active',
      };

      if (scriptUrl && scriptUrl.startsWith('https://script.google.com/')) {
        try {
          const uploadRes = await uploadAvatarToGoogleDrive(
            googleSheetsConfig,
            effectiveAccForDrive,
            compressed.base64,
            compressed.mimeType
          );

          if (uploadRes.success && uploadRes.avatarUrl) {
            // Nâng cấp lên URL trực tiếp Google Drive CDN
            await changeAvatar(uploadRes.avatarUrl, acc, studentToUpdate);
            return {
              success: true,
              message: 'Đã lưu ảnh đại diện trực tiếp vào Google Drive và đồng bộ Google Sheet thành công!',
              avatarUrl: uploadRes.avatarUrl,
            };
          } else {
            return {
              success: true,
              compressedBase64: compressed.base64,
              isDrivePermissionError: uploadRes.isDrivePermissionError,
              message: uploadRes.isDrivePermissionError
                ? 'Đã lưu ảnh đại diện hiển thị vĩnh viễn trên máy! (Google Drive cần cấp quyền DriveApp để lưu bản sao lên Cloud)'
                : 'Đã lưu ảnh đại diện thành công và hiển thị vĩnh viễn trong hệ thống!',
            };
          }
        } catch {
          return {
            success: true,
            compressedBase64: compressed.base64,
            message: 'Đã lưu ảnh đại diện thành công và hiển thị vĩnh viễn trong hệ thống!',
          };
        }
      }

      return {
        success: true,
        compressedBase64: compressed.base64,
        message: 'Đã lưu ảnh đại diện thành công và hiển thị vĩnh viễn trong hệ thống!',
        avatarUrl: compressed.base64,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Lỗi trong quá trình xử lý ảnh: ' + (err.message || 'Không xác định'),
      };
    }
  };

  const addAccount = (accountData: Omit<AccountUser, 'id'>) => {
    if (!canAdministerAllAccounts(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền tạo thêm tài khoản mới!');
      return;
    }
    const newId = createUniqueId('acc');
    const newAcc: AccountUser = {
      ...accountData,
      id: newId,
      status: 'active',
      lastLoginAt: new Date().toISOString(),
    };
    setAccounts(prev => [newAcc, ...prev]);
    logActivity('Tạo tài khoản', `Đã cấp tài khoản ${newAcc.title} cho ${newAcc.fullName} (${newAcc.username})`);
  };

  const updateAccount = (updatedAccount: AccountUser) => {
    if (!canEditTargetAccount(currentUserRole, updatedAccount.id)) {
      alert('Bạn không có quyền chỉnh sửa tài khoản của người khác!');
      return;
    }
    // If not GVCN, user can only update PIN, phone, email, avatar, cannot change permissions, category or role
    if (!isHomeroomTeacher(currentUserRole.role)) {
      const existing = accounts.find(a => a.id === updatedAccount.id);
      if (existing) {
        updatedAccount.role = existing.role;
        updatedAccount.category = existing.category;
        updatedAccount.permissions = existing.permissions;
        updatedAccount.fullName = existing.fullName;
        updatedAccount.studentId = existing.studentId;
        updatedAccount.studentCode = existing.studentCode;
        updatedAccount.groupId = existing.groupId;
        updatedAccount.status = existing.status;
      }
    }
    setAccounts(prev => prev.map(a => (a.id === updatedAccount.id ? updatedAccount : a)));

    // If this account is GVCN, automatically synchronize classInfo and active role name
    if (updatedAccount.role === 'gvcn' || updatedAccount.category === 'gvcn' || updatedAccount.id === 'acc_gvcn') {
      setClassInfo(prev => ({
        ...prev,
        homeroomTeacher: updatedAccount.fullName,
        teacherPhone: updatedAccount.phone || prev.teacherPhone,
        teacherEmail: updatedAccount.email || prev.teacherEmail,
      }));

      if (currentUserRole.role === 'gvcn' || currentUserRole.accountId === updatedAccount.id) {
        setCurrentUserRole(prev => ({
          ...prev,
          name: updatedAccount.fullName,
          avatar: updatedAccount.avatar || prev.avatar,
        }));
      }
    }

    logActivity('Cập nhật tài khoản', `Đã cập nhật thông tin tài khoản ${updatedAccount.fullName}`);
  };

  const deleteAccount = (id: string) => {
    if (!canAdministerAllAccounts(currentUserRole.role)) {
      alert('Chỉ Giáo viên Chủ nhiệm (GVCN) mới có quyền xóa tài khoản!');
      return;
    }
    const target = accounts.find(a => a.id === id);
    if (target?.role === 'gvcn') {
      alert('Không thể xóa tài khoản Quản trị viên tối cao (GVCN)!');
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== id));
    logActivity('Xóa tài khoản', `Đã thu hồi tài khoản ${target?.fullName || id}`);
  };

  const updateClassInfo = (info: ClassInfo) => {
    if (!canManageClassActivities(currentUserRole.role)) {
      alert('Chỉ GVCN và Ban Cán Sự lớp mới có quyền cập nhật thông tin chung của lớp!');
      return;
    }

    let teacher = (info.homeroomTeacher || '').trim();
    let email = (info.teacherEmail || '').trim();
    let phone = (info.teacherPhone || '').trim();

    if (teacher.includes('@')) {
      if (!email) email = teacher;
      teacher = classInfo.homeroomTeacher && !classInfo.homeroomTeacher.includes('@') ? classInfo.homeroomTeacher : '';
    } else if (/^[0-9+\s().-]{7,}$/.test(teacher)) {
      if (!phone) phone = teacher;
      teacher = classInfo.homeroomTeacher && !/^[0-9+\s().-]{7,}$/.test(classInfo.homeroomTeacher) ? classInfo.homeroomTeacher : '';
    }

    if (phone) {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length === 9 && !digits.startsWith('0')) {
        phone = '0' + digits;
      }
    }

    const cleanInfo: ClassInfo = {
      ...info,
      className: info.className.trim() || classInfo.className || '',
      homeroomTeacher: capitalizeVietnameseName(teacher || classInfo.homeroomTeacher || ''),
      teacherPhone: phone,
      teacherEmail: email,
      schoolYear: info.schoolYear.trim() || classInfo.schoolYear || '2026 - 2027',
      totalStudents: students.length > 0 ? students.length : info.totalStudents,
    };
    setClassInfo(cleanInfo);

    // If homeroomTeacher name changed, automatically sync to all GVCN accounts & active role
    if (cleanInfo.homeroomTeacher) {
      const trimmedTeacher = cleanInfo.homeroomTeacher;
      setAccounts(prev => prev.map(a => {
        if (a.role === 'gvcn' || a.category === 'gvcn' || a.id === 'acc_gvcn') {
          return {
            ...a,
            fullName: trimmedTeacher,
            phone: cleanInfo.teacherPhone || a.phone,
            email: cleanInfo.teacherEmail || a.email,
          };
        }
        return a;
      }));

      if (currentUserRole.role === 'gvcn' || currentUserRole.accountId === 'acc_gvcn') {
        setCurrentUserRole(prev => ({
          ...prev,
          name: trimmedTeacher,
        }));
      }
    }

    logActivity('Cập nhật thông tin lớp', `Cập nhật thông tin lớp ${cleanInfo.className} - GVCN: ${cleanInfo.homeroomTeacher} - Năm học ${cleanInfo.schoolYear}`);
  };

  const logout = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('gvcn_session_active');
      }
    } catch (_) {}
    setCurrentUserRole(GUEST_ROLE);
    saveToStorage('currentUserRole', GUEST_ROLE);
    logActivity('Đăng xuất', 'Chuyển sang chế độ Khách (Chỉ xem)', false);
  };

  const undoLastAction = () => {
    if (activityLogs.length === 0) return;
    const latest = activityLogs[0];
    setActivityLogs(prev => prev.slice(1));
    logActivity('Hoàn tác', `Đã hoàn tác thao tác gần nhất: "${latest.action}"`, false);
  };

  return (
    <AppContext.Provider
      value={{
        currentUserRole,
        setCurrentUserRole,
        availableRoles,
        accounts,
        classInfo,
        googleSheetsConfig,
        students,
        attendance,
        violations,
        rewards,
        academicRecords,
        cleaningDuties,
        laborActivities,
        extracurricularActivities,
        evaluations,
        groupSummaries,
        settings,
        activityLogs,
        selectedWeek,
        setSelectedWeek,
        selectedStudentIdForDetail,
        setSelectedStudentIdForDetail,
        quickActionModalOpen,
        setQuickActionModalOpen,
        googleSheetsModalOpen,
        setGoogleSheetsModalOpen,
        accountModalOpen,
        setAccountModalOpen,
        loginModalOpen,
        setLoginModalOpen,
        changePasswordModalOpen,
        setChangePasswordModalOpen,
        changeAvatarModalOpen,
        targetAvatarAccount,
        targetAvatarStudent,
        setChangeAvatarModalOpen,
        loginTargetUsername,
        setLoginTargetUsername,
        openLoginModal,
        studentScores,
        rankedStudents,
        groupScores,
        rankedGroups,
        studentsNeedingAttention,
        addAttendance,
        bulkMarkAttendance,
        deleteAttendance,
        batchDeleteAttendance,
        addViolation,
        batchAddViolations,
        updateViolation,
        updateViolationStatus,
        deleteViolation,
        batchDeleteViolations,
        addReward,
        batchAddRewards,
        updateReward,
        deleteReward,
        batchDeleteRewards,
        addAcademicRecord,
        batchAddAcademicRecords,
        deleteAcademicRecord,
        updateDutyStatus,
        updateDuty,
        addDuty,
        deleteDuty,
        addLaborActivity,
        updateLaborActivity,
        confirmLaborActivity,
        deleteLaborActivity,
        updateLaborParticipation,
        addExtracurricular,
        deleteExtracurricular,
        submitSelfEvaluation,
        deleteEvaluation,
        updateEvaluationRemarks,
        submitGroupSummary,
        addStudent,
        updateStudent,
        deleteStudent,
        batchDeleteStudents,
        batchImportStudents,
        batchUpdateStudentsFromExcel,
        clearAllStudents,
        exportStudentAccountsList,
        updateSettings,
        updateClassInfo,
        cleanData,
        normalizeAndFixData,
        resetToDefaultData,
        exportClassDataToExcel,
        undoLastAction,
        logout,
        updateGoogleSheetsConfig,
        syncAllToGoogleSheets,
        pullFromGoogleSheets,
        testGoogleSheetsConnection,
        backupGVCNData,
        exportDataToJson,
        importDataFromJson,
        restoreGVCNBackup,
        deleteGVCNBackup,
        gvcnBackupHistory,
        lastGVCNBackupAt,
        switchAccount,
        loginWithCredentials,
        loginWithGoogle,
        registerTeacherAccount,
        clearAllOldBackgroundData,
        changePassword,
        adminResetPin,
        changeAvatar,
        uploadAvatar,
        addAccount,
        updateAccount,
        deleteAccount,
        seatingChart,
        assignSeat,
        swapSeats,
        autoAssignSeats,
        rotateColumns,
        clearSeatingChart,
        saveSeatingChart,
        isInitialLoadingData,
        isSyncingData,
        scheduleAutoSync,
        syncNotification,
        dismissSyncNotification,
        triggerManualSyncWithConfirmation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
