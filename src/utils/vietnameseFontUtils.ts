/**
 * Bộ giải mã & Sửa lỗi Font chữ tiếng Việt toàn diện (Vietnamese Font & Encoding Fixer)
 * Hỗ trợ chuyển đổi:
 * 1. TCVN3 (ABC - font .VnTime, .VnTimeH, .VnArial, ...) sang Unicode chuẩn
 * 2. VNI-Windows (font VNI-Times, ...) sang Unicode chuẩn
 * 3. Windows-1258 / ANSI tiếng Việt sang Unicode chuẩn
 * 4. Xử lý UTF-8 BOM, UTF-16LE, UTF-16BE
 * 5. Trích xuất text tiếng Việt từ file Word nhị phân cũ (.doc 97-2003) nếu mammoth không đọc được
 */

// Bảng mã chuyển đổi TCVN3 (ABC thường) sang Unicode chuẩn
const TCVN3_TO_UNICODE: { [key: string]: string } = {
  // Nguyên âm thường có dấu trong TCVN3
  '\xb8': 'á',
  '\xb9': 'à',
  '\xba': 'ả',
  '\xbb': 'ã',
  '\xbc': 'ạ',
  '\xa8': 'ă',
  '\xbe': 'ắ',
  '\xbf': 'ằ',
  '\xc0': 'ẳ',
  '\xc1': 'ẵ',
  '\xc2': 'ặ',
  '\xa9': 'â',
  '\xc3': 'ấ',
  '\xc4': 'ầ',
  '\xc5': 'ẩ',
  '\xc6': 'ẫ',
  '\xc7': 'ậ',
  '\xc8': 'é',
  '\xc9': 'è',
  '\xca': 'ẻ',
  '\xcb': 'ẽ',
  '\xcc': 'ẹ',
  '\xaa': 'ê',
  '\xcd': 'ế',
  '\xce': 'ề',
  '\xcf': 'ể',
  '\xd0': 'ễ',
  '\xd1': 'ệ',
  '\xd2': 'í',
  '\xd3': 'ì',
  '\xd4': 'ỉ',
  '\xd5': 'ĩ',
  '\xd6': 'ị',
  '\xd7': 'ó',
  '\xd8': 'ò',
  '\xd9': 'ỏ',
  '\xda': 'õ',
  '\xdb': 'ọ',
  '\xab': 'ô',
  '\xdc': 'ố',
  '\xdd': 'ồ',
  '\xde': 'ổ',
  '\xdf': 'ỗ',
  '\xe1': 'ộ',
  '\xac': 'ơ',
  '\xe2': 'ớ',
  '\xe3': 'ờ',
  '\xe4': 'ở',
  '\xe5': 'ỡ',
  '\xe6': 'ợ',
  '\xe7': 'ú',
  '\xe8': 'ù',
  '\xe9': 'ủ',
  '\xea': 'ũ',
  '\xeb': 'ụ',
  '\xad': 'ư',
  '\xec': 'ứ',
  '\xed': 'ừ',
  '\xee': 'ử',
  '\xef': 'ữ',
  '\xf1': 'ự',
  '\xf2': 'ý',
  '\xf3': 'ỳ',
  '\xf4': 'ỷ',
  '\xf5': 'ỹ',
  '\xf6': 'ỵ',
  '\xae': 'đ',

  // Chữ hoa TCVN3
  '\xa1': 'Ă',
  '\xa2': 'Â',
  '\xa3': 'Đ',
  '\xa4': 'Ê',
  '\xa5': 'Ô',
  '\xa6': 'Ơ',
  '\xa7': 'Ư',
};

