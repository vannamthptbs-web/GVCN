import * as XLSX from 'xlsx';
import { Student, AccountUser, ClassInfo } from '../types';

export interface ParsedExcelStudent {
  studentCode: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  dateOfBirth: string; // YYYY-MM-DD
  groupId: number; // 1, 2, 3, 4
  roleInClass: string;
  phone: string;
  email?: string;
  parentName: string;
  parentPhone: string;
  address: string;
  teacherNotes: string;
  // Account Credentials
  username?: string;
  pin?: string;
  // Metadata for preview & action
  isExistingMatch?: boolean;
  matchedStudentId?: string;
  matchedBy?: 'code' | 'name';
  actionType?: 'update' | 'insert';
}

export interface ParseExcelResult {
  success: boolean;
  message: string;
  students: ParsedExcelStudent[];
  totalRows: number;
  validCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Remove Vietnamese accents/diacritics for flexible fuzzy keyword matching in headers
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Capitalize proper Vietnamese name (e.g. "nguyễn văn an" -> "Nguyễn Văn An")
 */
export function capitalizeVietnameseName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Split a full Vietnamese name into { hoDem, ten }
 * e.g. "Trần Minh Hoàng" -> { hoDem: "Trần Minh", ten: "Hoàng" }
 */
export function splitVietnameseFullName(fullName: string): { hoDem: string; ten: string } {
  if (!fullName) return { hoDem: '', ten: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { hoDem: '', ten: parts[0] };
  }
  const ten = parts[parts.length - 1];
  const hoDem = parts.slice(0, parts.length - 1).join(' ');
  return { hoDem, ten };
}

/**
 * Format ISO date string (YYYY-MM-DD) to Vietnamese standard DD/MM/YYYY
 */
export function formatDateToVietnamese(dateStr: string): string {
  if (!dateStr) return '01/01/2008';
  const matchYmd = String(dateStr).match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = matchYmd[2].padStart(2, '0');
    const day = matchYmd[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  const matchDmy = String(dateStr).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (matchDmy) {
    const day = matchDmy[1].padStart(2, '0');
    const month = matchDmy[2].padStart(2, '0');
    const year = matchDmy[3];
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

/**
 * Normalize any input date string / number into ISO YYYY-MM-DD
 */
export function normalizeDate(raw: any): string {
  if (!raw && raw !== 0) return '';

  // If Excel serial number date (e.g. 39550)
  if (typeof raw === 'number') {
    try {
      if (XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
        const parsed = XLSX.SSF.parse_date_code(raw);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const y = String(parsed.y);
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
      const parsedDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().slice(0, 10);
      }
    } catch {
      // ignore
    }
  }

  const str = String(raw).trim();

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const partsDmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (partsDmy) {
    const day = partsDmy[1].padStart(2, '0');
    const month = partsDmy[2].padStart(2, '0');
    const year = partsDmy[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const partsYmd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (partsYmd) {
    const year = partsYmd[1];
    const month = partsYmd[2].padStart(2, '0');
    const day = partsYmd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Normalize phone number (removes spaces/dots/dashes, restores leading 0 for 9-digit numbers)
 */
export function normalizePhone(raw: any): string {
  if (!raw) return '';
  let str = String(raw).trim().replace(/[\s\.\-\(\)]/g, '');
  // If Excel stripped leading 0 for Vietnamese 10-digit phone
  if (str.length === 9 && !str.startsWith('0')) {
    str = '0' + str;
  }
  return str;
}

/**
 * Normalize gender
 */
export function normalizeGender(raw: any): 'Nam' | 'Nữ' {
  if (!raw) return 'Nam';
  const val = removeVietnameseTones(String(raw));
  if (val.includes('nu') || val.includes('female') || val === 'f' || val === '0' || val === 'gai') {
    return 'Nữ';
  }
  return 'Nam';
}

/**
 * Normalize Group ID (Tổ 1, 2, 3, 4)
 */
export function normalizeGroup(raw: any, fallbackIndex = 1): number {
  if (!raw && raw !== 0) return fallbackIndex;
  const str = String(raw).trim();
  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 4) return num;
  }
  return fallbackIndex;
}

/**
 * Standard class roles
 */
export const STANDARD_ROLES = [
  'Lớp trưởng',
  'Lớp phó Học tập',
  'Lớp phó Lao động',
  'Lớp phó Văn thể mỹ',
  'Bí thư Chi đoàn',
  'Phó Bí thư',
  'Thủ quỹ',
  'Tổ trưởng',
  'Tổ phó',
  'Cán sự môn',
  'Thành viên'
];

/**
 * Normalize class role
 */
export function normalizeRole(raw: any, groupNum?: number): string {
  if (!raw) return 'Thành viên';
  const val = removeVietnameseTones(String(raw));
  
  if (val.includes('lop truong') || val === 'lt') return 'Lớp trưởng';
  if (val.includes('hoc tap') || val.includes('lpht')) return 'Lớp phó Học tập';
  if (val.includes('lao dong') || val.includes('lpld')) return 'Lớp phó Lao động';
  if (val.includes('van the my') || val.includes('van nghe') || val.includes('the thao')) return 'Lớp phó Văn thể mỹ';
  if (val.includes('lop pho')) return 'Lớp phó';
  if (val.includes('bi thu') && !val.includes('pho')) return 'Bí thư Chi đoàn';
  if (val.includes('pho bi thu')) return 'Phó Bí thư';
  if (val.includes('thu quy')) return 'Thủ quỹ';
  if (val.includes('to truong')) return groupNum ? `Tổ trưởng Tổ ${groupNum}` : 'Tổ trưởng';
  if (val.includes('to pho')) return groupNum ? `Tổ phó Tổ ${groupNum}` : 'Tổ phó';
  if (val.includes('can su')) return String(raw).trim();
  if (val.includes('thanh vien') || val.includes('hoc sinh') || val === 'hs') return 'Thành viên';

  return String(raw).trim() || 'Thành viên';
}

/**
 * Parse uploaded Excel file containing student data
 * Supports:
 * - Standard template (Họ đệm + Tên OR Họ và tên)
 * - vnEdu & SMAS student list exports
 * - MOET official CSDL format
 * - Custom sheets with flexible header names
 */
export function parseStudentsFromExcel(
  fileBuffer: ArrayBuffer,
  existingStudents: Student[]
): ParseExcelResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        message: 'File Excel không có trang tính nào hợp lệ!',
        students: [],
        totalRows: 0,
        validCount: 0,
        errors: ['File trống hoặc không đọc được trang tính'],
        warnings: [],
      };
    }

    // Try finding data sheet (first sheet, or named "DanhSach", "HocSinh", "Lop", etc.)
    let targetSheetName = workbook.SheetNames.find(name => {
      const n = removeVietnameseTones(name);
      return n.includes('danh sach') || n.includes('danhsach') || n.includes('hoc sinh') || n.includes('hocsinh') || n.includes('hs');
    }) || workbook.SheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return {
        success: false,
        message: 'Không tìm thấy dữ liệu trong trang tính!',
        students: [],
        totalRows: 0,
        validCount: 0,
        errors: ['Trang tính rỗng'],
        warnings: [],
      };
    }

    // Convert to 2D array
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) {
      return {
        success: false,
        message: 'Trang tính rỗng, không có dòng dữ liệu nào!',
        students: [],
        totalRows: 0,
        validCount: 0,
        errors: ['Không có dòng dữ liệu nào trong sheet'],
        warnings: [],
      };
    }

    // Find the header row index across top 30 rows
    let headerRowIndex = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(rawRows.length, 30); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const normalizedRow = row.map(cell => removeVietnameseTones(String(cell || '')));

      // Check if this row contains student header indicators
      const hasCode = normalizedRow.some(c =>
        c === 'ma hs' || c === 'mahs' || c === 'ma hoc sinh' || c === 'ma dinh danh' || c === 'ma so' || c === 'student code' || c === 'id' || c === 'code'
      );
      const hasFullName = normalizedRow.some(c =>
        c.includes('ho va ten') || c.includes('ho ten') || c === 'ho va ten hoc sinh' || c === 'full name'
      );
      const hasSplitName = normalizedRow.some(c =>
        c.includes('ho dem') || c.includes('ho va chu dem') || c.includes('ho va ten dem') || c === 'ho'
      ) && normalizedRow.some(c =>
        c === 'ten' || c === 'ten goi' || c === 'first name'
      );

      if (hasFullName || hasSplitName || (hasCode && normalizedRow.some(c => c.includes('ten') || c.includes('sinh') || c.includes('gioi')))) {
        headerRowIndex = r;

        normalizedRow.forEach((c, idx) => {
          // Mã học sinh
          if (c === 'ma hs' || c === 'mahs' || c === 'ma hoc sinh' || c === 'ma dinh danh' || c === 'ma so' || c === 'student code' || c === 'code' || c === 'id') {
            if (colMap['code'] === undefined) colMap['code'] = idx;
          }
          // Họ và chữ đệm (tách)
          else if (c.includes('ho va chu dem') || c.includes('ho va ten dem') || c.includes('ho dem') || c === 'ho lot' || c === 'ho') {
            if (colMap['hoDem'] === undefined) colMap['hoDem'] = idx;
          }
          // Tên (tách)
          else if (c === 'ten' || c === 'ten goi' || c === 'first name' || c === 'ten hs') {
            if (colMap['ten'] === undefined) colMap['ten'] = idx;
          }
          // Họ và tên (gộp)
          else if (c.includes('ho va ten') || c.includes('ho ten') || c === 'ho va ten hoc sinh' || c === 'ten hoc sinh' || c === 'full name') {
            if (colMap['fullName'] === undefined) colMap['fullName'] = idx;
          }
          // Giới tính
          else if (c.includes('gioi tinh') || c === 'phai' || c === 'gender' || c === 'nam/nu' || c === 'sex') {
            if (colMap['gender'] === undefined) colMap['gender'] = idx;
          }
          // Ngày sinh
          else if (c.includes('ngay sinh') || c.includes('sinh ngay') || c.includes('ngay/thang/nam sinh') || c === 'dob' || c === 'date of birth') {
            if (colMap['dob'] === undefined) colMap['dob'] = idx;
          }
          // Tổ
          else if (c === 'to' || c === 'to hoc tap' || c === 'to sinh hoat' || c === 'nhom' || c === 'group') {
            if (colMap['group'] === undefined) colMap['group'] = idx;
          }
          // Chức vụ
          else if (c.includes('chuc vu') || c.includes('chuc danh') || c.includes('vai tro') || c === 'nhiem vu' || c === 'role') {
            if (colMap['role'] === undefined) colMap['role'] = idx;
          }
          // SĐT Học sinh
          else if (
            c.includes('sdt hs') || c.includes('dien thoai hs') || c.includes('sdt hoc sinh') ||
            c.includes('so dien thoai hs') || c.includes('di dong hs') ||
            ((c.includes('sdt') || c.includes('dien thoai')) && !c.includes('phu huynh') && !c.includes('ph') && !c.includes('cha') && !c.includes('me') && !c.includes('bo'))
          ) {
            if (colMap['phone'] === undefined) colMap['phone'] = idx;
          }
          // Email
          else if (c.includes('email') || c.includes('e-mail') || c.includes('hom thu') || c.includes('thu dien tu') || c === 'mail') {
            if (colMap['email'] === undefined) colMap['email'] = idx;
          }
          // Họ tên Phụ huynh
          else if (
            c.includes('ho ten phu huynh') || c.includes('ten phu huynh') || c === 'phu huynh' ||
            c.includes('ho ten cha') || c.includes('ho ten me') || c.includes('ho ten bo') ||
            c.includes('nguoi giam ho') || c.includes('cha/me')
          ) {
            if (colMap['parentName'] === undefined) colMap['parentName'] = idx;
          }
          // SĐT Phụ huynh
          else if (
            c.includes('sdt phu huynh') || c.includes('dien thoai phu huynh') || c.includes('sdt ph') ||
            c.includes('dien thoai ph') || c.includes('sdt cha') || c.includes('sdt me') || c.includes('sdt gia dinh') ||
            c.includes('so lien lac gia dinh')
          ) {
            if (colMap['parentPhone'] === undefined) colMap['parentPhone'] = idx;
          }
          // Địa chỉ
          else if (c.includes('dia chi') || c.includes('thuong tru') || c.includes('noi o') || c === 'ho khau' || c === 'que quan' || c === 'address') {
            if (colMap['address'] === undefined) colMap['address'] = idx;
          }
          // Ghi chú GVCN
          else if (c.includes('ghi chu') || c.includes('luu y') || c.includes('dac diem') || c.includes('nhan xet') || c === 'notes' || c === 'note') {
            if (colMap['notes'] === undefined) colMap['notes'] = idx;
          }
          // Tên đăng nhập (Tài khoản)
          else if (c.includes('tai khoan') || c.includes('ten dang nhap') || c === 'username' || c === 'user' || c.includes('dang nhap')) {
            if (colMap['username'] === undefined) colMap['username'] = idx;
          }
          // Mật khẩu (Mã PIN)
          else if (c.includes('mat khau') || c.includes('ma pin') || c === 'password' || c === 'pass' || c === 'pin') {
            if (colMap['pin'] === undefined) colMap['pin'] = idx;
          }
        });

        break;
      }
    }

