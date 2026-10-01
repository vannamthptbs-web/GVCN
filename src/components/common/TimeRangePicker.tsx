import React from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';
import { TimeRangeOption } from '../../utils/timeFilter';

interface TimeRangePickerProps {
  selectedOption: TimeRangeOption;
  onChangeOption: (option: TimeRangeOption) => void;
  customStartDate?: string;
  onChangeCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  onChangeCustomEndDate?: (date: string) => void;
  showCustomInputs?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  selectedOption,
  onChangeOption,
  customStartDate,
  onChangeCustomStartDate,
  customEndDate,
  onChangeCustomEndDate,
  showCustomInputs = true,
  className = '',
  size = 'md',
}) => {
  const options: { id: TimeRangeOption; label: string; icon?: string }[] = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'this_week', label: 'Tuần này' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'semester_1', label: 'Học kỳ 1' },
    { id: 'all', label: 'Tất cả' },
    { id: 'custom', label: 'Tùy chọn...' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Pills Container */}
      <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-xs flex-wrap gap-1">
        {options.map(opt => {
          const isActive = selectedOption === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeOption(opt.id)}
              className={`transition-all rounded-lg font-bold text-xs ${
                size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5'
              } ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Date Pickers when custom option is selected */}
      {selectedOption === 'custom' && showCustomInputs && (
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs animate-in fade-in">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-600">Từ:</span>
          </div>
          <input
            type="date"
            value={customStartDate || '2026-09-01'}
            onChange={e => onChangeCustomStartDate && onChangeCustomStartDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />

          <span className="text-slate-400 font-bold">→</span>

          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="font-semibold text-slate-600">Đến:</span>
          </div>
          <input
            type="date"
            value={customEndDate || new Date().toISOString().slice(0, 10)}
            onChange={e => onChangeCustomEndDate && onChangeCustomEndDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
