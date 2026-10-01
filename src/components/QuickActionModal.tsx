import React, { useState } from 'react';
import { X, CalendarCheck, AlertTriangle, Award, Sparkles, Check, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { ViolationCategory, ViolationSeverity, RewardCategory, DutyStatus } from '../types';

export const QuickActionModal: React.FC = () => {
  const {
    quickActionModalOpen,
    setQuickActionModalOpen,
    students,
    currentUserRole,
    addViolation,
    addReward,
    addAttendance,
    updateDutyStatus,
    cleaningDuties
  } = useApp();

  const [activeType, setActiveType] = useState<'violation' | 'reward' | 'attendance' | 'duty'>('violation');

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  
  // Violation Form
  const [vioCategory, setVioCategory] = useState<ViolationCategory>('Nề nếp');
  const [vioTitle, setVioTitle] = useState('Đi học muộn');
  const [vioSeverity, setVioSeverity] = useState<ViolationSeverity>('Nhẹ');
  const [vioPenalty, setVioPenalty] = useState<number>(-2);
  const [vioNote, setVioNote] = useState('');
  const [vioRemedy, setVioRemedy] = useState('');

  // Reward Form
  const [rewCategory, setRewCategory] = useState<RewardCategory>('Điểm tốt');
  const [rewTitle, setRewTitle] = useState('Phát biểu xây dựng bài tốt');
  const [rewBonus, setRewBonus] = useState<number>(3);
  const [rewEvidence, setRewEvidence] = useState('');

  // Attendance Form
  const [attStatus, setAttStatus] = useState<'present' | 'absent_excused' | 'absent_unexcused' | 'late'>('late');
  const [attNote, setAttNote] = useState('Đến muộn 10 phút');

  // Duty quick form
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>('Hoàn thành tốt');
  const [dutyNote, setDutyNote] = useState('');

  if (!quickActionModalOpen) return null;

  const handleSaveViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    addViolation({
      studentId: selectedStudentId,
      date: new Date().toISOString().slice(0, 10),
      category: vioCategory,
      title: vioTitle,
      severity: vioSeverity,
      penaltyPoints: -Math.abs(vioPenalty),
      note: vioNote,
      recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
      status: 'Đã ghi nhận',
      remedyAction: vioRemedy,
      isRepeated: false,
    });
    setQuickActionModalOpen(false);
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    addReward({
      studentId: selectedStudentId,
      date: new Date().toISOString().slice(0, 10),
      category: rewCategory,
      title: rewTitle,
      bonusPoints: Math.abs(rewBonus),
      note: rewEvidence,
      recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
      evidence: rewEvidence,
    });

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });

    setQuickActionModalOpen(false);
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    addAttendance({
      studentId: selectedStudentId,
      date: new Date().toISOString().slice(0, 10),
      session: 'Sáng',
      status: attStatus,
      note: attNote,
      recordedBy: `${currentUserRole.name} (${currentUserRole.title})`,
    });
    setQuickActionModalOpen(false);
  };

  const handleSaveDuty = (e: React.FormEvent) => {
    e.preventDefault();
    const todayDuty = cleaningDuties[0];
    if (todayDuty) {
      updateDutyStatus(todayDuty.id, dutyStatus, dutyNote);
    }
    setQuickActionModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Ghi Nhận Nhanh (10 Giây)</h3>
              <p className="text-xs text-slate-300">Tự động đồng bộ vào sổ thi đua, báo cáo tuần & lịch sử cá nhân</p>
            </div>
          </div>
          <button
            onClick={() => setQuickActionModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-4 p-2 bg-slate-100/80 gap-1 border-b border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveType('violation')}
            className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeType === 'violation'
                ? 'bg-white text-rose-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Vi phạm</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('reward')}
            className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeType === 'reward'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Việc tốt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('attendance')}
            className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeType === 'attendance'
                ? 'bg-white text-blue-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Điểm danh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('duty')}
            className={`py-2 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeType === 'duty'
                ? 'bg-white text-amber-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trực nhật</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* 1. VIOLATION FORM */}
          {activeType === 'violation' && (
            <form onSubmit={handleSaveViolation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn Học sinh vi phạm</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} - {s.fullName} (Tổ {s.groupId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân loại</label>
                  <select
                    value={vioCategory}
                    onChange={e => setVioCategory(e.target.value as ViolationCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value="Nề nếp">Nề nếp (Đồng phục, đi muộn, trật tự)</option>
                    <option value="Học tập">Học tập (Bài tập, sách vở, chuẩn bị)</option>
                    <option value="Khác">Khác (Ứng xử, cơ sở vật chất)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ & Điểm trừ</label>
                  <div className="flex gap-2">
                    <select
                      value={vioSeverity}
                      onChange={e => {
                        const sev = e.target.value as ViolationSeverity;
                        setVioSeverity(sev);
                        if (sev === 'Nhẹ') setVioPenalty(-2);
                        if (sev === 'Vừa') setVioPenalty(-4);
                        if (sev === 'Nặng') setVioPenalty(-6);
                        if (sev === 'Rất nặng') setVioPenalty(-10);
                      }}
                      className="w-2/3 px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="Nhẹ">Nhẹ (-2đ)</option>
                      <option value="Vừa">Vừa (-4đ)</option>
                      <option value="Nặng">Nặng (-6đ)</option>
                      <option value="Rất nặng">Rất nặng (-10đ)</option>
                    </select>
                    <input
                      type="number"
                      value={vioPenalty}
                      onChange={e => setVioPenalty(Number(e.target.value))}
                      className="w-1/3 px-2 py-2 border border-slate-300 rounded-lg text-rose-600 font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1.5">Gợi ý lỗi phổ biến (Bấm để chọn nhanh)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { text: 'Đi học muộn', cat: 'Nề nếp', pts: -2 },
                    { text: 'Không làm bài tập', cat: 'Học tập', pts: -2 },
                    { text: 'Làm việc riêng trong giờ', cat: 'Học tập', pts: -2 },
                    { text: 'Không mặc đúng đồng phục', cat: 'Nề nếp', pts: -2 },
                    { text: 'Sử dụng điện thoại trái phép', cat: 'Nề nếp', pts: -4 },
                    { text: 'Không trực nhật đúng nhiệm vụ', cat: 'Nề nếp', pts: -4 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setVioTitle(preset.text);
                        setVioCategory(preset.cat as ViolationCategory);
                        setVioPenalty(preset.pts);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-md text-[11px] text-slate-700 transition-colors"
                    >
                      {preset.text}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết vi phạm</label>
                <input
                  type="text"
                  required
                  value={vioTitle}
                  onChange={e => setVioTitle(e.target.value)}
                  placeholder="Ví dụ: Đi muộn 15 phút, không mang sách bài tập..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biện pháp khắc phục / Nhắc nhở (Tùy chọn)</label>
                <input
                  type="text"
                  value={vioRemedy}
                  onChange={e => setVioRemedy(e.target.value)}
                  placeholder="Ví dụ: Hoàn thành bù bài tập, nhờ tổ trưởng kiểm tra..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Vi Phạm & Trừ Điểm Thi Đua</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. REWARD FORM */}
          {activeType === 'reward' && (
            <form onSubmit={handleSaveReward} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn Học sinh được khen thưởng</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} - {s.fullName} (Tổ {s.groupId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Danh mục</label>
                  <select
                    value={rewCategory}
                    onChange={e => setRewCategory(e.target.value as RewardCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Điểm tốt">Điểm tốt (Điểm 9 - 10)</option>
                    <option value="Giúp đỡ bạn">Giúp đỡ bạn trong học tập</option>
                    <option value="Nhiệm vụ xuất sắc">Nhiệm vụ lớp xuất sắc</option>
                    <option value="Thành tích học tập">Thành tích thi cử / Olympic</option>
                    <option value="Văn nghệ - Thể thao">Văn nghệ - Thể thao</option>
                    <option value="Việc tốt">Việc tốt (Nhặt được của rơi, giúp người)</option>
                    <option value="Tiến bộ vượt bậc">Có tiến bộ vượt bậc</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điểm cộng thi đua</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={rewBonus}
                    onChange={e => setRewBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-emerald-600 font-bold text-center"
                  />
                </div>
              </div>

              {/* Quick Presets for Rewards */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1.5">Gợi ý việc tốt (Bấm để chọn nhanh)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { text: 'Đạt điểm 10 miệng môn Toán', cat: 'Điểm tốt', pts: 3 },
                    { text: 'Nhặt được của rơi trả lại bạn', cat: 'Việc tốt', pts: 5 },
                    { text: 'Tích cực kèm bạn học yếu', cat: 'Giúp đỡ bạn', pts: 4 },
                    { text: 'Đạt giải thể thao cấp trường', cat: 'Văn nghệ - Thể thao', pts: 6 },
                    { text: 'Hoàn thành xuất sắc trực nhật', cat: 'Nhiệm vụ xuất sắc', pts: 3 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRewTitle(preset.text);
                        setRewCategory(preset.cat as RewardCategory);
                        setRewBonus(preset.pts);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-md text-[11px] text-slate-700 transition-colors"
                    >
                      {preset.text}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung thành tích / Việc tốt</label>
                <input
                  type="text"
                  required
                  value={rewTitle}
                  onChange={e => setRewTitle(e.target.value)}
                  placeholder="Ví dụ: Đạt điểm 10 kiểm tra, đại diện lớp thi cờ vua..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Minh chứng / Ghi chú</label>
                <input
                  type="text"
                  value={rewEvidence}
                  onChange={e => setRewEvidence(e.target.value)}
                  placeholder="Ví dụ: Sổ đầu bài, lời khen cô Nga..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Khen Thưởng & Tặng Điểm Thi Đua 🎉</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. ATTENDANCE QUICK */}
          {activeType === 'attendance' && (
            <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn Học sinh</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} - {s.fullName} (Tổ {s.groupId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Trạng thái chuyên cần hôm nay</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttStatus('late')}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                      attStatus === 'late' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <span>Đi muộn</span>
                    <span className="text-[10px] text-amber-600">-1đ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttStatus('absent_excused')}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                      attStatus === 'absent_excused' ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <span>Vắng có phép</span>
                    <span className="text-[10px] text-blue-600">-0.5đ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttStatus('absent_unexcused')}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                      attStatus === 'absent_unexcused' ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <span>Vắng không phép</span>
                    <span className="text-[10px] text-rose-600">-3đ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttStatus('present')}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                      attStatus === 'present' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200'
                    }`}
                  >
                    <span>Có mặt</span>
                    <span className="text-[10px] text-emerald-600">Đầy đủ</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú lý do</label>
                <input
                  type="text"
                  value={attNote}
                  onChange={e => setAttNote(e.target.value)}
                  placeholder="Ví dụ: Phụ huynh gọi điện báo ốm, hỏng xe..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Chuyên Cần</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. DUTY QUICK */}
          {activeType === 'duty' && (
            <form onSubmit={handleSaveDuty} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">Trực nhật hôm nay: Tổ {cleaningDuties[0]?.groupId || 1}</span>
                  <span className="text-amber-700 text-[11px]">Xác nhận nhanh trong 10 giây</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">Lớp phó Lao động hoặc GVCN chỉ cần chọn 1 nút để chấm điểm vệ sinh lớp.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Đánh giá vệ sinh hôm nay</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDutyStatus('Hoàn thành tốt')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      dutyStatus === 'Hoàn thành tốt' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-400' : 'border-slate-200'
                    }`}
                  >
                    <div className="text-emerald-700 font-bold">✨ Hoàn thành tốt</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">+2 điểm thi đua tổ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDutyStatus('Hoàn thành')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      dutyStatus === 'Hoàn thành' ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-400' : 'border-slate-200'
                    }`}
                  >
                    <div className="text-blue-700 font-bold">👍 Đạt yêu cầu</div>
                    <div className="text-[10px] text-blue-600 mt-0.5">Giữ nguyên điểm</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDutyStatus('Chưa hoàn thành')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      dutyStatus === 'Chưa hoàn thành' ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-400' : 'border-slate-200'
                    }`}
                  >
                    <div className="text-amber-700 font-bold">⚠️ Chưa sạch</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">-2 điểm thi đua tổ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDutyStatus('Không thực hiện')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      dutyStatus === 'Không thực hiện' ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-400' : 'border-slate-200'
                    }`}
                  >
                    <div className="text-rose-700 font-bold">❌ Bỏ trực nhật</div>
                    <div className="text-[10px] text-rose-600 mt-0.5">-5 điểm thi đua tổ</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú nhận xét</label>
                <input
                  type="text"
                  value={dutyNote}
                  onChange={e => setDutyNote(e.target.value)}
                  placeholder="Ví dụ: Bảng sạch, kê bàn ghế ngay ngắn, đã đổ rác..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Xác Nhận Đánh Giá Trực Nhật</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
