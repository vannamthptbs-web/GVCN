/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { isHomeroomTeacher, isGuestUser } from './utils/permissionUtils';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { QuickActionModal } from './components/QuickActionModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { AccountManagementModal } from './components/AccountManagementModal';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ChangeAvatarModal } from './components/ChangeAvatarModal';
import { GoogleSheetsSyncConfirmation } from './components/common/GoogleSheetsSyncConfirmation';

// Views
import { DashboardView } from './components/views/DashboardView';
import { ClassOverviewView } from './components/views/ClassOverviewView';
import { StudentsView } from './components/views/StudentsView';
import { AttendanceView } from './components/views/AttendanceView';
import { ViolationsView } from './components/views/ViolationsView';
import { RewardsView } from './components/views/RewardsView';
import { AcademicView } from './components/views/AcademicView';
import { DutyView } from './components/views/DutyView';
import { LaborView } from './components/views/LaborView';
import { ExtracurricularView } from './components/views/ExtracurricularView';
import { GroupCompetitionView } from './components/views/GroupCompetitionView';
import { IndividualCompetitionView } from './components/views/IndividualCompetitionView';
import { WeeklyReportView } from './components/views/WeeklyReportView';
import { MonthlyReportView } from './components/views/MonthlyReportView';
import { AnalyticsReportView } from './components/views/AnalyticsReportView';
import { SettingsView } from './components/views/SettingsView';
import { StudentPortalView } from './components/views/StudentPortalView';
import { SeatingChartView } from './components/views/SeatingChartView';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUserRole, isInitialLoadingData, googleSheetsConfig, classInfo } = useApp();

  // Yêu cầu: Chưa đăng nhập thì không thể vào hệ thống -> Khóa màn hình tại Trang Đăng Nhập
  if (isGuestUser(currentUserRole.role)) {
    return <LoginPage />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} />;
      case 'overview':
        return <ClassOverviewView />;
      case 'students':
        return <StudentsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'seating_chart':
        return <SeatingChartView />;
      case 'violations':
        return <ViolationsView />;
      case 'rewards':
        return <RewardsView />;
      case 'academic':
        return <AcademicView />;
      case 'duty':
        return <DutyView />;
      case 'labor':
        return <LaborView />;
      case 'extracurricular':
        return <ExtracurricularView />;
      case 'group_competition':
        return <GroupCompetitionView />;
      case 'individual_competition':
        return <IndividualCompetitionView />;
      case 'weekly_report':
        return <WeeklyReportView />;
      case 'monthly_report':
        return <MonthlyReportView />;
      case 'analytics':
        return <AnalyticsReportView />;
      case 'settings':
        return isHomeroomTeacher(currentUserRole.role) ? <SettingsView /> : <DashboardView setActiveTab={setActiveTab} />;
      case 'student_portal':
        return <StudentPortalView />;
      default:
        return <DashboardView setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* Top Fixed Header */}
      <Navbar onOpenMobileMenu={() => setMobileOpen(prev => !prev)} />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Center Main Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-16">
          <div className="max-w-7xl mx-auto space-y-6">
            {isInitialLoadingData && Boolean(googleSheetsConfig?.spreadsheetId) && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Đang kết nối và đồng bộ dữ liệu trực tuyến từ Google Sheets...</span>
                </div>
                <span className="text-emerald-700 font-mono text-[11px] hidden sm:inline">{classInfo.className ? `Lớp ${classInfo.className}` : 'Sổ tay chủ nhiệm'}</span>
              </div>
            )}
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Popups & Modals */}
      <QuickActionModal />
      <StudentDetailModal />
      <GoogleSheetsModal />
      <AccountManagementModal />
      <LoginModal />
      <ChangePasswordModal />
      <ChangeAvatarModal />
      <GoogleSheetsSyncConfirmation />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

