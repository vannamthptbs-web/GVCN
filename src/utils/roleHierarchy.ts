import { Student, AccountUser, RoleType, UserRole } from '../types';

/**
 * Chuẩn hóa tên chức vụ học sinh theo quy tắc Điều lệ trường học:
 * - 1 Lớp chỉ có duy nhất 1 Lớp trưởng.
 * - Mỗi tổ có duy nhất 1 Tổ trưởng và 1 Tổ phó.
 * - 1 Lớp có 1 Bí thư Chi đoàn, 1 Thủ quỹ.
 */
export function normalizeStudentRole(roleInClass?: string, groupId?: number): string {
  const r = (roleInClass || '').trim();
  const lower = r.toLowerCase();
  const g = groupId || 1;

  if (!r || lower === 'thành viên' || lower === 'học sinh' || lower === 'thanh vien' || lower === 'hoc sinh') {
    return 'Thành viên';
  }
  if (lower.includes('lớp trưởng') || lower.includes('lop truong') || lower === 'lt') {
    return 'Lớp trưởng';
  }
  if (lower.includes('tổ trưởng') || lower.includes('to truong') || lower === 'tt') {
    return `Tổ trưởng Tổ ${g}`;
  }
  if (lower.includes('tổ phó') || lower.includes('to pho') || lower === 'tp') {
    return `Tổ phó Tổ ${g}`;
  }
  if (lower.includes('học tập') || lower.includes('hoc tap')) {
    return 'Lớp phó Học tập';
  }
  if (lower.includes('kỷ luật') || lower.includes('ky luat') || lower.includes('nề nếp') || lower.includes('ne nep')) {
    return 'Lớp phó Kỷ luật';
  }
  if (lower.includes('lao động') || lower.includes('lao dong') || lower.includes('vệ sinh') || lower.includes('ve sinh')) {
    return 'Lớp phó Lao động';
  }
  if (lower.includes('văn thể') || lower.includes('van the') || lower.includes('phong trào') || lower.includes('phong trao')) {
    return 'Lớp phó Văn thể mỹ';
  }
  if (lower.includes('phó bí thư') || lower.includes('pho bi thu') || lower === 'pbt') {
    return 'Phó Bí thư';
  }
  if (lower.includes('bí thư') || lower.includes('bi thu') || lower === 'bt') {
    return 'Bí thư Chi đoàn';
  }
  if (lower.includes('thủ quỹ') || lower.includes('thu quy') || lower === 'tq') {
    return 'Thủ quỹ';
  }
  if (lower.includes('ủy viên') || lower.includes('uy vien')) {
    return 'Ủy viên BCH Chi đoàn';
  }
  if (lower.includes('lớp phó') || lower.includes('lop pho') || lower === 'lp') {
    return 'Lớp phó';
  }
  return r;
}

/**
 * Trọng số thứ bậc chức vụ học sinh trong lớp học Việt Nam (Theo Điều lệ trường học)
 * Số càng nhỏ -> Thứ bậc toàn trường/toàn lớp càng cao
 */