    if (headerRowIndex === -1 || (colMap['fullName'] === undefined && colMap['ten'] === undefined)) {
      // Fallback: Default positional mapping
      colMap = {
        code: 1,
        hoDem: 2,
        ten: 3,
        fullName: 4,
        gender: 5,
        dob: 6,
        group: 7,
        role: 8,
        phone: 9,
        email: 10,
        parentName: 11,
        parentPhone: 12,
        address: 13,
        notes: 14
      };
      headerRowIndex = 0;
      warnings.push('Không tìm thấy dòng tiêu đề chuẩn rõ ràng. Hệ thống áp dụng cấu hình ánh xạ mặc định STT, Mã HS, Họ tên, Giới tính...');
    }

    const parsedStudents: ParsedExcelStudent[] = [];
    const codeMap = new Map<string, Student>();
    const nameMap = new Map<string, Student>();

    existingStudents.forEach(s => {
      if (s.studentCode) codeMap.set(s.studentCode.trim().toLowerCase(), s);
      if (s.fullName) nameMap.set(s.fullName.trim().toLowerCase(), s);
    });

    let autoCodeSeq = existingStudents.length + 1;

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      // Extract Name (supports separate Ho Dem + Ten OR single Full Name)
      let resolvedName = '';
      const rawFull = colMap['fullName'] !== undefined ? String(row[colMap['fullName']] || '').trim() : '';
      const rawHo = colMap['hoDem'] !== undefined ? String(row[colMap['hoDem']] || '').trim() : '';
      const rawTen = colMap['ten'] !== undefined ? String(row[colMap['ten']] || '').trim() : '';

