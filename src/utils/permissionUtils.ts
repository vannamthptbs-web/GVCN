import { RoleType, UserRole, AccountUser } from '../types';

export const BAN_CAN_SU_ROLES: RoleType[] = [
  'lop_truong',
  'lop_pho_hoc_tap',
  'lop_pho_lao_dong',
  'lop_pho_van_the_my',
  'bi_thu_chi_doan',
  'pho_bi_thu',
  'thu_quy',
];

export const TO_TRUONG_ROLES: RoleType[] = [
  'to_truong',
  'to_pho',
];

export const CADRE_ROLES: RoleType[] = [
  ...BAN_CAN_SU_ROLES,
  ...TO_TRUONG_ROLES,
];

/**
 * Check if the user is in Ban cán sự (Lớp trưởng, các Lớp phó, Bí thư, Thủ quỹ)
 * Có quyền xem thông tin cả lớp
 */
export function isBanCanSu(role?: RoleType | string): boolean {
  return !!role && BAN_CAN_SU_ROLES.includes(role as RoleType);
}

/**
 * Check if the user is Tổ trưởng hoặc Tổ phó (TT)
 * Có quyền xem thông tin các thành viên trong tổ của mình
 */
export function isGroupLeader(role?: RoleType | string): boolean {
  return !!role && TO_TRUONG_ROLES.includes(role as RoleType);
}

/**
 * Check if the current user can view violations of a target student
 * - GVCN và Ban cán sự: xem được toàn bộ vi phạm của cả lớp
 * - TT (Tổ trưởng/Tổ phó): xem được vi phạm của các bạn trong tổ mình
 * - Cá nhân: CHỈ ĐƯỢC XEM vi phạm của chính bản thân mình
 */
export function canViewStudentViolations(
  currentUser: UserRole | undefined | null,
  targetStudent: { id?: string; studentId?: string; groupId?: number }
): boolean {
  if (!currentUser || isGuestUser(currentUser.role)) return false;
  if (isHomeroomTeacher(currentUser.role) || isBanCanSu(currentUser.role)) return true;

  const targetId = targetStudent.id || targetStudent.studentId;
  if (currentUser.studentId && targetId && currentUser.studentId === targetId) {
    return true;
  }

  if (isGroupLeader(currentUser.role)) {
    return currentUser.groupId !== undefined && targetStudent.groupId !== undefined && currentUser.groupId === targetStudent.groupId;
  }

  return false;
}

/**
 * Check if the current user can view private personal contact info of a student
 * (SĐT, SĐT phụ huynh, địa chỉ, ghi chú riêng của GVCN)
 */
export function canViewStudentPrivateInfo(
  currentUser: UserRole | undefined | null,
  targetStudent: { id?: string; studentId?: string; groupId?: number }
): boolean {
  if (!currentUser || isGuestUser(currentUser.role)) return false;
  if (isHomeroomTeacher(currentUser.role) || isBanCanSu(currentUser.role)) return true;

  const targetId = targetStudent.id || targetStudent.studentId;
  if (currentUser.studentId && targetId && currentUser.studentId === targetId) {
    return true;
  }

  if (isGroupLeader(currentUser.role)) {
    return currentUser.groupId !== undefined && targetStudent.groupId !== undefined && currentUser.groupId === targetStudent.groupId;
  }

  return false;
}

/**
 * Check if the current user is a guest (not logged in)
 */
export function isGuestUser(role?: RoleType | string): boolean {
  return !role || role === 'khach';
}

/**
 * Check if the user is the homeroom teacher (GVCN)
 */
export function isHomeroomTeacher(role?: RoleType | string): boolean {
  return role === 'gvcn';
}

/**
 * Check if the user is the class president (Lớp trưởng)
 */
export function isClassPresident(role?: RoleType | string): boolean {
  return role === 'lop_truong';
}

/**
 * Check if the user is a class administrator (GVCN or Lớp trưởng)
 * Theo yêu cầu người dùng: Lớp trưởng có TOÀN BỘ QUYỀN như GVCN
 */
export function isClassAdmin(role?: RoleType | string): boolean {
  return role === 'gvcn' || role === 'lop_truong';
}

/**
 * Check if the user is a class vice president (Lớp phó)
 */
