import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Award,
  Trophy,
  Users,
  Download,
  Printer,
  Sparkles,
  TrendingUp,
  Filter,
  CheckCircle2,
  AlertCircle,
  Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';

export const MonthlyReportView: React.FC = () => {
  const {
    students,
    rankedGroups,
    rankedStudents,
    exportToExcel,
    violations,
    rewards,
    attendance,
    academicRecords,
    setSelectedStudentIdForDetail
  } = useApp();

  const [timeRange, setTimeRange] = useState<TimeRangeOption>('this_month');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [groupFilter, setGroupFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic filter
  const filteredViolations = useMemo(() => {
    return violations.filter(v => isDateInRange(v.date, timeRange, customStartDate, customEndDate));
  }, [violations, timeRange, customStartDate, customEndDate]);

  const filteredRewards = useMemo(() => {
    return rewards.filter(r => isDateInRange(r.date, timeRange, customStartDate, customEndDate));
  }, [rewards, timeRange, customStartDate, customEndDate]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => isDateInRange(a.date, timeRange, customStartDate, customEndDate));
  }, [attendance, timeRange, customStartDate, customEndDate]);

  const filteredStudents = useMemo(() => {
    return rankedStudents.filter(item => {
      if (groupFilter !== 0 && item.student.groupId !== groupFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.student.fullName.toLowerCase().includes(q) ||
          item.student.studentCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rankedStudents, groupFilter, searchQuery]);

  // Classification stats
  const excellentStudents = rankedStudents.filter(s => s.totalScore >= 95);
  const goodStudents = rankedStudents.filter(s => s.totalScore >= 85 && s.totalScore < 95);
  const averageStudents = rankedStudents.filter(s => s.totalScore < 85);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Báo Cáo Tổng Kết Tháng & Xếp Loại Rèn Luyện</h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Định Kỳ & Tùy Chọn
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Đánh giá toàn diện hạnh kiểm và kết quả thi đua cho {students.length} học sinh và 4 tổ theo mốc thời gian
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>
      </div>

      {/* Time Range Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="font-bold text-slate-700">Lựa chọn thời gian:</span>
        </div>
        <TimeRangePicker
          selectedOption={timeRange}
          onChangeOption={setTimeRange}
          customStartDate={customStartDate}
          onChangeCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          onChangeCustomEndDate={setCustomEndDate}
        />
      </div>

      {/* Monthly Classification Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-center justify-between text-emerald-800 font-bold mb-1">
            <span>Xếp Loại Tốt (≥ 95đ)</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">{excellentStudents.length} Học sinh</div>
          <p className="text-[11px] text-emerald-600 mt-1">
            Chiếm {students.length > 0 ? Math.round((excellentStudents.length / students.length) * 100) : 0}% toàn lớp • Đạt danh hiệu Rèn luyện Tốt
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center justify-between text-blue-800 font-bold mb-1">
            <span>Xếp Loại Khá (85 - 94đ)</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-700">{goodStudents.length} Học sinh</div>
          <p className="text-[11px] text-blue-600 mt-1">
            Chiếm {students.length > 0 ? Math.round((goodStudents.length / students.length) * 100) : 0}% toàn lớp • Duy trì nề nếp ổn định
          </p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center justify-between text-amber-800 font-bold mb-1">
            <span>Cần Phấn Đấu (&lt; 85đ)</span>
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-700">{averageStudents.length} Học sinh</div>
          <p className="text-[11px] text-amber-600 mt-1">
            GVCN & Ban cán sự lớp đã lập kế hoạch kèm cặp
          </p>
        </div>
      </div>

      {/* Period Activity Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-slate-500 font-medium block">Khen thưởng hoa điểm 10</span>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{filteredRewards.length}</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-slate-500 font-medium block">Lượt vi phạm</span>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{filteredViolations.length}</div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-slate-500 font-medium block">Lượt vắng / muộn</span>
          <div className="text-2xl font-black text-amber-600 mt-0.5">
            {filteredAttendance.filter(a => a.status !== 'present').length}
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-slate-500 font-medium block">Chuyên cần đạt</span>
          <div className="text-2xl font-black text-blue-600 mt-0.5">
            {(() => {
              const nonPresent = filteredAttendance.filter(a => a.status !== 'present').length;
              if (nonPresent === 0) return '100%';
              const totalEst = Math.max(1, (students.length || 40) * 20);
              const pct = Math.max(85, 100 - (nonPresent * 100) / totalEst);
              return `${pct.toFixed(1)}%`;
            })()}
          </div>
        </div>
      </div>

      {/* Group Performance */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Xếp Hạng 4 Tổ Trong Khoảng Thời Gian Đã Chọn</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {rankedGroups.map((g, idx) => (
            <div key={g.groupId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{g.groupName}</span>
                <span className="bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-full text-[10px]">
                  Hạng #{g.rank}
                </span>
              </div>
              <div className="text-xl font-black text-emerald-600">{g.totalScore.toFixed(1)} Điểm</div>
              <p className="text-[11px] text-slate-500">Tổ trưởng: {g.leaderName}</p>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                Vệ sinh: <strong>{g.cleanRate.toFixed(0)}%</strong> • Vi phạm: <strong>{g.totalViolations}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Full Ranking Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Bảng Xếp Hạng Thi Đua Toàn Bộ Học Sinh Cả Lớp</span>
              <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {filteredStudents.length}/{students.length} Học sinh
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Đánh giá kết quả rèn luyện từng cá nhân cho toàn bộ danh sách lớp
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
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 text-center">Hạng</th>
                <th className="py-2.5 px-3">Mã HS</th>
                <th className="py-2.5 px-3">Họ và Tên</th>
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
              {filteredStudents.map((item) => (
                <tr
                  key={item.student.id}
                  onClick={() => setSelectedStudentIdForDetail(item.student.id)}
                  className="hover:bg-purple-50/40 transition-colors cursor-pointer"
                >
                  <td className="py-2 px-3 text-center font-bold">
                    {item.rankInClass === 1 ? '🥇 1' : item.rankInClass === 2 ? '🥈 2' : item.rankInClass === 3 ? '🥉 3' : `#${item.rankInClass}`}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-500">{item.student.studentCode}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <img src={item.student.avatar} alt={item.student.fullName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      <span className="font-bold text-slate-900">{item.student.fullName}</span>
                      {item.student.roleInClass !== 'Thành viên' && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {item.student.roleInClass}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-600">Tổ {item.student.groupId}</td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {item.attendancePenalty < 0 ? (
                      <span className="text-rose-600 font-bold">{item.attendancePenalty}đ</span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {item.penaltyPoints > 0 ? (
                      <span className="text-rose-600 font-bold">-{item.penaltyPoints}đ</span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {item.bonusPoints > 0 ? (
                      <span className="text-emerald-600 font-bold">+{item.bonusPoints}đ</span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {(item.dutyPoints + (item.laborPoints || 0)) !== 0 ? (
                      <span className={item.dutyPoints + (item.laborPoints || 0) > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {item.dutyPoints + (item.laborPoints || 0) > 0 ? `+${item.dutyPoints + (item.laborPoints || 0)}` : item.dutyPoints + (item.laborPoints || 0)}đ
                      </span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {item.academicBonus !== 0 ? (
                      <span className={item.academicBonus > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {item.academicBonus > 0 ? `+${item.academicBonus}` : item.academicBonus}đ
                      </span>
                    ) : (
                      <span className="text-slate-400">0đ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-black text-emerald-600 text-sm">{item.totalScore.toFixed(1)}đ</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.totalScore >= 95
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.totalScore >= 85
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.totalScore >= 95 ? 'Tốt' : item.totalScore >= 85 ? 'Khá' : 'Đạt'}
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