      if (rawFull) {
        resolvedName = rawFull;
      } else if (rawHo || rawTen) {
        resolvedName = `${rawHo} ${rawTen}`.trim();
      }

      // If still empty, check if row is empty/blank, skip
      if (!resolvedName) continue;

      // Clean full name
      const fullName = capitalizeVietnameseName(resolvedName);

      // Extract or generate Student Code
      let studentCode = colMap['code'] !== undefined ? String(row[colMap['code']] || '').trim() : '';
      if (!studentCode) {
        studentCode = `HS11${autoCodeSeq.toString().padStart(2, '0')}`;
        autoCodeSeq++;
      }

      // Gender
      const rawGender = colMap['gender'] !== undefined ? row[colMap['gender']] : 'Nam';
      const gender = normalizeGender(rawGender);

      // Date of Birth (normalized to YYYY-MM-DD for app storage)
      const rawDob = colMap['dob'] !== undefined ? row[colMap['dob']] : '';
      const dateOfBirth = rawDob ? normalizeDate(rawDob) : '';

      // Group ID (1..4)
      const rawGroup = colMap['group'] !== undefined ? row[colMap['group']] : undefined;
      const groupId = normalizeGroup(rawGroup, (parsedStudents.length % 4) + 1);

      // Role in Class
      const rawRole = colMap['role'] !== undefined ? row[colMap['role']] : 'Thành viên';
      const roleInClass = normalizeRole(rawRole, groupId);