export function isVicePresident(role?: RoleType | string): boolean {
  return role === 'lop_pho_hoc_tap' || role === 'lop_pho_lao_dong' || role === 'lop_pho_van_the_my';
}

/**
 * Check if the user is a class officer / cadre (Ban cán sự / Tổ trưởng / Tổ phó)
 */
export function isClassCadre(role?: RoleType | string): boolean {
  return !!role && CADRE_ROLES.includes(role as RoleType);
}

/**
 * Check if the user is a regular student (Thành viên)
 */
export function isRegularStudent(role?: RoleType | string): boolean {
  return role === 'hoc_sinh';
}

/**
 * Check if the user is any student in the class (including both regular students and class cadres / ban cán sự)
 * Tất cả học sinh trong lớp đều có góc cá nhân khi đăng nhập, kể cả ban cán sự
 */
export function isAnyStudent(role?: RoleType | string): boolean {
  if (!role || role === 'khach' || role === 'gvcn') return false;
  return true;
}

/**
 * Check if the user can manage or edit the seating chart (GVCN and Lớp trưởng)
 */
export function canManageSeatingChart(role?: RoleType | string): boolean {
  return isClassAdmin(role);
}

/**
 * Check if the user is read-only (Thành viên hoặc Khách)
 * Yêu cầu: "thành viên: chỉ xem mà không thể sửa đổi"
 */
export function isReadOnlyUser(role?: RoleType | string): boolean {
  return !role || role === 'khach' || role === 'hoc_sinh';
}

/**
 * Check if the user has permission to record/adjust general class activities:
 * (Điểm danh, vi phạm, khen thưởng, trực nhật, học tập, lao động, ngoại khóa)
 * -> GVCN, Lớp trưởng, và Ban cán sự có quyền ghi nhận/điều chỉnh.
 * -> Thành viên (học sinh) và Khách: CHỈ XEM, KHÔNG THỂ SỬA ĐỔI.
 */
export function canManageClassActivities(role?: RoleType | string): boolean {
  if (!role || isReadOnlyUser(role)) return false;
  return isClassAdmin(role) || isClassCadre(role);
}

/**
 * Check if the user can manage students (thêm, sửa, xóa, phân tổ, gán chức vụ)
 * -> GVCN và Lớp trưởng (Toàn bộ quyền như GVCN)
 */
export function canManageStudentMaster(role?: RoleType | string): boolean {
  return isClassAdmin(role);
}

/**
 * Check if the user can modify system settings / competition criteria
 * -> GVCN và Lớp trưởng
 */
export function canManageSystemSettings(role?: RoleType | string): boolean {
  return isClassAdmin(role);
}

/**
 * Check if the user can manage all accounts and reset PINs
 * -> GVCN và Lớp trưởng
 */
export function canAdministerAllAccounts(role?: RoleType | string): boolean {
  return isClassAdmin(role);
}

/**
 * Check if the user can manage cleaning duties (trực nhật):
 * -> GVCN, Lớp trưởng, Lớp phó Lao động
 */
export function canManageDuty(role?: RoleType | string): boolean {
  if (!role || isReadOnlyUser(role)) return false;
  return isClassAdmin(role) || role === 'lop_pho_lao_dong';
}

/**
 * Check if the user can manage labor activities (kế hoạch lao động ngoài giờ):
 * -> GVCN, Lớp trưởng, Lớp phó Lao động
 */
export function canManageLabor(role?: RoleType | string): boolean {
  if (!role || isReadOnlyUser(role)) return false;
  return isClassAdmin(role) || role === 'lop_pho_lao_dong';
}

/**
 * Check if the user can manage academic records & tests:
 * -> GVCN, Lớp trưởng, Lớp phó Học tập, Tổ trưởng
 */
export function canManageAcademics(role?: RoleType | string): boolean {
  if (!role || isReadOnlyUser(role)) return false;
  return isClassAdmin(role) || role === 'lop_pho_hoc_tap' || role === 'to_truong';
}

/**
 * Check if the user can manage extracurricular activities:
 * -> GVCN, Lớp trưởng, Lớp phó Văn thể mỹ, Bí thư Chi đoàn, Phó Bí thư
 */
