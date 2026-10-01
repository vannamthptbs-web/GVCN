import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Phone,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  LayoutGrid,
  List,
  Sparkles,
  Award,
  FileSpreadsheet,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Key,
  Camera
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { ExcelStudentModal } from '../ExcelStudentModal';
import { EditStudentModal } from '../EditStudentModal';
import { generateStudentTemplateExcel } from '../../utils/excelImportExport';
import {
  compareStudentsByGroupHierarchy,
  compareStudentsByRoleHierarchy,
  compareStudentsByName,
  normalizeStudentRole
} from '../../utils/roleHierarchy';
import { canManageStudentMaster } from '../../utils/permissionUtils';

export const StudentsView: React.FC = () => {
  const {
    students,
    accounts,
    studentScores,
    setSelectedStudentIdForDetail,
    addStudent,
    updateStudent,
    deleteStudent,
    batchDeleteStudents,
    clearAllStudents,
    currentUserRole,
    classInfo,
    setChangeAvatarModalOpen,
  } = useApp();

  const canEditStudent = canManageStudentMaster(currentUserRole.role);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | 'all'>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAttentionOnly, setFilterAttentionOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Bulk actions and Excel modal state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  // Modal Clear All Students state
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingStudents, setIsClearingStudents] = useState(false);

  // Modal Add Student state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newCode, setNewCode] = useState(`HS11${(students.length + 1).toString().padStart(2, '0')}`);
  const [newGender, setNewGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [newDob, setNewDob] = useState('');
  const [newGroupId, setNewGroupId] = useState<number>(1);
  const [newRoleInClass, setNewRoleInClass] = useState('Thành viên');
  const [newUsername, setNewUsername] = useState('');
  const [newPin, setNewPin] = useState('123');
  const [newPhone, setNewPhone] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTeacherNotes, setNewTeacherNotes] = useState('');

  const handleConfirmClearAllStudents = async () => {
    setIsClearingStudents(true);
    try {
      const res = await clearAllStudents();
      if (res.success) {
        setBulkActionFeedback(`Đã xóa sạch thành công ${res.count} học sinh khỏi danh sách lớp!`);
        setIsClearAllModalOpen(false);
        setTimeout(() => setBulkActionFeedback(null), 4000);
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('Lỗi xóa danh sách học sinh: ' + (err.message || ''));
    } finally {
      setIsClearingStudents(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.parentName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchGroup = selectedGroup === 'all' || s.groupId === selectedGroup;
      const matchRole =
        filterRole === 'all' ||
        (filterRole === 'cadre' ? s.roleInClass !== 'Thành viên' : s.roleInClass === filterRole);

      const stats = studentScores[s.id];
      const matchAttention = !filterAttentionOnly || (stats && stats.needsAttention);

      return matchSearch && matchGroup && matchRole && matchAttention;
    });
  }, [students, searchTerm, selectedGroup, filterRole, filterAttentionOnly, studentScores]);

  // Sorting state
  const [sortBy, setSortBy] = useState<'hierarchy_group' | 'hierarchy_class' | 'studentCode' | 'name' | 'group' | 'score'>('hierarchy_group');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'hierarchy_group' | 'hierarchy_class' | 'studentCode' | 'name' | 'group' | 'score') => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection(field === 'score' ? 'desc' : 'asc');
    }
  };

  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    // When filtering exclusively for cadres, always display according to strict class hierarchy
    if (filterRole === 'cadre') {
      return list.sort((a, b) => compareStudentsByRoleHierarchy(a, b));
    }

    return list.sort((a, b) => {
      let res = 0;
      if (sortBy === 'hierarchy_group') {
        res = compareStudentsByGroupHierarchy(a, b);
      } else if (sortBy === 'hierarchy_class') {
        res = compareStudentsByRoleHierarchy(a, b);
      } else if (sortBy === 'studentCode') {
        res = a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true });
      } else if (sortBy === 'name') {
        res = compareStudentsByName(a, b);
      } else if (sortBy === 'group') {
        if (a.groupId !== b.groupId) {
          res = a.groupId - b.groupId;
        } else {
          res = compareStudentsByGroupHierarchy(a, b);
        }
      } else if (sortBy === 'score') {
        const scoreA = studentScores[a.id]?.totalScore ?? 0;
        const scoreB = studentScores[b.id]?.totalScore ?? 0;
        res = scoreB - scoreA;
      }
      return sortDirection === 'desc' ? -res : res;
    });
  }, [filteredStudents, sortBy, sortDirection, filterRole, studentScores]);

  const allFilteredSelected = sortedStudents.length > 0 && sortedStudents.every(s => selectedStudentIds.includes(s.id));
  const someFilteredSelected = sortedStudents.some(s => selectedStudentIds.includes(s.id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all currently filtered students
      const filteredIdSet = new Set(sortedStudents.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      // Select all currently filtered students
      const combined = new Set([...selectedStudentIds, ...sortedStudents.map(s => s.id)]);
      setSelectedStudentIds(Array.from(combined));
    }
  };

  const toggleSelectStudent = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkDelete = () => {
    if (selectedStudentIds.length === 0) return;
    const res = batchDeleteStudents(selectedStudentIds);
    if (res.success) {
      setBulkActionFeedback(res.message);
      setSelectedStudentIds([]);
      setIsBulkDeleteModalOpen(false);
      setTimeout(() => setBulkActionFeedback(null), 3500);
    }
  };

  const handleBulkChangeGroup = (targetGroupId: number) => {
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;
    selectedStudentIds.forEach(id => {
      const s = students.find(item => item.id === id);
      if (s) {
        updateStudent({ ...s, groupId: targetGroupId });
      }
    });
    setBulkActionFeedback(`Đã chuyển thành công ${count} học sinh sang Tổ ${targetGroupId}!`);
    setTimeout(() => setBulkActionFeedback(null), 3500);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName) return;
    const normalizedRole = normalizeStudentRole(newRoleInClass, newGroupId);
    addStudent({
      fullName: newFullName,
      studentCode: newCode,
      gender: newGender,
      dateOfBirth: newDob,
      groupId: newGroupId,
      roleInClass: normalizedRole,
      phone: newPhone,
      parentName: newParentName || `Phụ huynh ${newFullName}`,
      parentPhone: newParentPhone,
      address: newAddress,
      avatar: newGender === 'Nam' 
        ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      teacherNotes: newTeacherNotes,
      customUsername: newUsername.trim() || undefined,
      customPin: newPin.trim() || undefined,
    });
    setIsAddModalOpen(false);
    // Reset form
    setNewFullName('');
    setNewCode(`HS11${(students.length + 2).toString().padStart(2, '0')}`);
    setNewUsername('');
    setNewPin('123');
    setNewPhone('');
    setNewParentName('');
    setNewParentPhone('');
    setNewAddress('');
    setNewTeacherNotes('');
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Danh Sách Học Sinh Lớp {classInfo.className}</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {students.length} Học sinh
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý hồ sơ điện tử, thông tin phụ huynh và tiến trình thi đua của từng em
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Dạng bảng chi tiết"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Dạng thẻ lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Export to Excel Button */}
          <button
            onClick={() => generateStudentTemplateExcel(students, classInfo.className)}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-2xs flex items-center gap-1.5"
            title="Xuất danh sách học sinh ra file Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {/* Clear All Students Button (GVCN only) */}
          {currentUserRole.role === 'gvcn' && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 active:scale-95 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
              title="Xóa sạch toàn bộ danh sách học sinh và dữ liệu liên quan để làm lại từ đầu"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Xóa sạch DS</span>
            </button>
          )}

          {/* Import / Update from Excel Button */}
          {(currentUserRole.role === 'gvcn' || currentUserRole.role === 'admin' || currentUserRole.role === 'can_bo_lop') && (
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 active:scale-95 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
              title="Nhập hoặc cập nhật danh sách học sinh bằng file Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Nhập / Cập nhật Excel</span>
            </button>
          )}

          {/* Add Student Button (GVCN only) */}
          {currentUserRole.role === 'gvcn' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm học sinh</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học sinh, mã HS, phụ huynh..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 focus:bg-white rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium"
            />
          </div>

          {/* Group filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap shadow-2xs ${
                selectedGroup === 'all' 
                  ? 'bg-slate-900 text-white font-extrabold shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-bold'
              }`}
            >
              Tất cả tổ ({students.length})
            </button>
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap shadow-2xs ${
                  selectedGroup === g 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-sm ring-1 ring-emerald-500' 
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-bold'
                }`}
              >
                Tổ {g} ({students.filter(s => s.groupId === g).length})
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Chips and Sort Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 text-[11px] font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Lọc nhanh:
            </span>

            <button
              onClick={() => setFilterAttentionOnly(!filterAttentionOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                filterAttentionOnly
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Cần quan tâm</span>
            </button>

            <button
              onClick={() => setFilterRole(filterRole === 'cadre' ? 'all' : 'cadre')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterRole === 'cadre'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Ban cán sự & Tổ trưởng
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-1.5 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Thứ tự:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="hierarchy_group">Tổ & Cán sự tổ (Mặc định chuẩn)</option>
              <option value="hierarchy_class">Chức vụ toàn lớp (Lớp trưởng → Tổ trưởng)</option>
              <option value="studentCode">Mã học sinh</option>
              <option value="name">Tên học sinh (A - Z)</option>
              <option value="score">Điểm thi đua</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-white transition-colors"
              title={sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}
            >
              {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast/Banner */}
      {bulkActionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>{bulkActionFeedback}</span>
          </div>
          <button onClick={() => setBulkActionFeedback(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            ✕
          </button>
        </div>
      )}

      {/* Sticky Bulk Action Bar */}
      {canEditStudent && selectedStudentIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg">
              Đã chọn {selectedStudentIds.length} học sinh
            </span>
            <span className="text-xs text-slate-300 hidden md:inline">
              Áp dụng thao tác hàng loạt cho các em đã chọn
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Group assignment */}
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3 text-emerald-400" /> Chuyển tổ:
              </span>
              {[1, 2, 3, 4].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleBulkChangeGroup(g)}
                  className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg font-bold transition-colors"
                  title={`Chuyển các học sinh đã chọn sang Tổ ${g}`}
                >
                  Tổ {g}
                </button>
              ))}
            </div>

            {/* Bulk Delete Button (GVCN only) */}
            {currentUserRole.role === 'gvcn' && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hàng loạt ({selectedStudentIds.length})</span>
              </button>
            )}

            {/* Deselect button */}
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition-colors"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Student List View: Table or Grid */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
          Không tìm thấy học sinh nào phù hợp với điều kiện tìm kiếm.
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  {canEditStudent && (
                    <th className="py-3.5 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                        title={allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả học sinh đang hiển thị'}
                      >
                        {allFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : someFilteredSelected ? (
                          <MinusSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                        )}
                      </button>
                    </th>
                  )}
                  <th
                    className="py-3.5 px-3 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('studentCode')}
                    title="Bấm để sắp xếp theo Mã HS"
                  >
                    <div className="flex items-center gap-1">
                      <span>Mã HS</span>
                      {sortBy === 'studentCode' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('name')}
                    title="Bấm để sắp xếp theo Tên HS"
                  >
                    <div className="flex items-center gap-1">
                      <span>Họ và Tên</span>
                      {sortBy === 'name' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('group')}
                    title="Bấm để sắp xếp theo Tổ"
                  >
                    <div className="flex items-center gap-1">
                      <span>Tổ</span>
                      {sortBy === 'group' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('hierarchy_class')}
                    title="Bấm để sắp xếp theo Cấp bậc Chức vụ"
                  >
                    <div className="flex items-center gap-1">
                      <span>Chức vụ</span>
                      {sortBy === 'hierarchy_class' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('score')}
                    title="Bấm để sắp xếp theo Điểm Thi Đua"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Điểm Thi Đua</span>
                      {sortBy === 'score' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 transition-colors"
                    onClick={() => handleSort('score')}
                    title="Bấm để sắp xếp theo Hạng Lớp"
                  >
                    <span>Hạng Lớp</span>
                  </th>
                  <th className="py-3.5 px-4">Liên hệ Phụ huynh</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.map(student => {
                  const stats = studentScores[student.id];
                  const isAttention = stats?.needsAttention;
                  const isSelected = selectedStudentIds.includes(student.id);

                  return (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedStudentIdForDetail(student.id)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected ? 'bg-emerald-50/70' : 'hover:bg-emerald-50/30'
                      }`}
                    >
                      {canEditStudent && (
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => toggleSelectStudent(student.id, e)}
                            className="p-1 rounded hover:bg-slate-100 transition-colors"
                            title={isSelected ? 'Bỏ chọn học sinh này' : 'Chọn học sinh này'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-3 font-mono font-bold text-slate-500">
                        {student.studentCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="relative group/avatar shrink-0 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const matchingAcc = accounts.find(a => a.studentId === student.id || a.studentCode === student.studentCode);
                              setChangeAvatarModalOpen(true, matchingAcc || null, student);
                            }}
                            title="Nhấp để đổi ảnh đại diện cho học sinh này"
                          >
                            <img
                              src={student.avatar}
                              alt={student.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 group-hover/avatar:ring-2 group-hover/avatar:ring-indigo-500 transition-all"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Camera className="w-3 h-3" />
                            </div>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {student.fullName}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {student.gender} • {student.dateOfBirth}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                          Tổ {student.groupId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                            student.roleInClass.includes('Lớp trưởng')
                              ? 'bg-blue-100 text-blue-800'
                              : student.roleInClass.includes('Lớp phó')
                              ? 'bg-indigo-100 text-indigo-800'
                              : student.roleInClass.includes('Tổ trưởng')
                              ? 'bg-purple-100 text-purple-800'
                              : 'text-slate-600'
                          }`}
                        >
                          {student.roleInClass}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-extrabold text-sm text-emerald-600">
                          {stats?.totalScore.toFixed(1) || '100'}đ
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-700">
                          #{stats?.rankInClass || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{student.parentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{student.parentPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAttention ? (
                          <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Cần lưu ý
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Bình thường
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedStudentIdForDetail(student.id)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-800 rounded-lg text-xs font-bold transition-all shadow-2xs"
                          >
                            Hồ sơ chi tiết
                          </button>
                          
                          {canEditStudent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStudent(student);
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 hover:text-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 transition-all shadow-2xs flex items-center gap-1"
                              title="Điều chỉnh thông tin, đổi tổ, chức vụ, SĐT..."
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>
                          )}

                          {currentUserRole.role === 'gvcn' && (
                            deleteConfirmId === student.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-300 shadow-2xs">
                                <span className="text-[11px] text-rose-800 font-extrabold px-1">Xóa HS?</span>
                                <button
                                  onClick={() => {
                                    deleteStudent(student.id);
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px]"
                                >
                                  Xóa
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(student.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Xóa học sinh này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedStudents.map(student => {
            const stats = studentScores[student.id];
            const isAttention = stats?.needsAttention;
            const isSelected = selectedStudentIds.includes(student.id);

            return (
              <div
                key={student.id}
                onClick={() => setSelectedStudentIdForDetail(student.id)}
                className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {canEditStudent && (
                        <button
                          type="button"
                          onClick={(e) => toggleSelectStudent(student.id, e)}
                          className="p-1 -ml-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title={isSelected ? 'Bỏ chọn' : 'Chọn học sinh'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      )}
                      <div
                        className="relative group/avatar shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          const matchingAcc = accounts.find(a => a.studentId === student.id || a.studentCode === student.studentCode);
                          setChangeAvatarModalOpen(true, matchingAcc || null, student);
                        }}
                        title="Nhấp để đổi ảnh đại diện cho học sinh này"
                      >
                        <img
                          src={student.avatar}
                          alt={student.fullName}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-xs group-hover/avatar:ring-2 group-hover/avatar:ring-indigo-500 transition-all"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/45 rounded-xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Camera className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-700 transition-colors">
                          {student.fullName}
                        </h4>
                        <p className="text-[11px] text-slate-400">{student.studentCode} • Tổ {student.groupId}</p>
                      </div>
                    </div>

                    <span className="font-black text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      {stats?.totalScore.toFixed(1)}đ
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{student.roleInClass}</span>
                    <div className="flex items-center gap-1.5">
                      {canEditStudent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStudent(student);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-900 border border-amber-300 rounded-lg font-bold text-xs flex items-center gap-1 transition-all shadow-2xs"
                          title="Sửa thông tin học sinh này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                      )}
                      <span className="font-bold text-slate-700">Hạng #{stats?.rankInClass} Lớp</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
                    PH: {student.parentName} ({student.parentPhone})
                  </p>
                </div>

                {isAttention && (
                  <div className="mt-3 p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-medium flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    <span className="truncate">{stats.attentionReasons?.[0] || 'Cần chú ý'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Thêm Học Sinh Mới Vào Lớp {classInfo.className}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Học Sinh</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={newGender}
                    onChange={e => setNewGender(e.target.value as 'Nam' | 'Nữ')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Hoàng"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân vào Tổ</label>
                  <select
                    value={newGroupId}
                    onChange={e => setNewGroupId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value={1}>Tổ 1</option>
                    <option value={2}>Tổ 2</option>
                    <option value={3}>Tổ 3</option>
                    <option value={4}>Tổ 4</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chức vụ trong lớp</label>
                  <select
                    value={newRoleInClass}
                    onChange={e => setNewRoleInClass(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Thành viên">Thành viên</option>
                    <option value="Tổ trưởng">Tổ trưởng (Tổ {newGroupId})</option>
                    <option value="Tổ phó">Tổ phó (Tổ {newGroupId})</option>
                    <option value="Lớp trưởng">Lớp trưởng</option>
                    <option value="Lớp phó Học tập">Lớp phó Học tập</option>
                    <option value="Lớp phó Kỷ luật">Lớp phó Kỷ luật</option>
                    <option value="Lớp phó Lao động">Lớp phó Lao động</option>
                    <option value="Lớp phó Văn thể mỹ">Lớp phó Văn thể mỹ</option>
                    <option value="Bí thư Chi đoàn">Bí thư Chi đoàn</option>
                    <option value="Phó Bí thư">Phó Bí thư</option>
                    <option value="Thủ quỹ">Thủ quỹ</option>
                    <option value="Cán sự môn">Cán sự bộ môn</option>
                  </select>
                </div>
              </div>

              {/* Account & Password Settings */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tài khoản đăng nhập</span>
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder={newCode ? `hs_${newCode.toLowerCase()}` : 'Để trống hệ thống tự sinh'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Để trống sẽ tự tạo: hs_mãhs</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mật khẩu ban đầu</span>
                  </label>
                  <input
                    type="text"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="Mặc định: 123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Mặc định: 123 (có thể đổi sau)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ tên Phụ huynh</label>
                  <input
                    type="text"
                    value={newParentName}
                    onChange={e => setNewParentName(e.target.value)}
                    placeholder="Tên bố/mẹ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SĐT Phụ huynh</label>
                  <input
                    type="text"
                    value={newParentPhone}
                    onChange={e => setNewParentPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú của GVCN</label>
                <textarea
                  rows={2}
                  value={newTeacherNotes}
                  onChange={e => setNewTeacherNotes(e.target.value)}
                  placeholder="Ghi chú thêm về học lực, sức khỏe..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Lưu Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa hàng loạt</h3>
                <p className="text-rose-600 font-semibold text-[11px]">Thao tác của GVCN</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 text-xs leading-relaxed">
              Bạn đang chuẩn bị xóa vĩnh viễn <strong>{selectedStudentIds.length} học sinh</strong> khỏi danh sách lớp {classInfo.className}. Toàn bộ điểm thi đua, vi phạm, khen thưởng và điểm danh liên quan cũng sẽ được xóa sạch.
            </div>

            {/* List of selected students */}
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 p-2">
              {selectedStudentIds.map(id => {
                const s = students.find(item => item.id === id);
                if (!s) return null;
                return (
                  <div key={id} className="py-1 px-2 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">{s.fullName}</span>
                    <span className="font-mono text-slate-500">{s.studentCode} • Tổ {s.groupId}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition-all"
              >
                Xác nhận xóa {selectedStudentIds.length} học sinh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Students Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xóa Sạch Danh Sách Học Sinh</h3>
                <p className="text-rose-600 font-semibold text-[11px]">Thao tác hệ thống đặc biệt của GVCN</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-950 text-xs leading-relaxed space-y-2">
              <p>
                Bạn đang chuẩn bị <strong>xóa toàn bộ {students.length} học sinh</strong> trong lớp {classInfo.className}.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-rose-900 text-[11px]">
                <li>Toàn bộ hồ sơ học sinh, tài khoản học sinh sẽ bị xóa sạch.</li>
                <li>Toàn bộ lịch sử điểm danh, sổ vi phạm, khen thưởng, sổ lao động sẽ được reset để bắt đầu lại.</li>
                <li>Hệ thống sẽ <strong>tự động tạo 1 bản sao lưu dự phòng (Snapshot)</strong> an toàn trước khi xóa để bạn có thể khôi phục lại bất kỳ lúc nào trong mục Cài đặt.</li>
                <li>Dữ liệu mới sẽ được đồng bộ ngay lập tức lên Google Sheets.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isClearingStudents}
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isClearingStudents}
                onClick={handleConfirmClearAllStudents}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isClearingStudents ? (
                  <>Đang xóa sạch dữ liệu...</>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác nhận xóa sạch ({students.length} HS)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import & Update Modal */}
      <ExcelStudentModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />

      {/* Edit Student Modal for GVCN */}
      <EditStudentModal
        student={editingStudent}
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
      />
    </div>
  );
};
