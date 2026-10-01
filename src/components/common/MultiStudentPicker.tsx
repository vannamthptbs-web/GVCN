import React, { useState, useMemo } from 'react';
import { Users, Check, Search, X, CheckSquare, Square, UserCheck } from 'lucide-react';
import { Student } from '../../types';

interface MultiStudentPickerProps {
  students: Student[];
  selectedStudentIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  helperText?: string;
  maxHeight?: string;
}

export const MultiStudentPicker: React.FC<MultiStudentPickerProps> = ({
  students,
  selectedStudentIds,
  onChange,
  label = 'Chọn học sinh áp dụng',
  helperText,
  maxHeight = 'max-h-56',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroupFilter, setActiveGroupFilter] = useState<number | 'all'>('all');

  const selectedSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);

  const groups = useMemo(() => {
    const list: number[] = [];
    students.forEach(s => {
      if (!list.includes(s.groupId)) list.push(s.groupId);
    });
    return list.sort((a, b) => a - b);
  }, [students]);

  // Filtered students according to search and group tab
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.studentCode.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchGroup = activeGroupFilter === 'all' || s.groupId === activeGroupFilter;
      return matchSearch && matchGroup;
    });
  }, [students, searchTerm, activeGroupFilter]);

  // Quick Action: Select all students in whole class
  const handleSelectAllClass = () => {
    onChange(students.map(s => s.id));
  };

  // Quick Action: Deselect all
  const handleDeselectAll = () => {
    onChange([]);
  };

  // Quick Action: Select / Toggle group
  const handleToggleGroup = (groupId: number) => {
    const groupStudentIds = students.filter(s => s.groupId === groupId).map(s => s.id);
    const allGroupSelected = groupStudentIds.every(id => selectedSet.has(id));

    if (allGroupSelected) {
      // Unselect this group
      onChange(selectedStudentIds.filter(id => !groupStudentIds.includes(id)));
    } else {
      // Add all from this group
      const newSet = new Set([...selectedStudentIds, ...groupStudentIds]);
      onChange(Array.from(newSet));
    }
  };

  // Toggle single student
  const handleToggleStudent = (studentId: string) => {
    if (selectedSet.has(studentId)) {
      onChange(selectedStudentIds.filter(id => id !== studentId));
    } else {
      onChange([...selectedStudentIds, studentId]);
    }
  };

  const isAllClassSelected = students.length > 0 && selectedStudentIds.length === students.length;

  return (
    <div className="space-y-2">
      {/* Label and Selected Counter */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
          <span className="text-rose-500">*</span>
        </label>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all ${
              isAllClassSelected
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : selectedStudentIds.length > 0
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isAllClassSelected
              ? `Cả lớp (${students.length} HS)`
              : `Đã chọn ${selectedStudentIds.length}/${students.length} HS`}
          </span>
        </div>
      </div>

      {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}

      {/* Quick Selection Buttons */}
      <div className="flex items-center flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
        <span className="text-[11px] font-bold text-slate-500 mr-1">Chọn nhanh:</span>
        <button
          type="button"
          onClick={handleSelectAllClass}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
            isAllClassSelected
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Toàn bộ lớp ({students.length})</span>
        </button>

        {groups.map(g => {
          const groupStudents = students.filter(s => s.groupId === g);
          const isGroupAllSelected =
            groupStudents.length > 0 && groupStudents.every(s => selectedSet.has(s.id));

          return (
            <button
              key={g}
              type="button"
              onClick={() => handleToggleGroup(g)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                isGroupAllSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-blue-50 text-slate-700 border border-slate-300'
              }`}
            >
              Tổ {g} ({groupStudents.length})
            </button>
          );
        })}

        {selectedStudentIds.length > 0 && (
          <button
            type="button"
            onClick={handleDeselectAll}
            className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors ml-auto font-medium"
          >
            Bỏ chọn
          </button>
        )}
      </div>

      {/* Search and Group Filter Tabs */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên hoặc mã học sinh..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveGroupFilter('all')}
            className={`px-2 py-1 rounded-md font-medium transition-colors ${
              activeGroupFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Tất cả
          </button>
          {groups.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroupFilter(g)}
              className={`px-2 py-1 rounded-md font-medium transition-colors ${
                activeGroupFilter === g ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              T{g}
            </button>
          ))}
        </div>
      </div>

      {/* Student Checklist Grid */}
      <div
        className={`${maxHeight} overflow-y-auto border border-slate-200 rounded-xl p-1 bg-white divide-y divide-slate-100`}
      >
        {filteredStudents.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            Không tìm thấy học sinh phù hợp với bộ lọc
          </div>
        ) : (
          filteredStudents.map(student => {
            const isSelected = selectedSet.has(student.id);

            return (
              <div
                key={student.id}
                onClick={() => handleToggleStudent(student.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50/80 hover:bg-blue-100/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {student.fullName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {student.studentCode} • Tổ {student.groupId}
                      {student.roleInClass && student.roleInClass !== 'Thành viên' && (
                        <span className="ml-1 text-indigo-600 font-medium">({student.roleInClass})</span>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    student.groupId === 1
                      ? 'bg-emerald-50 text-emerald-700'
                      : student.groupId === 2
                      ? 'bg-blue-50 text-blue-700'
                      : student.groupId === 3
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  Tổ {student.groupId}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Selected tags preview if fewer than 6, or note */}
      {selectedStudentIds.length > 0 && selectedStudentIds.length < 6 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selectedStudentIds.map(id => {
            const s = students.find(st => st.id === id);
            if (!s) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[11px] font-medium"
              >
                {s.fullName}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleStudent(id);
                  }}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
