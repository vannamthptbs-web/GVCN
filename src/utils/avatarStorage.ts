/**
 * avatarStorage.ts
 * Hệ thống lưu trữ và đồng bộ ảnh đại diện vĩnh viễn cho học sinh và cán sự lớp.
 * 
 * Đảm bảo:
 * 1. Khi học sinh đổi ảnh đại diện (qua file tải lên, dán link hoặc chọn mẫu), ảnh được lưu
 *    vào bộ nhớ cục bộ đồng bộ (localStorage) VÀ kho cơ sở dữ liệu IndexedDB trình duyệt.
 * 2. Ngăn ngừa việc ảnh bị mất hoặc bị ghi đè khi tải lại trang, chuyển tab, hoặc đồng bộ
 *    Google Sheets / import danh sách học sinh.
 * 3. Hỗ trợ đa định dạng: Link Google Drive (lh3 CDN), link trực tuyến hoặc ảnh nén base64 chất lượng cao.
 */

import { Student, AccountUser } from '../types';

const LS_PERMANENT_AVATARS_KEY = 'gvcn_permanent_student_avatars_v2';
const LS_FALLBACK_KEY = 'teacher_app_permanent_avatars';

// In-memory cache for ultra-fast synchronous lookup
let memoryAvatarMap: Record<string, string> = {};
let isMemoryInitialized = false;

// Initialize from localStorage
function getStoredAvatarMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_PERMANENT_AVATARS_KEY) || localStorage.getItem(LS_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[AvatarStorage] Lỗi đọc bộ nhớ ảnh đại diện:', err);
  }
  return {};
}

function initMemoryMap(): Record<string, string> {
  if (!isMemoryInitialized) {
    memoryAvatarMap = getStoredAvatarMap();
    isMemoryInitialized = true;
  }
  return memoryAvatarMap;
}

// Normalize identifier key
function normalizeKey(key?: string | null): string {
  if (!key) return '';
  return String(key).trim().toLowerCase().replace(/\s+/g, ' ');
}

// ----------------------------------------------------
// INDEXEDDB SUPPORT FOR LARGE BASE64 AVATARS (UP TO 50MB+)
// ----------------------------------------------------
const IDB_NAME = 'gvcn_app_media_db';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'student_avatars';

function openAvatarDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[AvatarStorage] IndexedDB mở thất bại, dùng localStorage fallback');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

async function persistToIndexedDB(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl) return;
  try {
    const db = await openAvatarDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    store.put({ key, dataUrl, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[AvatarStorage] Lỗi ghi IndexedDB:', err);
  }
}

/**
 * Tải toàn bộ avatar từ IndexedDB vào bộ nhớ memory cache khi app khởi động
 */
export async function hydrateAvatarsFromIndexedDB(): Promise<Record<string, string>> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return initMemoryMap();
  }

  try {
    const db = await openAvatarDB();
    if (!db) return initMemoryMap();

    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result as Array<{ key: string; dataUrl: string }>;
        if (Array.isArray(results) && results.length > 0) {
          const map = initMemoryMap();
          results.forEach(item => {
            if (item.key && item.dataUrl) {
              map[item.key] = item.dataUrl;
            }
          });
          // Đồng bộ ngược lại localStorage nếu dung lượng cho phép
          try {
            localStorage.setItem(LS_PERMANENT_AVATARS_KEY, JSON.stringify(map));
          } catch (_) {}
          resolve(map);
        } else {
          resolve(initMemoryMap());
        }
      };

      req.onerror = () => resolve(initMemoryMap());
    });
  } catch {
    return initMemoryMap();
  }
}

/**
 * Lưu ảnh đại diện của học sinh vào kho lưu trữ vĩnh viễn (localStorage + IndexedDB + Memory)
 */