export function canManageExtracurricular(role?: RoleType | string): boolean {
  if (!role || isReadOnlyUser(role)) return false;
  return (
    isClassAdmin(role) ||
    role === 'lop_pho_van_the_my' ||
    role === 'bi_thu_chi_doan' ||
    role === 'pho_bi_thu'
  );
}

/**
 * Check if the user can manage attendance:
 * -> GVCN, Lớp trưởng, Lớp phó Học tập, Tổ trưởng, Tổ phó
 */
export function canManageAttendance(role?: RoleType | string): boolean {
  if (!role || isReadOnlyUser(role)) return false;
  return isClassAdmin(role) || role === 'lop_pho_hoc_tap' || role === 'to_truong' || role === 'to_pho';
}

/**
 * Check if the current user can edit a specific account's credentials (PIN, phone, email, etc.)
 * -> GVCN và Lớp trưởng có thể sửa tài khoản học sinh.
 * -> Học sinh / cán sự chỉ được đổi thông tin cá nhân của chính mình.
 */
export function canEditTargetAccount(
  currentUser: UserRole | undefined | null,
  targetAccountId: string
): boolean {
  if (!currentUser || isGuestUser(currentUser.role)) return false;
  if (isClassAdmin(currentUser.role)) return true;
  return currentUser.accountId === targetAccountId;
}

/**
 * Check if the current user can view a target account's PIN/password
 * -> GVCN và Lớp trưởng có thể xem mã PIN để hỗ trợ học sinh.
 * -> Học sinh chỉ xem được mã PIN của chính mình.
 */
export function canViewTargetAccountPin(
  currentUser: UserRole | undefined | null,
  targetAccountId: string
): boolean {
  if (!currentUser || isGuestUser(currentUser.role)) return false;
  if (isClassAdmin(currentUser.role)) return true;
  return currentUser.accountId === targetAccountId;
}

/**
 * Check if a student can submit their own weekly self evaluation
 */
export function canSubmitSelfEvaluation(
  currentUser: UserRole | undefined | null,
  targetStudentId: string
): boolean {
  if (!currentUser || isGuestUser(currentUser.role)) return false;
  if (isClassAdmin(currentUser.role) || isClassCadre(currentUser.role)) return true;
  return currentUser.studentId === targetStudentId;
}

/**
 * Friendly explanation of user's role and permissions
 */
export function getRolePermissionSummary(role?: RoleType | string): string {
  switch (role) {
    case 'gvcn':
      return 'Giáo viên Chủ nhiệm (Toàn quyền quản trị lớp học)';
    case 'lop_truong':
      return 'Lớp trưởng (Toàn bộ quyền như GVCN: quản lý chung, học sinh, tiêu chí, tài khoản)';
    case 'lop_pho_lao_dong':
      return 'Lớp phó Lao động (Quản lý trực nhật, kế hoạch lao động vệ sinh lớp)';
    case 'lop_pho_hoc_tap':
      return 'Lớp phó Học tập (Quản lý học tập, điểm danh, nề nếp tiết học)';
    case 'lop_pho_van_the_my':
      return 'Lớp phó Văn thể mỹ (Quản lý phong trào văn thể, hoạt động ngoại khóa)';
    case 'bi_thu_chi_doan':
    case 'pho_bi_thu':
      return 'Bí thư / Phó Bí thư (Quản lý công tác Đoàn, phong trào thanh niên)';
    case 'thu_quy':
      return 'Thủ quỹ (Quản lý quỹ lớp và thu chi phong trào)';
    case 'to_truong':
    case 'to_pho':
      return 'Tổ trưởng / Tổ phó (Ghi nhận thi đua, điểm danh và nề nếp tổ)';
    case 'hoc_sinh':
      return 'Thành viên lớp (Chỉ xem dữ liệu, nộp tự đánh giá và đổi mật khẩu cá nhân)';
    default:
      return 'Khách vãng lai (Chỉ xem thông tin công khai)';
  }
}

/**
 * Friendly error message explaining permission restriction
 */
export function getPermissionDeniedMessage(reason?: string): string {
  return (
    reason ||
    'Bạn không có quyền thực hiện thao tác này! Thành viên chỉ có quyền xem dữ liệu mà không thể chỉnh sửa. Vui lòng liên hệ Lớp trưởng hoặc GVCN.'
  );
}

