import React, { useState } from 'react';
import {
  User,
  Award,
  AlertTriangle,
  Send,
  Check,
  Clock,
  Sparkles,
  Trophy,
  Star,
  MessageSquare,
  Key,
  ShieldCheck,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';

export const StudentPortalView: React.FC = () => {
  const {
    students,
    accounts,
    currentUserRole,
    studentScores,
    violations,
    rewards,
    evaluations,
    addEvaluation,
    setSelectedStudentIdForDetail,
    setChangePasswordModalOpen,
    setChangeAvatarModalOpen,
    classInfo,
    seatingChart,
  } = useApp();

  // Pick the student corresponding to current student role or ban can su, or matched by name, or default to first student
  const student = students.find(s => s.id === currentUserRole.studentId) ||
    students.find(s => s.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim()) ||
    students[0];
  const stats = studentScores[student.id];

  const mySeat = seatingChart.find(s => s.studentId === student.id);
  const studentViolations = violations.filter(v => v.studentId === student.id);
  const studentRewards = rewards.filter(r => r.studentId === student.id);
  const myEvaluations = evaluations.filter(e => e.studentId === student.id);

  // Form states for self-evaluation
  const [goodDeeds, setGoodDeeds] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goodDeeds && !weaknesses) return;

    addEvaluation({
      studentId: student.id,
      week: 4,
      goodDeeds,
      weaknesses,
      nextWeekPlan,
      leaderRemark: 'Đang chờ Tổ trưởng duyệt & nhận xét...',
      teacherRemark: '',
    });

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });

    setSubmitted(true);
    setGoodDeeds('');
    setWeaknesses('');
    setNextWeekPlan('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Student Greeting Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => {
                const matchingAcc = accounts.find(a => a.studentId === student.id || a.studentCode === student.studentCode);
                setChangeAvatarModalOpen(true, matchingAcc || null, student);
              }}
              title="Nhấn để đổi ảnh đại diện (Lưu Google Drive)"
            >
              <img
                src={student.avatar}
                alt={student.fullName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-300 shadow-md group-hover:brightness-90 transition-all"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-white shadow">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Góc Cá Nhân Học Sinh
                </span>
                <span className="text-slate-300 text-xs font-semibold">Tổ {student.groupId}</span>
                {mySeat ? (
                  <span className="bg-teal-500/30 border border-teal-400/40 text-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    Chỗ ngồi: Dãy {mySeat.column} - Bàn {mySeat.row} ({mySeat.deskPosition === 1 ? 'Ghế Trái' : 'Ghế Phải'})
                  </span>
                ) : (
                  <span className="bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Chưa xếp chỗ ngồi
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Xin chào, {student.fullName}!
              </h2>
              <p className="text-slate-300 text-xs mt-0.5">
                Lớp {classInfo.className} • Mã số: {student.studentCode} • Chức vụ: {student.roleInClass} • GVCN: {classInfo.homeroomTeacher}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const matchingAcc = accounts.find(a => a.studentId === student.id || a.studentCode === student.studentCode);
                    setChangeAvatarModalOpen(true, matchingAcc || null, student);
                  }}
                  className="px-3 py-1 bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-indigo-300/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-200" />
                  Đổi ảnh đại diện (Google Drive)
                </button>
                <button
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="px-3 py-1 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Key className="w-3.5 h-3.5 text-indigo-300" />
                  Đổi mật khẩu / PIN cá nhân
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[140px] flex flex-col justify-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Điểm thi đua</span>
            <div className="text-3xl font-black text-emerald-400 my-0.5">
              {stats?.totalScore.toFixed(1) || '100'}đ
            </div>
            <span className="text-xs text-slate-200">
              Hạng #{stats?.rankInClass || 1} Lớp • #{stats?.rankInGroup || 1} Tổ
            </span>
          </div>
        </div>

        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Two columns: Self Reflection Form & Personal Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Weekly Self Reflection Form */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Bản Tự Đánh Giá Cuối Tuần (Tuần 4)
              </h3>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Học sinh tự nhìn nhận ưu điểm, khuyết điểm để gửi Tổ trưởng và Cô giáo chủ nhiệm
            </p>
          </div>

          {submitted && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Em đã nộp bản tự đánh giá thành công! Cô giáo và Tổ trưởng sẽ ghi nhận và gửi lời động viên.</span>
            </div>
          )}

          <form onSubmit={handleSubmitEvaluation} className="space-y-3.5">
            <div>
              <label className="block font-semibold text-emerald-800 mb-1">
                1. Những điều em đã làm tốt trong tuần qua (Học tập, giúp bạn, trực nhật...)
              </label>
              <textarea
                rows={2}
                required
                value={goodDeeds}
                onChange={e => setGoodDeeds(e.target.value)}
                placeholder="Ví dụ: Đạt điểm 10 môn Toán, trực nhật sạch sẽ, giúp bạn giải bài khó..."
                className="w-full p-2.5 bg-emerald-50/30 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-amber-800 mb-1">
                2. Những điều em thấy mình chưa làm tốt (Đi muộn, quên bài tập, mất trật tự...)
              </label>
              <textarea
                rows={2}
                value={weaknesses}
                onChange={e => setWeaknesses(e.target.value)}
                placeholder="Ví dụ: Có 1 hôm ngủ quên đi muộn 5 phút, chưa thuộc hết bài Lịch Sử..."
                className="w-full p-2.5 bg-amber-50/30 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-blue-800 mb-1">
                3. Mục tiêu và kế hoạch em sẽ cải thiện trong tuần tới
              </label>
              <textarea
                rows={2}
                value={nextWeekPlan}
                onChange={e => setNextWeekPlan(e.target.value)}
                placeholder="Ví dụ: Đi học đúng giờ, chuẩn bị bài đầy đủ trước khi đến lớp..."
                className="w-full p-2.5 bg-blue-50/30 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Gửi Bản Tự Đánh Giá Cho GVCN & Tổ Trưởng</span>
            </button>
          </form>
        </div>

        {/* Right: Personal History Cards */}
        <div className="space-y-4 text-xs">
          {/* Rewards Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Việc Tốt & Khen Thưởng Của Em ({studentRewards.length})
              </h3>
              <span className="text-emerald-700 font-bold">+{stats?.totalRewardPoints || 0}đ</span>
            </div>

            {studentRewards.length === 0 ? (
              <p className="text-slate-400 italic py-2">Chưa có ghi nhận khen thưởng trong tuần này.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {studentRewards.map(r => (
                  <div key={r.id} className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <strong className="text-emerald-950 block">{r.title}</strong>
                      <span className="text-[10px] text-slate-500">{r.category} • {r.date}</span>
                    </div>
                    <span className="text-emerald-700 font-black text-xs">+{r.bonusPoints}đ</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Violations Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Vi Phạm & Tiến Trình Khắc Phục ({studentViolations.length})
              </h3>
              <span className="text-rose-600 font-bold">{stats?.totalViolationPenalty || 0}đ</span>
            </div>

            {studentViolations.length === 0 ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-medium">
                ✨ Tuyệt vời! Em không có vi phạm nào trong tuần. Tiếp tục phát huy nhé!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {studentViolations.map(v => (
                  <div key={v.id} className="p-2.5 bg-rose-50/40 rounded-xl border border-rose-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900">{v.title}</strong>
                      <span className="text-rose-600 font-bold">{v.penaltyPoints}đ</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{v.date}</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-rose-200 font-semibold text-slate-700">
                        {v.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