export function savePermanentAvatar(
  identifiers: {
    studentId?: string;
    studentCode?: string;
    fullName?: string;
    accountId?: string;
    username?: string;
  },
  avatarUrl: string
): void {
  if (!avatarUrl || !avatarUrl.trim()) return;

  const cleanUrl = avatarUrl.trim();
  const map = initMemoryMap();

  const keysToSave: string[] = [];

  if (identifiers.studentId) {
    keysToSave.push(`id:${normalizeKey(identifiers.studentId)}`);
    keysToSave.push(normalizeKey(identifiers.studentId));
  }
  if (identifiers.studentCode) {
    keysToSave.push(`code:${normalizeKey(identifiers.studentCode)}`);
    keysToSave.push(normalizeKey(identifiers.studentCode));
  }
  if (identifiers.fullName) {
    keysToSave.push(`name:${normalizeKey(identifiers.fullName)}`);
  }
  if (identifiers.accountId) {
    keysToSave.push(`acc:${normalizeKey(identifiers.accountId)}`);
    keysToSave.push(normalizeKey(identifiers.accountId));
  }
  if (identifiers.username) {
    keysToSave.push(`user:${normalizeKey(identifiers.username)}`);
    keysToSave.push(normalizeKey(identifiers.username));
  }

  // Update memory
  keysToSave.forEach(k => {
    if (k) map[k] = cleanUrl;
  });

  // Persist to localStorage
  try {
    localStorage.setItem(LS_PERMANENT_AVATARS_KEY, JSON.stringify(map));
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(map));
  } catch (lsErr) {
    console.warn('[AvatarStorage] LocalStorage quota exceeded, storing to IndexedDB directly:', lsErr);
  }

  // Persist to IndexedDB asynchronously
  keysToSave.forEach(k => {
    if (k) {
      persistToIndexedDB(k, cleanUrl).catch(() => {});
    }
  });
}

/**
 * Tìm ảnh đại diện đã lưu của một học sinh hoặc tài khoản
 */
export function getPermanentAvatar(
  identifiers: {
    studentId?: string;
    studentCode?: string;
    fullName?: string;
    accountId?: string;
    username?: string;
  },
  fallbackAvatar?: string
): string | undefined {
  const map = initMemoryMap();

  // Try lookups in order of specificity
  if (identifiers.studentId) {
    const k1 = `id:${normalizeKey(identifiers.studentId)}`;
    if (map[k1]) return map[k1];
    const k2 = normalizeKey(identifiers.studentId);
    if (map[k2]) return map[k2];
  }

  if (identifiers.studentCode) {
    const k1 = `code:${normalizeKey(identifiers.studentCode)}`;
    if (map[k1]) return map[k1];
    const k2 = normalizeKey(identifiers.studentCode);
    if (map[k2]) return map[k2];
  }

  if (identifiers.accountId) {
    const k1 = `acc:${normalizeKey(identifiers.accountId)}`;
    if (map[k1]) return map[k1];
    const k2 = normalizeKey(identifiers.accountId);
    if (map[k2]) return map[k2];
  }

  if (identifiers.username) {
    const k1 = `user:${normalizeKey(identifiers.username)}`;
    if (map[k1]) return map[k1];
    const k2 = normalizeKey(identifiers.username);
    if (map[k2]) return map[k2];
  }

  if (identifiers.fullName) {
    const k1 = `name:${normalizeKey(identifiers.fullName)}`;
    if (map[k1]) return map[k1];
  }

  return fallbackAvatar;
}

/**
 * Áp dụng avatar vĩnh viễn vào danh sách học sinh (bảo vệ không bị mất ảnh khi sync sheet / refresh)
 */
export function applyPermanentAvatarsToStudents(students: Student[]): Student[] {
  if (!Array.isArray(students) || students.length === 0) return students;

  return students.map(student => {
    const saved = getPermanentAvatar({
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
    });

    if (saved && saved !== student.avatar) {
      return { ...student, avatar: saved };
    }
    return student;
  });
}

/**
 * Áp dụng avatar vĩnh viễn vào danh sách tài khoản
 */
export function applyPermanentAvatarsToAccounts(accounts: AccountUser[]): AccountUser[] {
  if (!Array.isArray(accounts) || accounts.length === 0) return accounts;

  return accounts.map(acc => {
    const saved = getPermanentAvatar({
      studentId: acc.studentId,
      studentCode: acc.studentCode,
      fullName: acc.fullName,
      accountId: acc.id,
      username: acc.username,
    });

    if (saved && saved !== acc.avatar) {
      return { ...acc, avatar: saved };
    }
    return acc;
  });
}