// Bảng mã VNI thường gặp sang Unicode
const VNI_PAIRS: [RegExp, string][] = [
  [/a1/g, 'á'], [/a2/g, 'à'], [/a3/g, 'ả'], [/a4/g, 'ã'], [/a5/g, 'ạ'],
  [/a8/g, 'ă'], [/a81/g, 'ắ'], [/a82/g, 'ằ'], [/a83/g, 'ẳ'], [/a84/g, 'ẵ'], [/a85/g, 'ặ'],
  [/a6/g, 'â'], [/a61/g, 'ấ'], [/a62/g, 'ầ'], [/a63/g, 'ẩ'], [/a64/g, 'ẫ'], [/a65/g, 'ậ'],
  [/e1/g, 'é'], [/e2/g, 'è'], [/e3/g, 'ẻ'], [/e4/g, 'ẽ'], [/e5/g, 'ẹ'],
  [/e6/g, 'ê'], [/e61/g, 'ế'], [/e62/g, 'ề'], [/e63/g, 'ể'], [/e64/g, 'ễ'], [/e65/g, 'ệ'],
  [/i1/g, 'í'], [/i2/g, 'ì'], [/i3/g, 'ỉ'], [/i4/g, 'ĩ'], [/i5/g, 'ị'],
  [/o1/g, 'ó'], [/o2/g, 'ò'], [/o3/g, 'ỏ'], [/o4/g, 'õ'], [/o5/g, 'ọ'],
  [/o6/g, 'ô'], [/o61/g, 'ố'], [/o62/g, 'ồ'], [/o63/g, 'ổ'], [/o64/g, 'ỗ'], [/o65/g, 'ộ'],
  [/o7/g, 'ơ'], [/o71/g, 'ớ'], [/o72/g, 'ờ'], [/o73/g, 'ở'], [/o74/g, 'ỡ'], [/o75/g, 'ợ'],
  [/u1/g, 'ú'], [/u2/g, 'ù'], [/u3/g, 'ủ'], [/u4/g, 'ũ'], [/u5/g, 'ụ'],
  [/u7/g, 'ư'], [/u71/g, 'ứ'], [/u72/g, 'ừ'], [/u73/g, 'ử'], [/u74/g, 'ữ'], [/u75/g, 'ự'],
  [/y1/g, 'ý'], [/y2/g, 'ỳ'], [/y3/g, 'ỷ'], [/y4/g, 'ỹ'], [/y5/g, 'ỵ'],
  [/d9/g, 'đ'], [/D9/g, 'Đ'],
];

/**
 * Chuyển đổi chuỗi văn bản mã TCVN3 (.VnTime) sang Unicode chuẩn
 */
export function convertTCVN3ToUnicode(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += TCVN3_TO_UNICODE[ch] !== undefined ? TCVN3_TO_UNICODE[ch] : ch;
  }
  return result;
}

/**
 * Chuyển đổi mã VNI sang Unicode chuẩn
 */
export function convertVNIToUnicode(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [pattern, replacement] of VNI_PAIRS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Kiểm tra xem chuỗi có dấu hiệu mã TCVN3 hay không
 */
export function detectTCVN3(text: string): boolean {
  if (!text) return false;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Vùng mã TCVN3 thường nằm từ 0xA1 đến 0xF6
    if (code >= 0xa1 && code <= 0xf6) {
      count++;
    }
  }
  return count > 3 || (count > 0 && text.length < 50);
}

/**
 * Tự động sửa lỗi phông chữ tiếng Việt (TCVN3, VNI, UTF-8 BOM, ký tự hỏng)
 */
export function autoFixVietnameseText(text: string): { text: string; fixed: boolean; detectedEncoding: string } {
  if (!text) return { text: '', fixed: false, detectedEncoding: 'None' };

  // 1. Xóa ký tự BOM nếu có
  let cleaned = text.replace(/^\uFEFF/, '').replace(/\u0000/g, '');

  // 2. Kiểm tra mã TCVN3
  if (detectTCVN3(cleaned)) {
    const converted = convertTCVN3ToUnicode(cleaned);
    return { text: converted, fixed: true, detectedEncoding: 'TCVN3 (.VnTime)' };
  }

  // 3. Chuẩn hóa dạng Unicode (NFC - Canonical Composition) giúp hiển thị tiếng Việt mượt mà
  try {
    cleaned = cleaned.normalize('NFC');
  } catch (_) {}

  return { text: cleaned, fixed: false, detectedEncoding: 'Unicode (UTF-8)' };
}

/**
 * Đọc File an toàn với tự động nhận diện Encoding:
 * Hỗ trợ UTF-8, UTF-16LE, UTF-16BE, Windows-1258, TCVN3
 */