      // Contact info
      const rawPhone = colMap['phone'] !== undefined ? row[colMap['phone']] : '';
      const phone = normalizePhone(rawPhone) || '';

      const email = colMap['email'] !== undefined ? String(row[colMap['email']] || '').trim() : undefined;

      // Parent info
      const rawParentName = colMap['parentName'] !== undefined ? String(row[colMap['parentName']] || '').trim() : '';
      const parentName = rawParentName || '';

      const rawParentPhone = colMap['parentPhone'] !== undefined ? row[colMap['parentPhone']] : '';
      const parentPhone = normalizePhone(rawParentPhone) || '';

      // Address
      const rawAddress = colMap['address'] !== undefined ? String(row[colMap['address']] || '').trim() : '';
      const address = rawAddress || '';

      // Notes
      const teacherNotes = colMap['notes'] !== undefined ? String(row[colMap['notes']] || '').trim() : '';

      // Username & Pin
      const rawUsername = colMap['username'] !== undefined ? String(row[colMap['username']] || '').trim() : '';
      const rawPin = colMap['pin'] !== undefined ? String(row[colMap['pin']] || '').trim() : '';

      // Check match with existing students
      const codeMatch = codeMap.get(studentCode.toLowerCase());
      const nameMatch = nameMap.get(fullName.toLowerCase());
      const matched = codeMatch || nameMatch;

      parsedStudents.push({
        studentCode,
        fullName,
        gender,
        dateOfBirth,
        groupId,
        roleInClass,
        phone,
        email: email || undefined,
        parentName,
        parentPhone,
        address,
        teacherNotes,
        username: rawUsername || undefined,
        pin: rawPin || undefined,
        isExistingMatch: !!matched,
        matchedStudentId: matched?.id,
        matchedBy: codeMatch ? 'code' : nameMatch ? 'name' : undefined,
        actionType: matched ? 'update' : 'insert',
      });
    }

    if (parsedStudents.length === 0) {
      return {
        success: false,
        message: 'Không tìm thấy dữ liệu học sinh hợp lệ nào trong file Excel!',
        students: [],
        totalRows: rawRows.length,
        validCount: 0,
        errors: ['Không có dòng nào chứa đầy đủ Họ tên hoặc Mã học sinh hợp lệ'],
        warnings,
      };
    }

    return {
      success: true,
      message: `Đã đọc và chuẩn hóa thành công ${parsedStudents.length} học sinh từ file Excel!`,
      students: parsedStudents,
      totalRows: rawRows.length,
      validCount: parsedStudents.length,
      errors,
      warnings,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Lỗi đọc file Excel: ' + (error?.message || 'Định dạng file không hợp lệ'),
      students: [],
      totalRows: 0,
      validCount: 0,
      errors: [error?.message || 'Lỗi không xác định'],
      warnings,
    };
  }
}

/**
 * Generate standard student template Excel file for user to download
 * Supports:
 * 1. 'standard_moet' (Khuyên dùng - Chuẩn vnEdu / SMAS / Bộ GD&ĐT):
 *    Có cả cột Họ đệm + Tên + Họ và tên, Ngày sinh DD/MM/YYYY, Email, Chức vụ, Tổ, Phụ huynh, và Sheet Hướng dẫn quy chuẩn chi tiết.
 * 2. 'simple':
 *    Mẫu rút gọn gộp Họ và tên.
 */
