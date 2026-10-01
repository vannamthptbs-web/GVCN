import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  School,
  Users,
  CalendarCheck,
  Grid,
  AlertTriangle,
  Award,
  BookOpen,
  Sparkles,
  Hammer,
  Trophy,
  UserCheck2,
  CalendarDays,
  FileSpreadsheet,
  PieChart,
  Settings,
  X,
  User,
  HeartHandshake,
  Search,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isHomeroomTeacher, isAnyStudent } from '../utils/permissionUtils';

export type NavTab =
  | 'dashboard'
  | 'overview'
  | 'students'
  | 'attendance'
  | 'seating_chart'
  | 'violations'
  | 'rewards'
  | 'academic'
  | 'duty'
  | 'labor'
  | 'extracurricular'
  | 'group_competition'
  | 'individual_competition'
  | 'weekly_report'
  | 'monthly_report'
  | 'analytics'
  | 'settings'
  | 'student_portal';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface MenuItemDef {
  id: NavTab;
  num: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  iconBg: string;
  iconColor: string;
  section: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const { 
    currentUserRole, 
    violations, 
    rewards, 
    studentsNeedingAttention,
    classInfo,
    students,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const isStudent = isAnyStudent(currentUserRole.role);
  const isGVCN = isHomeroomTeacher(currentUserRole.role);

  const menuItems: MenuItemDef[] = useMemo(() => [
    // Section 1: Quản trị & Học sinh
    { 
      id: 'dashboard', 
      num: '01', 
      label: '1. Trang chủ', 
      icon: LayoutDashboard,
      iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-700',
      section: 'Quản trị & Học sinh'
    },
    { 
      id: 'overview', 
      num: '02', 
      label: '2. Tổng quan lớp', 
      icon: School,
      iconBg: 'bg-sky-50 text-sky-700 border-sky-200',
      iconColor: 'text-sky-700',
      section: 'Quản trị & Học sinh'
    },
    { 
      id: 'students', 
      num: '03', 
      label: '3. Danh sách học sinh', 
      icon: Users, 
      badge: students.length,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconColor: 'text-emerald-700',
      section: 'Quản trị & Học sinh'
    },
    { 
      id: 'attendance', 
      num: '04', 
      label: '4. Điểm danh', 
      icon: CalendarCheck,
      iconBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      iconColor: 'text-cyan-700',
      section: 'Quản trị & Học sinh'
    },
    { 
      id: 'seating_chart', 
      num: '05', 
      label: '5. Sơ đồ lớp', 
      icon: Grid,
      iconBg: 'bg-teal-50 text-teal-700 border-teal-200',
      iconColor: 'text-teal-700',
      section: 'Quản trị & Học sinh'
    },

    // Section 2: Nề nếp & Học tập
    { 
      id: 'violations', 
      num: '06', 
      label: '6. Vi phạm nề nếp', 
      icon: AlertTriangle, 
      badge: violations.length, 
      badgeColor: violations.length > 0 
        ? 'bg-rose-500 text-white font-extrabold shadow-2xs' 
        : 'bg-slate-100 text-slate-500',
      iconBg: 'bg-rose-50 text-rose-700 border-rose-200',
      iconColor: 'text-rose-700',
      section: 'Nề nếp & Học tập'
    },
    { 
      id: 'rewards', 
      num: '07', 
      label: '7. Khen thưởng – Việc tốt', 
      icon: Award, 
      badge: rewards.length, 
      badgeColor: rewards.length > 0 
        ? 'bg-amber-500 text-white font-extrabold shadow-2xs' 
        : 'bg-slate-100 text-slate-500',
      iconBg: 'bg-amber-50 text-amber-800 border-amber-200',
      iconColor: 'text-amber-700',
      section: 'Nề nếp & Học tập'
    },
    { 
      id: 'academic', 
      num: '08', 
      label: '8. Học tập & Bài tập', 
      icon: BookOpen,
      iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconColor: 'text-indigo-700',
      section: 'Nề nếp & Học tập'
    },

    // Section 3: Hoạt động & Phong trào
    { 
      id: 'duty', 
      num: '09', 
      label: '9. Trực nhật lớp', 
      icon: Sparkles,
      iconBg: 'bg-teal-50 text-teal-700 border-teal-200',
      iconColor: 'text-teal-700',
      section: 'Hoạt động & Phong trào'
    },
    { 
      id: 'labor', 
      num: '10', 
      label: '10. Lao động ngoài giờ', 
      icon: Hammer,
      iconBg: 'bg-orange-50 text-orange-700 border-orange-200',
      iconColor: 'text-orange-700',
      section: 'Hoạt động & Phong trào'
    },
    { 
      id: 'extracurricular', 
      num: '11', 
      label: '11. Ngoại khóa – Phong trào', 
      icon: HeartHandshake,
      iconBg: 'bg-pink-50 text-pink-700 border-pink-200',
      iconColor: 'text-pink-700',
      section: 'Hoạt động & Phong trào'
    },

    // Section 4: Thi đua & Xếp hạng
    { 
      id: 'group_competition', 
      num: '12', 
      label: '12. Thi đua tổ', 
      icon: Trophy, 
      badge: '4 Tổ',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      iconBg: 'bg-amber-50 text-amber-800 border-amber-200',
      iconColor: 'text-amber-800',
      section: 'Thi đua & Xếp hạng'
    },
    { 
      id: 'individual_competition', 
      num: '13', 
      label: '13. Thi đua cá nhân', 
      icon: UserCheck2,
      iconBg: 'bg-purple-50 text-purple-700 border-purple-200',
      iconColor: 'text-purple-700',
      section: 'Thi đua & Xếp hạng'
    },

    // Section 5: Tổng kết & Cài đặt
    { 
      id: 'weekly_report', 
      num: '14', 
      label: '14. Tổng kết tuần & Sinh hoạt', 
      icon: CalendarDays,
      iconBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      iconColor: 'text-cyan-700',
      section: 'Tổng kết & Cài đặt'
    },
    { 
      id: 'monthly_report', 
      num: '15', 
      label: '15. Tổng kết tháng', 
      icon: FileSpreadsheet,
      iconBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconColor: 'text-emerald-700',
      section: 'Tổng kết & Cài đặt'
    },
    { 
      id: 'analytics', 
      num: '16', 
      label: '16. Báo cáo – Thống kê', 
      icon: PieChart,
      iconBg: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-700',
      section: 'Tổng kết & Cài đặt'
    },
    ...(isGVCN ? [{ 
      id: 'settings' as NavTab, 
      num: '17', 
      label: '17. Cài đặt tiêu chí', 
      icon: Settings,
      iconBg: 'bg-slate-100 text-slate-700 border-slate-300',
      iconColor: 'text-slate-700',
      section: 'Tổng kết & Cài đặt'
    }] : []),
  ], [students.length, violations.length, rewards.length, isGVCN]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const q = searchQuery.toLowerCase().trim();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(q) || 
      item.section.toLowerCase().includes(q) ||
      item.num.includes(q)
    );
  }, [menuItems, searchQuery]);

  const sections = useMemo(() => {
    const list: { name: string; items: MenuItemDef[] }[] = [];
    filteredItems.forEach(item => {
      let group = list.find(g => g.name === item.section);
      if (!group) {
        group = { name: item.section, items: [] };
        list.push(group);
      }
      group.items.push(item);
    });
    return list;
  }, [filteredItems]);

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-50/90 backdrop-blur-md border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shadow-sm ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header with Close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white lg:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900 text-sm">Danh Mục Chức Năng</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search / Quick Filter Bar */}
        <div className="p-3 border-b border-slate-200/80 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh menu (16 mục)..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Student Portal Special Shortcut if current user is Student */}
        {isStudent && (
          <div className="p-3 border-b border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <button
              onClick={() => handleSelect('student_portal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                activeTab === 'student_portal'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <span>Góc Cá nhân Học sinh</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {sections.map(sec => (
            <div key={sec.name} className="space-y-1.5">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {sec.name}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {sec.items.length}
                </span>
              </div>

              <div className="space-y-1">
                {sec.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all relative ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-700/25 border border-emerald-500 ring-1 ring-emerald-400/40'
                          : 'bg-white hover:bg-slate-100/90 text-slate-800 hover:text-slate-950 font-semibold border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      {/* Left side: Icon badge + Label */}
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30 shadow-inner'
                              : `${item.iconBg}`
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <span className="truncate tracking-tight">{item.label}</span>
                      </div>

                      {/* Right side: Badge or Arrow */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                              isActive
                                ? 'bg-white/25 text-white border-white/40'
                                : `${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="py-8 text-center px-4 bg-white rounded-xl border border-dashed border-slate-200">
              <p className="text-xs font-semibold text-slate-600">Không tìm thấy chức năng phù hợp</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-bold underline"
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}
        </div>

        {/* Bottom Class Info Card */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Lớp {classInfo.className} ({classInfo.schoolYear})
              </span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 ml-1">
                {students.length} HS
              </span>
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2">
              <span className="truncate">GVCN: <strong className="text-slate-900 font-bold">{classInfo.homeroomTeacher}</strong></span>
              {isGVCN && (
                <button
                  type="button"
                  onClick={() => handleSelect('settings')}
                  title="Tùy chỉnh thông tin Lớp, Năm học, GVCN trong Cài đặt"
                  className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors shrink-0 ml-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Cần quan tâm:</span>
              <span className={`font-bold px-2 py-0.5 rounded-md ${
                studentsNeedingAttention.length > 0 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {studentsNeedingAttention.length} học sinh
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 leading-snug">
              <p className="font-bold text-slate-700 truncate">
                {classInfo.homeroomTeacher ? `GVCN: ${classInfo.homeroomTeacher}` : 'Sổ Chủ Nhiệm Điện Tử'}
              </p>
              <p className="text-[9px] text-slate-400 truncate">
                {classInfo.schoolName || 'Hệ thống Quản lý Nề nếp & Thi đua'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

