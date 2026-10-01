import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw, X, Clock, UserCheck } from 'lucide-react';
import { isHomeroomTeacher } from '../../utils/permissionUtils';

export const GoogleSheetsSyncConfirmation: React.FC = () => {
  const {
    syncNotification,
    dismissSyncNotification,
    triggerManualSyncWithConfirmation,
    setGoogleSheetsModalOpen,
    classInfo,
    currentUserRole,
  } = useApp();

  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  const isGVCN = isHomeroomTeacher(currentUserRole?.role);
  const isVisible = Boolean(syncNotification && syncNotification.visible);
  const isSuccess = syncNotification?.status === 'success';

  // Reset progress when a new notification arrives or status changes
  const notificationKey = syncNotification
    ? `${syncNotification.timestamp}_${syncNotification.status}_${syncNotification.actionDetails || ''}`
    : '';

  useEffect(() => {
    if (isVisible && isSuccess) {
      setProgress(100);
    }
  }, [notificationKey, isVisible, isSuccess]);

  // Handle countdown interval
  useEffect(() => {
    if (!isVisible || !isSuccess || isHovered) {
      return;
    }

    const duration = 5000; // Auto dismiss after 5 seconds
    const intervalMs = 50;
    const step = (intervalMs / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev - step;
        return next <= 0 ? 0 : next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isVisible, isSuccess, isHovered, notificationKey]);

  // Trigger dismissal after progress finishes in an effect (not inside setProgress updater)
  useEffect(() => {
    if (progress <= 0 && isVisible && isSuccess && !isHovered) {
      dismissSyncNotification();
    }
  }, [progress, isVisible, isSuccess, isHovered, dismissSyncNotification]);

  if (!syncNotification || !syncNotification.visible) {
    return null;
  }

  const isSaving = syncNotification.status === 'saving' || syncNotification.status === 'pending';
  const isError = syncNotification.status === 'error';

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-96 transition-all duration-300 transform translate-y-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Xác nhận lưu Google Sheets"
    >
      <div
        className={`rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-all ${
          isSuccess
            ? 'bg-white/95 border-emerald-300 ring-2 ring-emerald-500/20 shadow-emerald-900/10'
            : isSaving
            ? 'bg-white/95 border-teal-300 ring-2 ring-teal-500/20 shadow-teal-900/10'
            : 'bg-white/95 border-rose-300 ring-2 ring-rose-500/20 shadow-rose-900/10'
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b ${
            isSuccess
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-600'
              : isSaving
              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-600'
              : 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-rose-600'
          }`}
        >
          <div className="flex items-center gap-2">
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-100" />}
            {isSaving && <RefreshCw className="w-4 h-4 text-teal-100 animate-spin" />}
            {isError && <AlertTriangle className="w-4 h-4 text-amber-100" />}
            <span className="tracking-wide">
              {isSuccess && 'XÁC NHẬN LƯU GOOGLE SHEETS'}
              {isSaving && 'ĐANG LƯU LÊN GOOGLE SHEETS...'}
              {isError && 'LỖI LƯU GOOGLE SHEETS'}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissSyncNotification}
            className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/90 hover:text-white"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-2.5 text-slate-800">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isSuccess
                  ? 'bg-emerald-100/80 text-emerald-700'
                  : isSaving
                  ? 'bg-teal-100/80 text-teal-700'
                  : 'bg-rose-100/80 text-rose-700'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                {syncNotification.title}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2">
                {syncNotification.message}
              </p>
            </div>
          </div>

          {/* Action and Actor Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 text-[11px]">
            {syncNotification.actor && (
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-slate-500">Người thực hiện:</span>
                <span className="font-bold text-slate-800 truncate">{syncNotification.actor}</span>
              </div>
            )}

            {syncNotification.actionDetails && (
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span className="text-slate-500">Nội dung:</span>
                <span className="font-semibold text-slate-800 truncate">{syncNotification.actionDetails}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60 text-[10px]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {syncNotification.timestamp}
              </span>
              <span className="font-medium text-emerald-700">
                {classInfo.className ? `Lớp ${classInfo.className}` : 'Lớp học'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {isSuccess && (
              <button
                type="button"
                onClick={dismissSyncNotification}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã hiểu</span>
              </button>
            )}

            {isSaving && (
              <>
                <button
                  type="button"
                  onClick={() => triggerManualSyncWithConfirmation('Lưu ngay lập tức')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Lưu ngay lập tức</span>
                </button>
                <button
                  type="button"
                  onClick={dismissSyncNotification}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-200"
                >
                  Đóng
                </button>
              </>
            )}

            {isError && (
              <>
                <button
                  type="button"
                  onClick={() => triggerManualSyncWithConfirmation('Thử lưu lại')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lưu lại</span>
                </button>
                {isGVCN && (
                  <button
                    type="button"
                    onClick={() => {
                      dismissSyncNotification();
                      setGoogleSheetsModalOpen(true);
                    }}
                    className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all border border-slate-200"
                  >
                    Cấu hình
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismissSyncNotification}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-200"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>

        {/* Auto Dismiss Progress Bar */}
        {isSuccess && (
          <div className="w-full bg-emerald-100 h-1 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