export function generateStudentTemplateExcel(
  currentStudents?: Student[],
  className = 'Lop_Hoc',
  templateType: 'standard_moet' | 'simple' = 'standard_moet'
) {
  const wb = XLSX.utils.book_new();

  // Standard MOET / vnEdu / SMAS Headers
  const standardHeaders = [
    'STT',
    'MÃ HỌC SINH',
    'HỌ VÀ CHỮ ĐỆM',
    'TÊN',
    'HỌ VÀ TÊN',
    'GIỚI TÍNH',
    'NGÀY SINH',
    'TỔ',
    'CHỨC VỤ',
    'TÊN ĐĂNG NHẬP (TÀI KHOẢN)',
    'MẬT KHẨU / MÃ PIN',
    'SỐ ĐIỆN THOẠI HS',
    'EMAIL HỌC SINH',
    'HỌ TÊN PHỤ HUYNH',
    'SĐT PHỤ HUYNH',
    'ĐỊA CHỈ THƯỜNG TRÚ',
    'GHI CHÚ CỦA GVCN'
  ];

  // Simple Headers
  const simpleHeaders = [
    'STT',
    'MÃ HỌC SINH',
    'HỌ VÀ TÊN',
    'GIỚI TÍNH',
    'NGÀY SINH',
    'TỔ',
    'CHỨC VỤ',
    'TÊN ĐĂNG NHẬP (TÀI KHOẢN)',
    'MẬT KHẨU / MÃ PIN',
    'SỐ ĐIỆN THOẠI HS',
    'EMAIL HỌC SINH',
    'HỌ TÊN PHỤ HUYNH',
    'SĐT PHỤ HUYNH',
    'ĐỊA CHỈ THƯỜNG TRÚ',
    'GHI CHÚ CỦA GVCN'
  ];

  const headers = templateType === 'standard_moet' ? standardHeaders : simpleHeaders;
  let rows: any[][] = [];

  if (currentStudents && currentStudents.length > 0) {
    if (templateType === 'standard_moet') {
      rows = currentStudents.map((s, idx) => {
        const split = splitVietnameseFullName(s.fullName);
        const vnDob = formatDateToVietnamese(s.dateOfBirth);
        const autoUser = `hs_${s.studentCode.toLowerCase()}`;
        return [
          idx + 1,
          s.studentCode,
          split.hoDem,
          split.ten,
          s.fullName,
          s.gender,
          vnDob,
          `Tổ ${s.groupId}`,
          s.roleInClass || 'Thành viên',
          s.customUsername || autoUser,
          s.customPin || '123',
          s.phone || '',
          s.email || `${s.studentCode.toLowerCase()}@lop${className.toLowerCase()}.edu.vn`,
          s.parentName || '',
          s.parentPhone || '',
          s.address || '',
          s.teacherNotes || ''
        ];
      });
    } else {
      rows = currentStudents.map((s, idx) => {
        const vnDob = formatDateToVietnamese(s.dateOfBirth);
        const autoUser = `hs_${s.studentCode.toLowerCase()}`;
        return [
          idx + 1,
          s.studentCode,
          s.fullName,
          s.gender,
          vnDob,
          `Tổ ${s.groupId}`,
          s.roleInClass || 'Thành viên',
          s.customUsername || autoUser,
          s.customPin || '123',
          s.phone || '',
          s.email || `${s.studentCode.toLowerCase()}@lop${className.toLowerCase()}.edu.vn`,
          s.parentName || '',
          s.parentPhone || '',
          s.address || '',
          s.teacherNotes || ''
        ];
      });
    }
  } else {
    // 5 High-quality realistic standard example rows with full credentials
    if (templateType === 'standard_moet') {
      rows = [
        [1, 'HS1101', 'Trần Minh', 'Hoàng', 'Trần Minh Hoàng', 'Nam', '12/04/2008', 'Tổ 1', 'Lớp trưởng', 'hs_hs1101', '123', '0912345601', 'hoang.tm@lop11a1.edu.vn', 'Trần Văn Hùng', '0988111222', '12 Nguyễn Trãi, Thanh Xuân, Hà Nội', 'Gương mẫu, trách nhiệm cao, quản lý tốt'],
        [2, 'HS1102', 'Lê Quỳnh', 'Chi', 'Lê Quỳnh Chi', 'Nữ', '20/08/2008', 'Tổ 1', 'Lớp phó Học tập', 'hs_hs1102', '123', '0912345602', 'chi.lq@lop11a1.edu.vn', 'Lê Thành Đạt', '0988111223', '45 Lê Văn Lương, Cầu Giấy, Hà Nội', 'Học giỏi đều các môn, kèm cặp bạn yếu'],
        [3, 'HS1103', 'Phạm Gia', 'Huy', 'Phạm Gia Huy', 'Nam', '15/02/2008', 'Tổ 1', 'Tổ trưởng Tổ 1', 'hs_hs1103', '123', '0912345603', 'huy.pg@lop11a1.edu.vn', 'Phạm Văn Nam', '0988111224', '88 Kim Mã, Ba Đình, Hà Nội', 'Đôn đốc tổ sát sao, ghi chép cẩn thận'],
        [4, 'HS1111', 'Nguyễn Đức', 'Thắng', 'Nguyễn Đức Thắng', 'Nam', '10/06/2008', 'Tổ 2', 'Lớp phó Lao động', 'hs_hs1111', '123', '0912345611', 'thang.nd@lop11a1.edu.vn', 'Nguyễn Văn Cường', '0988111232', '11 Hoàng Cầu, Đống Đa, Hà Nội', 'Phụ trách vệ sinh xuất sắc, chăm chỉ'],
        [5, 'HS1121', 'Vũ Bảo', 'Ngọc', 'Vũ Bảo Ngọc', 'Nữ', '18/01/2008', 'Tổ 3', 'Lớp phó Văn thể mỹ', 'hs_hs1121', '123', '0912345621', 'ngoc.vb@lop11a1.edu.vn', 'Vũ Văn Tuấn', '0988111242', '14 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', 'Năng nổ phong trào văn nghệ, đàn hát tốt']
      ];
    } else {
      rows = [
        [1, 'HS1101', 'Trần Minh Hoàng', 'Nam', '12/04/2008', 'Tổ 1', 'Lớp trưởng', 'hs_hs1101', '123', '0912345601', 'hoang.tm@lop11a1.edu.vn', 'Trần Văn Hùng', '0988111222', '12 Nguyễn Trãi, Thanh Xuân, Hà Nội', 'Gương mẫu, trách nhiệm cao'],
        [2, 'HS1102', 'Lê Quỳnh Chi', 'Nữ', '20/08/2008', 'Tổ 1', 'Lớp phó Học tập', 'hs_hs1102', '123', '0912345602', 'chi.lq@lop11a1.edu.vn', 'Lê Thành Đạt', '0988111223', '45 Lê Văn Lương, Cầu Giấy, Hà Nội', 'Học giỏi đều các môn'],
        [3, 'HS1103', 'Phạm Gia Huy', 'Nam', '15/02/2008', 'Tổ 1', 'Tổ trưởng Tổ 1', 'hs_hs1103', '123', '0912345603', 'huy.pg@lop11a1.edu.vn', 'Phạm Văn Nam', '0988111224', '88 Kim Mã, Ba Đình, Hà Nội', 'Ghi chép tổ cẩn thận'],
        [4, 'HS1111', 'Nguyễn Đức Thắng', 'Nam', '10/06/2008', 'Tổ 2', 'Lớp phó Lao động', 'hs_hs1111', '123', '0912345611', 'thang.nd@lop11a1.edu.vn', 'Nguyễn Văn Cường', '0988111232', '11 Hoàng Cầu, Đống Đa, Hà Nội', 'Phụ trách vệ sinh xuất sắc'],
        [5, 'HS1121', 'Vũ Bảo Ngọc', 'Nữ', '18/01/2008', 'Tổ 3', 'Lớp phó Văn thể mỹ', 'hs_hs1121', '123', '0912345621', 'ngoc.vb@lop11a1.edu.vn', 'Vũ Văn Tuấn', '0988111242', '14 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', 'Năng nổ văn nghệ']
      ];
    }
  }

  // Header Title banner
  const wsData = [
    [`DANH SÁCH HỌC SINH LỚP ${className} - MẪU CHUẨN ĐỒNG BỘ`],
    [`(Mẫu chuẩn Giáo dục & Đào tạo - Tương thích vnEdu, SMAS, CSDL Ngành. Định dạng ngày sinh: DD/MM/YYYY)`],
    [],
    headers,
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  if (templateType === 'standard_moet') {
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // MÃ HS
      { wch: 18 }, // HỌ VÀ CHỮ ĐỆM
      { wch: 12 }, // TÊN
      { wch: 25 }, // HỌ VÀ TÊN
      { wch: 11 }, // GIỚI TÍNH
      { wch: 14 }, // NGÀY SINH
      { wch: 10 }, // TỔ
      { wch: 22 }, // CHỨC VỤ
      { wch: 24 }, // TÊN ĐĂNG NHẬP
      { wch: 18 }, // MẬT KHẨU
      { wch: 16 }, // SĐT HS
      { wch: 26 }, // EMAIL HS
      { wch: 24 }, // PHỤ HUYNH
      { wch: 16 }, // SĐT PH
      { wch: 32 }, // ĐỊA CHỈ
      { wch: 35 }, // GHI CHÚ
    ];
  } else {
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // MÃ HS
      { wch: 26 }, // HỌ VÀ TÊN
      { wch: 11 }, // GIỚI TÍNH
      { wch: 14 }, // NGÀY SINH
      { wch: 10 }, // TỔ
      { wch: 22 }, // CHỨC VỤ
      { wch: 24 }, // TÊN ĐĂNG NHẬP
      { wch: 18 }, // MẬT KHẨU
      { wch: 16 }, // SĐT HS
      { wch: 26 }, // EMAIL HS
      { wch: 24 }, // PHỤ HUYNH
      { wch: 16 }, // SĐT PH
      { wch: 32 }, // ĐỊA CHỈ
      { wch: 35 }, // GHI CHÚ
    ];
  }

  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');

  // Sheet 2: Guidelines & Regulations (HuongDan_QuyChuan)
  const guideData = [
    ['HƯỚNG DẪN QUY CHUẨN DỮ LIỆU FILE EXCEL DANH SÁCH HỌC SINH'],
    ['(Hệ thống tự động nhận diện thông minh, tương thích với các xuất file từ vnEdu, SMAS, CSDL Ngành)'],
    [],
    ['1. BẢNG QUY CHUẨN CÁC CỘT THÔNG TIN:'],
    ['Tên cột', 'Bắt buộc?', 'Kiểu dữ liệu', 'Ví dụ hợp lệ', 'Lưu ý của hệ thống'],
    ['MÃ HỌC SINH', 'Có', 'Văn bản', 'HS1101, 0123456789', 'Khóa định danh học sinh. Dùng để đối soát cập nhật hồ sơ'],
    ['HỌ VÀ CHỮ ĐỆM', 'Tùy chọn', 'Văn bản', 'Trần Minh, Lê Quỳnh', 'Tương thích file trích xuất vnEdu, SMAS (tách cột Họ đệm và Tên)'],
    ['TÊN', 'Tùy chọn', 'Văn bản', 'Hoàng, Chi, An', 'Nếu có cột Họ đệm + Tên, hệ thống tự động ghép lại'],
    ['HỌ VÀ TÊN', 'Có', 'Văn bản', 'Trần Minh Hoàng', 'Họ tên đầy đủ. Tự động viết hoa chuẩn tiếng Việt'],
    ['GIỚI TÍNH', 'Có', 'Văn bản', 'Nam hoặc Nữ', 'Chấp nhận: Nam, Nữ, nam, nu, Male, Female'],
    ['NGÀY SINH', 'Có', 'Ngày tháng', '12/04/2008', 'Định dạng chuẩn Việt Nam: Ngày/Tháng/Năm (DD/MM/YYYY)'],
    ['TỔ', 'Có', 'Số hoặc Chữ', 'Tổ 1, Tổ 2, Tổ 3, Tổ 4 hoặc 1, 2, 3, 4', 'Hệ thống tự động ánh xạ vào 4 tổ sinh hoạt của lớp'],
    ['CHỨC VỤ', 'Có', 'Văn bản', 'Lớp trưởng, Tổ trưởng, Thành viên', 'Xem bảng danh mục chức vụ hợp lệ bên dưới'],
    ['TÊN ĐĂNG NHẬP', 'Tùy chọn', 'Văn bản', 'hs_hs1101, tt1_hoang', 'Tài khoản đăng nhập ứng dụng. Để trống hệ thống tự tạo'],
    ['MẬT KHẨU / MÃ PIN', 'Tùy chọn', 'Văn bản/Số', '123, 123456', 'Mật khẩu ban đầu. Mặc định là 123 nếu để trống'],
    ['SỐ ĐIỆN THOẠI HS', 'Tùy chọn', 'Số/Văn bản', '0912345601', 'Hệ thống tự động phục hồi số 0 ở đầu nếu Excel bị mất'],
    ['EMAIL HỌC SINH', 'Tùy chọn', 'Email', 'an.nv@lop11a1.edu.vn', 'Dùng để liên hệ hoặc tạo tài khoản đăng nhập'],
    ['HỌ TÊN PHỤ HUYNH', 'Tùy chọn', 'Văn bản', 'Trần Văn Hùng', 'Tên bố, mẹ hoặc người giám hộ hợp pháp'],
    ['SĐT PHỤ HUYNH', 'Khuyên dùng', 'Số/Văn bản', '0988111222', 'Số điện thoại liên lạc của gia đình khi cần trao đổi'],
    ['ĐỊA CHỈ THƯỜNG TRÚ', 'Tùy chọn', 'Văn bản', '12 Nguyễn Trãi, Thanh Xuân, Hà Nội', 'Địa chỉ nơi ở thường trú hoặc tạm trú của học sinh'],
    ['GHI CHÚ CỦA GVCN', 'Tùy chọn', 'Văn bản', 'Học tốt, sức khỏe yếu, lưu ý riêng...', 'Ghi chú phục vụ công tác chủ nhiệm của GVCN'],
    [],
    ['2. DANH MỤC CHỨC VỤ CHUẨN TRONG LỚP ĐƯỢC HỖ TRỢ:'],
    ['Chức vụ', 'Mô tả & Nhiệm vụ', 'Quyền hạn trong ứng dụng'],
    ['Lớp trưởng', 'Điều hành chung toàn diện các hoạt động của lớp', 'Quản lý thi đua, điểm danh, nề nếp toàn lớp'],
    ['Lớp phó Học tập', 'Theo dõi học tập, truy bài, 15 phút đầu giờ', 'Ghi nhận điểm thi đua học tập'],
    ['Lớp phó Lao động', 'Phân công và đôn đốc trực nhật, lao động vệ sinh', 'Chấm điểm trực nhật, phân công lao động'],
    ['Lớp phó Văn thể mỹ', 'Phụ trách phong trào thể thao, văn nghệ, hoạt động ngoài giờ', 'Ghi nhận khen thưởng phong trào'],
    ['Bí thư Chi đoàn', 'Phụ trách công tác Đoàn, phong trào thanh niên', 'Tham gia ban cán sự theo dõi thi đua'],
    ['Phó Bí thư', 'Hỗ trợ Bí thư Chi đoàn', 'Ban cán sự lớp'],
    ['Thủ quỹ', 'Quản lý quỹ lớp, các khoản đóng góp phong trào', 'Ban cán sự lớp'],
    ['Tổ trưởng (Tổ 1 - 4)', 'Quản lý và chấm thi đua thành viên trong tổ', 'Điểm danh tổ, tổng kết tuần của tổ'],
    ['Tổ phó (Tổ 1 - 4)', 'Hỗ trợ tổ trưởng điều hành tổ', 'Hỗ trợ công tác tổ'],
    ['Cán sự môn', 'Phụ trách từng bộ môn chuyên biệt (Toán, Văn, Anh...)', 'Hỗ trợ kiểm tra bài vở'],
    ['Thành viên', 'Học sinh lớp (mặc định)', 'Xem hồ sơ cá nhân, tự đánh giá tuần']
  ];

  const guideWs = XLSX.utils.aoa_to_sheet(guideData);
  guideWs['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 16 },
    { wch: 35 },
    { wch: 60 }
  ];

  XLSX.utils.book_append_sheet(wb, guideWs, 'HuongDan_QuyChuan');

  const fileName = currentStudents && currentStudents.length > 0
    ? `Danh_Sach_Hoc_Sinh_Lop_${className}_Chuan_GVCN.xlsx`
    : templateType === 'standard_moet'
    ? `Mau_Excel_Danh_Sach_Hoc_Sinh_Chuan_vnEdu_SMAS_${className}.xlsx`
    : `Mau_Excel_Danh_Sach_Hoc_Sinh_Nhanh_${className}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Xuất file Excel Danh sách lớp kèm Tài khoản và Mật khẩu để cung cấp cho học sinh
 */
export function exportStudentAccountsListExcel(
  students: Student[],
  accounts: AccountUser[],
  classInfo: Partial<ClassInfo>
) {
  const wb = XLSX.utils.book_new();

  // Create lookup maps
  const accountMap = new Map<string, AccountUser>();
  accounts.forEach(acc => {
    if (acc.studentId) accountMap.set(acc.studentId, acc);
    if (acc.studentCode) accountMap.set(acc.studentCode.toLowerCase().trim(), acc);
    if (acc.fullName) accountMap.set(acc.fullName.toLowerCase().trim(), acc);
  });

  const headers = [
    'STT',
    'MÃ HỌC SINH',
    'HỌ VÀ TÊN',
    'TỔ',
    'CHỨC VỤ TRONG LỚP',
    'TÀI KHOẢN (TÊN ĐĂNG NHẬP)',
    'MẬT KHẨU / MÃ PIN',
    'TRẠNG THÁI MẬT KHẨU',
    'GIỚI TÍNH',
    'NGÀY SINH',
    'SỐ ĐIỆN THOẠI HỌC SINH',
    'HỌ TÊN PHỤ HUYNH',
    'SĐT PHỤ HUYNH',
    'HƯỚNG DẪN ĐĂNG NHẬP'
  ];

  const titleRows = [
    [`BẢNG CẤP TÀI KHOẢN & MẬT KHẨU ĐĂNG NHẬP ${classInfo.className ? `LỚP ${classInfo.className}` : 'LỚP HỌC'}`],
    [`Năm học: ${classInfo.schoolYear || '2026 - 2027'}${classInfo.schoolName ? ` • Trường: ${classInfo.schoolName}` : ''}`],
    [`GVCN: ${classInfo.homeroomTeacher || 'Chưa cập nhật'} | SĐT: ${classInfo.teacherPhone || ''} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
    ['Lưu ý: Thầy/Cô cắt hoặc gửi thông tin riêng cho từng học sinh. Khuyến khích học sinh đổi mật khẩu ngay sau lần đăng nhập đầu tiên.'],
    []
  ];

  const dataRows = students.map((s, idx) => {
    const acc = accountMap.get(s.id) ||
      (s.studentCode ? accountMap.get(s.studentCode.toLowerCase().trim()) : undefined) ||
      accountMap.get(s.fullName.toLowerCase().trim());

    const username = acc?.username || s.customUsername || `hs_${s.studentCode.toLowerCase()}`;
    const pin = acc?.pin || s.customPin || '123';
    const isCustom = acc?.isCustomPin || pin !== '123';
    const pinStatus = isCustom ? 'Đã đổi mật khẩu riêng' : 'Mật khẩu ban đầu (123)';

    return [
      idx + 1,
      s.studentCode,
      s.fullName,
      `Tổ ${s.groupId}`,
      s.roleInClass || 'Thành viên',
      username,
      pin,
      pinStatus,
      s.gender,
      formatDateToVietnamese(s.dateOfBirth),
      s.phone || '',
      s.parentName || '',
      s.parentPhone || '',
      'Truy cập ứng dụng lớp học -> Nhập Tài khoản & Mật khẩu -> Bấm "Đổi mật khẩu" để bảo mật.'
    ];
  });

  const fullSheetData = [...titleRows, headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã HS
    { wch: 25 }, // Họ tên
    { wch: 10 }, // Tổ
    { wch: 22 }, // Chức vụ
    { wch: 24 }, // Tài khoản
    { wch: 18 }, // Mật khẩu
    { wch: 24 }, // Trạng thái MK
    { wch: 10 }, // Giới tính
    { wch: 14 }, // Ngày sinh
    { wch: 16 }, // SĐT HS
    { wch: 24 }, // PH
    { wch: 16 }, // SĐT PH
    { wch: 45 }  // Hướng dẫn
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'TaiKhoan_HocSinh');

  // GVCN Administration sheet
  const gvcnAcc = accounts.find(a => a.category === 'gvcn' || a.role === 'gvcn');
  if (gvcnAcc) {
    const gvcnRows = [
      ['THÔNG TIN TÀI KHOẢN QUẢN TRỊ GIÁO VIÊN CHỦ NHIỆM'],
      ['Họ và tên GVCN:', gvcnAcc.fullName],
      ['Tài khoản đăng nhập:', gvcnAcc.username],
      ['Mật khẩu / Mã PIN hiện tại:', gvcnAcc.pin],
      ['Quyền hạn:', 'Toàn quyền điều hành và quản trị lớp học'],
      ['Ngày xuất file:', new Date().toLocaleString('vi-VN')],
      ['Cảnh báo bảo mật:', 'Tuyệt đối không gửi hoặc để lộ thông tin sheet này cho học sinh!']
    ];
    const gvcnWs = XLSX.utils.aoa_to_sheet(gvcnRows);
    gvcnWs['!cols'] = [{ wch: 28 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, gvcnWs, 'TaiKhoan_GVCN');
  }

  const fileName = `Danh_Sach_Tai_Khoan_Mat_Khau_Lop_${(classInfo.className || 'Lop_Hoc').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
