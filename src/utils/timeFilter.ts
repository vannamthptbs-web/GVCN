export type TimeRangeOption = 
  | 'today' 
  | 'yesterday'
  | 'this_week' 
  | 'last_week'
  | 'this_month' 
  | 'last_month' 
  | 'semester_1' 
  | 'all' 
  | 'custom';

export interface TimeRangeConfig {
  option: TimeRangeOption;
  customStartDate?: string;
  customEndDate?: string;
}

/**
 * Standardize date string YYYY-MM-DD
 */
export function normalizeDate(date: Date | string): string {
  if (typeof date === 'string') {
    if (date.length >= 10) return date.slice(0, 10);
    return date;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get date boundaries for a given time range option
 */
export function getTimeRangeDates(
  option: TimeRangeOption,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string; label: string } {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const todayStr = normalizeDate(today);

  switch (option) {
    case 'today': {
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: 'Hôm nay',
      };
    }
    case 'yesterday': {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      const yestStr = normalizeDate(yest);
      return {
        startDate: yestStr,
        endDate: yestStr,
        label: 'Hôm qua',
      };
    }
    case 'this_week': {
      // Monday to Sunday
      const day = today.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMon = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMon);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        startDate: normalizeDate(monday),
        endDate: normalizeDate(sunday),
        label: 'Tuần này',
      };
    }
    case 'last_week': {
      const day = today.getDay();
      const diffToMon = (day === 0 ? -6 : 1) - day - 7;
      const lastMon = new Date(today);
      lastMon.setDate(today.getDate() + diffToMon);

      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);

      return {
        startDate: normalizeDate(lastMon),
        endDate: normalizeDate(lastSun),
        label: 'Tuần trước',
      };
    }
    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: normalizeDate(firstDay),
        endDate: normalizeDate(lastDay),
        label: `Tháng ${today.getMonth() + 1}/${today.getFullYear()}`,
      };
    }
    case 'last_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: normalizeDate(firstDay),
        endDate: normalizeDate(lastDay),
        label: `Tháng ${firstDay.getMonth() + 1}/${firstDay.getFullYear()}`,
      };
    }
    case 'semester_1': {
      const year = today.getFullYear();
      // Semester 1: From Sept 1 to Jan 15
      return {
        startDate: `${year}-09-01`,
        endDate: `${year + 1}-01-15`,
        label: `Học kỳ I (${year} - ${year + 1})`,
      };
    }
    case 'custom': {
      const s = customStart || '2026-09-01';
      const e = customEnd || todayStr;
      return {
        startDate: s,
        endDate: e,
        label: `Từ ${s} đến ${e}`,
      };
    }
    case 'all':
    default: {
      return {
        startDate: '2000-01-01',
        endDate: '2099-12-31',
        label: 'Toàn bộ thời gian',
      };
    }
  }
}

/**
 * Check if a date string falls within the selected time range
 */
export function isDateInRange(
  dateStr?: string,
  option: TimeRangeOption = 'all',
  customStart?: string,
  customEnd?: string
): boolean {
  if (option === 'all') return true;
  if (!dateStr) return false;

  const targetDate = normalizeDate(dateStr);
  const { startDate, endDate } = getTimeRangeDates(option, customStart, customEnd);

  return targetDate >= startDate && targetDate <= endDate;
}
