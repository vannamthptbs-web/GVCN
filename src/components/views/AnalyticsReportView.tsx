import React, { useState, useMemo } from 'react';
import {
  PieChart,
  BarChart3,
  Download,
  CalendarCheck,
  Sparkles,
  Users,
  Calendar,
  Search,
  Trophy,
  Award,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  CalendarRange
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import {
  calculateEmulationScoresForPeriod,
  getCurrentSchoolWeek,
  EmulationFilterOptions,
} from '../../utils/emulationHistory';

export const AnalyticsReportView: React.FC = () => {
  const {
    students,
    violations,
    rewards,
    attendance,
    academicRecords,
    cleaningDuties,
    laborActivities,
    extracurricularActivities,
    classInfo,
    settings,
    exportToExcel,
    setSelectedStudentIdForDetail
  } = useApp();

  // Active School Week state (default to current school week)
  const currentWeekNumber = useMemo(() => getCurrentSchoolWeek(), []);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeekNumber);
  const [filterMode, setFilterMode] = useState<'week' | 'all' | 'custom'>('week');

  const [timeRange, setTimeRange] = useState<TimeRangeOption>('this_week');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [groupFilter, setGroupFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailMatrix, setShowDetailMatrix] = useState(true);

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

  // Compute emulation summary for the selected week/period
  const emulationSummary = useMemo(() => {
    const filter: EmulationFilterOptions = filterMode === 'all'
      ? { type: 'all' }
      : {
          type: 'week',
          week: selectedWeek,
          schoolYear: classInfo.schoolYear || '2026 - 2027',
        };
    return calculateEmulationScoresForPeriod(appDataPayload, filter);
  }, [appDataPayload, filterMode, selectedWeek, classInfo.schoolYear]);

  // Ranked groups for the chosen period
  const rankedGroups = emulationSummary.groupScores;
  const maxGroupScore = rankedGroups.length > 0 ? Math.max(...rankedGroups.map(g => g.totalScore)) : 100;
  const minGroupScore = rankedGroups.length > 0 ? Math.min(...rankedGroups.map(g => g.totalScore)) : 100;
  const areAllGroupsEqual = rankedGroups.length > 1 && Math.abs(maxGroupScore - minGroupScore) < 0.05;

  // Filter dynamic datasets based on the chosen week/period
  const filteredViolations = useMemo(() => {
    return (emulationSummary.transactions || []).filter(t => t.categoryType === 'Vi phạm (-)');
  }, [emulationSummary.transactions]);

  const filteredRewards = useMemo(() => {
    return (emulationSummary.transactions || []).filter(t => t.categoryType === 'Khen thưởng (+)');
  }, [emulationSummary.transactions]);

  // Student list from the selected period
  const filteredStudents = useMemo(() => {
    return (emulationSummary.studentScores || []).filter(item => {
      if (groupFilter !== 0 && item.groupId !== groupFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.fullName.toLowerCase().includes(q) ||
          item.studentCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [emulationSummary.studentScores, groupFilter, searchQuery]);

  // Violation by category stats based on current period transactions
  const vioNenep = filteredViolations.filter(v => v.content.includes('Nề nếp') || v.content.includes('đồng phục') || v.content.includes('muộn')).length;
  const vioHoctap = filteredViolations.filter(v => v.content.includes('Học tập') || v.content.includes('bài tập') || v.content.includes('sách vở')).length;
  const vioKhac = Math.max(0, filteredViolations.length - vioNenep - vioHoctap);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Báo Cáo Thống Kê & Phân Tích Dữ Liệu</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Trực Quan Hóa Đa Chiều
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            So sánh điểm thi đua 4 tổ cập nhật động theo từng tuần, cơ cấu vi phạm và xuất file Excel
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo Toàn Diện (.xlsx)</span>
        </button>
      </div>

      {/* Week Selector Bar - Cập nhật điểm thi đua theo tuần */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 rounded-3xl text-white shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Chọn Tuần So Sánh Điểm Thi Đua</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                  Tự Động Tính Điểm Từng Tuần
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Chuyển đổi tuần để so sánh điểm thi đua 4 tổ và danh sách học sinh theo tuần đó
              </p>
            </div>
          </div>

          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-xs text-amber-200 font-semibold self-start sm:self-auto">
            Đang xem: <strong>{emulationSummary.periodLabel}</strong>
          </div>
        </div>

        {/* Quick Week Switcher Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => {
              setFilterMode('week');
              setSelectedWeek(currentWeekNumber);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
              filterMode === 'week' && selectedWeek === currentWeekNumber
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tuần Này (Tuần {currentWeekNumber})</span>
          </button>

          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(w => (
            <button
              key={w}
              onClick={() => {
                setFilterMode('week');
                setSelectedWeek(w);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                filterMode === 'week' && selectedWeek === w
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              Tuần {w}
            </button>
          ))}

          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
              filterMode === 'all'
                ? 'bg-indigo-500 text-white shadow-md font-black'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            Lũy Kế Toàn Khóa
          </button>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Group Comparison Bar Visualizer (Cập nhật động theo tuần) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>So Sánh Điểm Thi Đua 4 Tổ</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {emulationSummary.periodLabel} • Thang điểm gốc 100đ
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                {areAllGroupsEqual ? 'Cả 4 tổ đồng điểm' : `Quán quân: ${rankedGroups[0]?.groupName || 'Tổ 1'}`}
              </span>
              <button
                type="button"
                onClick={() => setShowDetailMatrix(!showDetailMatrix)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium underline"
              >
                {showDetailMatrix ? 'Thu gọn tiêu chí' : 'Xem chi tiết'}
              </button>
            </div>
          </div>

          {/* Group Comparison Bars */}
          <div className="space-y-4 pt-1">
            {rankedGroups.map((g) => {
              // Calculate width relative to 105 for clear visual differences
              const maxDisplay = Math.max(100, maxGroupScore + 5);
              const percentage = Math.min(100, Math.max(15, (g.totalScore / maxDisplay) * 100));
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
                          <span className="text-[10px] text-slate-500">({g.leaderName})</span>
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

                  {/* Dynamic Progress Bar */}
                  <div className="w-full h-3.5 bg-slate-200/70 rounded-full overflow-hidden p-0.5 shadow-inner">
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

                  {/* Sub-criteria summary pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-600">
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
                      Trực nhật: <strong>{g.hygieneScore.toFixed(0)}/15đ</strong>
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      TB cá nhân: <strong>{g.avgStudentScore.toFixed(1)}đ</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Criteria Matrix comparison table */}
          {showDetailMatrix && (
            <div className="pt-3 border-t border-slate-100 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                Bảng Đối Chiếu Chi Tiết 4 Tổ ({emulationSummary.periodLabel}):
              </span>
              <table className="w-full text-left text-[11px] border border-slate-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="py-2 px-2.5">Tiêu chí</th>
                    {rankedGroups.map(g => (
                      <th key={g.groupId} className="py-2 px-2 text-center">
                        {g.groupName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1.5 px-2.5 text-slate-600">Chuyên cần (20đ)</td>
                    {rankedGroups.map(g => (
                      <td key={g.groupId} className="py-1.5 px-2 text-center font-semibold text-slate-900">
                        {g.attendanceScore.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 text-slate-600">Học tập (25đ)</td>
                    {rankedGroups.map(g => (
                      <td key={g.groupId} className="py-1.5 px-2 text-center font-semibold text-slate-900">
                        {g.academicScore.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 text-slate-600">Nề nếp kỷ luật (20đ)</td>
                    {rankedGroups.map(g => (
                      <td key={g.groupId} className="py-1.5 px-2 text-center font-semibold text-slate-900">
                        {g.disciplineScore.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 text-slate-600">Vệ sinh - Trực nhật (15đ)</td>
                    {rankedGroups.map(g => (
                      <td key={g.groupId} className="py-1.5 px-2 text-center font-semibold text-slate-900">
                        {g.hygieneScore.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-2 px-2.5 text-slate-900">TỔNG ĐIỂM THI ĐUA</td>
                    {rankedGroups.map(g => (
                      <td key={g.groupId} className="py-2 px-2 text-center text-emerald-600 font-black">
                        {g.totalScore.toFixed(1)}đ
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chart 2: Violation Categories Breakdown (Cập nhật động theo tuần) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-rose-600" />
              <span>Cơ Cấu Vi Phạm & Khen Thưởng</span>
            </h3>
            <span className="text-xs bg-rose-50 text-rose-700 font-bold px-2.5 py-1 rounded-lg border border-rose-200">
              {filteredViolations.length} vi phạm • {filteredRewards.length} khen thưởng
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 text-center text-xs">
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 shadow-xs">
              <span className="text-rose-800 font-bold block">Nề nếp</span>
              <div className="text-3xl font-black text-rose-600 my-1">{vioNenep}</div>
              <span className="text-[10px] text-rose-500">Đồng phục, đi muộn</span>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100 shadow-xs">
              <span className="text-amber-800 font-bold block">Học tập</span>
              <div className="text-3xl font-black text-amber-600 my-1">{vioHoctap}</div>
              <span className="text-[10px] text-amber-500">Bài tập, sách vở</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-xs">
              <span className="text-slate-700 font-bold block">Khác</span>
              <div className="text-3xl font-black text-slate-800 my-1">{vioKhac}</div>
              <span className="text-[10px] text-slate-400">Trực nhật, ứng xử</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                ⭐
              </div>
              <div>
                <span className="font-bold text-emerald-950 block">Hoa Điểm Mười & Khen Thưởng</span>
                <span className="text-[11px] text-emerald-700">Tuyên dương cá nhân tích cực trong {emulationSummary.periodLabel}</span>
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {filteredRewards.length}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic text-center pt-2">
            Tổng cộng: {filteredViolations.length} lượt vi phạm và {filteredRewards.length} lượt khen thưởng trong {emulationSummary.periodLabel}.
          </p>
        </div>
      </div>

      {/* Full Data Table Preview (Cập nhật điểm theo tuần đã chọn) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>Bảng Tổng Hợp Dữ Liệu Thi Đua Cả Lớp</span>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                {filteredStudents.length}/{students.length} Học sinh
              </span>
            </h3>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Hiển thị đầy đủ điểm thi đua từng cá nhân cập nhật theo <strong>{emulationSummary.periodLabel}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setGroupFilter(0)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  groupFilter === 0 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({students.length})
              </button>
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    groupFilter === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên hoặc mã HS..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center">Hạng Cá Nhân</th>
                <th className="py-2.5 px-3">Mã HS</th>
                <th className="py-2.5 px-3">Học sinh</th>
                <th className="py-2.5 px-3">Tổ</th>
                <th className="py-2.5 px-3 text-center">Chuyên cần</th>
                <th className="py-2.5 px-3 text-center">Vi phạm</th>
                <th className="py-2.5 px-3 text-center">Khen thưởng</th>
                <th className="py-2.5 px-3 text-center">Lao động</th>
                <th className="py-2.5 px-3 text-center">Học tập</th>
                <th className="py-2.5 px-3 text-center font-bold">Tổng Điểm</th>
                <th className="py-2.5 px-3 text-center">Xếp Loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(s => (
                <tr
                  key={s.studentId}
                  onClick={() => setSelectedStudentIdForDetail?.(s.studentId)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-center font-bold text-slate-700">#{s.rankInClass}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{s.studentCode}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <img src={s.avatar} alt={s.fullName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      <span className="font-semibold text-slate-900">{s.fullName}</span>
                      {s.roleInClass && s.roleInClass !== 'Thành viên' && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {s.roleInClass}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">Tổ {s.groupId}</td>
                  <td className="py-2.5 px-3 text-center text-slate-600">
                    {s.attendancePenalty > 0 ? (
                      <span className="text-rose-600 font-bold">-{s.attendancePenalty}đ</span>
                    ) : (
                      '0đ'
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {s.penaltyPoints > 0 ? (
                      <span className="text-rose-600 font-bold">-{s.penaltyPoints}đ</span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {s.bonusPoints > 0 ? (
                      <span className="text-emerald-600 font-bold">+{s.bonusPoints}đ</span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600">
                    {(s.laborPoints || 0) !== 0 ? (
                      <span className={(s.laborPoints || 0) > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {(s.laborPoints || 0) > 0 ? `+${s.laborPoints}` : s.laborPoints}đ
                      </span>
                    ) : (
                      '0đ'
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600">
                    {(s.academicBonus || 0) !== 0 ? (
                      <span className={(s.academicBonus || 0) > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {(s.academicBonus || 0) > 0 ? `+${s.academicBonus}` : s.academicBonus}đ
                      </span>
                    ) : (
                      '0đ'
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-black text-emerald-700 text-sm">
                    {s.totalScore.toFixed(1)}đ
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        s.classification === 'Xuất sắc'
                          ? 'bg-purple-100 text-purple-800'
                          : s.classification === 'Tốt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.classification === 'Khá'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.classification}
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