export function getRoleRank(roleInClass?: string, groupId?: number): number {
  const r = (roleInClass || '').toLowerCase().trim();
  if (!r || r === 'thành viên' || r === 'học sinh' || r === 'thanh vien' || r === 'hoc sinh') {
    return 100;
  }

  // 1. Lớp trưởng (Đứng đầu toàn lớp)
  if (r.includes('lớp trưởng') || r.includes('lop truong') || r === 'lt') {
    return 10;
  }

  // 2. Các Lớp phó
  if (r.includes('học tập') || r.includes('hoc tap')) {
    return 20; // Lớp phó học tập
  }
  if (r.includes('kỷ luật') || r.includes('ky luat') || r.includes('nề nếp')) {
    return 21; // Lớp phó kỷ luật / nề nếp
  }
  if (r.includes('lao động') || r.includes('lao dong') || r.includes('vệ sinh')) {
    return 22; // Lớp phó lao động / vệ sinh
  }
  if (r.includes('văn thể') || r.includes('van the') || r.includes('phong trào')) {
    return 23; // Lớp phó văn thể mỹ
  }
  if (r.includes('lớp phó') || r.includes('lop pho') || r === 'lp') {
    return 25; // Lớp phó chung
  }

  // 3. Ban Chấp Hành Chi Đoàn & Thủ Quỹ (Kiểm tra 'phó bí thư' TRƯỚC 'bí thư')
  if (r.includes('phó bí thư') || r.includes('pho bi thu') || r === 'pbt') {
    return 31; // Phó Bí thư Chi đoàn
  }
  if (r.includes('bí thư') || r.includes('bi thu') || r === 'bt') {
    return 30; // Bí thư Chi đoàn
  }
  if (r.includes('thủ quỹ') || r.includes('thu quy') || r === 'tq') {
    return 35; // Thủ quỹ
  }
  if (r.includes('ủy viên') || r.includes('uy vien')) {
    return 38; // Ủy viên BCH
  }

  // 4. Tổ trưởng các tổ (Mỗi tổ có 1 tổ trưởng: Tổ 1=41, Tổ 2=42, Tổ 3=43, Tổ 4=44)
  if (r.includes('tổ trưởng') || r.includes('to truong') || r === 'tt') {
    const matchGroup = r.match(/t[ổo]\s*([1-9])/i);
    const g = groupId || (matchGroup ? parseInt(matchGroup[1], 10) : 1);
    return 40 + g;
  }

  // 5. Tổ phó các tổ (Mỗi tổ có 1 tổ phó: Tổ 1=51, Tổ 2=52, Tổ 3=53, Tổ 4=54)
  if (r.includes('tổ phó') || r.includes('to pho') || r === 'tp') {
    const matchGroup = r.match(/t[ổo]\s*([1-9])/i);
    const g = groupId || (matchGroup ? parseInt(matchGroup[1], 10) : 1);
    return 50 + g;
  }

  return 90; // Chức vụ đặc thù khác
}

/**
 * Kiểm tra xem học sinh có thuộc Ban Cán Sự Lớp hoặc Ban Cán Sự Tổ không
 */
export function isStudentCadre(s: Student): boolean {
  return getRoleRank(s.roleInClass, s.groupId) < 90;
}

/**
 * Sắp xếp danh sách Cán sự lớp & Chi đoàn theo đúng chuẩn trật tự thứ bậc:
 * 1. Lớp trưởng (1 người đứng đầu lớp)
 * 2. Các Lớp phó (Học tập -> Kỷ luật -> Lao động -> Văn thể mỹ)
 * 3. Bí thư Chi đoàn -> Phó Bí thư -> Thủ quỹ
 * 4. Tổ trưởng các tổ (Tổ trưởng Tổ 1 -> 2 -> 3 -> 4)
 * 5. Tổ phó các tổ (Tổ phó Tổ 1 -> 2 -> 3 -> 4)
 */
export function sortCadres(students: Student[]): Student[] {
  const cadres = students.filter(isStudentCadre);
  return cadres.sort((a, b) => {
    const rankA = getRoleRank(a.roleInClass, a.groupId);
    const rankB = getRoleRank(b.roleInClass, b.groupId);
    if (rankA !== rankB) return rankA - rankB;
    if (a.groupId !== b.groupId) return a.groupId - b.groupId;
    return a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true });
  });
}

/**
 * Sắp xếp học sinh trong từng Tổ chuẩn mực:
 * Trong phạm vi sinh hoạt từng tổ:
 * 1. Tổ trưởng đứng đầu tổ (#1)
 * 2. Tổ phó đứng thứ nhì tổ (#2)
 * 3. Cán sự lớp trong tổ (Lớp trưởng, Lớp phó, Bí thư...) nếu có
 * 4. Thành viên theo STT/Mã HS
 */
