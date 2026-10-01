import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  User, 
  Phone, 
  MapPin, 
  Users, 
  Shield, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { Student } from '../types';
import { useApp } from '../context/AppContext';
import { isHomeroomTeacher } from '../utils/permissionUtils';
import { getRoleRank, normalizeStudentRole } from '../utils/roleHierarchy';

interface EditStudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { updateStudent, currentUserRole, students } = useApp();

  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [groupId, setGroupId] = useState<number>(1);
  const [roleInClass, setRoleInClass] = useState('Thành viên');
  const [customRole, setCustomRole] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isGVCN = isHomeroomTeacher(currentUserRole.role);

  // Danh sách chức vụ tương thích chuẩn Điều lệ trường học
  const roleOptions = [
    { value: 'Thành viên', label: 'Thành viên (Học sinh bình thường)' },
    { value: 'Lớp trưởng', label: '👑 Lớp trưởng (1 người đứng đầu toàn lớp)' },
    { value: 'Lớp phó Học tập', label: '⭐ Lớp phó Học tập' },
    { value: 'Lớp phó Kỷ luật', label: '⭐ Lớp phó Kỷ luật / Nề nếp' },
    { value: 'Lớp phó Lao động', label: '⭐ Lớp phó Lao động / Vệ sinh' },
    { value: 'Lớp phó Văn thể mỹ', label: '⭐ Lớp phó Văn thể mỹ' },
    { value: 'Bí thư Chi đoàn', label: '🎖️ Bí thư Chi đoàn (1 người toàn lớp)' },
    { value: 'Phó Bí thư', label: '🎖️ Phó Bí thư Chi đoàn' },
    { value: 'Thủ quỹ', label: '💰 Thủ quỹ lớp (1 người toàn lớp)' },
    { value: `Tổ trưởng Tổ ${groupId}`, label: `🔰 Tổ trưởng Tổ ${groupId} (1 người phụ trách tổ ${groupId})` },
    { value: `Tổ phó Tổ ${groupId}`, label: `🎗️ Tổ phó Tổ ${groupId} (1 người phụ trách tổ ${groupId})` },
    { value: 'Ủy viên BCH Chi đoàn', label: 'Ủy viên BCH Chi đoàn' },
    { value: 'Khác', label: 'Chức vụ khác...' }
  ];

  // Tìm học sinh đang giữ chức vụ hiện tại để thông tin minh bạch
  const currentMonitor = students.find(s => s.roleInClass.includes('Lớp trưởng') && s.id !== student?.id);
  const currentGroupLeader = students.find(s => 
    (s.roleInClass.includes('Tổ trưởng') || s.roleInClass === 'tt') && 
    s.groupId === groupId && 
    s.id !== student?.id
  );

  useEffect(() => {
    if (student) {
      setFullName(student.fullName || '');
      setStudentCode(student.studentCode || '');
      setGender(student.gender || 'Nam');
      setDateOfBirth(student.dateOfBirth || '');
      const initG = student.groupId || 1;
      setGroupId(initG);
      
      const normalized = normalizeStudentRole(student.roleInClass, initG);
      const isPreset = roleOptions.some(opt => opt.value === normalized || opt.value === student.roleInClass);

      if (isPreset) {
        setRoleInClass(normalized);
        setCustomRole('');
      } else {
        setRoleInClass('Khác');
        setCustomRole(student.roleInClass || '');
      }

      setPhone(student.phone || '');
      setParentName(student.parentName || '');
      setParentPhone(student.parentPhone || '');
      setAddress(student.address || '');
      setTeacherNotes(student.teacherNotes || '');
      setSavedSuccess(false);
      setErrorMsg('');
    }
  }, [student, isOpen]);

  // Tự động chuyển tên chức vụ Tổ khi đổi Tổ
  const handleGroupChange = (newG: number) => {
    setGroupId(newG);
    if (roleInClass.startsWith('Tổ trưởng Tổ')) {
      setRoleInClass(`Tổ trưởng Tổ ${newG}`);
    } else if (roleInClass.startsWith('Tổ phó Tổ')) {
      setRoleInClass(`Tổ phó Tổ ${newG}`);
    }
  };

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên học sinh.');
      return;
    }
    if (!studentCode.trim()) {
      setErrorMsg('Vui lòng nhập mã học sinh.');
      return;
    }

    const rawRole = roleInClass === 'Khác' ? (customRole.trim() || 'Thành viên') : roleInClass;
    const finalRole = normalizeStudentRole(rawRole, Number(groupId));

    const updated: Student = {
      ...student,
      fullName: fullName.trim(),
      studentCode: studentCode.trim().toUpperCase(),
      gender,
      dateOfBirth,
      groupId: Number(groupId),
      roleInClass: finalRole,
      phone: phone.trim(),
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      address: address.trim(),
      teacherNotes: teacherNotes.trim(),
    };

    updateStudent(updated);
    setSavedSuccess(true);
    setErrorMsg('');

    setTimeout(() => {
      setSavedSuccess(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Điều Chỉnh Thông Tin Học Sinh</h3>
              <p className="text-xs text-emerald-100">
                Sửa họ tên, đổi tổ, cập nhật chức vụ, SĐT & thông tin gia đình
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {savedSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã cập nhật thông tin học sinh thành công! Dữ liệu đã lưu vào hệ thống.</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 flex items-center gap-2 text-xs font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Group: Định danh học sinh */}
          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Thông tin cơ bản & Định danh</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isGVCN}
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isGVCN}
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value)}
                  placeholder="HS1101"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giới tính</label>
                <select
                  disabled={!isGVCN}
                  value={gender}
                  onChange={e => setGender(e.target.value as 'Nam' | 'Nữ')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày sinh (YYYY-MM-DD)</label>
                <div className="relative">
                  <input
                    type="date"
                    disabled={!isGVCN}
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group: Tổ & Chức vụ (quan trọng cho sai tổ) */}
          <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200/80">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. Phân bổ Tổ thi đua & Chức vụ trong lớp</span>
              <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Sửa sai tổ tại đây
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Tổ thi đua <span className="text-emerald-700 font-bold">(Hiện tại: Tổ {groupId})</span>
                </label>
                <select
                  disabled={!isGVCN}
                  value={groupId}
                  onChange={e => handleGroupChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value={1}>Tổ 1</option>
                  <option value={2}>Tổ 2</option>
                  <option value={3}>Tổ 3</option>
                  <option value={4}>Tổ 4</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Chọn đúng tổ nếu học sinh trước đó bị phân nhầm tổ. Điểm thi đua của tổ sẽ tự động liên kết.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Chức vụ trong lớp</label>
                <select
                  disabled={!isGVCN}
                  value={roleInClass}
                  onChange={e => setRoleInClass(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 font-medium text-slate-800"
                >
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {roleInClass === 'Khác' && (
                  <input
                    type="text"
                    disabled={!isGVCN}
                    value={customRole}
                    onChange={e => setCustomRole(e.target.value)}
                    placeholder="Nhập tên chức vụ..."
                    className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                )}

                {/* Phản hồi trực quan về tính độc quyền chức danh */}
                {roleInClass.includes('Lớp trưởng') && currentMonitor && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                    ⚠️ Lớp trưởng hiện tại là <strong>{currentMonitor.fullName}</strong>. Khi lưu, {currentMonitor.fullName} sẽ tự động trở về "Thành viên" vì mỗi lớp chỉ có 1 Lớp trưởng duy nhất.
                  </p>
                )}

                {roleInClass.includes('Tổ trưởng') && currentGroupLeader && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                    ⚠️ Tổ trưởng Tổ {groupId} hiện tại là <strong>{currentGroupLeader.fullName}</strong>. Khi lưu, {currentGroupLeader.fullName} sẽ trở về "Thành viên" vì mỗi tổ có 1 Tổ trưởng duy nhất. Cán sự các tổ khác và Lớp trưởng hoàn toàn không bị ảnh hưởng.
                  </p>
                )}
              </div>
            </div>

            {/* Thông tin quy tắc phân công chuẩn */}
            <div className="flex items-start gap-2 p-2.5 bg-blue-50/80 rounded-lg border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Quy tắc thứ bậc chuẩn:</strong> Lớp có <strong>1 Lớp trưởng</strong> toàn diện; mỗi tổ có <strong>1 Tổ trưởng</strong> và <strong>1 Tổ phó</strong>. Khi phân công, hệ thống tự động giữ trật tự ổn định và không làm xáo trộn các chức danh của tổ khác.
              </span>
            </div>
          </div>

          {/* Group: Liên lạc & Gia đình */}
          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>3. Thông tin liên lạc & Gia đình</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SĐT học sinh</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ tên phụ huynh</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  placeholder="Nguyễn Văn B (Bố) / Trần Thị C (Mẹ)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SĐT liên hệ phụ huynh</label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={e => setParentPhone(e.target.value)}
                  placeholder="0988 123 456"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Số nhà, đường/thôn, xã/phường, quận/huyện..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Group: Ghi chú của GVCN */}
          <div className="space-y-2 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>4. Ghi chú nội bộ của GVCN (Bảo mật)</span>
              </h4>
              <span className="text-[10px] text-amber-800">Chỉ GVCN xem được</span>
            </div>
            <textarea
              rows={3}
              value={teacherNotes}
              onChange={e => setTeacherNotes(e.target.value)}
              placeholder="Nhập ghi chú đặc biệt về tính cách, gia cảnh, năng khiếu, học lực, cần nhắc nhở..."
              className="w-full p-2.5 bg-white border border-amber-300/80 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {!isGVCN && (
            <p className="text-xs text-slate-500 italic">
              * Lưu ý: Tài khoản hiện tại không phải là GVCN nên chỉ có quyền cập nhật SĐT, Phụ huynh và Địa chỉ.
            </p>
          )}

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
