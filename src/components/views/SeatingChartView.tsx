import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  RotateCw,
  Sparkles,
  Printer,
  Trash2,
  Lock,
  Unlock,
  Shuffle,
  Grid,
  Check,
  X,
  UserCheck,
  ChevronDown,
  Info,
  Award,
  AlertTriangle,
  Move,
  ArrowRightLeft,
  HelpCircle,
  BookOpen,
  UserPlus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student, SeatAssignment } from '../../types';
import { isClassAdmin } from '../../utils/permissionUtils';

export const SeatingChartView: React.FC = () => {
  const {
    students,
    seatingChart,
    assignSeat,
    swapSeats,
    autoAssignSeats,
    rotateColumns,
    clearSeatingChart,
    currentUserRole,
    setSelectedStudentIdForDetail,
    classInfo,
  } = useApp();

  const canEdit = isClassAdmin(currentUserRole.role);
  const [isLocked, setIsLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<number | 'all'>('all');
  const [autoMenuOpen, setAutoMenuOpen] = useState(false);

  // Vị trí cửa ra vào và cửa sổ (Mặc định 'right': Cửa sổ bên Trái, Cửa ra vào bên Phải theo yêu cầu GV)
  const [doorPosition, setDoorPosition] = useState<'left' | 'right'>('right');

  // Quick seat assign modal for empty seats
  const [assigningSeatTarget, setAssigningSeatTarget] = useState<{ column: number; row: number; deskPosition: 1 | 2 } | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignGroupFilter, setAssignGroupFilter] = useState<number | 'all'>('all');

  // Guide modal & guide banner state
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideBannerExpanded, setGuideBannerExpanded] = useState(true);
  
  // Click-to-move state for touch devices / easy clicking
  const [activeSelectedStudentId, setActiveSelectedStudentId] = useState<string | null>(null);
  
  // Drag and Drop state
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [draggedSourceSeat, setDraggedSourceSeat] = useState<{ column: number; row: number; deskPosition: 1 | 2 } | null>(null);
  const [dragOverSeatKey, setDragOverSeatKey] = useState<string | null>(null);

  // Quick detail preview modal for student
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

  // Map of studentId -> SeatAssignment
  const studentSeatMap = useMemo(() => {
    const map = new Map<string, SeatAssignment>();
    seatingChart.forEach(seat => {
      map.set(seat.studentId, seat);
    });
    return map;
  }, [seatingChart]);

  // Map of key "col-row-pos" -> SeatAssignment
  const seatKeyMap = useMemo(() => {
    const map = new Map<string, SeatAssignment>();
    seatingChart.forEach(seat => {
      const key = `${seat.column}-${seat.row}-${seat.deskPosition}`;
      map.set(key, seat);
    });
    return map;
  }, [seatingChart]);

  // Unassigned students
  const unassignedStudents = useMemo(() => {
    return students.filter(s => !studentSeatMap.has(s.id));
  }, [students, studentSeatMap]);

  // Filtered unassigned students
  const filteredUnassignedStudents = useMemo(() => {
    return unassignedStudents.filter(s => {
      const matchesSearch = !searchQuery.trim() || 
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        s.studentCode.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesGroup = selectedGroupFilter === 'all' || s.groupId === selectedGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [unassignedStudents, searchQuery, selectedGroupFilter]);

  // Current logged in student ID
  const myStudentId = currentUserRole.studentId || 
    students.find(s => s.fullName.toLowerCase().trim() === currentUserRole.name.toLowerCase().trim())?.id;

  // Total seated count
  const seatedCount = students.length - unassignedStudents.length;

  // Handle Drag Start from Unassigned List
  const handleDragStartFromList = (e: React.DragEvent, studentId: string) => {
    if (!canEdit || isLocked) return;
    e.dataTransfer.setData('text/plain', studentId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedStudentId(studentId);
    setDraggedSourceSeat(null);
  };

  // Handle Drag Start from a Seat
  const handleDragStartFromSeat = (
    e: React.DragEvent, 
    studentId: string, 
    column: number, 
    row: number, 
    deskPosition: 1 | 2
  ) => {
    if (!canEdit || isLocked) return;
    e.dataTransfer.setData('text/plain', studentId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedStudentId(studentId);
    setDraggedSourceSeat({ column, row, deskPosition });
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    if (!canEdit || isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSeatKey !== key) {
      setDragOverSeatKey(key);
    }
  };

  const handleDragLeave = (e: React.DragEvent, key: string) => {
    if (dragOverSeatKey === key) {
      setDragOverSeatKey(null);
    }
  };

  const handleDropOnSeat = (column: number, row: number, deskPosition: 1 | 2) => {
    if (!canEdit || isLocked || !draggedStudentId) {
      setDraggedStudentId(null);
      setDraggedSourceSeat(null);
      setDragOverSeatKey(null);
      return;
    }

    const targetKey = `${column}-${row}-${deskPosition}`;
    const targetSeat = seatKeyMap.get(targetKey);

    if (draggedSourceSeat) {
      // Dragged from another seat
      if (
        draggedSourceSeat.column === column &&
        draggedSourceSeat.row === row &&
        draggedSourceSeat.deskPosition === deskPosition
      ) {
        // Dropped on the same seat -> do nothing
      } else if (targetSeat) {
        // Target has student -> Swap
        swapSeats(draggedSourceSeat, { column, row, deskPosition });
      } else {
        // Target is empty -> Move
        assignSeat(column, row, deskPosition, draggedStudentId);
        assignSeat(draggedSourceSeat.column, draggedSourceSeat.row, draggedSourceSeat.deskPosition, null);
      }
    } else {
      // Dragged from unassigned list
      assignSeat(column, row, deskPosition, draggedStudentId);
    }

    setDraggedStudentId(null);
    setDraggedSourceSeat(null);
    setDragOverSeatKey(null);
  };

  // Click-to-Move Handler
  const handleSeatClick = (column: number, row: number, deskPosition: 1 | 2) => {
    const seatKey = `${column}-${row}-${deskPosition}`;
    const seatAssignment = seatKeyMap.get(seatKey);

    if (activeSelectedStudentId && canEdit && !isLocked) {
      // If student is currently active for move
      const sourceSeat = studentSeatMap.get(activeSelectedStudentId);

      if (sourceSeat) {
        // Student already in a seat -> Swap or Move
        if (sourceSeat.column === column && sourceSeat.row === row && sourceSeat.deskPosition === deskPosition) {
          // Clicked same seat -> Deselect
          setActiveSelectedStudentId(null);
          return;
        }
        if (seatAssignment) {
          // Target occupied -> Swap
          swapSeats(
            { column: sourceSeat.column, row: sourceSeat.row, deskPosition: sourceSeat.deskPosition },
            { column, row, deskPosition }
          );
        } else {
          // Target empty -> Move
          assignSeat(column, row, deskPosition, activeSelectedStudentId);
          assignSeat(sourceSeat.column, sourceSeat.row, sourceSeat.deskPosition, null);
        }
      } else {
        // Student was unassigned -> Assign to this seat
        assignSeat(column, row, deskPosition, activeSelectedStudentId);
      }

      setActiveSelectedStudentId(null);
      return;
    }

    // Otherwise show details or select for move
    if (seatAssignment) {
      const student = students.find(s => s.id === seatAssignment.studentId);
      if (student) {
        if (canEdit && !isLocked) {
          setActiveSelectedStudentId(student.id);
        } else {
          setPreviewStudent(student);
        }
      }
    } else {
      // Bấm vào ghế trống khi chưa chọn học sinh: Mở modal chọn nhanh học sinh vào ghế này
      if (canEdit && !isLocked) {
        setAssigningSeatTarget({ column, row, deskPosition });
        setAssignSearch('');
        setAssignGroupFilter('all');
      }
    }
  };

  const handleUnseat = (column: number, row: number, deskPosition: 1 | 2) => {
    if (!canEdit || isLocked) return;
    assignSeat(column, row, deskPosition, null);
  };

  const handlePrint = () => {
    window.print();
  };

  const getGroupBadgeColor = (groupId: number) => {
    switch (groupId) {
      case 1:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 2:
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 4:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold shadow-xs">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  Sơ Đồ Chỗ Ngồi Lớp Học
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-200">
                    {classInfo?.className ? `Lớp ${classInfo.className}` : 'Lớp học'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Mô hình chuẩn 4 Cột (Dãy bàn) × 8 Hàng ghế (2 vị trí/bàn) = 64 Chỗ ngồi • Đã xếp:{' '}
                  <strong className="text-emerald-600 font-bold">{seatedCount}</strong>/{students.length} học sinh
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                {/* Lock/Unlock Toggle */}
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs ${
                    isLocked
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={isLocked ? 'Đang khóa (Nhấn để mở)' : 'Đang mở khóa (Nhấn để khóa)'}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{isLocked ? 'Đã khóa sơ đồ' : 'Khóa sửa'}</span>
                </button>

                {/* Auto Assign Dropdown */}
                <div className="relative">
                  <button
                    disabled={isLocked}
                    onClick={() => setAutoMenuOpen(!autoMenuOpen)}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tự động xếp chỗ</span>
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>

                  {autoMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1.5 space-y-1 text-xs">
                      <button
                        onClick={() => {
                          autoAssignSeats('by_group');
                          setAutoMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold flex items-center justify-between"
                      >
                        <span>🏢 Xếp theo 4 Tổ (1 cột/tổ)</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Khuyên dùng</span>
                      </button>
                      <button
                        onClick={() => {
                          autoAssignSeats('alphabetical');
                          setAutoMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold"
                      >
                        🔤 Xếp theo Tên A - Z
                      </button>
                      <button
                        onClick={() => {
                          autoAssignSeats('gender');
                          setAutoMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold"
                      >
                        👫 Xếp xen kẽ Nam - Nữ (Bàn đôi)
                      </button>
                      <button
                        onClick={() => {
                          autoAssignSeats('random');
                          setAutoMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold flex items-center gap-1.5"
                      >
                        <Shuffle className="w-3 h-3 text-slate-500" />
                        <span>Xáo trộn ngẫu nhiên</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Rotate Columns (Weekly Routine) */}
                <button
                  disabled={isLocked || seatedCount === 0}
                  onClick={() => rotateColumns('next')}
                  className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  title="Luân chuyển các tổ sang dãy bàn kế tiếp (Dãy 1 sang 2, 2 sang 3, 3 sang 4, 4 sang 1)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Xoay vòng dãy bàn (Tuần mới)</span>
                </button>

                {/* Clear Chart */}
                <button
                  disabled={isLocked || seatedCount === 0}
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ chỗ ngồi trên sơ đồ và xếp lại từ đầu?')) {
                      clearSeatingChart();
                      setActiveSelectedStudentId(null);
                    }
                  }}
                  className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
                  title="Xóa trắng sơ đồ lớp"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hết</span>
                </button>

                {/* Swap Door & Window Toggle */}
                <button
                  onClick={() => setDoorPosition(prev => prev === 'right' ? 'left' : 'right')}
                  className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Hoán đổi vị trí giữa Cửa ra vào và Cửa sổ trên sơ đồ"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
                  <span>Đổi bên Cửa/Sổ</span>
                </button>
              </>
            )}

            {/* Help / Guide Button */}
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Xem hướng dẫn các cách xếp chỗ cho học sinh"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Hướng dẫn xếp chỗ</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="In sơ đồ lớp ra giấy hoặc file PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Sơ Đồ A4</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm học sinh trên sơ đồ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Group Filters */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold text-[11px]">Tổ:</span>
            <button
              onClick={() => setSelectedGroupFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedGroupFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            {[1, 2, 3, 4].map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroupFilter(g)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                  selectedGroupFilter === g
                    ? getGroupBadgeColor(g) + ' ring-1 ring-slate-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tổ {g}
              </button>
            ))}
          </div>

          {/* Unassigned quick stat tag */}
          {unassignedStudents.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chưa xếp chỗ: <strong className="text-indigo-900 font-bold">{unassignedStudents.length}</strong> học sinh</span>
            </div>
          )}

          {/* Prompt banner if student is selected for move */}
          {activeSelectedStudentId && (
            <div className="flex-1 min-w-[240px] flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold animate-pulse">
              <div className="flex items-center gap-1.5 truncate">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">
                  Đang chọn: <strong>{students.find(s => s.id === activeSelectedStudentId)?.fullName}</strong> (Bấm vào ghế đích để chuyển)
                </span>
              </div>
              <button
                onClick={() => setActiveSelectedStudentId(null)}
                className="ml-2 text-amber-700 hover:text-amber-900 text-[11px] underline shrink-0"
              >
                Hủy chọn
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Guide Banner for Seating Assignment */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 shadow-xs print:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center font-black text-sm">
              💡
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-2">
                Cách xếp chỗ cho học sinh (4 cách nhanh &amp; dễ dàng)
              </h3>
              <p className="text-[11px] text-amber-800 font-medium">
                Bạn có thể bấm vào ghế trống, bấm chọn học sinh, kéo thả hoặc bấm nút Tự động xếp chỗ.
              </p>
            </div>
          </div>
          <button
            onClick={() => setGuideBannerExpanded(!guideBannerExpanded)}
            className="text-xs font-bold text-amber-900 hover:text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-100/70 transition-colors"
          >
            {guideBannerExpanded ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
          </button>
        </div>

        {guideBannerExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-amber-200/70 text-xs">
            <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-amber-200/80 space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">1</span>
                <span>Bấm trực tiếp vào ghế trống</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Nhấp chuột vào bất kỳ ô <strong>"+ Xếp chỗ"</strong> trên sơ đồ lớp. Một cửa sổ chọn học sinh sẽ mở ra để bạn chọn ngay bạn muốn xếp vào.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-amber-200/80 space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">2</span>
                <span>Bấm chọn học sinh trước</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Bấm vào thẻ học sinh ở khay danh sách dưới (thẻ sáng màu vàng), sau đó bấm vào vị trí ghế muốn xếp để đặt vào ghế đó.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-amber-200/80 space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">3</span>
                <span>Kéo &amp; Thả (Drag &amp; Drop)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Giữ chuột vào thẻ học sinh và kéo thả vào ghế trống trên sơ đồ. Kéo đè lên học sinh khác để tự động <strong>hoán đổi 2 chỗ ngồi</strong>.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-amber-200/80 space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">4</span>
                <span>Tự động xếp 1 cú nhấp</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Bấm nút <strong>"Tự động xếp chỗ"</strong> ở trên: tự động chia theo 4 Tổ (1 cột/tổ), theo thứ tự ABC hoặc xen kẽ Nam Nữ chỉ trong 1 giây!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block text-center mb-6 space-y-1">
        <h2 className="text-xl font-bold uppercase tracking-wider text-black">
          SƠ ĐỒ BỐ TRÍ CHỖ NGỒI {classInfo?.className ? `LỚP ${classInfo.className}` : 'LỚP HỌC'}
        </h2>
        <p className="text-xs text-gray-600">
          {classInfo?.schoolName ? `Trường ${classInfo.schoolName} • ` : ''}GVCN: {classInfo?.homeroomTeacher || 'Chưa cập nhật'} • Năm học {classInfo?.schoolYear || '2026 - 2027'}
        </p>
      </div>

      {/* Classroom Layout Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-6">
        {/* Front Board / Teacher Platform Area */}
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Black Board with Swapped Door & Window */}
          <div className="w-full py-2.5 px-4 bg-emerald-950 text-white rounded-xl shadow-inner border-2 border-emerald-900 flex items-center justify-between">
            {doorPosition === 'right' ? (
              <>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                  <span className="text-sm">🪟</span>
                  <span>CỬA SỔ</span>
                </div>
                <div className="text-center">
                  <span className="text-xs sm:text-sm font-black tracking-widest text-emerald-100 uppercase">
                    BẢNG ĐEN LỚP HỌC
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
                  <span>CỬA RA VÀO LỚP HỌC</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-300" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-300" />
                  <span>CỬA RA VÀO LỚP HỌC</span>
                </div>
                <div className="text-center">
                  <span className="text-xs sm:text-sm font-black tracking-widest text-emerald-100 uppercase">
                    BẢNG ĐEN LỚP HỌC
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                  <span>CỬA SỔ</span>
                  <span className="text-sm">🪟</span>
                </div>
              </>
            )}
          </div>

          {/* Teacher's Platform & Podium */}
          <div className="flex items-center justify-center">
            <div className="px-8 py-2 bg-gradient-to-b from-amber-100 to-amber-200 border border-amber-300 rounded-xl shadow-xs text-center flex items-center gap-2 text-xs font-black text-amber-900">
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>BÀN GIÁO VIÊN & BỤC GIẢNG</span>
            </div>
          </div>

          <div className="text-center text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            ↓ LỐI ĐI CHÍNH GIỮA CÁC DÃY BÀN HỌC SINH ↓
          </div>
        </div>

        {/* 4 Columns x 8 Rows Seating Grid */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[860px] grid grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map(col => (
              <div key={col} className="space-y-3">
                {/* Column / Row Header */}
                <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-center">
                  <div className="text-xs font-black text-slate-900 uppercase">
                    DÃY {col} (CỘT {col})
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    Khu vực Tổ {col}
                  </div>
                </div>

                {/* 8 Rows in this Column */}
                <div className="space-y-2.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(row => {
                    const leftKey = `${col}-${row}-1`;
                    const rightKey = `${col}-${row}-2`;
                    const leftSeat = seatKeyMap.get(leftKey);
                    const rightSeat = seatKeyMap.get(rightKey);
                    const leftStudent = leftSeat ? students.find(s => s.id === leftSeat.studentId) : null;
                    const rightStudent = rightSeat ? students.find(s => s.id === rightSeat.studentId) : null;

                    return (
                      <div
                        key={row}
                        className="bg-slate-50/70 border border-slate-200 rounded-xl p-1.5 shadow-2xs space-y-1"
                      >
                        {/* Desk Row Label */}
                        <div className="flex items-center justify-between px-1 text-[9px] font-bold text-slate-400 uppercase">
                          <span>Bàn {row}</span>
                          <span>{row === 1 ? 'Bàn đầu' : row === 8 ? 'Bàn cuối' : ''}</span>
                        </div>

                        {/* Dual Desk Seats (2 positions in 1 column) */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* Seat 1 (Left) */}
                          <SeatItem
                            column={col}
                            row={row}
                            deskPosition={1}
                            student={leftStudent}
                            canEdit={canEdit}
                            isLocked={isLocked}
                            isMySeat={leftStudent?.id === myStudentId}
                            isSelectedForMove={leftStudent?.id === activeSelectedStudentId}
                            isTargetDragOver={dragOverSeatKey === leftKey}
                            isHighlighted={
                              Boolean(searchQuery.trim() && leftStudent?.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                              (selectedGroupFilter !== 'all' && leftStudent?.groupId === selectedGroupFilter)
                            }
                            onDragStart={handleDragStartFromSeat}
                            onDragOver={e => handleDragOver(e, leftKey)}
                            onDragLeave={e => handleDragLeave(e, leftKey)}
                            onDrop={() => handleDropOnSeat(col, row, 1)}
                            onClick={() => handleSeatClick(col, row, 1)}
                            onUnseat={() => handleUnseat(col, row, 1)}
                          />

                          {/* Seat 2 (Right) */}
                          <SeatItem
                            column={col}
                            row={row}
                            deskPosition={2}
                            student={rightStudent}
                            canEdit={canEdit}
                            isLocked={isLocked}
                            isMySeat={rightStudent?.id === myStudentId}
                            isSelectedForMove={rightStudent?.id === activeSelectedStudentId}
                            isTargetDragOver={dragOverSeatKey === rightKey}
                            isHighlighted={
                              Boolean(searchQuery.trim() && rightStudent?.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                              (selectedGroupFilter !== 'all' && rightStudent?.groupId === selectedGroupFilter)
                            }
                            onDragStart={handleDragStartFromSeat}
                            onDragOver={e => handleDragOver(e, rightKey)}
                            onDragLeave={e => handleDragLeave(e, rightKey)}
                            onDrop={() => handleDropOnSeat(col, row, 2)}
                            onClick={() => handleSeatClick(col, row, 2)}
                            onUnseat={() => handleUnseat(col, row, 2)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back of Classroom */}
        <div className="text-center pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          ↑ CUỐI LỚP HỌC & BẢNG TIN THI ĐUA ↑
        </div>
      </div>

      {/* Unassigned Students Section (Bottom Drawer / Tray) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">
              Danh Sách Học Sinh Chưa Xếp Chỗ ({unassignedStudents.length})
            </h3>
            {unassignedStudents.length === 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                ✨ Toàn bộ học sinh đã có chỗ ngồi!
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {canEdit && !isLocked
              ? 'Kéo thả thẻ học sinh vào bất kỳ ghế trống, hoặc nhấp vào tên học sinh rồi nhấp vào ghế để xếp chỗ.'
              : 'Hiển thị các bạn chưa được xếp vị trí ghế trên sơ đồ.'}
          </p>
        </div>

        {unassignedStudents.length === 0 ? (
          <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Tuyệt vời! 100% học sinh trong danh sách lớp đã được xếp vị trí chỗ ngồi phù hợp.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {filteredUnassignedStudents.map(student => {
              const isSelected = activeSelectedStudentId === student.id;
              return (
                <div
                  key={student.id}
                  draggable={canEdit && !isLocked}
                  onDragStart={e => handleDragStartFromList(e, student.id)}
                  onClick={() => {
                    if (canEdit && !isLocked) {
                      setActiveSelectedStudentId(isSelected ? null : student.id);
                    } else {
                      setPreviewStudent(student);
                    }
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer select-none text-left flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400 shadow-md scale-102'
                      : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                  }`}
                >
                  <img
                    src={student.avatar}
                    alt={student.fullName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {student.fullName}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="font-semibold">Tổ {student.groupId}</span>
                      {student.roleInClass && student.roleInClass !== 'Thành viên' && (
                        <span className="text-indigo-600 font-bold truncate">• {student.roleInClass}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Quick Detail Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={previewStudent.avatar}
                  alt={previewStudent.fullName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 shadow-xs"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {previewStudent.fullName}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="font-medium">Mã: {previewStudent.studentCode}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold">
                      Tổ {previewStudent.groupId}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Chức vụ:</span>
                <span className="font-bold text-slate-800">{previewStudent.roleInClass || 'Học sinh'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Giới tính:</span>
                <span className="font-bold text-slate-800">{previewStudent.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vị trí chỗ ngồi:</span>
                {studentSeatMap.has(previewStudent.id) ? (
                  <span className="font-bold text-teal-700">
                    Dãy {studentSeatMap.get(previewStudent.id)?.column} • Bàn {studentSeatMap.get(previewStudent.id)?.row} • Ghế {studentSeatMap.get(previewStudent.id)?.deskPosition === 1 ? 'Trái' : 'Phải'}
                  </span>
                ) : (
                  <span className="italic text-amber-600 font-semibold">Chưa xếp chỗ</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setSelectedStudentIdForDetail(previewStudent.id);
                  setPreviewStudent(null);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Xem hồ sơ học sinh</span>
              </button>
              <button
                onClick={() => setPreviewStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Seat Assign Picker Modal (When clicking an empty seat) */}
      {assigningSeatTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-black text-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Xếp Học Sinh Vào Dãy {assigningSeatTarget.column} - Bàn {assigningSeatTarget.row}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Vị trí: <strong className="text-teal-700 font-bold">{assigningSeatTarget.deskPosition === 1 ? 'Ghế 1 (Bên Trái)' : 'Ghế 2 (Bên Phải)'}</strong> • Bấm chọn học sinh bên dưới:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningSeatTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search inside Modal */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm học sinh theo tên hoặc mã..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  autoFocus
                />
                {assignSearch && (
                  <button
                    onClick={() => setAssignSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Group filter tabs */}
              <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
                <button
                  onClick={() => setAssignGroupFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    assignGroupFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({unassignedStudents.length})
                </button>
                {[1, 2, 3, 4].map(g => {
                  const countInGroup = unassignedStudents.filter(s => s.groupId === g).length;
                  return (
                    <button
                      key={g}
                      onClick={() => setAssignGroupFilter(g)}
                      className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                        assignGroupFilter === g
                          ? getGroupBadgeColor(g) + ' ring-1 ring-slate-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Tổ {g} ({countInGroup})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {/* Unassigned Students Section */}
              <div>
                <div className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Học sinh chưa xếp chỗ</span>
                  <span className="text-teal-600 font-bold">
                    {unassignedStudents.filter(s => {
                      const matchesSearch = !assignSearch.trim() || 
                        s.fullName.toLowerCase().includes(assignSearch.toLowerCase().trim()) ||
                        s.studentCode.toLowerCase().includes(assignSearch.toLowerCase().trim());
                      const matchesGroup = assignGroupFilter === 'all' || s.groupId === assignGroupFilter;
                      return matchesSearch && matchesGroup;
                    }).length} bạn
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unassignedStudents
                    .filter(s => {
                      const matchesSearch = !assignSearch.trim() || 
                        s.fullName.toLowerCase().includes(assignSearch.toLowerCase().trim()) ||
                        s.studentCode.toLowerCase().includes(assignSearch.toLowerCase().trim());
                      const matchesGroup = assignGroupFilter === 'all' || s.groupId === assignGroupFilter;
                      return matchesSearch && matchesGroup;
                    })
                    .map(student => (
                      <button
                        key={student.id}
                        onClick={() => {
                          assignSeat(
                            assigningSeatTarget.column,
                            assigningSeatTarget.row,
                            assigningSeatTarget.deskPosition,
                            student.id
                          );
                          setAssigningSeatTarget(null);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left flex items-center gap-2.5 group shadow-2xs"
                      >
                        <img
                          src={student.avatar}
                          alt={student.fullName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 group-hover:text-teal-800 truncate">
                            {student.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{student.studentCode}</span>
                            <span>•</span>
                            <span>Tổ {student.groupId}</span>
                            <span>•</span>
                            <span>{student.gender}</span>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-teal-100 group-hover:bg-teal-600 text-teal-800 group-hover:text-white rounded-lg text-[10px] font-bold transition-colors shrink-0">
                          Chọn
                        </span>
                      </button>
                    ))}
                </div>

                {unassignedStudents.filter(s => {
                  const matchesSearch = !assignSearch.trim() || 
                    s.fullName.toLowerCase().includes(assignSearch.toLowerCase().trim()) ||
                    s.studentCode.toLowerCase().includes(assignSearch.toLowerCase().trim());
                  const matchesGroup = assignGroupFilter === 'all' || s.groupId === assignGroupFilter;
                  return matchesSearch && matchesGroup;
                }).length === 0 && (
                  <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium">
                    Không tìm thấy học sinh chưa xếp chỗ nào phù hợp.
                  </div>
                )}
              </div>

              {/* Already Assigned Students Section (Option to transfer) */}
              <div className="pt-2 border-t border-slate-100">
                <details className="group">
                  <summary className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer list-none flex items-center justify-between py-1">
                    <span>Chuyển học sinh đang ngồi ở bàn khác sang đây</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {students
                      .filter(s => studentSeatMap.has(s.id))
                      .filter(s => {
                        const matchesSearch = !assignSearch.trim() || 
                          s.fullName.toLowerCase().includes(assignSearch.toLowerCase().trim()) ||
                          s.studentCode.toLowerCase().includes(assignSearch.toLowerCase().trim());
                        const matchesGroup = assignGroupFilter === 'all' || s.groupId === assignGroupFilter;
                        return matchesSearch && matchesGroup;
                      })
                      .map(student => {
                        const curSeat = studentSeatMap.get(student.id);
                        return (
                          <button
                            key={student.id}
                            onClick={() => {
                              if (curSeat) {
                                assignSeat(curSeat.column, curSeat.row, curSeat.deskPosition, null);
                              }
                              assignSeat(
                                assigningSeatTarget.column,
                                assigningSeatTarget.row,
                                assigningSeatTarget.deskPosition,
                                student.id
                              );
                              setAssigningSeatTarget(null);
                            }}
                            className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left flex items-center gap-2.5 group shadow-2xs"
                          >
                            <img
                              src={student.avatar}
                              alt={student.fullName}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-slate-900 group-hover:text-amber-900 truncate">
                                {student.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Đang ngồi: Dãy {curSeat?.column} • Bàn {curSeat?.row} ({curSeat?.deskPosition === 1 ? 'Trái' : 'Phải'})
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-amber-100 group-hover:bg-amber-500 text-amber-800 group-hover:text-white rounded-lg text-[10px] font-bold transition-colors shrink-0">
                              Chuyển
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </details>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAssigningSeatTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seating Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-base">
                  <BookOpen className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Hướng Dẫn Xếp Chỗ Cho Học Sinh
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Có 4 cách thao tác cực kỳ đơn giản và thuận tiện
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              {/* Method 1 */}
              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-1.5">
                <div className="font-black text-teal-900 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-black">1</span>
                  <span>Cách 1: Bấm trực tiếp vào ghế trống (Khuyên dùng)</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  Nhấp vào bất kỳ ô ghế nào hiển thị <strong>"+ Xếp chỗ"</strong> trên sơ đồ. Một cửa sổ chọn học sinh sẽ hiện ra, bạn chỉ cần gõ tên hoặc chọn bạn học sinh muốn xếp vào ghế đó là xong!
                </p>
              </div>

              {/* Method 2 */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-1.5">
                <div className="font-black text-indigo-900 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">2</span>
                  <span>Cách 2: Chọn học sinh trước rồi bấm vào ghế</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  Bấm vào một học sinh ở khay danh sách dưới (thẻ học sinh sẽ phát sáng viền vàng). Sau đó, bạn chỉ cần bấm vào bất kỳ ghế nào trên sơ đồ để đưa học sinh vào vị trí đó.
                </p>
              </div>

              {/* Method 3 */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
                <div className="font-black text-amber-900 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-black">3</span>
                  <span>Cách 3: Kéo và thả chuột (Drag &amp; Drop)</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  Giữ chuột vào thẻ học sinh ở khay dưới và kéo thả vào ghế trống trên sơ đồ. Bạn cũng có thể kéo một học sinh đang ngồi thả đè lên học sinh khác để <strong>hoán đổi 2 vị trí chỗ ngồi</strong> cho nhau ngay tức khắc.
                </p>
              </div>

              {/* Method 4 */}
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-1.5">
                <div className="font-black text-purple-900 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black">4</span>
                  <span>Cách 4: Xếp tự động thông minh bằng 1 cú nhấp</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  Trên thanh công cụ, bấm nút <strong>"Tự động xếp chỗ"</strong> và chọn một trong 4 phương án:
                  <br />• <strong>🏢 Xếp theo 4 Tổ:</strong> Mỗi tổ ngồi trọn vẹn 1 dãy bàn (Dãy 1 là Tổ 1, Dãy 2 là Tổ 2...).
                  <br />• <strong>🔤 Xếp theo Tên A - Z:</strong> Sắp xếp lần lượt theo vần chữ cái từ trên xuống dưới.
                  <br />• <strong>👫 Xếp xen kẽ Nam - Nữ:</strong> Mỗi bàn đôi gồm 1 bạn nam và 1 bạn nữ ngồi cùng nhau.
                  <br />• <strong>🎲 Xáo trộn ngẫu nhiên:</strong> Đổi gió chỗ ngồi ngẫu nhiên cho cả lớp.
                </p>
              </div>

              {/* Extra Features */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <div className="font-bold text-slate-800">💡 Tính năng hữu ích khác:</div>
                <div>• <strong>Đổi bên Cửa/Sổ:</strong> Bấm nút <strong>"Đổi bên Cửa/Sổ"</strong> trên thanh công cụ để hoán đổi vị trí Cửa ra vào và Cửa sổ theo đúng thực tế phòng học của bạn.</div>
                <div>• <strong>Xoay vòng dãy bàn (Tuần mới):</strong> Vào đầu tuần mới, bấm nút này để luân chuyển cả 4 dãy bàn sang dãy kế tiếp (Dãy 1 sang 2, 2 sang 3, 3 sang 4, 4 sang 1).</div>
                <div>• <strong>In Sơ Đồ A4:</strong> Bấm nút "In Sơ Đồ A4" để xuất sơ đồ ra giấy dán lên tường lớp hoặc lưu file PDF.</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SeatItemProps {
  column: number;
  row: number;
  deskPosition: 1 | 2;
  student: Student | null | undefined;
  canEdit: boolean;
  isLocked: boolean;
  isMySeat: boolean;
  isSelectedForMove: boolean;
  isTargetDragOver: boolean;
  isHighlighted: boolean;
  onDragStart: (e: React.DragEvent, studentId: string, col: number, row: number, pos: 1 | 2) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: () => void;
  onClick: () => void;
  onUnseat: () => void;
}

const SeatItem: React.FC<SeatItemProps> = ({
  column,
  row,
  deskPosition,
  student,
  canEdit,
  isLocked,
  isMySeat,
  isSelectedForMove,
  isTargetDragOver,
  isHighlighted,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onUnseat,
}) => {
  const isLeft = deskPosition === 1;

  if (!student) {
    // Empty Seat with friendly click target
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        title={canEdit && !isLocked ? `Bấm để chọn học sinh ngồi vào Bàn ${row} - Dãy ${column}` : 'Ghế trống'}
        className={`h-16 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center text-center p-1 select-none cursor-pointer group ${
          isTargetDragOver
            ? 'bg-emerald-100 border-emerald-500 scale-102 shadow-sm'
            : 'bg-white/80 hover:bg-emerald-50/70 border-slate-300 hover:border-emerald-500 hover:shadow-xs'
        }`}
      >
        <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-700 transition-colors">
          {isLeft ? 'Ghế 1 (Trái)' : 'Ghế 2 (Phải)'}
        </span>
        <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors flex items-center gap-0.5 mt-0.5">
          {canEdit && !isLocked ? (
            <>
              <span className="text-emerald-500 font-black">+</span> Xếp chỗ
            </>
          ) : (
            'Trống'
          )}
        </span>
      </div>
    );
  }

  // Occupied Seat
  return (
    <div
      draggable={canEdit && !isLocked}
      onDragStart={e => onDragStart(e, student.id, column, row, deskPosition)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`relative h-16 rounded-lg border transition-all p-1.5 flex flex-col justify-between select-none cursor-pointer group ${
        isMySeat
          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-400 ring-2 ring-amber-400 shadow-md'
          : isSelectedForMove
          ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400 scale-102 shadow-md'
          : isTargetDragOver
          ? 'bg-emerald-100 border-emerald-500 scale-102 shadow-md'
          : isHighlighted
          ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-400 shadow-xs'
          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* My seat banner */}
      {isMySeat && (
        <span className="absolute -top-2 right-1 px-1.5 py-0.2 bg-amber-500 text-white text-[8px] font-black rounded shadow-xs tracking-wider">
          ⭐ BẠN
        </span>
      )}

      {/* Unseat button on hover if can edit */}
      {canEdit && !isLocked && (
        <button
          onClick={e => {
            e.stopPropagation();
            onUnseat();
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white hidden group-hover:flex items-center justify-center text-[10px] font-bold shadow-xs hover:bg-rose-600 transition-colors z-10"
          title="Gỡ học sinh khỏi bàn"
        >
          ×
        </button>
      )}

      {/* Student Header: Avatar & Name */}
      <div className="flex items-center gap-1.5 min-w-0">
        <img
          src={student.avatar}
          alt={student.fullName}
          referrerPolicy="no-referrer"
          className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black text-slate-900 truncate leading-tight">
            {student.fullName}
          </div>
          <div className="text-[9px] text-slate-500 truncate">
            {student.gender} • Tổ {student.groupId}
          </div>
        </div>
      </div>

      {/* Student Footer: Role badge or seat label */}
      <div className="flex items-center justify-between text-[8.5px] pt-0.5 border-t border-slate-100">
        <span className="text-slate-400 font-medium">
          {isLeft ? 'G.Trái' : 'G.Phải'}
        </span>
        {student.roleInClass && student.roleInClass !== 'Thành viên' ? (
          <span className="px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold truncate max-w-[65px]">
            {student.roleInClass}
          </span>
        ) : (
          <span className="text-slate-400">Tổ {student.groupId}</span>
        )}
      </div>
    </div>
  );
};