export function compareStudentsByGroupHierarchy(a: Student, b: Student): number {
  if (a.groupId !== b.groupId) {
    return a.groupId - b.groupId;
  }
  const getGroupInternalRank = (s: Student) => {
    const r = (s.roleInClass || '').toLowerCase().trim();
    if (r.includes('tổ trưởng') || r.includes('to truong') || r === 'tt') return 1;
    if (r.includes('tổ phó') || r.includes('to pho') || r === 'tp') return 2;
    const classRank = getRoleRank(s.roleInClass, s.groupId);
    if (classRank < 40) return 10 + classRank; // Cán sự lớp nằm trong tổ này
    return 100;
  };
  const rankA = getGroupInternalRank(a);
  const rankB = getGroupInternalRank(b);
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true });
}

/**
 * Sắp xếp danh sách toàn bộ học sinh theo Chức vụ toàn lớp:
 * Lớp trưởng -> Lớp phó -> Bí thư -> Thủ quỹ -> Tổ trưởng Tổ 1..4 -> Tổ phó Tổ 1..4 -> Thành viên (theo Tổ & Mã HS)
 */
export function compareStudentsByRoleHierarchy(a: Student, b: Student): number {
  const rankA = getRoleRank(a.roleInClass, a.groupId);
  const rankB = getRoleRank(b.roleInClass, b.groupId);
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  if (a.groupId !== b.groupId) {
    return a.groupId - b.groupId;
  }
  return a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true });
}

/**
 * Sắp xếp học sinh theo Tổ (Tổ 1 -> 2 -> 3 -> 4) và trong mỗi tổ sắp theo thứ bậc cán sự tổ:
 */
export function compareStudentsByGroupAndCadre(a: Student, b: Student): number {
  if (a.groupId !== b.groupId) {
    return a.groupId - b.groupId;
  }
  return compareStudentsByGroupHierarchy(a, b);
}

/**
 * Tách họ và tên để sắp xếp theo Tên (A-Z) chuẩn tiếng Việt
 */
