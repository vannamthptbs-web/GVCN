import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Award,
  AlertTriangle,
  Users,
  Trophy,
  Star,
  Sparkles,
  Share2,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { TimeRangePicker } from '../common/TimeRangePicker';
import { TimeRangeOption, isDateInRange } from '../../utils/timeFilter';
import { calculateEmulationScoresForPeriod, getCurrentSchoolWeek } from '../../utils/emulationHistory';

export const WeeklyReportView: React.FC = () => {
  const {
    students,
    attendance,
    violations,
    rewards,
    academicRecords,
    cleaningDuties,
    laborActivities,
    extracurricularActivities,
    rankedGroups,
    rankedStudents,
    studentsNeedingAttention,
    classInfo,
    setSelectedStudentIdForDetail
  } = useApp();

  const [timeRange, setTimeRange] = useState<TimeRangeOption>('this_week');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [currentWeek, setCurrentWeek] = useState<number>(() => getCurrentSchoolWeek());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'agenda' | 'minutes'>('summary');
  const [tableGroupFilter, setTableGroupFilter] = useState<number>(0);
  const [tableSearch, setTableSearch] = useState('');

  const monitor = students.find(s => s.roleInClass === 'Lớp trưởng');
  const secretary = students.find(s => s.roleInClass === 'Bí thư Chi đoàn' || s.roleInClass === 'Phó Bí thư') || students.find(s => s.roleInClass === 'Lớp phó Học tập') || students[1];

  // Tính điểm thi đua chính xác theo tuần được chọn (currentWeek)
  const weeklyPeriodSummary = useMemo(() => {
    return calculateEmulationScoresForPeriod({
      students,
      violations,
      rewards,
      attendance,
      academicRecords,
      cleaningDuties,
      laborActivities,
      extracurricularActivities,
      classInfo,
    }, {
      type: 'week',
      week: currentWeek,
      schoolYear: classInfo.schoolYear || '2026 - 2027',
    });
  }, [
    students,
    violations,
    rewards,
    attendance,
    academicRecords,
    cleaningDuties,
    laborActivities,
    extracurricularActivities,
    classInfo,
    currentWeek
  ]);

  const weeklyRankedGroups = weeklyPeriodSummary.groupScores;
  const topGroup = weeklyRankedGroups[0] || rankedGroups[0];
  const topStudents = rankedStudents.slice(0, 5);

  // Filter dynamic datasets based on chosen time range
  const filteredViolations = useMemo(() => {
    return violations.filter(v => isDateInRange(v.date, timeRange, customStartDate, customEndDate));
  }, [violations, timeRange, customStartDate, customEndDate]);

  const filteredRewards = useMemo(() => {
    return rewards.filter(r => isDateInRange(r.date, timeRange, customStartDate, customEndDate));
  }, [rewards, timeRange, customStartDate, customEndDate]);

  const filteredAcademic = useMemo(() => {
    return academicRecords.filter(a => isDateInRange(a.date, timeRange, customStartDate, customEndDate));
  }, [academicRecords, timeRange, customStartDate, customEndDate]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(att => isDateInRange(att.date, timeRange, customStartDate, customEndDate));
  }, [attendance, timeRange, customStartDate, customEndDate]);

  const filteredClassStudents = useMemo(() => {
    return rankedStudents.filter(item => {
      if (tableGroupFilter !== 0 && item.student.groupId !== tableGroupFilter) return false;
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        return (
          item.student.fullName.toLowerCase().includes(q) ||
          item.student.studentCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rankedStudents, tableGroupFilter, tableSearch]);

  const handleCopyZalo = () => {
    const text = `📢 BÁO CÁO TỔNG KẾT TUẦN ${currentWeek} - LỚP ${classInfo.className}
👨‍🏫 GVCN: ${classInfo.homeroomTeacher}
---------------------------------
1. CHUYÊN CẦN: ${students.length}/${students.length} học sinh duy trì nền nếp.
2. THI ĐUA TỔ:
   🏆 Quán quân: ${topGroup?.groupName || 'Tổ 1'} (${topGroup?.totalScore.toFixed(1)}đ)
3. HỌC SINH TIÊU BIỂU TUẦN:
   ⭐ 1. ${topStudents[0]?.student.fullName || '---'} (${topStudents[0]?.totalScore.toFixed(1) || 0}đ)
   ⭐ 2. ${topStudents[1]?.student.fullName || '---'} (${topStudents[1]?.totalScore.toFixed(1) || 0}đ)
   ⭐ 3. ${topStudents[2]?.student.fullName || '---'} (${topStudents[2]?.totalScore.toFixed(1) || 0}đ)
4. VIỆC TỐT & KHEN THƯỞNG: ${filteredRewards.length} lượt tuyên dương hoa điểm mười.
5. KỶ LUẬT & VI PHẠM: ${filteredViolations.length} trường hợp cần lưu ý khắc phục.
6. KẾ HOẠCH TUẦN TIẾP THEO:
   - Tiếp tục ôn tập theo kế hoạch nhà trường.
   - Giữ gìn vệ sinh lớp học đạt chuẩn xanh - sạch.
Kính gửi Quý Phụ huynh theo dõi!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Tổng Kết Tuần & Kịch Bản Tiết Sinh Hoạt Lớp Thứ 6
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Tự Động 100%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp dữ liệu và chỉ số thi đua theo mốc thời gian chọn lọc • Sẵn sàng điều hành sinh hoạt và xuất Zalo
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyZalo}
            className="px-3.5 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Đã sao chép tin nhắn!' : 'Sao chép gửi Zalo Phụ Huynh'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>In biên bản tuần</span>
          </button>
        </div>
      </div>

      {/* Time Range Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-slate-700">Thời gian báo cáo:</span>
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold pb-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`py-2 px-4 rounded-xl transition-all ${
            activeTab === 'summary' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          📊 Tổng quan thi đua Tuần {currentWeek}
        </button>
        <button
          onClick={() => setActiveTab('agenda')}
          className={`py-2 px-4 rounded-xl transition-all ${
            activeTab === 'agenda' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          📋 Kịch bản điều hành Sinh hoạt lớp (45 phút)
        </button>
        <button
          onClick={() => setActiveTab('minutes')}
          className={`py-2 px-4 rounded-xl transition-all ${
            activeTab === 'minutes' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          📝 Biên bản tự động nộp BGH
        </button>
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          {/* Quick Metrics in Selected Period */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-800 font-semibold block">Hoa điểm mười & Khen thưởng</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{filteredRewards.length} lượt</div>
              <span className="text-[10px] text-emerald-600">Trong thời gian chọn</span>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-rose-800 font-semibold block">Ghi nhận vi phạm</span>
              <div className="text-2xl font-black text-rose-700 mt-1">{filteredViolations.length} lượt</div>
              <span className="text-[10px] text-rose-600">Đã nhắc nhở / khắc phục</span>
            </div>

            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-blue-800 font-semibold block">Ghi nhận học tập</span>
              <div className="text-2xl font-black text-blue-700 mt-1">{filteredAcademic.length} tiết</div>
              <span className="text-[10px] text-blue-600">Sổ đầu bài</span>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-purple-800 font-semibold block">Bản ghi chuyên cần</span>
              <div className="text-2xl font-black text-purple-700 mt-1">{filteredAttendance.length} lượt</div>
              <span className="text-[10px] text-purple-600">Sổ điểm danh</span>
            </div>
          </div>

          {/* Week Winners Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group champion */}
            <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-white p-5 rounded-2xl border border-amber-300 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Tổ Dẫn Đầu Tuần {currentWeek} 🏆
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {topGroup?.groupName || 'Tổ 1'}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tổ trưởng: {topGroup?.leaderName} • Điểm tổng: <strong>{topGroup?.totalScore.toFixed(1)}đ</strong>
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl font-black shadow-md">
                🥇
              </div>
            </div>

            {/* Top Student */}
            <div className="bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-white p-5 rounded-2xl border border-emerald-300 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Học Sinh Xuất Sắc Nhất Tuần ⭐
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {topStudents[0]?.student.fullName || 'Trần Minh Hoàng'}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tổ {topStudents[0]?.student.groupId} • Điểm thi đua: <strong>{topStudents[0]?.totalScore.toFixed(1)}đ</strong>
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-black shadow-md">
                👑
              </div>
            </div>
          </div>

          {/* Group Rankings table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Bảng Tổng Điểm Thi Đua 4 Tổ (Tuần {currentWeek})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {weeklyRankedGroups.map((g, i) => (
                <div key={g.groupId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{g.groupName}</span>
                    <span className="font-black text-emerald-600">{g.totalScore.toFixed(1)}đ</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Hạng #{g.rank} Toàn Lớp</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Students */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Top 5 Học Sinh Tiêu Biểu Nhất Lớp</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              {topStudents.map((st, i) => (
                <div key={st.student.id} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center space-y-1">
                  <img src={st.student.avatar} alt={st.student.fullName} className="w-10 h-10 rounded-full mx-auto object-cover" />
                  <div className="font-bold text-slate-900 truncate">{st.student.fullName}</div>
                  <div className="text-emerald-700 font-black">{st.totalScore.toFixed(1)}đ</div>
                  <span className="text-[10px] text-slate-400">Tổ {st.student.groupId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Class Ranking Table - Displaying All Students */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Bảng Điểm Thi Đua & Xếp Loại Toàn Thể Học Sinh Cả Lớp</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {filteredClassStudents.length}/{students.length} Học sinh
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hiển thị đầy đủ tất cả học sinh cả lớp với điểm số chi tiết từng hạng mục
                </p>
              </div>

              {/* Group filter buttons & search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setTableGroupFilter(0)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      tableGroupFilter === 0 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({students.length})
                  </button>
                  {[1, 2, 3, 4].map(g => (
                    <button
                      key={g}
                      onClick={() => setTableGroupFilter(g)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        tableGroupFilter === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    placeholder="Tìm tên hoặc mã HS..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-44 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center">Hạng</th>
                    <th className="py-2.5 px-3">Mã HS</th>
                    <th className="py-2.5 px-3">Họ và Tên</th>
                    <th className="py-2.5 px-3">Tổ</th>
                    <th className="py-2.5 px-3 text-center">Chuyên cần</th>
                    <th className="py-2.5 px-3 text-center">Vi phạm</th>
                    <th className="py-2.5 px-3 text-center">Khen thưởng</th>
                    <th className="py-2.5 px-3 text-center">Trực nhật / LĐ</th>
                    <th className="py-2.5 px-3 text-center">Học tập</th>
                    <th className="py-2.5 px-3 text-center font-bold">Tổng Điểm</th>
                    <th className="py-2.5 px-3 text-center">Xếp Loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClassStudents.map((item) => (
                    <tr
                      key={item.student.id}
                      onClick={() => setSelectedStudentIdForDetail(item.student.id)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 text-center font-bold text-slate-700">
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
                      <td className="py-2 px-3 text-slate-600 font-medium">Tổ {item.student.groupId}</td>
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
                      <td className="py-2 px-3 text-center font-black text-emerald-700 text-sm">
                        {item.totalScore.toFixed(1)}đ
                      </td>
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
      )}

      {/* TAB 2: AGENDAS FOR 45 MINUTE FRIDAY MEETING */}
      {activeTab === 'agenda' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">
              Kịch Bản Điều Hành Tiết Sinh Hoạt Lớp Thứ 6 (45 Phút)
            </h3>
            <p className="text-slate-500 mt-0.5">
              Chuẩn bị sư phạm theo tinh thần kỷ luật tích cực, học sinh làm chủ diễn đàn
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
                  Phần 1: Ban Cán Sự Lớp & 4 Tổ Trưởng Báo Cáo (10 Phút)
                </span>
                <span className="text-slate-500 font-mono">10 phút</span>
              </div>
              <ul className="list-disc list-inside text-slate-700 space-y-1 pl-2">
                <li>Lớp trưởng khai mạc, nhận xét chung tình hình lớp tuần {currentWeek}.</li>
                <li>4 Tổ trưởng báo cáo ngắn gọn: Chuyên cần, lỗi vi phạm nề nếp, thành viên tiến bộ.</li>
                <li>Lớp phó Lao động nhận xét tình hình trực nhật vệ sinh phòng B204.</li>
                <li>Lớp phó Học tập công bố số lượt điểm tốt ({filteredRewards.length} lượt) và tình hình làm bài tập về nhà.</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                  Phần 2: Học Sinh Trao Đổi, Giải Trình & Đề Xuất Biện Pháp Khắc Phục (10 Phút)
                </span>
                <span className="text-slate-500 font-mono">10 phút</span>
              </div>
              <ul className="list-disc list-inside text-slate-700 space-y-1 pl-2">
                <li>Các bạn học sinh có vi phạm ({filteredViolations.length} lượt) trình bày lý do và cam kết khắc phục.</li>
                <li>Cả lớp đóng góp ý kiến xây dựng trên tinh thần hỗ trợ nhau tiến bộ.</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                  Phần 3: Tuyên Dương, Khen Thưởng & Trao Thưởng Tuần (5 Phút) 🎉
                </span>
                <span className="text-emerald-700 font-mono font-bold">5 phút</span>
              </div>
              <ul className="list-disc list-inside text-emerald-900 space-y-1 pl-2 font-medium">
                <li>Trao cờ luân lưu thi đua cho: <strong>{topGroup?.groupName || 'Tổ 1'}</strong>.</li>
                <li>Tặng quà / Sticker tuyên dương Top 5 học sinh tiêu biểu: {topStudents.map(s => s.student?.fullName || '').filter(Boolean).join(', ') || 'Chưa có'}.</li>
              </ul>
            </div>

            {/* Step 4 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">4</span>
                  Phần 4: GVCN Nhận Xét & Định Hướng Kế Hoạch Tuần Mới (15 Phút)
                </span>
                <span className="text-slate-500 font-mono">15 phút</span>
              </div>
              <ul className="list-disc list-inside text-slate-700 space-y-1 pl-2">
                <li>{classInfo.homeroomTeacher} đánh giá toàn diện, biểu dương tinh thần đoàn kết.</li>
                <li>Nhắc nhở riêng các trường hợp cần quan tâm một cách tế nhị.</li>
                <li>Phổ biến kế hoạch học tập, kiểm tra định kỳ của tuần {currentWeek + 1}.</li>
              </ul>
            </div>

            {/* Step 5 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">5</span>
                  Phần 5: Phát Động Thi Đua & Thư Ký Thông Qua Biên Bản (5 Phút)
                </span>
                <span className="text-slate-500 font-mono">5 phút</span>
              </div>
              <ul className="list-disc list-inside text-slate-700 space-y-1 pl-2">
                <li>Thư ký ({secretary?.fullName || 'Nguyễn Bảo Trâm'}) đọc biên bản sinh hoạt lớp. Tập thể biểu quyết 100% thông qua.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OFFICIAL MINUTES */}
      {activeTab === 'minutes' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs text-slate-800 leading-relaxed print:p-0 print:border-none">
          <div className="text-center space-y-1 pb-4 border-b border-slate-200">
            <p className="font-bold uppercase text-slate-600">{classInfo.schoolName || 'TRƯỜNG THPT CHUYÊN'} • LỚP {classInfo.className}</p>
            <h2 className="text-lg font-black text-slate-900 uppercase">
              BIÊN BẢN SINH HOẠT LỚP TUẦN {currentWeek}
            </h2>
            <p className="text-slate-500 text-[11px]">
              Thời gian: 16h15 Thứ Sáu • Địa điểm: {classInfo.roomNumber}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <strong>I. THÀNH PHẦN THAM DỰ:</strong>
              <ul className="list-disc list-inside pl-3 mt-1 space-y-0.5 text-slate-700">
                <li>Chủ tọa: {classInfo.homeroomTeacher} – Giáo viên chủ nhiệm</li>
                <li>Thư ký: {secretary?.fullName || 'Nguyễn Bảo Trâm'} – {secretary?.roleInClass || 'Bí thư Chi đoàn'}</li>
                <li>Có mặt: {students.length}/{students.length} học sinh (100%)</li>
              </ul>
            </div>

            <div>
              <strong>II. NỘI DUNG CUỘC HỌP:</strong>
              <div className="pl-3 mt-1 space-y-2 text-slate-700">
                <p>1. Lớp trưởng {monitor?.fullName || 'Trần Minh Hoàng'} đánh giá tình hình chuyên cần và nền nếp tuần qua.</p>
                <p>2. Kết quả thi đua: {topGroup?.groupName} xếp thứ Nhất ({topGroup?.totalScore.toFixed(1)} điểm).</p>
                <p>3. Khen thưởng {topStudents.length} học sinh xuất sắc: {topStudents.map(s => s.student?.fullName || '').filter(Boolean).join(', ') || 'Chưa có'} ({filteredRewards.length} lượt hoa điểm 10).</p>
                <p>4. Ý kiến chỉ đạo của GVCN: Đề nghị cả lớp tập trung học tập, giữ vững kỷ cương nền nếp và vệ sinh lớp học.</p>
              </div>
            </div>

            <div>
              <strong>III. BẢNG XẾP HẠNG THI ĐUA TOÀN THỂ HỌC SINH CẢ LỚP ({students.length}/{students.length} HỌC SINH):</strong>
              <div className="mt-2 border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-1.5 text-center">Hạng</th>
                      <th className="p-1.5">Mã HS</th>
                      <th className="p-1.5">Họ và Tên</th>
                      <th className="p-1.5">Tổ</th>
                      <th className="p-1.5 text-center">Chuyên cần</th>
                      <th className="p-1.5 text-center">Vi phạm</th>
                      <th className="p-1.5 text-center">Thưởng</th>
                      <th className="p-1.5 text-center">Trực nhật/LĐ</th>
                      <th className="p-1.5 text-center font-bold">Điểm Tuần</th>
                      <th className="p-1.5 text-center">Xếp Loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rankedStudents.map((st) => (
                      <tr key={st.student.id}>
                        <td className="p-1.5 text-center font-bold">#{st.rankInClass}</td>
                        <td className="p-1.5 font-mono">{st.student.studentCode}</td>
                        <td className="p-1.5 font-semibold">{st.student.fullName}</td>
                        <td className="p-1.5">Tổ {st.student.groupId}</td>
                        <td className="p-1.5 text-center">{st.attendancePenalty < 0 ? `${st.attendancePenalty}đ` : '0đ'}</td>
                        <td className="p-1.5 text-center text-rose-600">{st.penaltyPoints > 0 ? `-${st.penaltyPoints}đ` : '0đ'}</td>
                        <td className="p-1.5 text-center text-emerald-600">{st.bonusPoints > 0 ? `+${st.bonusPoints}đ` : '0đ'}</td>
                        <td className="p-1.5 text-center">{st.dutyPoints + (st.laborPoints || 0) !== 0 ? `${st.dutyPoints + (st.laborPoints || 0) > 0 ? '+' : ''}${st.dutyPoints + (st.laborPoints || 0)}đ` : '0đ'}</td>
                        <td className="p-1.5 text-center font-bold">{st.totalScore.toFixed(1)}đ</td>
                        <td className="p-1.5 text-center font-semibold">
                          {st.totalScore >= 95 ? 'Tốt' : st.totalScore >= 85 ? 'Khá' : 'Đạt'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <strong>IV. KẾT LUẬN & BIỂU QUYẾT:</strong>
              <p className="pl-3 mt-1 text-slate-700">
                Tập thể lớp {classInfo.className} biểu quyết 100% thông qua nội dung biên bản và chỉ tiêu thi đua tuần tới.
              </p>
            </div>
          </div>

          <div className="pt-8 grid grid-cols-2 text-center text-xs">
            <div>
              <p className="font-bold text-slate-900">THƯ KÝ LỚP</p>
              <p className="text-[11px] text-slate-400 italic mt-12">{secretary?.fullName || 'Nguyễn Bảo Trâm'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">GIÁO VIÊN CHỦ NHIỆM</p>
              <p className="text-[11px] text-slate-400 italic mt-12">{classInfo.homeroomTeacher}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
