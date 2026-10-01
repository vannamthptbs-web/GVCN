import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  Sparkles,
  Link,
  Eye,
  Camera,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface BannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Preset banner photos for high schools and classrooms
export const PRESET_BANNERS = [
  {
    id: 'school_campus',
    title: 'Sân trường rợp bóng cây',
    description: 'Không gian sư phạm xanh mát, yên bình',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80',
  },
  {
    id: 'classroom_modern',
    title: 'Lớp học thân thương',
    description: 'Phòng học sáng sủa, ấm áp và truyền cảm hứng',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&auto=format&fit=crop&q=80',
  },
  {
    id: 'blackboard_study',
    title: 'Bảng đen & Tri thức',
    description: 'Bảng phấn, thước kẻ và góc học tập nghiêm túc',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&auto=format&fit=crop&q=80',
  },
  {
    id: 'library_books',
    title: 'Thư viện & Sách vở',
    description: 'Kho tàng kiến thức chắp cánh tương lai',
    url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&auto=format&fit=crop&q=80',
  },
  {
    id: 'teamwork_study',
    title: 'Đoàn kết học tập',
    description: 'Học nhóm, sẻ chia và cùng nhau tiến bộ',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sunrise_hope',
    title: 'Bình minh ước mơ',
    description: 'Bầu trời rực rỡ tượng trưng cho nhiệt huyết tuổi trẻ',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
  },
];

export const BannerModal: React.FC<BannerModalProps> = ({ isOpen, onClose }) => {
  const { classInfo, updateClassInfo } = useApp();
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(classInfo.bannerUrl || '');
  const [urlInput, setUrlInput] = useState<string>(classInfo.bannerUrl || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Compress & resize image to ensure fast storage
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP)!');
      return;
    }

    // Limit original size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Tệp hình ảnh quá lớn (vượt quá 15MB). Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            setPreviewUrl(optimizedBase64);
            setSuccessMsg('Đã tải và tối ưu hóa ảnh thành công!');
          } else {
            setPreviewUrl(event.target?.result as string);
          }
        } catch (err) {
          setPreviewUrl(event.target?.result as string);
        } finally {
          setIsProcessingFile(false);
        }
      };
      img.onerror = () => {
        setIsProcessingFile(false);
        setErrorMsg('Không thể đọc hình ảnh này. Vui lòng thử ảnh khác!');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      setErrorMsg('Đã xảy ra lỗi khi đọc tệp ảnh!');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setErrorMsg('Vui lòng nhập đường dẫn URL của hình ảnh!');
      return;
    }
    setPreviewUrl(cleanUrl);
    setSuccessMsg('Đã nạp đường dẫn ảnh xem trước thành công!');
  };

  const handleSaveBanner = () => {
    updateClassInfo({
      ...classInfo,
      bannerUrl: previewUrl,
    });
    setSuccessMsg('Đã lưu ảnh banner Trang chủ thành công!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleRemoveBanner = () => {
    setPreviewUrl('');
    setUrlInput('');
    updateClassInfo({
      ...classInfo,
      bannerUrl: '',
    });
    setSuccessMsg('Đã khôi phục banner về màu gradient mặc định!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Cài Đặt Ảnh Banner Trang Chủ</h3>
              <p className="text-xs text-slate-500">Tùy biến hình nền tiêu đề Trang chủ cho lớp {classInfo.className}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Live Preview Box */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Xem trước giao diện Banner Trang chủ:</span>
              {previewUrl && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đang chọn ảnh
                </span>
              )}
            </label>
            <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 min-h-[140px] flex flex-col justify-between">
              {previewUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                  style={{ backgroundImage: `url(${previewUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-emerald-950/75 to-slate-900/80 backdrop-blur-[1px]" />
                </div>
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    Năm học {classInfo.schoolYear}
                  </span>
                  <span className="bg-white/15 text-emerald-100 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-white/10">
                    GVCN: {classInfo.homeroomTeacher}
                  </span>
                </div>
                <h4 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Bảng Điều Khiển Lớp {classInfo.className}
                </h4>
                <p className="text-emerald-100/90 text-xs mt-1 font-medium italic">
                  "{classInfo.motto || 'Mỗi ngày cố gắng 1 chút, thành công ngày càng sẽ gần hơn'}"
                </p>
              </div>

              <div className="relative z-10 mt-3 pt-2 border-t border-white/10 flex justify-between items-center text-[11px] text-white/70">
                <span>Trạng thái: {previewUrl ? 'Đang dùng ảnh tùy chỉnh' : 'Đang dùng màu gradient mặc định'}</span>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl('');
                      setUrlInput('');
                    }}
                    className="text-rose-300 hover:text-rose-100 underline font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Bỏ ảnh này
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>1. Tải ảnh từ máy</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>2. Chọn mẫu sẵn</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'url'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>3. Dán link ảnh (URL)</span>
            </button>
          </div>

          {/* Tab 1: Upload from local file */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {isProcessingFile ? 'Đang đọc và xử lý ảnh...' : 'Bấm vào đây để chọn ảnh từ máy tính hoặc điện thoại'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ định dạng JPG, PNG, WEBP (tự động tối ưu hóa kích thước cho tốc độ tải cực nhanh)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Curated Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Nhấp vào bất kỳ ảnh mẫu trường lớp dưới đây để xem trước và áp dụng:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESET_BANNERS.map(preset => {
                  const isSelected = previewUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setPreviewUrl(preset.url);
                        setUrlInput(preset.url);
                        setSuccessMsg(`Đã chọn mẫu: "${preset.title}"!`);
                      }}
                      className={`group relative text-left rounded-xl overflow-hidden border-2 transition-all p-1 ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      <div className="aspect-video w-full rounded-lg overflow-hidden relative bg-slate-100">
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-emerald-600 text-white p-1 rounded-full shadow-sm">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="px-1 py-1.5">
                        <p className="text-xs font-bold text-slate-800 truncate">{preset.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{preset.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: URL input */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường link ảnh trực tiếp (Image URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/... hoặc link ảnh trường học của Thầy/Cô"
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                  >
                    Xem thử
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Mẹo: Thầy/Cô có thể dùng ảnh từ Google Drive (chọn chế độ công khai), Unsplash, hoặc tải ảnh lên trang lưu ảnh rồi dán link vào đây.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 gap-3">
          {classInfo.bannerUrl ? (
            <button
              type="button"
              onClick={handleRemoveBanner}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa ảnh (Mặc định)</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSaveBanner}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Ảnh Banner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
