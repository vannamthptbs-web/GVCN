import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Search,
  Filter,
  Calendar,
  Clock,
  Sparkles,
  Download,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  History,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldAlert,
  Layers,
  CalendarRange
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateEmulationScoresForPeriod,
  buildAllDailyTransactions,
  EmulationFilterOptions,
  EmulationFilterType,
  getDateTimelineInfo,
  getCurrentSchoolWeek,
  SCHOOL_YEAR_START
} from '../../utils/emulationHistory';
import { StudentPeriodScore, EmulationDailyTransaction } from '../../types';

export const IndividualCompetitionView: React.FC = () => {
  const {
    students,
    violations,
    rewards,
    attendance,
    academicRecords,
    cleaningDuties,
    extracurricularActivities,
    classInfo,
    settings,
    exportClassDataToExcel,
    syncAllToGoogleSheets,
    setSelectedStudentIdForDetail
  } = useApp();

  // Primary active tab: 'rankings' | 'daily_log'
  const [activeTab, setActiveTab] = useState<'rankings' | 'daily_log'>('rankings');

  // Filter state - Mặc định hiển thị tuần học hiện tại, sang tuần mới tính điểm cho tuần mới
  const [periodType, setPeriodType] = useState<EmulationFilterType>('week');
  const [selectedWeek, setSelectedWeek] = useState<number>(() => getCurrentSchoolWeek());
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August
  const [selectedSemester, setSelectedSemester] = useState<string>('Học kỳ I');
  const [selectedDay, setSelectedDay] = useState<string>('2026-08-31');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | 'all'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Pack data for emulation calculation
  const appDataPayload = useMemo(() => {
    return {
      students,
      violations,
      rewards,
      attendance,
      academicRecords,
      cleaningDuties,
      extracurricularActivities,
      classInfo,
      settings,
    };
  }, [
    students,
    violations,
    rewards,
    attendance,
    academicRecords,
    cleaningDuties,
    extracurricularActivities,
    classInfo,
    settings,
  ]);

  // Compute emulation summary for the selected period
  const periodSummary = useMemo(() => {
    const filter: EmulationFilterOptions = {
      type: periodType,
      day: selectedDay,
      week: selectedWeek,
      month: selectedMonth,
      year: 2026,
      semester: selectedSemester,
      schoolYear: classInfo.schoolYear || '2026 - 2027',
    };
    return calculateEmulationScoresForPeriod(appDataPayload, filter);
  }, [appDataPayload, periodType, selectedDay, selectedWeek, selectedMonth, selectedSemester, classInfo.schoolYear]);

  // All daily score transactions
  const allTransactions = useMemo(() => {
    return buildAllDailyTransactions(appDataPayload);
  }, [appDataPayload]);

  // Filtered daily transactions based on period & search
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      // Period filter
      let matchPeriod = true;
      if (periodType === 'day') {
        matchPeriod = t.date === selectedDay;
      } else if (periodType === 'week') {
        matchPeriod = t.week === selectedWeek;
      } else if (periodType === 'month') {
        matchPeriod = t.month === selectedMonth;
      } else if (periodType === 'semester') {
        matchPeriod = t.semester === selectedSemester;
      } else if (periodType === 'school_year') {
        matchPeriod = t.schoolYear === (classInfo.schoolYear || '2026 - 2027');
      }

      // Group filter
      const matchGroup = selectedGroup === 'all' || t.groupId === selectedGroup;

      // Search filter
      const matchSearch =
        !searchTerm ||
        t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.content.toLowerCase().includes(searchTerm.toLowerCase());

      return matchPeriod && matchGroup && matchSearch;
    });
  }, [allTransactions, periodType, selectedDay, selectedWeek, selectedMonth, selectedSemester, classInfo.schoolYear, selectedGroup, searchTerm]);

  // Filtered rankings
  const filteredRankings = useMemo(() => {
    return periodSummary.studentScores.filter(item => {
      const matchSearch =
        !searchTerm ||
        item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGroup = selectedGroup === 'all' || item.groupId === selectedGroup;
      return matchSearch && matchGroup;
    });
  }, [periodSummary.studentScores, searchTerm, selectedGroup]);

  // Handle direct Google Sheets sync
  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await syncAllToGoogleSheets();
      if (res.success) {
        setSyncNotice('Đã lưu dữ liệu điểm thi đua 2 chiều thành công lên Google Sheet!');
      } else {
        setSyncNotice(res.message || 'Chưa thể kết nối Google Sheets.');
      }
    } catch {
      setSyncNotice('Lỗi trong quá trình kết nối.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Bảng Điểm Thi Đua & Lịch Sử Đánh Giá Cá Nhân</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <History className="w-3 h-3" />
              Lưu trữ vĩnh viễn
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lớp {classInfo.className} • Điểm gốc 100đ • Lưu vết theo Ngày, Tuần, Tháng, Học Kỳ và Cả Năm Học
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportClassDataToExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel Đầy Đủ (18 Bảng)</span>
          </button>

          <button
            onClick={handleSyncToSheets}
            disabled={isSyncing}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang lưu Sheet...' : 'Đồng Bộ Sheet 2 Chiều'}</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Period Timeline Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <CalendarRange className="w-4 h-4 text-emerald-600" />
            <span>Mốc Thời Gian Đánh Giá:</span>
          </div>
          <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            Đang xem: <strong>{periodSummary.periodLabel}</strong>
          </div>
        </div>

        {/* Period Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            onClick={() => setPeriodType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🌟 Lũy Kế Toàn Khóa
          </button>

          <button
            onClick={() => setPeriodType('day')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'day'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📅 Theo Ngày
          </button>

          <button
            onClick={() => setPeriodType('week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'week'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📆 Theo Tuần
          </button>

          <button
            onClick={() => setPeriodType('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'month'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🗓️ Theo Tháng
          </button>

          <button
            onClick={() => setPeriodType('semester')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'semester'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🎓 Theo Học Kỳ
          </button>

          <button
            onClick={() => setPeriodType('school_year')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'school_year'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏫 Cả Năm Học
          </button>
        </div>

        {/* Sub-selectors for chosen period */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          {periodType === 'day' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Chọn ngày:</span>
              <input
                type="date"
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
              />
              <button
                onClick={() => setSelectedDay('2026-08-31')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-medium text-[11px]"
              >
                Hôm nay (31/08)
              </button>
            </div>
          )}

          {periodType === 'week' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-slate-500 font-medium shrink-0">Chọn tuần:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 ${
                    selectedWeek === w
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  T{w}
                </button>
              ))}
            </div>
          )}

          {periodType === 'month' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-slate-500 font-medium shrink-0">Chọn tháng:</span>
              {[
                { m: 8, label: 'Tháng 8' },
                { m: 9, label: 'Tháng 9' },
                { m: 10, label: 'Tháng 10' },
                { m: 11, label: 'Tháng 11' },
                { m: 12, label: 'Tháng 12' },
                { m: 1, label: 'Tháng 1' },
                { m: 2, label: 'Tháng 2' },
                { m: 3, label: 'Tháng 3' },
                { m: 4, label: 'Tháng 4' },
                { m: 5, label: 'Tháng 5' },
              ].map(item => (
                <button
                  key={item.m}
                  onClick={() => setSelectedMonth(item.m)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs shrink-0 ${
                    selectedMonth === item.m
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {periodType === 'semester' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Học kỳ:</span>
              {['Học kỳ I', 'Học kỳ II'].map(sem => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs ${
                    selectedSemester === sem
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          )}

          {periodType === 'school_year' && (
            <div className="text-slate-600 font-medium">
              Niên khóa: <strong className="text-slate-900">{classInfo.schoolYear || '2026 - 2027'}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Khu vực Học Sinh Tiêu Biểu Dẫn Đầu (Tối đa 5 học sinh cao điểm nhất) */}
      {filteredRankings.length > 0 && (
        <div className="space-y-3">
          {(() => {
            const allScores = filteredRankings.map(r => r.totalScore);
            const maxScore = allScores.length > 0 ? Math.max(...allScores) : 100;
            const minScore = allScores.length > 0 ? Math.min(...allScores) : 100;

            // 1. Kiểm tra nếu tất cả học sinh trong danh sách bằng điểm nhau
            const areAllEqual = allScores.length > 1 && Math.abs(maxScore - minScore) < 0.05;

            // 2. Đếm số lượng học sinh cùng đạt mức điểm cao nhất (bằng điểm top 1)
            const countTopScore = filteredRankings.filter(r => Math.abs(r.totalScore - maxScore) < 0.05).length;

            // Quy định: Nếu tất cả hoặc nhiều hơn 5 học sinh bằng điểm thì KHÔNG hiện học sinh tiêu biểu
            const shouldHideFeatured = areAllEqual || countTopScore > 5;

            // Khi hiển thị: Hiện tối đa 5 học sinh có điểm cao nhất
            const topFeaturedStudents = shouldHideFeatured
              ? []
              : filteredRankings.slice(0, Math.min(5, filteredRankings.length));

            if (shouldHideFeatured) {
              return (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start sm:items-center gap-3 shadow-xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold text-slate-900 text-sm">
                      {areAllEqual
                        ? `Tất cả ${filteredRankings.length} học sinh đang đồng điểm (${maxScore.toFixed(1)}đ)`
                        : `Có ${countTopScore} học sinh cùng đạt điểm cao nhất (${maxScore.toFixed(1)}đ)`}
                    </div>
                    <p className="text-amber-800 text-xs leading-relaxed">
                      {areAllEqual
                        ? 'Điểm thi đua hiện tại chưa có sự phân hóa hoặc chênh lệch. Theo quy chế, khi tất cả học sinh hoặc có nhiều hơn 5 học sinh bằng điểm thì không hiển thị mục Học sinh tiêu biểu.'
                        : `Theo quy chế thi đua, khi có nhiều hơn 5 học sinh cùng bằng điểm cao nhất thì không hiển thị mục Học sinh tiêu biểu để đảm bảo tính khách quan và công bằng.`}
                      {' '}Thầy cô và các bạn vui lòng theo dõi chi tiết ở <strong>Bảng Xếp Hạng Cá Nhân</strong> bên dưới.
                    </p>
                  </div>
                </div>
              );
            }

            if (topFeaturedStudents.length === 0) return null;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Top {topFeaturedStudents.length} Học Sinh Tiêu Biểu Dẫn Đầu ({periodSummary.periodLabel})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Hiển thị tối đa 5 học sinh cao điểm nhất
                  </span>
                </div>

                <div
                  className={`grid gap-3.5 ${
                    topFeaturedStudents.length === 1
                      ? 'grid-cols-1 max-w-md'
                      : topFeaturedStudents.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : topFeaturedStudents.length === 3
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : topFeaturedStudents.length === 4
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
                  }`}
                >
                  {topFeaturedStudents.map((item) => {
                    const isRank1 = item.rankInClass === 1;
                    const isRank2 = item.rankInClass === 2;
                    const isRank3 = item.rankInClass === 3;
                    const isRank4 = item.rankInClass === 4;

                    const cardBg = isRank1
                      ? 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-300'
                      : isRank2
                      ? 'bg-gradient-to-br from-slate-200/60 via-slate-100/30 to-white border-slate-300'
                      : isRank3
                      ? 'bg-gradient-to-br from-amber-700/15 via-amber-600/5 to-white border-amber-200'
                      : isRank4
                      ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border-emerald-200'
                      : 'bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-white border-blue-200';

                    const badgeColor = isRank1
                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                      : isRank2
                      ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-200'
                      : isRank3
                      ? 'bg-amber-700/80 text-white ring-2 ring-amber-600'
                      : isRank4
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                      : 'bg-blue-600 text-white ring-2 ring-blue-400';

                    const rankLabel = isRank1
                      ? (countTopScore > 1 ? '👑 Đồng Hạng Nhất' : '👑 Dẫn Đầu Thi Đua')
                      : isRank2
                      ? '⭐ Hạng Nhì'
                      : isRank3
                      ? '✨ Hạng Ba'
                      : isRank4
                      ? '🏅 Hạng Bốn'
                      : '🎖️ Hạng Năm';

                    return (
                      <div
                        key={item.studentId}
                        onClick={() => setSelectedStudentIdForDetail(item.studentId)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-xs hover:shadow-md ${cardBg}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={item.avatar}
                                alt={item.fullName}
                                className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs"
                              />
                              <span
                                className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full font-black text-[10px] flex items-center justify-center shadow-xs ${badgeColor}`}
                              >
                                #{item.rankInClass}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block truncate">
                                {rankLabel}
                              </span>
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-700 transition-colors truncate">
                                {item.fullName}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                Tổ {item.groupId} • {item.roleInClass}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-lg font-black text-emerald-600">{item.totalScore.toFixed(1)}đ</div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 inline-block">
                              {item.tier}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                          <span className="truncate">
                            Thành tích: <strong className="text-emerald-600">+{item.bonusPoints}đ</strong> • Vi phạm: <strong className="text-rose-600">-{item.penaltyPoints}đ</strong>
                          </span>
                          <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-1">
                            Hồ sơ →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tabs & Search Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rankings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Bảng Xếp Hạng ({filteredRankings.length} HS)</span>
          </button>

          <button
            onClick={() => setActiveTab('daily_log')}
            className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'daily_log'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>Nhật Ký Biến Động Điểm Theo Ngày ({filteredTransactions.length} mục)</span>
          </button>
        </div>

        {/* Search & Group Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, mã HS, nội dung..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium shrink-0 ${
                selectedGroup === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cả lớp
            </button>
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-2.5 py-1.5 rounded-lg font-medium shrink-0 ${
                  selectedGroup === g
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tổ {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: Complete Rankings Table */}
      {activeTab === 'rankings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 text-center">STT</th>
                  <th className="py-3.5 px-4">Học Sinh</th>
                  <th className="py-3.5 px-4">Tổ</th>
                  <th className="py-3.5 px-4 text-center">Điểm Gốc</th>
                  <th className="py-3.5 px-4 text-center text-emerald-600">+Điểm Cộng</th>
                  <th className="py-3.5 px-4 text-center text-rose-600">-Điểm Trừ</th>
                  <th className="py-3.5 px-4 text-center text-amber-600">-Chuyên Cần</th>
                  <th className="py-3.5 px-4 text-center font-bold text-slate-900">TỔNG ĐIỂM</th>
                  <th className="py-3.5 px-4 text-center">Xếp Loại</th>
                  <th className="py-3.5 px-4 text-center font-bold text-emerald-700">Hạng Cá Nhân</th>
                  <th className="py-3.5 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRankings.map((item, idx) => (
                  <tr
                    key={item.studentId}
                    onClick={() => setSelectedStudentIdForDetail(item.studentId)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-500 font-semibold text-xs">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.avatar}
                          alt={item.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {item.fullName}
                          </span>
                          <span className="block text-[11px] text-slate-400 font-mono">
                            {item.studentCode} • {item.roleInClass}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                        Tổ {item.groupId}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {item.baseScore}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-emerald-600">
                      +{item.bonusPoints + item.extraCurricularPoints + Math.max(0, item.academicBonus)}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-rose-600">
                      -{item.penaltyPoints}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-amber-600">
                      -{item.attendancePenalty}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        {item.totalScore.toFixed(1)}đ
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.tier === 'Xuất sắc'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.tier === 'Tốt'
                            ? 'bg-blue-100 text-blue-800'
                            : item.tier === 'Khá'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.tier}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-0.5 rounded-full ${
                          item.rankInClass === 1
                            ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                            : item.rankInClass === 2
                            ? 'bg-slate-200 text-slate-900 font-black'
                            : item.rankInClass === 3
                            ? 'bg-amber-700/60 text-white font-black'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        #{item.rankInClass}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedStudentIdForDetail(item.studentId);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-lg text-[11px] font-semibold text-slate-700 transition-colors"
                      >
                        Hồ sơ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Daily Transaction Log */}
      {activeTab === 'daily_log' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Sổ Nhật Ký Ghi Nhận Điểm Cộng & Điểm Trừ Theo Ngày
              </h3>
              <p className="text-[11px] text-slate-500">
                Toàn bộ biến động điểm được lưu trữ vĩnh viễn và đồng bộ 2 chiều với Google Sheet
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {filteredTransactions.length} bản ghi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Thời Gian & Thứ</th>
                  <th className="py-3 px-4">Tuần / Tháng</th>
                  <th className="py-3 px-4">Học Sinh</th>
                  <th className="py-3 px-4">Tổ</th>
                  <th className="py-3 px-4">Phân Loại</th>
                  <th className="py-3 px-4">Nội Dung Biến Động</th>
                  <th className="py-3 px-4 text-center">Điểm (±)</th>
                  <th className="py-3 px-4">Người Báo Cáo</th>
                  <th className="py-3 px-4">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      Không có bản ghi điểm nào trong khoảng thời gian đã chọn.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedStudentIdForDetail(t.studentId)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{t.date}</span>
                        <span className="text-[10px] text-slate-500">{t.dayOfWeek}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 block">Tuần {t.week}</span>
                        <span className="text-[10px] text-slate-400">{t.monthLabel}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{t.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{t.studentCode}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          Tổ {t.groupId}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.categoryType === 'Khen thưởng (+)'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.categoryType === 'Vi phạm (-)'
                              ? 'bg-rose-100 text-rose-800'
                              : t.categoryType === 'Chuyên cần'
                              ? 'bg-amber-100 text-amber-800'
                              : t.categoryType === 'Học tập'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {t.categoryType}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-medium">{t.content}</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                            t.pointsDelta > 0
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          {t.pointsDelta > 0 ? `+${t.pointsDelta}` : t.pointsDelta}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {t.recordedBy}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {t.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
