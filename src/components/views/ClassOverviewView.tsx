import React from 'react';
import {
  School,
  Users,
  ShieldCheck,
  User,
  GraduationCap,
  Sparkles,
  Trophy,
  PhoneCall,
  MapPin,
  Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { sortCadres, compareStudentsByGroupHierarchy, getRoleRank } from '../../utils/roleHierarchy';

export const ClassOverviewView: React.FC = () => {
  const { students, groupScores, setSelectedStudentIdForDetail, classInfo } = useApp();

  const maleCount = students.filter(s => s.gender === 'Nam').length;
  const femaleCount = students.filter(s => s.gender === 'Nữ').length;

  const cadres = sortCadres(students);
  const monitor = students.find(s => {
    const r = (s.roleInClass || '').toLowerCase().trim();
    return r.includes('lớp trưởng') || r.includes('lop truong') || r === 'lt';
  });

  return (
    <div className="space-y-6">
      {/* Hero Overview Header */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-bold">
              <School className="w-3.5 h-3.5" />
              <span>{classInfo.schoolName || 'Trường THPT Chuyên'} / Ban Tự Nhiên & Ngoại Ngữ</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              TỔNG QUAN TẬP THỂ LỚP {classInfo.className}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              {classInfo.roomNumber} • Năm học {classInfo.schoolYear} • Khẩu hiệu: "{classInfo.motto}"
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-200">
              <span>👩‍🏫 GVCN: <strong>{classInfo.homeroomTeacher}</strong> {classInfo.teacherPhone ? `(SĐT: ${classInfo.teacherPhone})` : ''}</span>
              <span>👑 Lớp trưởng: <strong>{monitor?.fullName || 'Chưa phân công'}</strong></span>
            </div>
          </div>

          {/* Sĩ số metrics box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Sĩ số</span>
              <div className="text-3xl font-black text-white mt-0.5">{students.length}</div>
              <span className="text-[10px] text-emerald-400 font-bold">Đầy đủ 100%</span>
            </div>
            <div className="border-x border-white/15">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Nam</span>
              <div className="text-3xl font-black text-sky-400 mt-0.5">{maleCount}</div>
              <span className="text-[10px] text-slate-300">55%</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Nữ</span>
              <div className="text-3xl font-black text-pink-400 mt-0.5">{femaleCount}</div>
              <span className="text-[10px] text-slate-300">45%</span>
            </div>
          </div>
        </div>

        {/* Backdrop visual blur */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Ban cán sự lớp showcase */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Ban Cán Sự Lớp & Ban Chấp Hành Chi Đoàn
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{cadres.length} thành viên nòng cốt</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cadres.map(c => {
            const rank = getRoleRank(c.roleInClass, c.groupId);
            const isMonitor = rank === 10;
            const isGroupLeader = rank >= 40 && rank <= 49;
            const isViceLeader = rank >= 50 && rank <= 59;
            const isClassVice = rank >= 20 && rank <= 29;

            const badgeColor = isMonitor
              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
              : isClassVice
              ? 'bg-blue-100 text-blue-900 border border-blue-300 font-bold'
              : isGroupLeader
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
              : isViceLeader
              ? 'bg-teal-100 text-teal-900 border border-teal-300 font-semibold'
              : 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold';

            const cardBorder = isMonitor
              ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50 shadow-xs'
              : isGroupLeader
              ? 'border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/50'
              : 'border-slate-200/80 bg-slate-50 hover:bg-slate-100/60';

            return (
              <div
                key={c.id}
                onClick={() => setSelectedStudentIdForDetail(c.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer group relative ${cardBorder}`}
              >
                {isMonitor && (
                  <span className="absolute top-2.5 right-2.5 text-amber-500 text-sm" title="Lớp trưởng">
                    👑
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <img
                    src={c.avatar}
                    alt={c.fullName}
                    className={`w-12 h-12 rounded-xl object-cover border shadow-xs ${isMonitor ? 'border-amber-400 ring-2 ring-amber-300/60' : 'border-slate-200'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md mb-0.5 ${badgeColor}`}>
                      {c.roleInClass}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                      {c.fullName}
                    </h4>
                    <p className="text-[11px] text-slate-500">Tổ {c.groupId} • {c.phone || c.studentCode}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 Groups Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(groupId => {
          const rawGroupStudents = students.filter(s => s.groupId === groupId);
          const groupStudents = [...rawGroupStudents].sort(compareStudentsByGroupHierarchy);
          const gScore = groupScores[groupId];
          const leader = groupStudents.find(s => (s.roleInClass || '').toLowerCase().includes('tổ trưởng'))?.fullName || 'Chưa phân công';
          const viceLeader = groupStudents.find(s => (s.roleInClass || '').toLowerCase().includes('tổ phó'))?.fullName || 'Chưa phân công';

          return (
            <div
              key={groupId}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base">Tổ {groupId}</h3>
                  <p className="text-[11px] text-slate-300">{groupStudents.length} Học sinh</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Điểm tổ</span>
                  <div className="text-lg font-black text-emerald-400">
                    {gScore?.totalScore.toFixed(1) || '100'}đ
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 text-xs">
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <span className="text-emerald-600">🔰</span> Tổ trưởng:
                    </span>
                    <strong className="text-slate-900">{leader}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Tổ phó:</span>
                    <strong className="text-slate-700">{viceLeader}</strong>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 text-[11px]">
                      Thành viên trong tổ:
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Tổ trưởng xếp đầu</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {groupStudents.map((st, i) => {
                      const r = (st.roleInClass || '').toLowerCase();
                      const isTT = r.includes('tổ trưởng');
                      const isTP = r.includes('tổ phó');
                      const isLT = r.includes('lớp trưởng');

                      return (
                        <div
                          key={st.id}
                          onClick={() => setSelectedStudentIdForDetail(st.id)}
                          className={`p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isTT
                              ? 'bg-emerald-50/80 text-emerald-950 font-bold border border-emerald-200/60'
                              : isTP
                              ? 'bg-teal-50/60 text-teal-950 font-semibold border border-teal-200/50'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className="truncate flex items-center gap-1">
                            <span>{i + 1}. {st.fullName}</span>
                            {isLT && <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1 rounded">👑 LT</span>}
                            {isTT && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1 rounded">TT</span>}
                            {isTP && <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1 rounded">TP</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                            {st.studentCode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
                Xếp hạng thi đua: <strong className="text-emerald-700">#{gScore?.rank || 1}</strong> toàn lớp
              </div>
            </div>
          );
        })}
      </div>

      {/* Classroom Seating / Group Organization Map */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Sơ Đồ Bố Trí Lớp Học & Vị Trí 4 Tổ
            </h3>
          </div>
          <span className="text-xs text-slate-400">Bục giảng hướng lên phía trên</span>
        </div>

        {/* Chalkboard Indicator */}
        <div className="w-full max-w-md mx-auto py-2 bg-slate-800 text-white rounded-lg text-center font-bold text-xs shadow-inner">
          [ BẢNG ĐEN LỚP HỌC & BÀN GIÁO VIÊN ]
        </div>

        {/* 4 Rows / Columns of Group Desks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {[1, 2, 3, 4].map(g => (
            <div key={g} className="p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center">
              <span className="font-bold text-slate-800 text-xs block mb-1">Dãy {g}: TỔ {g}</span>
              <p className="text-[11px] text-slate-500">5 Bàn đôi • 10 Ghế ngồi</p>
              <div className="mt-2 text-[10px] text-emerald-700 font-medium bg-emerald-50 py-1 rounded">
                Gần cửa {g === 1 || g === 2 ? 'chính' : 'sổ thoáng'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