export async function readTextFileWithEncoding(file: File): Promise<{ text: string; encoding: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Kiểm tra Byte Order Mark (BOM)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    // UTF-16 Little Endian
    const decoder = new TextDecoder('utf-16le');
    const decoded = decoder.decode(buffer.slice(2));
    return { text: decoded.normalize('NFC'), encoding: 'UTF-16 LE' };
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    // UTF-16 Big Endian
    const decoder = new TextDecoder('utf-16be');
    const decoded = decoder.decode(buffer.slice(2));
    return { text: decoded.normalize('NFC'), encoding: 'UTF-16 BE' };
  }

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    // UTF-8 with BOM
    const decoder = new TextDecoder('utf-8');
    const decoded = decoder.decode(buffer.slice(3));
    return { text: decoded.normalize('NFC'), encoding: 'UTF-8 with BOM' };
  }

  // Thử decode chuẩn UTF-8 trước
  let utf8Text = '';
  let utf8Success = true;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    utf8Text = decoder.decode(buffer);
  } catch (_) {
    utf8Success = false;
  }

  if (utf8Success && utf8Text) {
    // Kiểm tra xem trong text UTF-8 này có phải là văn bản gõ bằng font .VnTime (TCVN3) không
    if (detectTCVN3(utf8Text)) {
      const fixed = convertTCVN3ToUnicode(utf8Text);
      return { text: fixed.normalize('NFC'), encoding: 'TCVN3 (.VnTime) -> Unicode' };
    }
    return { text: utf8Text.normalize('NFC'), encoding: 'UTF-8' };
  }

  // Nếu không phải UTF-8 hợp lệ, thử Windows-1258 (Vietnamese Windows Code Page)
  try {
    const decoder = new TextDecoder('windows-1258');
    const decoded = decoder.decode(buffer);
    if (detectTCVN3(decoded)) {
      return { text: convertTCVN3ToUnicode(decoded).normalize('NFC'), encoding: 'TCVN3 in ANSI' };
    }
    return { text: decoded.normalize('NFC'), encoding: 'Windows-1258' };
  } catch (_) {}

  // Fallback đọc bằng ISO-8859-1 rồi kiểm tra TCVN3
  const latinDecoder = new TextDecoder('iso-8859-1');
  const latinText = latinDecoder.decode(buffer);
  if (detectTCVN3(latinText)) {
    return { text: convertTCVN3ToUnicode(latinText).normalize('NFC'), encoding: 'TCVN3 (.VnTime)' };
  }

  return { text: latinText, encoding: 'Ansi/Latin' };
}

/**
 * Trích xuất các chuỗi văn bản tiếng Việt có nghĩa từ file Word cũ .doc (Binary Word 97-2003)
 * khi mammoth không hỗ trợ định dạng nhị phân CFB/OLE.
 */
export function extractTextFromLegacyDoc(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const segments: string[] = [];

  // Trích xuất các đoạn UTF-16LE có thể có trong WordDocument stream
  let currentWord: number[] = [];
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const charCode = bytes[i] | (bytes[i + 1] << 8);
    // Ký tự in được: ASCII và ký tự tiếng Việt Unicode (0x00C0 - 0x1EF9)
    if (
      (charCode >= 32 && charCode <= 126) ||
      charCode === 10 ||
      charCode === 13 ||
      charCode === 9 ||
      (charCode >= 0x00c0 && charCode <= 0x024f) ||
      (charCode >= 0x1ea0 && charCode <= 0x1ef9)
    ) {
      currentWord.push(charCode);
    } else {
      if (currentWord.length >= 8) {
        const str = String.fromCharCode(...currentWord).trim();
        if (str.length > 5 && !str.startsWith('Microsoft') && !str.includes('Root Entry')) {
          segments.push(str);
        }
      }
      currentWord = [];
    }
  }

  if (segments.length > 0) {
    return segments.join('\n\n');
  }

  // Fallback đọc ASCII thuần nếu không tìm thấy UTF-16LE
  let asciiWord: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
      asciiWord.push(b);
    } else {
      if (asciiWord.length >= 10) {
        const s = String.fromCharCode(...asciiWord).trim();
        if (s.length > 5) segments.push(s);
      }
      asciiWord = [];
    }
  }

  return segments.join('\n');
}