export function compareStudentsByName(a: Student, b: Student): number {
  const getLastName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || fullName;
  };
  const lastNameA = getLastName(a.fullName);
  const lastNameB = getLastName(b.fullName);
  const cmp = lastNameA.localeCompare(lastNameB, 'vi', { sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return a.fullName.localeCompare(b.fullName, 'vi', { sensitivity: 'base' });
}

/**
 * Chuyển đổi chức vụ thành RoleType và Category chuẩn cho Account
 */
export function mapRoleInClassToAccountInfo(roleInClass: string, groupId?: number): {
  role: RoleType;
  category: AccountUser['category'];
  title: string;
  permissions: string[];
} {
  const rank = getRoleRank(roleInClass, groupId);
  const r = (roleInClass || '').toLowerCase().trim();

  if (rank === 10) {
    return {
      role: 'lop_truong',
      category: 'ban_can_su',
      title: 'Lớp trưởng',
      permissions: ['Điểm danh', 'Ghi nhận nề nếp', 'Quản lý trực nhật', 'Xem hồ sơ lớp', 'Điều hành thi đua']
    };
  }

  if (rank === 20) {
    return {
      role: 'lop_pho_hoc_tap',
      category: 'ban_can_su',
      title: 'Lớp phó Học tập',
      permissions: ['Điểm danh', 'Ghi nhận nề nếp', 'Theo dõi học tập', 'Xem hồ sơ lớp']
    };
  }

  if (rank === 22) {
    return {
      role: 'lop_pho_lao_dong',
      category: 'ban_can_su',
      title: 'Lớp phó Lao động',
      permissions: ['Quản lý trực nhật', 'Chấm điểm vệ sinh', 'Ghi nhận nề nếp', 'Xem hồ sơ lớp']
    };
  }

  if (rank === 23) {
    return {
      role: 'lop_pho_van_the_my',
      category: 'ban_can_su',
      title: 'Lớp phó Văn thể mỹ',
      permissions: ['Điểm danh', 'Ghi nhận nề nếp', 'Hoạt động phong trào', 'Xem hồ sơ lớp']
    };
  }

  if (rank >= 20 && rank <= 29) {
    return {
      role: 'lop_pho_lao_dong',
      category: 'ban_can_su',
      title: roleInClass || 'Lớp phó',
      permissions: ['Điểm danh', 'Ghi nhận nề nếp', 'Xem hồ sơ lớp']
    };
  }

  if (rank === 30) {
    return {
      role: 'bi_thu_chi_doan',
      category: 'ban_can_su',
      title: 'Bí thư Chi đoàn',
      permissions: ['Điểm danh', 'Ghi nhận nề nếp', 'Quản lý đoàn viên', 'Xem hồ sơ lớp']
    };
  }

  if (rank === 31) {
    return {
      role: 'pho_bi_thu',
      category: 'ban_can_su',
      title: 'Phó Bí thư Chi đoàn',
      permissions: ['Điểm danh', 'Ghi nhận nề nếp', 'Quản lý đoàn viên', 'Xem hồ sơ lớp']
    };
  }

  if (rank === 35) {
    return {
      role: 'thu_quy',
      category: 'ban_can_su',
      title: 'Thủ quỹ',
      permissions: ['Điểm danh', 'Ghi nhận quỹ lớp', 'Xem hồ sơ lớp']
    };
  }

  if (rank >= 40 && rank <= 49) {
    const g = groupId || (rank - 40);
    return {
      role: 'to_truong',
      category: 'to_truong_pho',
      title: `Tổ trưởng Tổ ${g}`,
      permissions: ['Điểm danh tổ', 'Ghi nhận nề nếp tổ', 'Theo dõi thi đua tổ']
    };
  }

  if (rank >= 50 && rank <= 59) {
    const g = groupId || (rank - 50);
    return {
      role: 'to_pho',
      category: 'to_truong_pho',
      title: `Tổ phó Tổ ${g}`,
      permissions: ['Điểm danh tổ', 'Theo dõi thi đua tổ']
    };
  }

  return {
    role: 'hoc_sinh',
    category: 'hoc_sinh',
    title: roleInClass || 'Học sinh',
    permissions: ['Xem hồ sơ cá nhân', 'Tra cứu điểm thi đua', 'Xem lịch trực nhật', 'Gửi tự đánh giá tuần']
  };
}

/**
 * ĐIỀU CHỈNH PHÂN CÔNG CHỨC VỤ ĐẢM BẢO NGUYÊN TẮC:
 * - Mỗi lớp chỉ có DUY NHẤT 1 Lớp trưởng.
 * - Mỗi tổ chỉ có DUY NHẤT 1 Tổ trưởng và 1 Tổ phó.
 * - Mỗi lớp chỉ có DUY NHẤT 1 Bí thư Chi đoàn và 1 Thủ quỹ.
 * 
 * Khi phân công học sinh A vào chức vụ độc quyền, học sinh cũ đang giữ chức vụ đó
 * sẽ được tự động chuyển về "Thành viên" để giữ nguyên trật tự, không bị nhảy loạn hoặc trùng lặp chức vụ!
 */
export function reconcileRoleAssignment(
  students: Student[],
  updatedStudent: Student
): {
  reconciledStudents: Student[];
  systemNotes: string[];
} {
  const notes: string[] = [];
  const normalizedRole = normalizeStudentRole(updatedStudent.roleInClass, updatedStudent.groupId);
  const studentToApply: Student = {
    ...updatedStudent,
    roleInClass: normalizedRole,
  };

  const targetRank = getRoleRank(studentToApply.roleInClass, studentToApply.groupId);
  const targetGroup = studentToApply.groupId;

  const isAssigningMonitor = targetRank === 10; // Lớp trưởng
  const isAssigningGroupLeader = targetRank >= 41 && targetRank <= 49; // Tổ trưởng (Tổ X)
  const isAssigningGroupViceLeader = targetRank >= 51 && targetRank <= 59; // Tổ phó (Tổ X)
  const isAssigningSecretary = targetRank === 30; // Bí thư
  const isAssigningTreasurer = targetRank === 35; // Thủ quỹ

  const reconciledStudents = students.map(s => {
    if (s.id === studentToApply.id) {
      return studentToApply;
    }

    const currentRank = getRoleRank(s.roleInClass, s.groupId);

    // 1. Nếu đang phân công Lớp trưởng mới -> Học sinh cũ đang là Lớp trưởng chuyển về Thành viên
    if (isAssigningMonitor && currentRank === 10) {
      notes.push(`Đã điều chỉnh chức vụ của ${s.fullName} thành "Thành viên" vì mỗi lớp chỉ có 1 Lớp trưởng duy nhất.`);
      return { ...s, roleInClass: 'Thành viên' };
    }

    // 2. Nếu đang phân công Tổ trưởng cho Tổ X -> Chỉ học sinh cũ của đúng Tổ X đang là Tổ trưởng mới chuyển về Thành viên
    // Cán sự các tổ khác (Tổ Y) và Lớp trưởng tuyệt đối không bị ảnh hưởng!
    if (isAssigningGroupLeader && currentRank >= 41 && currentRank <= 49 && (s.groupId === targetGroup || currentRank === targetRank)) {
      notes.push(`Đã điều chỉnh chức vụ của ${s.fullName} (Tổ ${targetGroup}) thành "Thành viên" vì mỗi tổ chỉ có 1 Tổ trưởng duy nhất.`);
      return { ...s, roleInClass: 'Thành viên' };
    }

    // 3. Nếu đang phân công Tổ phó cho Tổ X -> Chỉ học sinh cũ của đúng Tổ X đang là Tổ phó mới chuyển về Thành viên
    if (isAssigningGroupViceLeader && currentRank >= 51 && currentRank <= 59 && (s.groupId === targetGroup || currentRank === targetRank)) {
      notes.push(`Đã điều chỉnh chức vụ của ${s.fullName} (Tổ ${targetGroup}) thành "Thành viên" vì mỗi tổ chỉ có 1 Tổ phó duy nhất.`);
      return { ...s, roleInClass: 'Thành viên' };
    }

    // 4. Nếu đang phân công Bí thư -> Học sinh cũ đang là Bí thư chuyển về Thành viên
    if (isAssigningSecretary && currentRank === 30) {
      notes.push(`Đã điều chỉnh chức vụ của ${s.fullName} thành "Thành viên" vì lớp chỉ có 1 Bí thư Chi đoàn.`);
      return { ...s, roleInClass: 'Thành viên' };
    }

    // 5. Nếu đang phân công Thủ quỹ -> Học sinh cũ đang là Thủ quỹ chuyển về Thành viên
    if (isAssigningTreasurer && currentRank === 35) {
      notes.push(`Đã điều chỉnh chức vụ của ${s.fullName} thành "Thành viên" vì lớp chỉ có 1 Thủ quỹ.`);
      return { ...s, roleInClass: 'Thành viên' };
    }

    return s;
  });

  return { reconciledStudents, systemNotes: notes };
}

/**
 * Sắp xếp danh sách tài khoản chuẩn mực, bảo đảm GVCN đứng đầu,
 * kế tiếp là Lớp trưởng, các Lớp phó, Bí thư, Tổ trưởng 1->4, Tổ phó, và Học sinh
 */
export function sortAccountsByHierarchy(accounts: AccountUser[]): AccountUser[] {
  return [...accounts].sort((a, b) => {
    // GVCN luôn đứng đầu tiên
    const isGvcnA = a.category === 'gvcn' || a.role === 'gvcn' || a.id === 'acc_gvcn';
    const isGvcnB = b.category === 'gvcn' || b.role === 'gvcn' || b.id === 'acc_gvcn';
    if (isGvcnA && !isGvcnB) return -1;
    if (!isGvcnA && isGvcnB) return 1;
    if (isGvcnA && isGvcnB) return 0;

    // So sánh thứ bậc chức danh
    const rankA = getRoleRank(a.title, a.groupId);
    const rankB = getRoleRank(b.title, b.groupId);
    if (rankA !== rankB) return rankA - rankB;

    // So sánh theo Tổ
    const gA = a.groupId || 99;
    const gB = b.groupId || 99;
    if (gA !== gB) return gA - gB;

    // So sánh theo Mã học sinh
    const codeA = a.studentCode || a.username || '';
    const codeB = b.studentCode || b.username || '';
    return codeA.localeCompare(codeB, undefined, { numeric: true });
  });
}

/**
 * Mật khẩu / Mã PIN mặc định theo quy chế hệ thống: 123456
 */
export const DEFAULT_STUDENT_PIN = '123456';

/**
 * Hàm bỏ dấu tiếng Việt chuyển thành chữ không dấu viết thường, an toàn cho tài khoản
 */
export function removeTonesForAccount(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * NGUYÊN TẮC TẠO TÊN TÀI KHOẢN HỌC SINH (YÊU CẦU CHUẨN):
 * TÊN HỌC SINH KHÔNG DẤU + MÃ HỌC SINH
 * (Đảm bảo khi nhiều GVCN cùng dùng app thì tài khoản học sinh không bao giờ bị trùng lặp)
 * Ví dụ: 
 *   - "Nguyễn Vĩnh An" + "HS1101" -> "anhs1101"
 *   - "Lê Tấn Bình" + "HS1102" -> "binhhs1102"
 *   - "Lý Hồ Quốc Đạt" + "HS1103" -> "daths1103"
 *   - "Phạm Tấn Đồng" + "HS1104" -> "donghs1104"
 */
export function generateStudentUsername(
  fullName: string,
  studentCode?: string,
  roleInClass?: string | number,
  _groupId?: number
): string {
  if (!fullName || !fullName.trim()) {
    const codeClean = studentCode ? removeTonesForAccount(studentCode).toLowerCase().replace(/[^a-z0-9]/g, '') : 'hs';
    return codeClean || 'hs';
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const rawTen = parts[parts.length - 1]; // Tên chính của học sinh (An, Bình, Đạt, Đồng, Hợp...)
  const tenClean = removeTonesForAccount(rawTen).toLowerCase().replace(/[^a-z0-9]/g, '');

  // Kiểm tra nếu studentCode bị truyền nhầm là roleInClass thì cố gắng tìm code
  const isLikelyRole = (val?: string | number) => {
    if (val === undefined || val === null) return false;
    const v = removeTonesForAccount(String(val)).toLowerCase();
    return v.includes('lop') || v.includes('to') || v.includes('can su') || v.includes('bi thu') || v.includes('thanh vien') || v.includes('hoc sinh');
  };

  let realCode = studentCode;
  if (realCode && isLikelyRole(realCode) && roleInClass !== undefined && !isLikelyRole(roleInClass)) {
    realCode = String(roleInClass);
  } else if (realCode && isLikelyRole(realCode)) {
    realCode = '';
  }

  const codeClean = realCode
    ? removeTonesForAccount(realCode).toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';

  // Quy tắc chuẩn: Tên HS không dấu + Mã HS
  if (codeClean) {
    return `${tenClean}${codeClean}`;
  }

  // Fallback nếu chưa có mã học sinh: tên + họ đệm viết tắt
  if (parts.length === 1) {
    return `${tenClean}hs01`;
  }
  const hoDemParts = parts.slice(0, -1);
  const initials = hoDemParts.map(p => {
    const clean = removeTonesForAccount(p).replace(/[^a-z0-9]/g, '');
    return clean.charAt(0);
  }).join('');

  return `${tenClean}${initials}`;
}

/**
 * Kiểm tra xem một mã PIN có phải là mã PIN mặc định ban đầu hay không
 */
export function isDefaultStudentPin(pin?: string, _studentCode?: string): boolean {
  if (!pin) return true;
  const p = pin.trim();
  // Chấp nhận cả '123' và '123456'
  return p === '' || p === '123' || p === '123456';
}

