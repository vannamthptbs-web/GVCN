import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Users,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Info,
  Medal,
  CalendarRange,
  Download,
  RefreshCw,
  CheckCircle2,
  Search,
  BarChart3
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateEmulationScoresForPeriod,
  EmulationFilterOptions,
  EmulationFilterType,
  getCurrentSchoolWeek,
} from '../../utils/emulationHistory';

export const GroupCompetitionView: React.FC = () => {
  const {
    students,
    violations,
    rewards,
    attendance,
    academicRecords,
    cleaningDuties,
    extracurricularActivities,
    laborActivities,
    classInfo,
    settings,
    exportClassDataToExcel,
    syncAllToGoogleSheets,
    setSelectedStudentIdForDetail
  } = useApp();

  // Period filter state - Mặc định tuần hiện tại, tính lại điểm khi sang tuần mới
  const [periodType, setPeriodType] = useState<EmulationFilterType>('week');
  const [selectedWeek, setSelectedWeek] = useState<number>(() => getCurrentSchoolWeek());
  const [selectedMonth, setSelectedMonth] = useState<number>(8);
  const [selectedSemester, setSelectedSemester] = useState<string>('Học kỳ I');
  const [selectedDay, setSelectedDay] = useState<string>('2026-08-31');
  const [studentTableGroupFilter, setStudentTableGroupFilter] = useState<number>(0);
  const [studentTableSearch, setStudentTableSearch] = useState<string>('');

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
      laborActivities,
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
    laborActivities,
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

  const rankedGroups = periodSummary.groupScores;
  const allGroupScores = rankedGroups.map(g => g.totalScore);
  const maxGroupScore = allGroupScores.length > 0 ? Math.max(...allGroupScores) : 0;
  const minGroupScore = allGroupScores.length > 0 ? Math.min(...allGroupScores) : 0;
  const areAllGroupsEqual = allGroupScores.length > 1 && Math.abs(maxGroupScore - minGroupScore) < 0.05;
  const countRank1 = rankedGroups.filter(g => g.rank === 1).length;

  const filteredStudentScores = useMemo(() => {
    return (periodSummary.studentScores || []).filter(item => {
      if (studentTableGroupFilter !== 0 && item.groupId !== studentTableGroupFilter) return false;
      if (studentTableSearch.trim()) {
        const q = studentTableSearch.toLowerCase().trim();
        return (
          item.fullName.toLowerCase().includes(q) ||
          item.studentCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [periodSummary.studentScores, studentTableGroupFilter, studentTableSearch]);

  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await syncAllToGoogleSheets();
      if (res.success) {
        setSyncNotice('Đã lưu dữ liệu điểm thi đua tổ 2 chiều thành công lên Google Sheet!');
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-white/20 border border-white/30 text-amber-100 text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              Thi Đua 4 Tổ Tuần & Tháng (Lưu Trữ Vĩnh Viễn)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            BẢNG XẾP HẠNG THI ĐUA TẬP THỂ TỔ
          </h2>
          <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-xl">
            Vắng tổ: có phép -1đ, không phép -2đ • Trực nhật cộng điểm cho tổ (tốt +2đ, chưa đạt -2đ) • Chuyên cần (20đ) • Học tập (25đ) • Nề nếp (20đ) • Vệ sinh (15đ) • Điểm gốc tổ: 100đ
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 text-center min-w-[140px]">
            <span className="text-[11px] uppercase tracking-wider text-amber-200 font-bold block">
              {areAllGroupsEqual ? 'Đồng Hạng Nhất' : countRank1 > 1 ? 'Đồng Quán Quân' : 'Tổ Quán Quân'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-white my-0.5 truncate">
              {areAllGroupsEqual
                ? 'Cả 4 Tổ'
                : countRank1 > 1
                ? rankedGroups.filter(g => g.rank === 1).map(g => g.groupName).join(', ')
                : (rankedGroups[0]?.groupName || 'Chưa có ghi nhận')} 🏆
            </div>
            <span className="text-xs font-bold text-amber-200">
              {maxGroupScore > 0 ? `${maxGroupScore.toFixed(1)} Điểm` : 'Chưa có ghi nhận'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={exportClassDataToExcel}
              className="px-3 py-2 bg-white text-slate-900 hover:bg-amber-50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel Đầy Đủ</span>
            </button>
            <button
              onClick={handleSyncToSheets}
              disabled={isSyncing}
              className="px-3 py-2 bg-amber-900/60 hover:bg-amber-900/80 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-white/20 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang lưu...' : 'Lưu Vào Google Sheet'}</span>
            </button>
          </div>
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
            <CalendarRange className="w-4 h-4 text-amber-600" />
            <span>Mốc Thời Gian Đánh Giá Tổ:</span>
          </div>
          <div className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            Đang hiển thị: <strong>{periodSummary.periodLabel}</strong>
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
            onClick={() => setPeriodType('week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'week'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📆 Theo Tuần
          </button>

          <button
            onClick={() => setPeriodType('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'month'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🗓️ Theo Tháng
          </button>

          <button
            onClick={() => setPeriodType('semester')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'semester'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🎓 Theo Học Kỳ
          </button>

          <button
            onClick={() => setPeriodType('school_year')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodType === 'school_year'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏫 Cả Năm Học
          </button>
        </div>

        {/* Sub-selectors */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          {periodType === 'week' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-slate-500 font-medium shrink-0">Chọn tuần:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 ${
                    selectedWeek === w
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tuần {w}
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
                      ? 'bg-amber-600 text-white'
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
                      ? 'bg-amber-600 text-white'
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

      {/* Podium Visualization Top 3 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-3 text-center">
          Bục Vinh Quang Thi Đua ({periodSummary.periodLabel})
        </h3>

        {areAllGroupsEqual ? (
          <div className="py-4 text-center space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 text-2xl shadow-xs">
              🏆
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900">
                Cả 4 tổ đang đồng hạng 1 ({maxGroupScore.toFixed(1)}đ)
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chưa có sự thay đổi hoặc chênh lệch điểm thi đua giữa các tổ trong giai đoạn này.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {rankedGroups.map(g => (
                <div key={g.groupId} className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-center shadow-xs">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs inline-flex items-center justify-center mb-1">
                    #1
                  </span>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">{g.groupName}</div>
                  <div className="text-xs font-black text-amber-600 mt-0.5">{g.totalScore.toFixed(1)}đ</div>
                  <span className="text-[10px] text-amber-700 block font-medium">Đồng hạng 1</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2 sm:gap-6 pt-6 pb-2 max-w-2xl mx-auto">
            {/* Rank 2 */}
            {rankedGroups[1] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-xs inline-flex items-center justify-center shadow-xs">
                    {rankedGroups[1].rank}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{rankedGroups[1].groupName}</h4>
                  <span className="text-xs font-black text-slate-600">{rankedGroups[1].totalScore.toFixed(1)}đ</span>
                </div>
                <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t-2xl border-t-4 border-slate-400 flex items-center justify-center text-slate-700 font-black text-lg shadow-inner">
                  {rankedGroups[1].rank === 1 ? 'QUÁN QUÂN 🏆' : 'HẠNG NHÌ'}
                </div>
              </div>
            )}

            {/* Rank 1 (Champion) */}
            {rankedGroups[0] && (
              <div className="flex-1 flex flex-col items-center -mt-6">
                <div className="text-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-400 text-amber-950 font-black text-sm inline-flex items-center justify-center shadow-md animate-bounce">
                    👑
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base mt-1">{rankedGroups[0].groupName}</h4>
                  <span className="text-sm font-black text-amber-600">{rankedGroups[0].totalScore.toFixed(1)}đ</span>
                </div>
                <div className="w-full h-36 sm:h-48 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-2xl border-t-4 border-amber-500 flex items-center justify-center text-amber-950 font-black text-xl shadow-md">
                  QUÁN QUÂN 🏆
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {rankedGroups[2] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="text-center mb-2">
                  <span className="w-8 h-8 rounded-full bg-amber-700/60 text-white font-black text-xs inline-flex items-center justify-center shadow-xs">
                    {rankedGroups[2].rank}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{rankedGroups[2].groupName}</h4>
                  <span className="text-xs font-black text-amber-800">{rankedGroups[2].totalScore.toFixed(1)}đ</span>
                </div>
                <div className="w-full h-20 sm:h-28 bg-gradient-to-t from-amber-200 to-amber-100 rounded-t-2xl border-t-4 border-amber-600 flex items-center justify-center text-amber-900 font-black text-base shadow-inner">
                  {rankedGroups[2].rank === 1 ? 'QUÁN QUÂN 🏆' : rankedGroups[2].rank === 2 ? 'HẠNG NHÌ' : 'HẠNG BA'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* So Sánh Điểm Thi Đua 4 Tổ Theo Tuần Được Chọn */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              <span>So Sánh Điểm Thi Đua 4 Tổ ({periodSummary.periodLabel})</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cập nhật trực tiếp theo mốc thời gian được chọn • Biểu đồ thanh đối chiếu tương quan giữa các tổ
            </p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-xl border border-amber-200 self-start sm:self-auto">
            {areAllGroupsEqual ? 'Cả 4 tổ đồng điểm' : `Dẫn đầu: ${rankedGroups[0]?.groupName || 'Tổ 1'}`}
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {rankedGroups.map((g) => {
            const maxScoreDisplay = Math.max(100, maxGroupScore + 5);
            const percentage = Math.min(100, Math.max(15, (g.totalScore / maxScoreDisplay) * 100));
            const diffFromLeader = Number((maxGroupScore - g.totalScore).toFixed(1));

            return (
              <div key={g.groupId} className="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                        g.rank === 1
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : g.rank === 2
                          ? 'bg-slate-300 text-slate-900'
                          : g.rank === 3
                          ? 'bg-amber-700/60 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      #{g.rank}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{g.groupName}</span>
                        <span className="text-[10px] text-slate-500">(Tổ trưởng: {g.leaderName})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {g.rank === 1 ? (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        👑 Quán quân
                      </span>
                    ) : diffFromLeader > 0 ? (
                      <span className="text-[10px] bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full">
                        -{diffFromLeader}đ so với #1
                      </span>
                    ) : null}
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      {g.totalScore.toFixed(1)}đ
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      g.rank === 1
                        ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500'
                        : g.rank === 2
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : g.rank === 3
                        ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                        : 'bg-gradient-to-r from-slate-400 to-slate-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Mini detail stats */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Chuyên cần: <strong>{g.attendanceScore.toFixed(0)}/20đ</strong>
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Học tập: <strong>{g.academicScore.toFixed(0)}/25đ</strong>
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Nề nếp: <strong>{g.disciplineScore.toFixed(0)}/20đ</strong>
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Vệ sinh trực nhật: <strong>{g.hygieneScore.toFixed(0)}/15đ</strong>
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    TB thành viên: <strong>{g.avgStudentScore.toFixed(1)}đ</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Group Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rankedGroups.map((g) => {
          const groupMembers = students.filter(s => s.groupId === g.groupId);

          return (
            <div
              key={g.groupId}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                      g.rank === 1
                        ? 'bg-amber-400 text-amber-950'
                        : g.rank === 2
                        ? 'bg-slate-300 text-slate-900'
                        : g.rank === 3
                        ? 'bg-amber-700/60 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    #{g.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base">{g.groupName}</h3>
                      {areAllGroupsEqual && (
                        <span className="text-[10px] bg-amber-500/30 text-amber-300 font-bold px-2 py-0.5 rounded">
                          Đồng hạng 1
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">Tổ trưởng: {g.leaderName}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">Điểm Tổng</span>
                  <div className="text-2xl font-black text-emerald-400">{g.totalScore.toFixed(1)}đ</div>
                </div>
              </div>

              {/* Sub metrics */}
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">TB Cá nhân</span>
                    <strong className="text-slate-900 text-xs">{g.avgStudentScore.toFixed(1)}đ</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Học tập</span>
                    <strong className="text-emerald-600 text-xs">{g.academicScore.toFixed(1)}/25đ</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Vi phạm</span>
                    <strong className="text-rose-600 text-xs">{g.totalViolations} lỗi</strong>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 text-[11px] block mb-1.5">
                    Thành viên ({g.memberCount} học sinh):
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {groupMembers.map(st => (
                      <div
                        key={st.id}
                        onClick={() => setSelectedStudentIdForDetail(st.id)}
                        className="p-1.5 bg-slate-50 hover:bg-emerald-50 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <img src={st.avatar} alt={st.fullName} className="w-6 h-6 rounded-full object-cover" />
                        <span className="truncate text-slate-800 text-[11px] font-medium">{st.fullName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Chuyên cần: <strong>{g.attendanceScore.toFixed(0)}/20đ</strong> • Nề nếp: <strong>{g.disciplineScore.toFixed(0)}/20đ</strong>
                </span>
                <span className="text-amber-800 font-bold">
                  {g.rank === 1 ? '🏆 Giữ cờ thi đua' : `Hạng ${g.rank}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Class Students Emulation Table for the selected Period */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Bảng Điểm Thi Đua Từng Cá Nhân ({periodSummary.periodLabel})</span>
              <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                {filteredStudentScores.length}/{students.length} Học sinh
              </span>
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Tổng hợp điểm thi đua chi tiết của tất cả học sinh cả lớp theo giai đoạn được chọn
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStudentTableGroupFilter(0)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  studentTableGroupFilter === 0 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({students.length})
              </button>
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  onClick={() => setStudentTableGroupFilter(g)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    studentTableGroupFilter === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tổ {g}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentTableSearch}
                onChange={e => setStudentTableSearch(e.target.value)}
                placeholder="Tìm tên hoặc mã HS..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 text-center">Hạng</th>
                <th className="py-2.5 px-3">Mã HS</th>
                <th className="py-2.5 px-3">Học sinh</th>
                <th className="py-2.5 px-3">Tổ</th>
                <th className="py-2.5 px-3 text-center">Chuyên cần</th>
                <th className="py-2.5 px-3 text-center">Vi phạm</th>
                <th className="py-2.5 px-3 text-center">Khen thưởng</th>
                <th className="py-2.5 px-3 text-center">Trực nhật/LĐ</th>
                <th className="py-2.5 px-3 text-center">Học tập</th>
                <th className="py-2.5 px-3 text-center font-bold">Tổng Điểm</th>
                <th className="py-2.5 px-3 text-center">Xếp Loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudentScores.map((st) => (
                <tr
                  key={st.studentId}
                  onClick={() => setSelectedStudentIdForDetail(st.studentId)}
                  className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-2 px-3 text-center font-bold text-slate-700">#{st.rankInClass}</td>
                  <td className="py-2 px-3 font-mono text-slate-500">{st.studentCode}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <img src={st.avatar} alt={st.fullName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      <span className="font-bold text-slate-900">{st.fullName}</span>
                      {st.roleInClass && st.roleInClass !== 'Thành viên' && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {st.roleInClass}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-600 font-medium">Tổ {st.groupId}</td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {st.attendancePenalty > 0 ? (
                      <span className="text-rose-600 font-bold">-{st.attendancePenalty}đ</span>
                    ) : (
                      '0đ'
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {st.penaltyPoints > 0 ? (
                      <span className="text-rose-600 font-bold">-{st.penaltyPoints}đ</span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {st.bonusPoints > 0 ? (
                      <span className="text-emerald-600 font-bold">+{st.bonusPoints}đ</span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {(st.dutyPoints + (st.laborPoints || 0)) !== 0 ? (
                      <span className={st.dutyPoints + (st.laborPoints || 0) > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {st.dutyPoints + (st.laborPoints || 0) > 0 ? `+${st.dutyPoints + (st.laborPoints || 0)}` : st.dutyPoints + (st.laborPoints || 0)}đ
                      </span>
                    ) : (
                      '0đ'
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {st.academicBonus !== 0 ? (
                      <span className={st.academicBonus > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {st.academicBonus > 0 ? `+${st.academicBonus}` : st.academicBonus}đ
                      </span>
                    ) : (
                      '0đ'
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-black text-amber-700 text-sm">{st.totalScore.toFixed(1)}đ</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        st.classification === 'Xuất sắc'
                          ? 'bg-purple-100 text-purple-800'
                          : st.classification === 'Tốt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : st.classification === 'Khá'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {st.classification}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
