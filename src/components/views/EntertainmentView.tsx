import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  Sparkles,
  Trophy,
  Flame,
  Award,
  BookOpen,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCw,
  Users,
  Search,
  Filter,
  FileSpreadsheet,
  Zap,
  Gift,
  Star,
  ChevronRight,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Save,
  FileQuestion,
  Edit3,
  Send,
  Sliders,
  Check,
  Crown,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  Student,
  GameQuestion,
  GameQuestionSet,
  DailyMissionRecord,
  GameType
} from '../../types';
import {
  readTextFileWithEncoding,
  autoFixVietnameseText,
  convertTCVN3ToUnicode,
  convertVNIToUnicode,
  extractTextFromLegacyDoc,
  detectTCVN3,
} from '../../utils/vietnameseFontUtils';

// Web Audio sound synthesizer for sound effects without external audio files
class SoundEffects {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazy initialize on first interaction
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled() {
    return this.soundEnabled;
  }

  public playTick() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (_) {}
  }

  public playCorrect() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (_) {}
  }

  public playWrong() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (_) {}
  }

  public playVictory() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch (_) {}
  }
}

const sfx = new SoundEffects();

// Xáo trộn ngẫu nhiên thứ tự 4 đáp án A, B, C, D và tự động cập nhật vị trí đáp án đúng
export function shuffleQuestionOptions(q: GameQuestion): GameQuestion {
  if (!q.options || q.options.length < 2) return q;
  const originalOptions = [...q.options];
  const correctText = originalOptions[q.correctIndex];

  const indexed = originalOptions.map((opt, i) => ({ opt, isCorrect: i === q.correctIndex }));

  // Fisher-Yates shuffle
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  const newOptions = indexed.map(item => item.opt);
  const newCorrectIndex = indexed.findIndex(item => item.isCorrect);

  return {
    ...q,
    options: newOptions,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

// Xáo trộn toàn bộ câu hỏi và trộn ngẫu nhiên đáp án cho từng câu
export function shuffleQuestionPool(questions: GameQuestion[], preserveProgression: boolean = true): GameQuestion[] {
  if (!questions || questions.length === 0) return [];

  // Trộn ngẫu nhiên đáp án từng câu hỏi trước
  const optionsShuffled = questions.map(q => shuffleQuestionOptions(q));

  if (!preserveProgression) {
    const list = [...optionsShuffled];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  // Trộn ngẫu nhiên câu hỏi bên trong từng cấp độ khó để đảm bảo vừa ngẫu nhiên vừa tăng dần độ khó
  const easy = optionsShuffled.filter(q => q.level === 'Dễ');
  const medium = optionsShuffled.filter(q => q.level === 'Trung bình');
  const hard = optionsShuffled.filter(q => q.level === 'Khó');
  const extreme = optionsShuffled.filter(q => q.level === 'Cực khó');

  const shuffleArray = (arr: GameQuestion[]) => {
    const list = [...arr];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  return [
    ...shuffleArray(easy),
    ...shuffleArray(medium),
    ...shuffleArray(hard),
    ...shuffleArray(extreme),
  ];
}

export const EntertainmentView: React.FC = () => {
  const {
    students,
    classInfo,
    selectedWeek,
    currentUserRole,
    dailyMissions,
    savedQuestionSets,
    saveQuestionSet,
    deleteQuestionSet,
    recordGamePoints,
    syncAllToGoogleSheets,
    googleSheetsConfig
  } = useApp();

  // Active game sub-tab
  const [activeGame, setActiveGame] = useState<'wheel' | 'bell' | 'millionaire' | 'streak' | 'relay' | 'ai_creator' | 'leaderboard'>('wheel');
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Active Question Set in use
  const [selectedSetId, setSelectedSetId] = useState<string>(() => {
    return savedQuestionSets[0]?.id || 'set_default_1';
  });

  const activeQuestionSet = useMemo(() => {
    return savedQuestionSets.find(s => s.id === selectedSetId) || savedQuestionSets[0];
  }, [savedQuestionSets, selectedSetId]);

  // Seed để kích hoạt trộn ngẫu nhiên thứ tự câu hỏi và thứ tự các đáp án
  const [gameQuestionSeed, setGameQuestionSeed] = useState<number>(() => Date.now());

  // Ngân hàng câu hỏi đã được xáo trộn ngẫu nhiên câu hỏi và đảo ngẫu nhiên 4 đáp án A, B, C, D
  const randomizedGameQuestions = useMemo(() => {
    if (!activeQuestionSet?.questions || activeQuestionSet.questions.length === 0) {
      return [];
    }
    return shuffleQuestionPool(activeQuestionSet.questions, true);
  }, [activeQuestionSet, gameQuestionSeed]);

  // Trạng thái đố câu hỏi từ Ngân hàng đề trong Vòng quay may mắn
  const [wheelChallengeOpen, setWheelChallengeOpen] = useState<boolean>(false);
  const [wheelChallengeIndex, setWheelChallengeIndex] = useState<number>(0);
  const [wheelChallengeAnswered, setWheelChallengeAnswered] = useState<boolean>(false);
  const [wheelChallengeSelectedOpt, setWheelChallengeSelectedOpt] = useState<number | null>(null);

  const currentWheelQuestion = useMemo(() => {
    if (!randomizedGameQuestions || randomizedGameQuestions.length === 0) return null;
    return randomizedGameQuestions[wheelChallengeIndex % randomizedGameQuestions.length];
  }, [randomizedGameQuestions, wheelChallengeIndex]);

  const handleNextWheelQuestion = () => {
    setWheelChallengeIndex(prev => prev + 1);
    setWheelChallengeAnswered(false);
    setWheelChallengeSelectedOpt(null);
    sfx.playTick();
  };

  const handleAnswerWheelChallenge = (index: number) => {
    if (wheelChallengeAnswered || !currentWheelQuestion) return;
    setWheelChallengeSelectedOpt(index);
    setWheelChallengeAnswered(true);

    const isCorrect = index === currentWheelQuestion.correctIndex;
    if (isCorrect) {
      sfx.playVictory();
      triggerConfetti();
      setWheelBonusPoints(prev => prev + 15);
      showToast('XUẤT SẮC! Học sinh trả lời đúng câu hỏi và được cộng thêm 15 điểm thưởng!');
    } else {
      sfx.playWrong();
      showToast('Chưa chính xác! Cả lớp cùng xem lời giải thích bên dưới nhé.', 'error');
    }
  };

  // Trạng thái cửa sổ làm trắc nghiệm đố vui của Rèn Luyện Hàng Ngày (Streak)
  const [streakQuizModalOpen, setStreakQuizModalOpen] = useState<boolean>(false);
  const [streakQuizIndex, setStreakQuizIndex] = useState<number>(0);
  const [streakQuizAnswered, setStreakQuizAnswered] = useState<boolean>(false);
  const [streakSelectedAnswer, setStreakSelectedAnswer] = useState<number | null>(null);

  const currentStreakQuizQuestion = useMemo(() => {
    if (!randomizedGameQuestions || randomizedGameQuestions.length === 0) return null;
    return randomizedGameQuestions[streakQuizIndex % randomizedGameQuestions.length];
  }, [randomizedGameQuestions, streakQuizIndex]);

  const handleOpenStreakQuiz = () => {
    if (!streakSelectedStudentId) {
      showToast('Vui lòng chọn học sinh thực hiện nhiệm vụ trước!', 'error');
      return;
    }
    if (!currentStreakQuizQuestion) {
      showToast('Chưa có câu hỏi trong Ngân hàng đề!', 'error');
      return;
    }
    setStreakQuizAnswered(false);
    setStreakSelectedAnswer(null);
    setStreakQuizModalOpen(true);
  };

  const handleAnswerStreakQuiz = (optIndex: number) => {
    if (streakQuizAnswered || !currentStreakQuizQuestion) return;
    setStreakSelectedAnswer(optIndex);
    setStreakQuizAnswered(true);

    const isCorrect = optIndex === currentStreakQuizQuestion.correctIndex;
    if (isCorrect) {
      sfx.playVictory();
      triggerConfetti();
      const student = students.find(s => s.id === streakSelectedStudentId);
      if (student) {
        const res = recordGamePoints({
          studentId: student.id,
          gameType: 'daily_streak',
          gameName: 'Thử Thách Đố Vui Hàng Ngày',
          missionTitle: `Đố vui: ${currentStreakQuizQuestion.question.slice(0, 40)}...`,
          points: 15,
          isDailyMission: true,
        });
        showToast(res.message);
      }
    } else {
      sfx.playWrong();
      showToast('Chưa chính xác! Hãy đọc lời giải thích để rút kinh nghiệm.', 'error');
    }
  };

  // Hàm tích hợp bộ câu hỏi từ ngân hàng sang toàn bộ 5 trò chơi
  const handleIntegrateQuestionsToAllGames = (targetSetId?: string) => {
    const nextSetId = targetSetId || selectedSetId;
    setSelectedSetId(nextSetId);
    setGameQuestionSeed(Date.now()); // Kích hoạt trộn ngẫu nhiên câu hỏi & đáp án ngay lập tức

    // Reset tiến trình trò chơi Rung chuông vàng
    setBellQuestionIndex(0);
    setBellSelectedOption(null);
    setBellIsAnswered(false);
    setBellTimeLeft(15);
    setBellTimerActive(false);

    // Reset tiến trình trò chơi Ai là triệu phú
    setMilLevel(0);
    setMilSelectedOption(null);
    setMilIsAnswered(false);
    setMilGameOver(false);
    setMilLifelines({ fiftyFifty: true, audience: true, swap: true });
    setMilEliminatedOptions([]);
    setMilAudiencePoll(null);

    // Reset tiến trình trò chơi Đua thuyền tiếp sức
    setRelayQuestionIndex(0);
    setRelayAnswerSelected(null);
    setRelayWinner(null);
    setRelayPositions({ 1: 0, 2: 0, 3: 0, 4: 0 });

    // Reset thử thách vòng quay & đố vui rèn luyện
    setWheelChallengeOpen(false);
    setWheelChallengeAnswered(false);
    setWheelChallengeSelectedOpt(null);
    setWheelChallengeIndex(0);
    setStreakQuizModalOpen(false);
    setStreakQuizAnswered(false);
    setStreakSelectedAnswer(null);
    setStreakQuizIndex(0);

    const targetSet = savedQuestionSets.find(s => s.id === nextSetId) || activeQuestionSet;
    const count = targetSet?.questions?.length || 0;

    sfx.playVictory();
    triggerConfetti();
    showToast(`⚡ ĐÃ TÍCH HỢP & XÁO TRỘN NGẪU NHIÊN ${count} CÂU HỎI VÀO TOÀN BỘ 5 TRÒ CHƠI!`);
  };

  // Hàm trộn ngẫu nhiên lại câu hỏi & 4 đáp án A, B, C, D
  const handleReshuffleQuestions = () => {
    setGameQuestionSeed(Date.now());
    sfx.playTick();
    showToast('🎲 Đã xáo trộn ngẫu nhiên lại thứ tự câu hỏi và thứ tự các đáp án A, B, C, D!');
  };

  // =========================================================================
  // HỆ THỐNG THẨM ĐỊNH, DUYỆT & CHỈNH SỬA CÂU HỎI CỦA GIÁO VIÊN TRƯỚC KHI THI
  // =========================================================================
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [reviewSetId, setReviewSetId] = useState<string>(() => {
    return savedQuestionSets[0]?.id || 'set_default_1';
  });

  // Modal chỉnh sửa từng câu hỏi
  const [editQuestionModalOpen, setEditQuestionModalOpen] = useState<boolean>(false);
  const [isCreatingNewQuestion, setIsCreatingNewQuestion] = useState<boolean>(false);
  const [editFormSetId, setEditFormSetId] = useState<string>('');
  const [editFormQuestionId, setEditFormQuestionId] = useState<string>('');
  const [editFormText, setEditFormText] = useState<string>('');
  const [editFormOptions, setEditFormOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [editFormCorrectIndex, setEditFormCorrectIndex] = useState<number>(0);
  const [editFormLevel, setEditFormLevel] = useState<'Dễ' | 'Trung bình' | 'Khó' | 'Cực khó'>('Trung bình');
  const [editFormExplanation, setEditFormExplanation] = useState<string>('');
  const [editFormNotes, setEditFormNotes] = useState<string>('');
  const [editFormApproved, setEditFormApproved] = useState<boolean>(true);
  const [editFormError, setEditFormError] = useState<string>('');

  const setBeingReviewed = useMemo(() => {
    return savedQuestionSets.find(s => s.id === reviewSetId) || activeQuestionSet || savedQuestionSets[0];
  }, [savedQuestionSets, reviewSetId, activeQuestionSet]);

  const getSetReviewStats = (set?: GameQuestionSet) => {
    if (!set || !set.questions || set.questions.length === 0) {
      return { total: 0, approved: 0, percent: 0, isFullyApproved: false };
    }
    const total = set.questions.length;
    const approved = set.questions.filter(q => q.isApproved).length;
    const percent = Math.round((approved / total) * 100);
    const isFullyApproved = (set.isReviewedByTeacher && approved === total) || (total > 0 && approved === total);
    return { total, approved, percent, isFullyApproved };
  };

  const handleOpenReviewModal = (setId?: string) => {
    const targetId = setId || selectedSetId || savedQuestionSets[0]?.id;
    setReviewSetId(targetId);
    setReviewModalOpen(true);
  };

  const handleToggleQuestionApproval = (setId: string, questionId: string) => {
    const targetSet = savedQuestionSets.find(s => s.id === setId);
    if (!targetSet) return;

    const updatedQuestions = targetSet.questions.map(q => {
      if (q.id === questionId) {
        return { ...q, isApproved: !q.isApproved };
      }
      return q;
    });

    const allApproved = updatedQuestions.every(q => q.isApproved);
    const updatedSet: GameQuestionSet = {
      ...targetSet,
      questions: updatedQuestions,
      isReviewedByTeacher: allApproved,
      reviewedAt: allApproved ? new Date().toISOString() : targetSet.reviewedAt,
      updatedAt: new Date().toISOString(),
    };

    saveQuestionSet(updatedSet);
    sfx.playTick();
    const qNow = updatedQuestions.find(q => q.id === questionId);
    showToast(qNow?.isApproved ? '✅ Đã duyệt câu hỏi đạt chuẩn sư phạm!' : 'Đã bỏ duyệt câu hỏi.');
  };

  const handleApproveAllQuestionsInSet = (setId: string) => {
    const targetSet = savedQuestionSets.find(s => s.id === setId);
    if (!targetSet) return;

    const updatedQuestions = targetSet.questions.map(q => ({
      ...q,
      isApproved: true,
    }));

    const updatedSet: GameQuestionSet = {
      ...targetSet,
      questions: updatedQuestions,
      isReviewedByTeacher: true,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveQuestionSet(updatedSet);
    sfx.playVictory();
    triggerConfetti();
    showToast(`🛡️ ĐÃ PHÊ DUYỆT TOÀN BỘ ${updatedQuestions.length} CÂU HỎI TRONG BỘ ĐỀ! ĐỦ CHUẨN SƯ PHẠM ĐỂ THI.`);
  };

  const handleStartEditQuestion = (setId: string, question: GameQuestion) => {
    setEditFormSetId(setId);
    setEditFormQuestionId(question.id);
    setIsCreatingNewQuestion(false);
    setEditFormText(question.question);
    setEditFormOptions([
      question.options[0] || '',
      question.options[1] || '',
      question.options[2] || '',
      question.options[3] || '',
    ]);
    setEditFormCorrectIndex(question.correctIndex >= 0 && question.correctIndex < 4 ? question.correctIndex : 0);
    setEditFormLevel(question.level || 'Trung bình');
    setEditFormExplanation(question.explanation || '');
    setEditFormNotes(question.notes || '');
    setEditFormApproved(question.isApproved ?? true);
    setEditFormError('');
    setEditQuestionModalOpen(true);
  };

  const handleStartCreateQuestion = (setId: string) => {
    setEditFormSetId(setId);
    setEditFormQuestionId(`q_custom_${Date.now()}`);
    setIsCreatingNewQuestion(true);
    setEditFormText('');
    setEditFormOptions(['', '', '', '']);
    setEditFormCorrectIndex(0);
    setEditFormLevel('Trung bình');
    setEditFormExplanation('');
    setEditFormNotes('');
    setEditFormApproved(true);
    setEditFormError('');
    setEditQuestionModalOpen(true);
  };

  const handleSaveEditedQuestion = () => {
    if (!editFormText.trim()) {
      setEditFormError('Vui lòng nhập nội dung câu hỏi!');
      return;
    }
    if (editFormText.trim().length < 10) {
      setEditFormError('Nội dung câu hỏi quá ngắn (tối thiểu 10 ký tự). Thầy/Cô vui lòng viết đầy đủ, không để sơ sài!');
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (!editFormOptions[i]?.trim()) {
        setEditFormError(`Phương án [${['A', 'B', 'C', 'D'][i]}] không được để trống!`);
        return;
      }
    }

    const targetSet = savedQuestionSets.find(s => s.id === editFormSetId);
    if (!targetSet) {
      setEditFormError('Không tìm thấy bộ câu hỏi!');
      return;
    }

    const questionObj: GameQuestion = {
      id: editFormQuestionId,
      question: editFormText.trim(),
      options: [
        editFormOptions[0].trim(),
        editFormOptions[1].trim(),
        editFormOptions[2].trim(),
        editFormOptions[3].trim(),
      ],
      correctIndex: editFormCorrectIndex,
      level: editFormLevel,
      explanation: editFormExplanation.trim() || `Phương án đúng là ${['A', 'B', 'C', 'D'][editFormCorrectIndex]}.`,
      notes: editFormNotes.trim(),
      isApproved: editFormApproved,
    };

    let updatedQuestions: GameQuestion[];
    if (isCreatingNewQuestion) {
      updatedQuestions = [...targetSet.questions, questionObj];
    } else {
      updatedQuestions = targetSet.questions.map(q => (q.id === questionObj.id ? questionObj : q));
    }

    const allApproved = updatedQuestions.every(q => q.isApproved);
    const updatedSet: GameQuestionSet = {
      ...targetSet,
      questions: updatedQuestions,
      isReviewedByTeacher: allApproved,
      reviewedAt: allApproved ? new Date().toISOString() : targetSet.reviewedAt,
      updatedAt: new Date().toISOString(),
    };

    saveQuestionSet(updatedSet);
    setEditQuestionModalOpen(false);
    sfx.playTick();
    showToast(isCreatingNewQuestion ? '➕ Đã thêm câu hỏi mới vào bộ đề!' : '💾 Đã lưu chỉnh sửa câu hỏi & cập nhật đáp án đúng!');
  };

  const handleDeleteQuestionFromSet = (setId: string, questionId: string) => {
    const targetSet = savedQuestionSets.find(s => s.id === setId);
    if (!targetSet) return;
    if (targetSet.questions.length <= 1) {
      showToast('Bộ câu hỏi cần có tối thiểu 1 câu, không thể xóa hết!', 'error');
      return;
    }
    const updatedQuestions = targetSet.questions.filter(q => q.id !== questionId);
    const allApproved = updatedQuestions.length > 0 && updatedQuestions.every(q => q.isApproved);
    const updatedSet: GameQuestionSet = {
      ...targetSet,
      questions: updatedQuestions,
      isReviewedByTeacher: allApproved,
      updatedAt: new Date().toISOString(),
    };
    saveQuestionSet(updatedSet);
    sfx.playTick();
    showToast('🗑️ Đã xóa câu hỏi khỏi bộ đề.');
  };

  // Banner cảnh báo sư phạm hiển thị trong các trò chơi nếu bộ đề chưa được GV duyệt
  const renderPedagogicalQualityWarningBanner = () => {
    const stats = getSetReviewStats(activeQuestionSet);
    if (stats.isFullyApproved) return null;

    return (
      <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in duration-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-amber-950 flex items-center gap-1.5 flex-wrap">
              <span>LƯU Ý SƯ PHẠM TRƯỚC KHI THI ĐẤU:</span>
              <span className="font-semibold text-amber-900">
                Bộ đề "{activeQuestionSet?.title}" còn {stats.total - stats.approved}/{stats.total} câu chưa duyệt ({stats.approved}/{stats.total} đã duyệt).
              </span>
            </div>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Giáo viên cần xem lại nội dung và đáp án trước khi cho học sinh thi, tránh để câu hỏi sơ sài hoặc sai lệch kiến thức!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => handleOpenReviewModal(activeQuestionSet?.id)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>🔍 Duyệt & Sửa câu hỏi ngay</span>
          </button>

          <button
            type="button"
            onClick={() => activeQuestionSet && handleApproveAllQuestionsInSet(activeQuestionSet.id)}
            className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px]"
            title="Xác nhận đã kiểm tra và phê duyệt nhanh toàn bộ câu hỏi trong bộ đề này"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đã kiểm tra - Duyệt nhanh</span>
          </button>
        </div>
      </div>
    );
  };

  // Thanh công cụ tích hợp & chọn bộ câu hỏi dùng chung cho từng trò chơi
  const renderGameQuestionHeaderBar = (gameName: string, accentColor: string = 'bg-blue-600') => {
    const stats = getSetReviewStats(activeQuestionSet);

    return (
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 ${accentColor} rounded-xl shadow-xs`}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-amber-300 flex items-center gap-2 flex-wrap">
              <span>Bộ câu hỏi áp dụng cho {gameName}:</span>
              <span className="text-white underline decoration-amber-400 font-black">
                {activeQuestionSet?.title || 'Bộ đề rèn luyện'}
              </span>
              <span className="px-2 py-0.5 bg-indigo-600 text-[10px] text-white rounded-full font-mono font-bold">
                {randomizedGameQuestions.length} câu hỏi
              </span>
              {stats.isFullyApproved ? (
                <span className="px-2 py-0.5 bg-emerald-600/90 text-white rounded-md text-[10px] font-black flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3 h-3 text-white" />
                  <span>ĐÃ DUYỆT BỞI GV</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded-md text-[10px] font-black flex items-center gap-1 shadow-xs animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-slate-950" />
                  <span>CHỜ GV DUYỆT ({stats.approved}/{stats.total})</span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-300">
              Chủ đề: <strong className="text-amber-200">{activeQuestionSet?.topic || 'Kiến thức chung'}</strong> • Đã xáo trộn ngẫu nhiên thứ tự câu hỏi & 4 đáp án A, B, C, D
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSetId}
            onChange={e => handleIntegrateQuestionsToAllGames(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-800 text-amber-300 font-bold rounded-xl border border-indigo-400/40 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-[180px] sm:max-w-xs truncate cursor-pointer"
          >
            {savedQuestionSets.map(set => {
              const sStat = getSetReviewStats(set);
              return (
                <option key={set.id} value={set.id} className="bg-slate-900 text-white">
                  {sStat.isFullyApproved ? '🛡️' : '⚠️'} {set.title} ({set.questions.length} câu)
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={() => handleOpenReviewModal(activeQuestionSet?.id)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 border border-indigo-400/40"
            title="Mở bảng kiểm duyệt, sửa câu hỏi và đáp án trước khi thi đấu"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
            <span>📝 DUYỆT & SỬA CÂU HỎI</span>
          </button>

          <button
            type="button"
            onClick={() => handleIntegrateQuestionsToAllGames(selectedSetId)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Tích hợp bộ câu hỏi này vào tất cả các trò chơi và đồng bộ ngay"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span>⚡ TÍCH HỢP VÀO GAME</span>
          </button>

          <button
            type="button"
            onClick={handleReshuffleQuestions}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
            title="Xáo trộn ngẫu nhiên lại thứ tự câu hỏi và 4 đáp án A-B-C-D"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">🎲 Đổi ngẫu nhiên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveGame('ai_creator')}
            className="px-2.5 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold rounded-xl border border-indigo-400/30 transition-all cursor-pointer flex items-center gap-1"
            title="Mở Ngân hàng & Trợ lý AI tạo câu hỏi mới theo chủ đề"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">✨ Tạo / Đổi bộ</span>
          </button>
        </div>
      </div>
    );
  };

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sfx.setEnabled(next);
  };

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (_) {}
  };

  // =========================================================================
  // 1. GAME: VÒNG QUAY MAY MẮN (LUCKY WHEEL)
  // =========================================================================
  const [wheelGroupFilter, setWheelGroupFilter] = useState<number | 'all'>('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelResultStudent, setWheelResultStudent] = useState<Student | null>(null);
  const [wheelResultPrize, setWheelResultPrize] = useState<string>('');
  const [wheelBonusPoints, setWheelBonusPoints] = useState<number>(20);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);

  const wheelEligibleStudents = useMemo(() => {
    if (wheelGroupFilter === 'all') return students;
    return students.filter(s => s.groupId === wheelGroupFilter);
  }, [students, wheelGroupFilter]);

  const wheelPrizes = useMemo(() => [
    { label: 'Cộng 10 điểm', points: 10, color: '#3B82F6' },
    { label: 'Cộng 20 điểm', points: 20, color: '#10B981' },
    { label: 'Thử thách đố vui', points: 30, color: '#F59E0B' },
    { label: 'Hộp quà bí mật', points: 25, color: '#8B5CF6' },
    { label: 'Tuyên dương trước lớp', points: 15, color: '#EC4899' },
    { label: 'Cộng 50 điểm cực đại', points: 50, color: '#EF4444' },
    { label: 'Chọn bạn song ca / trả lời', points: 20, color: '#06B6D4' },
    { label: 'Nhân đôi may mắn', points: 40, color: '#14B8A6' },
  ], []);

  // Draw wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    const slices = wheelPrizes.length;
    const sliceAngle = (2 * Math.PI) / slices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentAngleRef.current);

    wheelPrizes.forEach((prize, i) => {
      const angle = i * sliceAngle;
      ctx.beginPath();
      ctx.fillStyle = prize.color;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(prize.label, radius - 20, 5);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#1E293B';
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUAY', 0, 0);

    ctx.restore();

    // Top pointer
    ctx.beginPath();
    ctx.moveTo(centerX - 14, 10);
    ctx.lineTo(centerX + 14, 10);
    ctx.lineTo(centerX, 36);
    ctx.closePath();
    ctx.fillStyle = '#E11D48';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [wheelPrizes]);

  const spinWheel = () => {
    if (isSpinning) return;
    if (wheelEligibleStudents.length === 0) {
      showToast('Chưa có học sinh trong danh sách để quay!', 'error');
      return;
    }

    setIsSpinning(true);
    setWheelResultStudent(null);
    setWheelResultPrize('');

    // Select random student and random prize
    const randomStudent = wheelEligibleStudents[Math.floor(Math.random() * wheelEligibleStudents.length)];
    const randomPrizeIndex = Math.floor(Math.random() * wheelPrizes.length);
    const targetPrize = wheelPrizes[randomPrizeIndex];

    const sliceAngle = (2 * Math.PI) / wheelPrizes.length;
    // Calculate target stop angle (pointer is at top: 3 * Math.PI / 2)
    const extraRotations = (5 + Math.floor(Math.random() * 4)) * (2 * Math.PI);
    const targetAngle = extraRotations + (3 * Math.PI / 2) - (randomPrizeIndex * sliceAngle + sliceAngle / 2);

    const startTime = performance.now();
    const duration = 3800; // 3.8s
    const startAngle = currentAngleRef.current % (2 * Math.PI);

    let lastTickAngle = startAngle;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startAngle + (targetAngle - startAngle) * easeOut;
      currentAngleRef.current = current;

      // Play tick sound on sector transition
      if (Math.abs(current - lastTickAngle) > sliceAngle) {
        sfx.playTick();
        lastTickAngle = current;
      }

      // Redraw
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(centerX, centerY) - 15;

          ctx.clearRect(0, 0, width, height);

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(current);

          wheelPrizes.forEach((prize, i) => {
            const angle = i * sliceAngle;
            ctx.beginPath();
            ctx.fillStyle = prize.color;
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, angle, angle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.save();
            ctx.rotate(angle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(prize.label, radius - 20, 5);
            ctx.restore();
          });

          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, 2 * Math.PI);
          ctx.fillStyle = '#1E293B';
          ctx.fill();
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.fillStyle = '#FACC15';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('QUAY', 0, 0);

          ctx.restore();

          // Pointer
          ctx.beginPath();
          ctx.moveTo(centerX - 14, 10);
          ctx.lineTo(centerX + 14, 10);
          ctx.lineTo(centerX, 36);
          ctx.closePath();
          ctx.fillStyle = '#E11D48';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setWheelResultStudent(randomStudent);
        setWheelResultPrize(targetPrize.label);
        setWheelBonusPoints(targetPrize.points);
        sfx.playVictory();
        triggerConfetti();
      }
    };

    requestAnimationFrame(animate);
  };

  const handleClaimWheelReward = () => {
    if (!wheelResultStudent) return;
    const res = recordGamePoints({
      studentId: wheelResultStudent.id,
      gameType: 'lucky_wheel',
      gameName: 'Vòng Quay May Mắn',
      missionTitle: `Trúng phần thưởng: ${wheelResultPrize}`,
      points: wheelBonusPoints,
    });
    showToast(res.message);
    setWheelResultStudent(null);
  };

  // =========================================================================
  // 2. GAME: ĐẤU TRÍ RUNG CHUÔNG VÀNG (GOLDEN BELL)
  // =========================================================================
  const [bellQuestionIndex, setBellQuestionIndex] = useState<number>(0);
  const [bellSelectedStudentId, setBellSelectedStudentId] = useState<string>('');
  const [bellSelectedOption, setBellSelectedOption] = useState<number | null>(null);
  const [bellIsAnswered, setBellIsAnswered] = useState<boolean>(false);
  const [bellTimeLeft, setBellTimeLeft] = useState<number>(15);
  const [bellTimerActive, setBellTimerActive] = useState<boolean>(false);
  const [bellScore, setBellScore] = useState<number>(0);
  const [bellStreak, setBellStreak] = useState<number>(0);

  const bellQuestions = randomizedGameQuestions;

  const currentBellQuestion = bellQuestions[bellQuestionIndex] || null;

  // Countdown timer for Rung Chuông Vàng
  useEffect(() => {
    let timer: any = null;
    if (bellTimerActive && bellTimeLeft > 0 && !bellIsAnswered) {
      timer = setInterval(() => {
        setBellTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setBellIsAnswered(true);
            sfx.playWrong();
            return 0;
          }
          if (prev <= 5) {
            sfx.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [bellTimerActive, bellTimeLeft, bellIsAnswered]);

  const startBellQuestion = () => {
    setBellSelectedOption(null);
    setBellIsAnswered(false);
    setBellTimeLeft(15);
    setBellTimerActive(true);
  };

  const handleSelectBellOption = (optionIndex: number) => {
    if (bellIsAnswered || !currentBellQuestion) return;
    setBellSelectedOption(optionIndex);
    setBellIsAnswered(true);
    setBellTimerActive(false);

    const isCorrect = optionIndex === currentBellQuestion.correctIndex;
    if (isCorrect) {
      sfx.playCorrect();
      triggerConfetti();
      const pointsToAdd = currentBellQuestion.level === 'Dễ' ? 10 : currentBellQuestion.level === 'Trung bình' ? 20 : currentBellQuestion.level === 'Khó' ? 30 : 50;
      setBellScore(prev => prev + pointsToAdd);
      setBellStreak(prev => prev + 1);

      if (bellSelectedStudentId) {
        recordGamePoints({
          studentId: bellSelectedStudentId,
          gameType: 'golden_bell',
          gameName: 'Rung Chuông Vàng',
          missionTitle: `Trả lời đúng câu hỏi cấp độ ${currentBellQuestion.level}`,
          points: pointsToAdd,
        });
      }
    } else {
      sfx.playWrong();
      setBellStreak(0);
    }
  };

  const nextBellQuestion = () => {
    if (bellQuestionIndex + 1 < bellQuestions.length) {
      setBellQuestionIndex(prev => prev + 1);
      setBellSelectedOption(null);
      setBellIsAnswered(false);
      setBellTimeLeft(15);
      setBellTimerActive(true);
    } else {
      sfx.playVictory();
      triggerConfetti();
      showToast('Chúc mừng! Bạn đã hoàn thành toàn bộ câu hỏi Rung Chuông Vàng!');
    }
  };

  // =========================================================================
  // 3. GAME: AI LÀ TRIỆU PHÚ (CLASS MILLIONAIRE)
  // =========================================================================
  const [milStudentId, setMilStudentId] = useState<string>('');
  const [milLevel, setMilLevel] = useState<number>(0); // 0 to 14
  const [milSelectedOption, setMilSelectedOption] = useState<number | null>(null);
  const [milIsAnswered, setMilIsAnswered] = useState<boolean>(false);
  const [milGameOver, setMilGameOver] = useState<boolean>(false);
  const [milLifelines, setMilLifelines] = useState<{ fiftyFifty: boolean; audience: boolean; swap: boolean }>({
    fiftyFifty: true,
    audience: true,
    swap: true,
  });
  const [milEliminatedOptions, setMilEliminatedOptions] = useState<number[]>([]);
  const [milAudiencePoll, setMilAudiencePoll] = useState<number[] | null>(null);

  const millionaireLadders = [
    { level: 1, points: 100, safe: false },
    { level: 2, points: 200, safe: false },
    { level: 3, points: 300, safe: false },
    { level: 4, points: 500, safe: false },
    { level: 5, points: 1000, safe: true }, // Mốc an toàn 1
    { level: 6, points: 1500, safe: false },
    { level: 7, points: 2000, safe: false },
    { level: 8, points: 3000, safe: false },
    { level: 9, points: 4000, safe: false },
    { level: 10, points: 5000, safe: true }, // Mốc an toàn 2
    { level: 11, points: 6000, safe: false },
    { level: 12, points: 7000, safe: false },
    { level: 13, points: 8000, safe: false },
    { level: 14, points: 9000, safe: false },
    { level: 15, points: 10000, safe: true }, // Mốc đỉnh cao
  ];

  const currentMilQuestion = bellQuestions[milLevel % bellQuestions.length] || null;

  const handleUseFiftyFifty = () => {
    if (!milLifelines.fiftyFifty || !currentMilQuestion || milIsAnswered) return;
    const correct = currentMilQuestion.correctIndex;
    const incorrects = [0, 1, 2, 3].filter(i => i !== correct);
    // Shuffle and pick 2 incorrects to eliminate
    const shuffled = incorrects.sort(() => 0.5 - Math.random());
    setMilEliminatedOptions([shuffled[0], shuffled[1]]);
    setMilLifelines(prev => ({ ...prev, fiftyFifty: false }));
    sfx.playTick();
  };

  const handleUseAudience = () => {
    if (!milLifelines.audience || !currentMilQuestion || milIsAnswered) return;
    const correct = currentMilQuestion.correctIndex;
    // Generate realistic audience distribution (correct has highest percentage)
    const poll = [15, 15, 15, 15];
    poll[correct] = 55;
    setMilAudiencePoll(poll);
    setMilLifelines(prev => ({ ...prev, audience: false }));
    sfx.playTick();
  };

  const handleUseSwap = () => {
    if (!milLifelines.swap || milIsAnswered) return;
    setMilLevel(prev => (prev + 3) % bellQuestions.length);
    setMilLifelines(prev => ({ ...prev, swap: false }));
    setMilEliminatedOptions([]);
    setMilAudiencePoll(null);
    sfx.playTick();
  };

  const handleAnswerMillionaire = (index: number) => {
    if (milIsAnswered || milGameOver || !currentMilQuestion) return;
    setMilSelectedOption(index);
    setMilIsAnswered(true);

    const isCorrect = index === currentMilQuestion.correctIndex;
    if (isCorrect) {
      sfx.playCorrect();
      triggerConfetti();
      if (milLevel === 14) {
        sfx.playVictory();
        setMilGameOver(true);
        showToast('XUẤT SẮC! Học sinh đã trở thành TRIỆU PHÚ TRI THỨC VỚI 10.000 ĐIỂM!');
      }
    } else {
      sfx.playWrong();
      setMilGameOver(true);
    }
  };

  const nextMillionaireLevel = () => {
    setMilLevel(prev => prev + 1);
    setMilSelectedOption(null);
    setMilIsAnswered(false);
    setMilEliminatedOptions([]);
    setMilAudiencePoll(null);
  };

  const resetMillionaire = () => {
    setMilLevel(0);
    setMilSelectedOption(null);
    setMilIsAnswered(false);
    setMilGameOver(false);
    setMilEliminatedOptions([]);
    setMilAudiencePoll(null);
    setMilLifelines({ fiftyFifty: true, audience: true, swap: true });
  };

  const claimMillionaireScore = () => {
    if (!milStudentId) {
      showToast('Vui lòng chọn học sinh trên ghế nóng để cộng điểm!', 'error');
      return;
    }
    const currentRewardPoints = millionaireLadders[Math.max(0, milLevel - 1)]?.points || 100;
    const normalizedPoints = Math.round(currentRewardPoints / 100) * 5; // e.g. 1000 pts -> 50 pts emulation
    const res = recordGamePoints({
      studentId: milStudentId,
      gameType: 'millionaire',
      gameName: 'Ai Là Triệu Phú',
      missionTitle: `Vượt qua mốc câu hỏi số ${milLevel + 1}`,
      points: normalizedPoints,
    });
    showToast(res.message);
  };

  // =========================================================================
  // 4. GAME: THỬ THÁCH RÈN LUYỆN HÀNG NGÀY & TÍCH ĐIỂM (DAILY STREAK)
  // =========================================================================
  const [streakSelectedStudentId, setStreakSelectedStudentId] = useState<string>('');

  const streakDailyQuests = useMemo(() => [
    {
      id: 'quest_1',
      title: 'Đố Vui Kiến Thức Hôm Nay',
      desc: 'Trả lời đúng câu hỏi trí tuệ ngày để kích hoạt chuỗi Streak',
      points: 15,
      type: 'quiz',
      icon: '🧠',
    },
    {
      id: 'quest_2',
      title: 'Chuyên Cần & Trang Phục Chuẩn',
      desc: 'Đi học đúng giờ, sơ vin gọn gàng, mang phù hiệu đầy đủ',
      points: 10,
      type: 'habit',
      icon: '👔',
    },
    {
      id: 'quest_3',
      title: 'Việc Tốt Giúp Đỡ Lớp & Bạn Bè',
      desc: 'Chủ động nhặt rác, hướng dẫn bạn giải bài khó, phụ giúp trực nhật',
      points: 15,
      type: 'good_deed',
      icon: '🌟',
    },
    {
      id: 'quest_4',
      title: 'Học Bài & Làm Bài Đầy Đủ',
      desc: 'Hoàn thành 100% bài tập về nhà và chuẩn bị bài mới chu đáo',
      points: 15,
      type: 'academic',
      icon: '📖',
    },
  ], []);

  // Compute student streaks map
  const studentStreaksMap = useMemo(() => {
    const map = new Map<string, { currentStreak: number; totalPoints: number; records: DailyMissionRecord[] }>();
    students.forEach(s => {
      const records = dailyMissions.filter(m => m.studentId === s.id);
      const totalPoints = records.reduce((sum, r) => sum + r.pointsEarned, 0);
      const currentStreak = records.length > 0 ? records[records.length - 1].streakDays : 0;
      map.set(s.id, { currentStreak, totalPoints, records });
    });
    return map;
  }, [students, dailyMissions]);

  const handleCompleteDailyQuest = (quest: any) => {
    if (!streakSelectedStudentId) {
      showToast('Vui lòng chọn học sinh thực hiện nhiệm vụ!', 'error');
      return;
    }
    const student = students.find(s => s.id === streakSelectedStudentId);
    if (!student) return;

    if (quest.type === 'quiz') {
      handleOpenStreakQuiz();
      return;
    }

    const res = recordGamePoints({
      studentId: student.id,
      gameType: 'daily_streak',
      gameName: 'Rèn Luyện Hàng Ngày',
      missionTitle: quest.title,
      points: quest.points,
      isDailyMission: true,
    });

    sfx.playVictory();
    triggerConfetti();
    showToast(res.message);
  };

  // =========================================================================
  // 5. GAME: ĐUA THUYỀN TIẾP SỨC 4 TỔ (TEAM RELAY RACE)
  // =========================================================================
  const [relayPositions, setRelayPositions] = useState<{ [groupId: number]: number }>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const [relayActiveGroup, setRelayActiveGroup] = useState<number>(1);
  const [relayQuestionIndex, setRelayQuestionIndex] = useState<number>(0);
  const [relayAnswerSelected, setRelayAnswerSelected] = useState<number | null>(null);
  const [relayWinner, setRelayWinner] = useState<number | null>(null);

  const relayQuestion = bellQuestions[relayQuestionIndex % bellQuestions.length] || null;

  const handleRelayAnswer = (optionIdx: number) => {
    if (!relayQuestion || relayAnswerSelected !== null || relayWinner !== null) return;
    setRelayAnswerSelected(optionIdx);

    const isCorrect = optionIdx === relayQuestion.correctIndex;
    if (isCorrect) {
      sfx.playCorrect();
      triggerConfetti();
      setRelayPositions(prev => {
        const nextPos = (prev[relayActiveGroup] || 0) + 1;
        const updated = { ...prev, [relayActiveGroup]: nextPos };
        if (nextPos >= 5) {
          setRelayWinner(relayActiveGroup);
          sfx.playVictory();
          showToast(`CHÚC MỪNG TỔ ${relayActiveGroup} ĐÃ VỀ ĐÍCH ĐẦU TIÊN! 🏆`);
        }
        return updated;
      });
    } else {
      sfx.playWrong();
      showToast(`Tổ ${relayActiveGroup} chưa ghi được điểm lượt này. Đến lượt Tổ tiếp theo!`, 'info');
    }
  };

  const nextRelayTurn = () => {
    setRelayAnswerSelected(null);
    setRelayQuestionIndex(prev => prev + 1);
    setRelayActiveGroup(prev => (prev % 4) + 1);
  };

  const resetRelayRace = () => {
    setRelayPositions({ 1: 0, 2: 0, 3: 0, 4: 0 });
    setRelayWinner(null);
    setRelayAnswerSelected(null);
    setRelayActiveGroup(1);
  };

  // =========================================================================
  // 6. AI QUESTION CREATOR (TẠO CÂU HỎI BẰNG AI)
  // =========================================================================
  const [aiTopic, setAiTopic] = useState<string>('Chương II: Di truyền NST (Sinh học)');
  const [aiContent, setAiContent] = useState<string>('');
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(10);
  const [aiIsLoading, setAiIsLoading] = useState<boolean>(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [detectedFileQuestions, setDetectedFileQuestions] = useState<GameQuestion[]>([]);

  const [fileEncodingInfo, setFileEncodingInfo] = useState<string>('');

  // Parser: Tự động trích xuất các câu hỏi trắc nghiệm từ văn bản thô (Word / Text)
  const parseQuestionsFromRawText = (rawText: string, topicTitle: string): GameQuestion[] => {
    if (!rawText || rawText.length < 20) return [];
    const clean = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const qRegex = /(?:^|\n)\s*(?:(?:Câu|Bài|Q)\s*\d+[\s:.)-]|(?:\d+)[\s:.)-])\s*/gi;
    const matches: { index: number; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = qRegex.exec(clean)) !== null) {
      matches.push({ index: m.index, text: m[0] });
    }

    if (matches.length < 1) return [];

    const list: GameQuestion[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].text.length;
      const end = (i + 1 < matches.length) ? matches[i + 1].index : clean.length;
      const block = clean.slice(start, end).trim();

      const optAReg = /(?:^|\n|\s+)(?:[\*\[\(]?)[A|a][\s.:\)\-\]](?:\s*)/;
      const optBReg = /(?:^|\n|\s+)(?:[\*\[\(]?)[B|b][\s.:\)\-\]](?:\s*)/;
      const optCReg = /(?:^|\n|\s+)(?:[\*\[\(]?)[C|c][\s.:\)\-\]](?:\s*)/;
      const optDReg = /(?:^|\n|\s+)(?:[\*\[\(]?)[D|d][\s.:\)\-\]](?:\s*)/;

      const aIdx = block.search(optAReg);
      const bIdx = block.search(optBReg);
      const cIdx = block.search(optCReg);
      const dIdx = block.search(optDReg);

      if (aIdx !== -1 && bIdx !== -1 && cIdx !== -1 && dIdx !== -1 && aIdx < bIdx && bIdx < cIdx && cIdx < dIdx) {
        const qText = block.slice(0, aIdx).trim();
        const optA = block.slice(aIdx, bIdx).replace(/^(?:[\*\[\(]?)[A|a][\s.:\)\-\]]\s*/, '').trim();
        const optB = block.slice(bIdx, cIdx).replace(/^(?:[\*\[\(]?)[B|b][\s.:\)\-\]]\s*/, '').trim();
        const optC = block.slice(cIdx, dIdx).replace(/^(?:[\*\[\(]?)[C|c][\s.:\)\-\]]\s*/, '').trim();
        let optD = block.slice(dIdx).replace(/^(?:[\*\[\(]?)[D|d][\s.:\)\-\]]\s*/, '').trim();

        const endMatch = optD.match(/(?:Đáp\s*án|Chọn|Key|Lời\s*giải|Hướng\s*dẫn|Giải\s*thích)/i);
        if (endMatch && endMatch.index !== undefined) {
          optD = optD.slice(0, endMatch.index).trim();
        }

        let correctIndex = 0;
        // Kiểm tra dấu * ở đầu các đáp án (ví dụ *A hoặc *B)
        if (block.slice(aIdx, bIdx).includes('*A') || block.slice(aIdx, bIdx).includes('*a')) correctIndex = 0;
        else if (block.slice(bIdx, cIdx).includes('*B') || block.slice(bIdx, cIdx).includes('*b')) correctIndex = 1;
        else if (block.slice(cIdx, dIdx).includes('*C') || block.slice(cIdx, dIdx).includes('*c')) correctIndex = 2;
        else if (block.slice(dIdx).includes('*D') || block.slice(dIdx).includes('*d')) correctIndex = 3;
        else {
          const ansMatch = block.match(/(?:Đáp\s*án|Chọn|Key|Đ\/A|ĐA|Hướng\s*dẫn)[\s:.]*\s*([A-Da-d])/i);
          if (ansMatch) {
            const letter = ansMatch[1].toUpperCase();
            if (letter === 'A') correctIndex = 0;
            else if (letter === 'B') correctIndex = 1;
            else if (letter === 'C') correctIndex = 2;
            else if (letter === 'D') correctIndex = 3;
          }
        }

        let explanation = `Đáp án đúng là ${['A', 'B', 'C', 'D'][correctIndex]} theo tài liệu ${topicTitle}.`;
        const explMatch = block.match(/(?:Lời\s*giải|Hướng\s*dẫn|Giải\s*thích)[\s:.]*([\s\S]*)/i);
        if (explMatch) {
          explanation = explMatch[1].trim().slice(0, 300);
        }

        const pct = (i + 1) / matches.length;
        let level: 'Dễ' | 'Trung bình' | 'Khó' | 'Cực khó' = 'Dễ';
        if (pct > 0.8) level = 'Cực khó';
        else if (pct > 0.55) level = 'Khó';
        else if (pct > 0.3) level = 'Trung bình';

        const rawQ: GameQuestion = {
          id: `q_parsed_${Date.now()}_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
          question: qText || `Câu hỏi số ${i + 1}`,
          options: [optA || 'Lựa chọn A', optB || 'Lựa chọn B', optC || 'Lựa chọn C', optD || 'Lựa chọn D'],
          correctIndex,
          level,
          explanation,
        };

        // Đảo ngẫu nhiên 4 đáp án ngay từ bước nạp để đảm bảo công bằng
        list.push(shuffleQuestionOptions(rawQ));
      }
    }
    return list;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setAiErrorMessage(null);
    setFileEncodingInfo('');

    // Tự động nhận diện Chủ đề (Topic) từ tên tệp (ví dụ: Bo_de_30_cau_Chuong_II_Di_truyen_NST.docx -> Chương II: Di truyền NST)
    let cleanTopic = file.name
      .replace(/\.(docx|doc|xlsx|xls|txt|csv|json)$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/^(Bo|De|Bo de|Tai lieu|Cau hoi|On tap)\s*\d*\s*(cau)?\s*/i, '')
      .trim();

    if (cleanTopic) {
      setAiTopic(cleanTopic);
    }

    try {
      let extractedText = '';
      let encodingLabel = 'Unicode (UTF-8)';

      if (file.name.match(/\.docx$/i)) {
        // Đọc file Word .docx bằng Mammoth
        const arrayBuffer = await file.arrayBuffer();
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value || '';
          encodingLabel = 'Word .docx (Unicode)';
        } catch (mErr) {
          console.warn('Lỗi đọc bằng mammoth, chuyển sang bộ trích xuất văn bản dự phòng:', mErr);
          extractedText = extractTextFromLegacyDoc(arrayBuffer);
          encodingLabel = 'Word .docx (Văn bản trích xuất)';
        }
      } else if (file.name.match(/\.doc$/i)) {
        // File Word cũ .doc (97-2003) - Trích xuất văn bản chống lỗi font
        const arrayBuffer = await file.arrayBuffer();
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value || '';
        } catch (_) {
          extractedText = extractTextFromLegacyDoc(arrayBuffer);
        }
        encodingLabel = 'Word .doc (Chuẩn hóa tiếng Việt)';
      } else if (file.name.match(/\.xlsx$/i) || file.name.match(/\.xls$/i)) {
        // Đọc file Excel .xlsx / .xls
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetTexts: string[] = [];
        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          if (ws) {
            sheetTexts.push(XLSX.utils.sheet_to_txt(ws));
          }
        });
        extractedText = sheetTexts.join('\n\n');
        encodingLabel = 'Excel Bảng Tính (Unicode)';
      } else {
        // Đọc file text thuần .txt, .csv, .json với bộ giải mã đa bảng mã (UTF-8, UTF-16, Windows-1258, TCVN3)
        const res = await readTextFileWithEncoding(file);
        extractedText = res.text;
        encodingLabel = res.encoding;
      }

      // Tự động kiểm tra và chuyển đổi phông chữ TCVN3 (.VnTime, .VnArial) hoặc VNI sang Unicode chuẩn 100%
      const autoFixed = autoFixVietnameseText(extractedText);
      extractedText = autoFixed.text;
      if (autoFixed.fixed) {
        encodingLabel = autoFixed.detectedEncoding;
      }

      if (!extractedText.trim()) {
        showToast('Tệp rỗng hoặc không thể trích xuất văn bản.', 'error');
        return;
      }

      setAiContent(extractedText);
      setFileEncodingInfo(encodingLabel);

      // Tự động quét xem trong file đã có sẵn câu hỏi trắc nghiệm chưa!
      const detected = parseQuestionsFromRawText(extractedText, cleanTopic || 'Bộ đề kiểm tra');
      if (detected.length > 0) {
        setDetectedFileQuestions(detected);
        sfx.playVictory();
        showToast(`Đã nhận diện chuẩn tiếng Việt (${encodingLabel}) và tìm thấy ${detected.length} câu hỏi trắc nghiệm!`);
      } else {
        setDetectedFileQuestions([]);
        showToast(`Đã đọc tiếng Việt chuẩn (${encodingLabel}) từ tệp "${file.name}"!`);
      }
    } catch (err: any) {
      console.error('Lỗi đọc file:', err);
      showToast('Lỗi khi đọc file tài liệu: ' + (err.message || 'Định dạng file không hỗ trợ'), 'error');
    }
  };

  // Nút thủ công sửa lỗi font chữ TCVN3 (.VnTime) sang Unicode
  const handleFixFontInContent = () => {
    if (!aiContent.trim()) {
      showToast('Vui lòng nhập hoặc dán nội dung trước khi sửa lỗi font!', 'error');
      return;
    }
    const fixed = convertTCVN3ToUnicode(aiContent).normalize('NFC');
    setAiContent(fixed);
    const detected = parseQuestionsFromRawText(fixed, aiTopic || 'Bộ đề kiểm tra');
    if (detected.length > 0) {
      setDetectedFileQuestions(detected);
    }
    sfx.playVictory();
    triggerConfetti();
    showToast('Đã sửa xong lỗi phông chữ TCVN3 (.VnTime) sang Unicode tiếng Việt chuẩn 100%!');
  };

  const handleImportDetectedQuestions = () => {
    if (detectedFileQuestions.length === 0) return;

    const newSet: GameQuestionSet = {
      id: `set_file_${Date.now()}`,
      title: `Bộ đề: ${aiTopic || uploadedFileName || 'Tài liệu tải lên'} (${detectedFileQuestions.length} câu)`,
      topic: aiTopic || 'Tài liệu tải lên',
      sourceContent: aiContent.slice(0, 500),
      createdAt: new Date().toISOString(),
      isReviewedByTeacher: false, // Yêu cầu giáo viên thẩm định trước khi thi
      questions: detectedFileQuestions.map(q => ({
        ...q,
        isApproved: false, // Chờ duyệt
      })),
    };

    saveQuestionSet(newSet);
    handleIntegrateQuestionsToAllGames(newSet.id);
    setDetectedFileQuestions([]);
    triggerConfetti();
    sfx.playVictory();
    // Mở ngay bàn làm việc duyệt đề cho giáo viên kiểm tra nội dung & đáp án
    handleOpenReviewModal(newSet.id);
    showToast(`⚡ ĐÃ NẠP ${newSet.questions.length} CÂU HỎI! Vui lòng duyệt & sửa nội dung, đáp án trước khi tổ chức thi!`);
  };

  const handleGenerateQuestionsWithAI = async () => {
    if (!aiTopic.trim() && !aiContent.trim()) {
      setAiErrorMessage('Vui lòng nhập Chủ đề hoặc dán/tải nội dung tài liệu lên.');
      return;
    }

    setAiIsLoading(true);
    setAiErrorMessage(null);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          content: aiContent.trim(),
          questionCount: aiQuestionCount,
        }),
      });

      const resData = await response.json();

      if (resData.success && Array.isArray(resData.questions) && resData.questions.length > 0) {
        // Đảo ngẫu nhiên câu hỏi & đáp án khi lưu
        const shuffledList = resData.questions.map((q: GameQuestion) => ({
          ...shuffleQuestionOptions(q),
          isApproved: false, // Bắt buộc GV phải duyệt từng câu
        }));
        const newSet: GameQuestionSet = {
          id: `set_ai_${Date.now()}`,
          title: `Bộ đề: ${aiTopic.slice(0, 35)}...`,
          topic: aiTopic,
          sourceContent: aiContent.slice(0, 500),
          createdAt: new Date().toISOString(),
          isReviewedByTeacher: false, // Chưa duyệt
          questions: shuffledList,
        };
        saveQuestionSet(newSet);
        handleIntegrateQuestionsToAllGames(newSet.id);
        triggerConfetti();
        sfx.playVictory();
        // Mở ngay bảng thẩm định & duyệt câu hỏi cho giáo viên
        handleOpenReviewModal(newSet.id);
        showToast(`⚡ ĐÃ TẠO XONG! Giáo viên hãy rà soát kỹ nội dung và đáp án trước khi cho học sinh thi đấu!`);
      } else {
        throw new Error(resData.message || 'Không thể tạo câu hỏi từ máy chủ.');
      }
    } catch (err: any) {
      console.warn('Lỗi gọi API server, kích hoạt bộ sinh thông minh cục bộ:', err);
      // Fallback local smart generator so user is NEVER blocked
      const fallbackQuestions: GameQuestion[] = generateSmartLocalQuestions(aiTopic, aiContent, aiQuestionCount);
      const newSet: GameQuestionSet = {
        id: `set_local_${Date.now()}`,
        title: `Bộ đề: ${aiTopic.slice(0, 35)}...`,
        topic: aiTopic,
        sourceContent: aiContent.slice(0, 500),
        createdAt: new Date().toISOString(),
        isReviewedByTeacher: false,
        questions: fallbackQuestions.map(q => ({
          ...q,
          isApproved: false,
        })),
      };
      saveQuestionSet(newSet);
      handleIntegrateQuestionsToAllGames(newSet.id);
      triggerConfetti();
      sfx.playVictory();
      handleOpenReviewModal(newSet.id);
      showToast(`⚡ ĐÃ TẠO XONG BỘ ĐỀ! Thầy/Cô vui lòng duyệt lại câu hỏi và đáp án trước khi thi đấu!`);
    } finally {
      setAiIsLoading(false);
    }
  };

  // Helper local fallback generator with ascending difficulty
  const generateSmartLocalQuestions = (topic: string, text: string, count: number): GameQuestion[] => {
    // 1. Kiểm tra nếu trong text đã có câu hỏi trắc nghiệm
    const parsed = parseQuestionsFromRawText(text, topic);
    if (parsed.length > 0) {
      return parsed.slice(0, count);
    }

    const cleanSentences = (text || '')
      .split(/[.\n;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && !s.startsWith('PK'));

    const list: GameQuestion[] = [];
    const total = Math.max(count, 3);
    const norm = (topic || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const isMitosisMeiosis = norm.includes('nguyen phan') || norm.includes('giam phan') || norm.includes('phan bao') || norm.includes('te bao');
    const isBiology = isMitosisMeiosis || norm.includes('sinh') || norm.includes('di truyen') || norm.includes('nst') || norm.includes('gen') || norm.includes('adn') || norm.includes('arn') || norm.includes('dot bien');
    const isHistory = norm.includes('lich su') || norm.includes('khang chien') || norm.includes('dien bien phu') || norm.includes('cach mang') || norm.includes('1975') || norm.includes('1945');

    const mitosisMeiosisBank = [
      {
        q: 'Trong quá trình nguyên phân, các nhiễm sắc thể (NST) co xoắn cực đại và tập trung thành 1 hàng ở mặt phẳng xích đạo của thoi phân bào tại kỳ nào?',
        opts: ['Kỳ giữa', 'Kỳ đầu', 'Kỳ sau', 'Kỳ cuối'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Ở kỳ giữa của nguyên phân, các NST kép co xoắn cực đại và xếp thành một hàng dọc trên mặt phẳng xích đạo thoi vô sắc.'
      },
      {
        q: 'Sự kiện quan trọng nhất diễn ra ở kỳ sau của quá trình nguyên phân là gì?',
        opts: ['Các crômatit trong từng NST kép tách nhau ở tâm động thành 2 NST đơn và phân li về 2 cực', 'Các NST kép bắt đầu co xoắn và dính vào thoi phân bào', 'Màng nhân và nhân con tiêu biến hoàn toàn', 'Màng nhân xuất hiện trở lại và tế bào chất phân chia'],
        c: 0,
        level: 'Trung bình' as const,
        exp: 'Kỳ sau nguyên phân đặc trưng bởi sự tách tâm động của từng NST kép, hình thành 2 NST đơn phân li đồng đều về hai cực tế bào.'
      },
      {
        q: 'Ý nghĩa sinh học quan trọng nhất của quá trình nguyên phân đối với cơ thể đa bào là gì?',
        opts: ['Giúp cơ thể lớn lên, thay thế tế bào già/tổn thương và duy trì ổn định bộ NST 2n', 'Tạo ra vô số biến dị tổ hợp phong phú cho chọn giống', 'Làm giảm bộ nhiễm sắc thể đi một nửa để tạo giao tử', 'Làm tăng tần số đột biến cấu trúc nhiễm sắc thể có lợi'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Nguyên phân là phương thức phân bào sinh dưỡng, đảm bảo sao chép và duy trì ổn định bộ NST lưỡng bội 2n qua các thế hệ tế bào.'
      },
      {
        q: 'Hiện tượng tiếp hợp và trao đổi chéo giữa các crômatit khác nguồn của cặp NST tương đồng diễn ra ở kỳ nào của giảm phân?',
        opts: ['Kỳ đầu của giảm phân I', 'Kỳ giữa của giảm phân I', 'Kỳ đầu của giảm phân II', 'Kỳ sau của giảm phân II'],
        c: 0,
        level: 'Trung bình' as const,
        exp: 'Sự tiếp hợp và trao đổi chéo chỉ xảy ra ở kỳ đầu giảm phân I, là cơ sở tế bào học dẫn đến hiện tượng hoán vị gen và biến dị tổ hợp.'
      },
      {
        q: 'Kết thúc quá trình giảm phân, từ 1 tế bào sinh dục chín có bộ NST lưỡng bội (2n) sẽ tạo ra bao nhiêu tế bào con có bộ NST như thế nào?',
        opts: ['4 tế bào con có bộ NST đơn bội (n)', '2 tế bào con có bộ NST lưỡng bội (2n)', '2 tế bào con có bộ NST đơn bội (n)', '4 tế bào con có bộ NST lưỡng bội (2n)'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Giảm phân trải qua 2 lần phân bào liên tiếp nhưng chỉ nhân đôi ADN 1 lần, kết quả từ 1 tế bào 2n tạo ra 4 tế bào con mang bộ NST giảm đi một nửa (n).'
      },
      {
        q: 'Ở kỳ giữa của giảm phân I, các cặp nhiễm sắc thể tương đồng tập trung ở mặt phẳng xích đạo xếp thành mấy hàng?',
        opts: ['Xếp thành 2 hàng song song', 'Xếp thành 1 hàng duy nhất', 'Phân tán ngẫu nhiên không theo quy luật', 'Xếp thành 4 hàng tách biệt'],
        c: 0,
        level: 'Khó' as const,
        exp: 'Khác với nguyên phân (xếp 1 hàng), ở kỳ giữa giảm phân I, các cặp NST tương đồng xếp thành 2 hàng song song trên mặt phẳng xích đạo.'
      },
      {
        q: 'Điểm khác biệt căn bản nhất giữa kỳ sau của giảm phân I và kỳ sau của nguyên phân là gì?',
        opts: ['Ở giảm phân I, các NST kép trong cặp tương đồng phân li độc lập về 2 cực mà không chẻ dọc tâm động', 'Ở giảm phân I, tâm động chẻ dọc ngay từ đầu kỳ', 'Ở nguyên phân, các NST kép không bị tách crômatit', 'Ở giảm phân I không có sự tham gia của thoi phân bào'],
        c: 0,
        level: 'Khó' as const,
        exp: 'Kỳ sau giảm phân I chứng kiến sự phân li độc lập của các NST kép về hai cực mà tâm động chưa hề tách đôi.'
      },
      {
        q: 'Một tế bào mẹ (2n = 8) thực hiện nguyên phân liên tiếp 3 lần, tổng số tế bào con thu được sau 3 lần phân bào là bao nhiêu?',
        opts: ['8 tế bào con', '6 tế bào con', '16 tế bào con', '24 tế bào con'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Số tế bào con tạo thành qua k lần nguyên phân được tính theo công thức 2^k = 2^3 = 8 tế bào.'
      }
    ];

    // Ngân hàng Lịch sử
    const historyBank = [
      {
        q: 'Chiến thắng nào của quân và dân ta đã làm phá sản hoàn toàn kế hoạch Nava, giáng đòn quyết định đập tan ý chí xâm lược của thực dân Pháp?',
        opts: ['Chiến dịch Điện Biên Phủ 1954', 'Chiến dịch Việt Bắc thu - đông 1947', 'Chiến dịch Biên giới thu - đông 1950', 'Chiến dịch Tây Bắc 1952'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Chiến thắng lịch sử Điện Biên Phủ (07/05/1954) đã đập tan tập đoàn cứ điểm mạnh nhất Đông Dương của Pháp, buộc Pháp phải ký Hiệp định Giơ-ne-vơ.'
      },
      {
        q: 'Sự kiện mang tính bước ngoặt vĩ đại mở ra kỷ nguyên độc lập, tự do cho dân tộc Việt Nam trong thế kỷ XX là gì?',
        opts: ['Thắng lợi của Cách mạng tháng Tám năm 1945', 'Chiến thắng Điện Biên Phủ trên không 1972', 'Phong trào Đồng Khởi 1960', 'Hiệp định Paris 1973'],
        c: 0,
        level: 'Trung bình' as const,
        exp: 'Cách mạng tháng Tám năm 1945 đã lật đổ ách thống trị của phát xít - thực dân và chế độ phong kiến ngàn năm, khai sinh nước Việt Nam Dân chủ Cộng hòa.'
      },
      {
        q: 'Chiến dịch Hồ Chí Minh lịch sử giải phóng hoàn toàn miền Nam, thống nhất đất nước chính thức toàn thắng vào ngày nào?',
        opts: ['30 tháng 4 năm 1975', '26 tháng 4 năm 1975', '01 tháng 5 năm 1975', '02 tháng 9 năm 1975'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Vào lúc 11h30 ngày 30/4/1975, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập, chiến dịch Hồ Chí Minh toàn thắng.'
      }
    ];

    // Ngân hàng Địa lý
    const geographyBank = [
      {
        q: 'Đặc điểm nổi bật nhất của vị trí địa lý nước ta đối với sự hình thành khí hậu là gì?',
        opts: ['Nằm hoàn toàn trong vùng nội chí tuyến Bắc bán cầu, tiếp giáp Biển Đông giàu ẩm', 'Nằm ở trung tâm lục địa Á - Âu nên chịu ảnh hưởng sâu sắc của gió mùa lục địa khô', 'Nằm gần xích đạo nhưng có mùa đông lạnh do địa hình núi cao che chắn', 'Nằm hoàn toàn trong vành đai sinh khoáng Thái Bình Dương'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Vị trí nội chí tuyến cùng sự tác động của Biển Đông mang lại cho nước ta nền nhiệt ẩm dồi dào, mưa nhiều, thiên nhiên xanh tốt quanh năm.'
      },
      {
        q: 'Gió mùa mùa đông (gió mùa Đông Bắc) ở miền Bắc nước ta có tính chất biến tính ẩm và mưa phùn vào thời kỳ nào?',
        opts: ['Nửa cuối mùa đông (tháng 2 - 3)', 'Nửa đầu mùa đông (tháng 11 - 12)', 'Giữa mùa đông (tháng 1)', 'Đầu mùa hạ (tháng 5)'],
        c: 0,
        level: 'Trung bình' as const,
        exp: 'Vào nửa cuối mùa đông, khối khí lạnh di chuyển lệch đông qua biển ấm, tăng cường hơi ẩm gây ra thời tiết ẩm ướt và mưa phùn dai dẳng ở Bắc Bộ.'
      }
    ];

    // Ngân hàng Hóa học / Vật lý / Toán học
    const scienceBank = [
      {
        q: 'Một chất điểm dao động điều hòa với phương trình x = A*cos(ωt + φ). Vận tốc của chất điểm sớm pha so với li độ một góc là bao nhiêu?',
        opts: ['π/2 rad (sớm pha 90 độ)', 'π rad (ngược pha)', 'π/4 rad (sớm pha 45 độ)', '0 rad (cùng pha)'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Vận tốc biến thiên điều hòa theo thời gian và sớm pha π/2 rad so với li độ dao động.'
      },
      {
        q: 'Hợp chất este etyl axetat có công thức cấu tạo thu gọn là gì?',
        opts: ['CH3COOC2H5', 'C2H5COOCH3', 'HCOOCH2CH3', 'CH3COOCH3'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Etyl axetat được tạo thành từ gốc axetat (CH3COO-) và gốc etyl (-C2H5), công thức thu gọn là CH3COOC2H5.'
      },
      {
        q: 'Cho hàm số y = f(x) có đạo hàm f\'(x) > 0 với mọi x thuộc (a; b). Hàm số f(x) có tính chất gì trên khoảng đó?',
        opts: ['Đồng biến trên khoảng (a; b)', 'Nghịch biến trên khoảng (a; b)', 'Là hàm hằng không đổi trên (a; b)', 'Không xác định được chiều biến thiên'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Theo định lý về tính đơn điệu, f\'(x) > 0 trên (a; b) suy ra hàm số đồng biến trên khoảng đó.'
      }
    ];

    // Ngân hàng An toàn giao thông & Nề nếp
    const trafficSafetyBank = [
      {
        q: 'Người điều khiển xe mô tô, xe gắn máy, xe đạp điện bắt buộc phải đội mũ bảo hiểm có cài quai đúng quy cách khi nào?',
        opts: ['Khi tham gia giao thông trên tất cả các tuyến đường bộ', 'Chỉ khi đi trên quốc lộ và đường cao tốc', 'Chỉ khi chở thêm người phía sau', 'Chỉ khi nhìn thấy lực lượng cảnh sát giao thông'],
        c: 0,
        level: 'Dễ' as const,
        exp: 'Luật Giao thông đường bộ quy định người ngồi trên mô tô, xe gắn máy, xe đạp điện phải đội mũ bảo hiểm cài quai đúng quy cách trên mọi tuyến đường bộ.'
      },
      {
        q: 'Khi gặp tín hiệu đèn giao thông màu vàng bật sáng, người điều khiển phương tiện phải xử lý như thế nào?',
        opts: ['Phải dừng lại trước vạch dừng; nếu đã đi quá vạch dừng thì được đi tiếp', 'Tăng tốc thật nhanh để vượt qua nút giao trước khi đèn chuyển đỏ', 'Bấm còi liên tục và rẽ phải ngay lập tức', 'Được phép tiếp tục di chuyển bình thường mà không cần giảm tốc'],
        c: 0,
        level: 'Trung bình' as const,
        exp: 'Khi đèn vàng bật, phương tiện phải dừng lại trước vạch dừng; trường hợp đã vượt quá vạch dừng thì được phép tiếp tục đi an toàn.'
      }
    ];

    for (let i = 0; i < total; i++) {
      let level: 'Dễ' | 'Trung bình' | 'Khó' | 'Cực khó' = 'Dễ';
      if (i >= total * 0.75) level = 'Cực khó';
      else if (i >= total * 0.5) level = 'Khó';
      else if (i >= total * 0.25) level = 'Trung bình';

      if (cleanSentences.length > i && cleanSentences[i].length > 25) {
        const sentence = cleanSentences[i];
        list.push({
          id: `q_loc_${i}_${Date.now()}`,
          question: `[Câu ${i + 1} - Cấp độ ${level}] Dựa vào tài liệu bài học về chủ đề "${topic}": Nhận định nào sau đây là nội dung cốt lõi chuẩn xác?`,
          options: [
            sentence,
            `Nhận định trái ngược: Hiện tượng trên hoàn toàn không diễn ra trong điều kiện bài học.`,
            `Nội dung này đã bị bác bỏ và không còn đúng theo chương trình chuẩn hiện hành.`,
            `Chỉ áp dụng với một trường hợp ngoại lệ hiếm gặp, không mang tính quy luật phổ quát.`,
          ],
          correctIndex: 0,
          level,
          explanation: `Theo tài liệu giảng dạy về "${topic}": "${sentence}" là khẳng định hoàn toàn chính xác.`,
        });
      } else if (isMitosisMeiosis || isBiology) {
        const bq = mitosisMeiosisBank[i % mitosisMeiosisBank.length];
        list.push({
          id: `q_loc_mitosis_${i}_${Date.now()}`,
          question: `[Câu ${i + 1} - Cấp độ ${bq.level}] ${bq.q}`,
          options: bq.opts,
          correctIndex: bq.c,
          level: bq.level,
          explanation: bq.exp,
        });
      } else if (isHistory) {
        const bq = historyBank[i % historyBank.length];
        list.push({
          id: `q_loc_hist_${i}_${Date.now()}`,
          question: `[Câu ${i + 1} - Cấp độ ${bq.level}] ${bq.q}`,
          options: bq.opts,
          correctIndex: bq.c,
          level: bq.level,
          explanation: bq.exp,
        });
      } else if (norm.includes('dia') || norm.includes('khi hau') || norm.includes('bien')) {
        const bq = geographyBank[i % geographyBank.length];
        list.push({
          id: `q_loc_geo_${i}_${Date.now()}`,
          question: `[Câu ${i + 1} - Cấp độ ${bq.level}] ${bq.q}`,
          options: bq.opts,
          correctIndex: bq.c,
          level: bq.level,
          explanation: bq.exp,
        });
      } else if (norm.includes('giao thong') || norm.includes('ne nep') || norm.includes('an toan') || norm.includes('noi quy')) {
        const bq = trafficSafetyBank[i % trafficSafetyBank.length];
        list.push({
          id: `q_loc_safe_${i}_${Date.now()}`,
          question: `[Câu ${i + 1} - Cấp độ ${bq.level}] ${bq.q}`,
          options: bq.opts,
          correctIndex: bq.c,
          level: bq.level,
          explanation: bq.exp,
        });
      } else {
        const combinedPool = [
          ...trafficSafetyBank,
          ...scienceBank,
          ...historyBank,
          ...geographyBank,
          ...mitosisMeiosisBank
        ];
        const bq = combinedPool[i % combinedPool.length];
        list.push({
          id: `q_loc_gen_${i}_${Date.now()}`,
          question: `[Câu ${i + 1} - Cấp độ ${bq.level}] ${bq.q}`,
          options: bq.opts,
          correctIndex: bq.c,
          level: bq.level,
          explanation: bq.exp,
        });
      }
    }
    return list.map(q => shuffleQuestionOptions(q));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom duration-200 ${
          toastMessage.type === 'error'
            ? 'bg-rose-900/90 text-rose-100 border-rose-500'
            : toastMessage.type === 'info'
            ? 'bg-blue-900/90 text-blue-100 border-blue-500'
            : 'bg-emerald-900/90 text-emerald-100 border-emerald-500'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-300" /> : <Sparkles className="w-5 h-5 text-amber-300" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-emerald-600/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-400/40 text-xs font-black text-amber-300 uppercase tracking-wider">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Menu số 12 • Hoạt động & Phong trào</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Góc Giải Trí & Trò Chơi Học Tập 4.0</span>
              <span className="text-xs bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase">
                5 Trò Chơi
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-3xl leading-relaxed">
              Tích hợp 100% danh sách học sinh lớp {classInfo.className || ''}. Hỗ trợ AI sinh câu hỏi theo chủ đề, lưu điểm rèn luyện hàng ngày và đồng bộ lên Google Sheets (Sheet <strong>GiaiTri_TichDiem</strong>).
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                soundOn
                  ? 'bg-emerald-600/60 text-amber-300 border-emerald-400/50 hover:bg-emerald-600'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={soundOn ? 'Đang bật âm thanh trò chơi' : 'Đã tắt âm thanh'}
            >
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                syncAllToGoogleSheets();
                showToast('Đang đồng bộ điểm trò chơi lên Google Sheets...');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-md border border-emerald-400/40 transition-all cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">Lưu Lên Google Sheet</span>
              <span className="sm:hidden">Lưu Sheet</span>
            </button>
          </div>
        </div>

        {/* Question Set Selector Bar */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-emerald-200 font-bold flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>Ngân hàng câu hỏi:</span>
            </span>
            <select
              value={selectedSetId}
              onChange={e => handleIntegrateQuestionsToAllGames(e.target.value)}
              className="px-3 py-1.5 bg-slate-900/90 text-amber-300 font-bold rounded-xl border border-emerald-400/50 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-xs truncate"
            >
              {savedQuestionSets.map(set => (
                <option key={set.id} value={set.id} className="bg-slate-900 text-white">
                  {set.title} ({set.questions.length} câu)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleIntegrateQuestionsToAllGames(selectedSetId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              title="Tích hợp bộ câu hỏi này sang toàn bộ 5 trò chơi và xáo trộn ngẫu nhiên câu hỏi & đáp án"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>⚡ TÍCH HỢP CÂU HỎI SANG TRÒ CHƠI</span>
            </button>

            <button
              type="button"
              onClick={handleReshuffleQuestions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
              title="Đảo ngẫu nhiên lại thứ tự câu hỏi và đảo ngẫu nhiên 4 phương án A, B, C, D"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>🎲 Đổi ngẫu nhiên câu & đáp án</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveGame('ai_creator')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>✨ Tạo / Nạp thêm câu hỏi</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs sm:text-sm font-bold">
        {[
          { id: 'wheel', label: '1. Vòng Quay May Mắn', icon: RotateCw, color: 'text-blue-600' },
          { id: 'bell', label: '2. Rung Chuông Vàng', icon: Trophy, color: 'text-amber-600' },
          { id: 'millionaire', label: '3. Ai Là Triệu Phú', icon: Crown, color: 'text-purple-600' },
          { id: 'streak', label: '4. Rèn Luyện Hàng Ngày', icon: Flame, color: 'text-orange-600', badge: 'Tích Điểm' },
          { id: 'relay', label: '5. Đua Thuyền 4 Tổ', icon: Users, color: 'text-teal-600' },
          { id: 'ai_creator', label: '✨ AI Tạo Câu Hỏi', icon: Sparkles, color: 'text-indigo-600' },
          { id: 'leaderboard', label: '📊 Bảng Xếp Hạng & Sheet', icon: FileSpreadsheet, color: 'text-emerald-600' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeGame === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveGame(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap border transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-slate-200/70 hover:bg-white text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.color}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: VÒNG QUAY MAY MẮN                                                 */}
      {/* ========================================================================= */}
      {activeGame === 'wheel' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-blue-600" />
                <span>Vòng Quay May Mắn (Chiếc Nón Kỳ Diệu)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quay ngẫu nhiên học sinh từ danh sách lớp để giải đố, nhận điểm thưởng và thử thách bất ngờ!
              </p>
            </div>

            {/* Filter by Group */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500">Phạm vi quay:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setWheelGroupFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${wheelGroupFilter === 'all' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600'}`}
                >
                  Cả lớp ({students.length})
                </button>
                {[1, 2, 3, 4].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setWheelGroupFilter(g)}
                    className={`px-3 py-1 rounded-lg transition-all ${wheelGroupFilter === g ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600'}`}
                  >
                    Tổ {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Bank Toolbar for Wheel */}
          {renderGameQuestionHeaderBar('Vòng Quay May Mắn', 'bg-blue-600')}
          {renderPedagogicalQualityWarningBanner()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Interactive Canvas Wheel */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
              <div className="relative p-2 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-2xl">
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={420}
                  className="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full cursor-pointer"
                  onClick={spinWheel}
                />
              </div>

              <button
                type="button"
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 disabled:opacity-50 text-white font-black text-sm rounded-full shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'ĐANG QUAY VÒNG...' : '🎯 NHẤN ĐỂ QUAY NGAY'}</span>
              </button>
            </div>

            {/* Right: Selected Student & Reward Box */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Học sinh được chọn ngẫu nhiên
                </h3>

                {wheelResultStudent ? (
                  <div className="p-4 bg-white rounded-2xl border-2 border-emerald-400 shadow-md space-y-3 animate-in zoom-in-95 duration-200">
                    <img
                      src={wheelResultStudent.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={wheelResultStudent.fullName}
                      className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-emerald-300 shadow-sm"
                    />
                    <div>
                      <h4 className="text-lg font-black text-slate-900">{wheelResultStudent.fullName}</h4>
                      <p className="text-xs text-slate-500">Mã: {wheelResultStudent.studentCode} • Tổ {wheelResultStudent.groupId}</p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-xs text-amber-800 font-bold block">Ô giải thưởng dừng lại:</span>
                      <span className="text-base font-black text-amber-600">{wheelResultPrize}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <span className="text-xs font-semibold text-slate-600">Điểm cộng thi đua:</span>
                      <input
                        type="number"
                        value={wheelBonusPoints}
                        onChange={e => setWheelBonusPoints(Number(e.target.value) || 0)}
                        className="w-20 px-2.5 py-1 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    {/* Nút kích hoạt Thử Thách Đố Vui từ Ngân Hàng */}
                    {currentWheelQuestion && (
                      <button
                        type="button"
                        onClick={() => {
                          setWheelChallengeOpen(prev => !prev);
                          setWheelChallengeAnswered(false);
                          setWheelChallengeSelectedOpt(null);
                        }}
                        className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>{wheelChallengeOpen ? 'Đóng câu hỏi thử thách' : '🎯 Đố câu hỏi từ Ngân hàng đề (+15đ)'}</span>
                      </button>
                    )}

                    {/* Hộp câu hỏi thử thách trực tiếp */}
                    {wheelChallengeOpen && currentWheelQuestion && (
                      <div className="p-3.5 bg-indigo-50/90 border-2 border-indigo-300 rounded-2xl space-y-3 text-left animate-in zoom-in-95">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-900">
                            Thử thách câu hỏi:
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold text-[10px]">
                            Mức độ: {currentWheelQuestion.level}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 leading-snug">
                          {currentWheelQuestion.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentWheelQuestion.options.map((opt, i) => {
                            const isSelected = wheelChallengeSelectedOpt === i;
                            const isCorrect = i === currentWheelQuestion.correctIndex;
                            let btnClass = 'bg-white border-slate-300 text-slate-800 hover:bg-indigo-100';
                            if (wheelChallengeAnswered) {
                              if (isCorrect) btnClass = 'bg-emerald-600 border-emerald-600 text-white font-black';
                              else if (isSelected) btnClass = 'bg-rose-600 border-rose-600 text-white font-bold';
                              else btnClass = 'bg-slate-100 border-slate-200 text-slate-400 opacity-60';
                            }
                            return (
                              <button
                                key={i}
                                type="button"
                                disabled={wheelChallengeAnswered}
                                onClick={() => handleAnswerWheelChallenge(i)}
                                className={`p-2 rounded-xl border text-[11px] text-left transition-all ${btnClass}`}
                              >
                                <span className="font-bold mr-1">{['A', 'B', 'C', 'D'][i]}.</span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                        {wheelChallengeAnswered && (
                          <div className="p-2 bg-white rounded-xl border border-indigo-200 text-[11px] text-slate-700 space-y-1">
                            <span className="font-bold text-indigo-950 block">💡 Lời giải thích:</span>
                            <p>{currentWheelQuestion.explanation}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleNextWheelQuestion}
                            className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Đổi câu hỏi khác</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(selectedSetId, currentWheelQuestion)}
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg border border-amber-300"
                            title="Sửa nội dung hoặc đáp án câu hỏi này"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa câu này</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleClaimWheelReward}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Xác nhận & Cộng điểm vào Tuần 5</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl">
                      🎲
                    </div>
                    <p className="text-xs font-medium">
                      Nhấn nút <strong className="text-slate-700">"Quay Ngay"</strong> để bắt đầu chọn học sinh may mắn của lớp!
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Roster count */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center justify-between">
                <span>Số lượng học sinh trong vòng quay:</span>
                <span className="font-black text-sm text-blue-700">{wheelEligibleStudents.length} học sinh</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: RUNG CHUÔNG VÀNG (GOLDEN BELL)                                     */}
      {/* ========================================================================= */}
      {activeGame === 'bell' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Đấu Trí Tri Thức – Rung Chuông Vàng</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chuỗi câu hỏi có mức độ khó tăng dần. Đếm ngược 15 giây kịch tính, chinh phục đỉnh cao tri thức!
              </p>
            </div>

            {/* Student selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Thí sinh:</span>
              <select
                value={bellSelectedStudentId}
                onChange={e => setBellSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="">-- Cả lớp cùng tham gia --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentCode}) - Tổ {s.groupId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Bank Toolbar for Golden Bell */}
          {renderGameQuestionHeaderBar('Rung Chuông Vàng', 'bg-amber-600')}
          {renderPedagogicalQualityWarningBanner()}

          {currentBellQuestion ? (
            <div className="space-y-6">
              {/* Question Header & Timer Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 bg-amber-500 text-white font-black text-xs rounded-xl shadow-xs">
                    Câu {bellQuestionIndex + 1} / {bellQuestions.length}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    currentBellQuestion.level === 'Dễ'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentBellQuestion.level === 'Trung bình'
                      ? 'bg-blue-100 text-blue-800'
                      : currentBellQuestion.level === 'Khó'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    Cấp độ: {currentBellQuestion.level}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartEditQuestion(selectedSetId, currentBellQuestion)}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Sửa nội dung hoặc đáp án câu hỏi này"
                  >
                    <Edit3 className="w-3 h-3 text-amber-700" />
                    <span>Sửa câu này</span>
                  </button>
                </div>

                {/* 15s Timer */}
                <div className="flex items-center gap-2 font-mono font-black text-sm">
                  <Clock className={`w-4 h-4 ${bellTimeLeft <= 5 ? 'text-rose-600 animate-bounce' : 'text-slate-600'}`} />
                  <span className={bellTimeLeft <= 5 ? 'text-rose-600 text-lg' : 'text-slate-800'}>
                    00:{bellTimeLeft.toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                  <span>Điểm tích lũy: <strong className="text-emerald-600">+{bellScore}</strong></span>
                  <span>Chuỗi đúng: <strong className="text-amber-600">{bellStreak} 🔥</strong></span>
                </div>
              </div>

              {/* Question Content */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-inner space-y-4">
                <p className="text-base sm:text-lg font-bold leading-relaxed text-amber-200">
                  {currentBellQuestion.question}
                </p>

                {/* 4 Answer Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {currentBellQuestion.options.map((option, idx) => {
                    const optionLabels = ['A', 'B', 'C', 'D'];
                    const isSelected = bellSelectedOption === idx;
                    const isCorrect = idx === currentBellQuestion.correctIndex;

                    let btnStyle = 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700';
                    if (bellIsAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-600 text-white border-rose-400';
                      } else {
                        btnStyle = 'bg-slate-800/40 text-slate-500 border-transparent';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectBellOption(idx)}
                        disabled={bellIsAnswered}
                        className={`p-4 rounded-2xl border text-left font-semibold text-xs sm:text-sm flex items-start gap-3 transition-all cursor-pointer active:scale-98 ${btnStyle}`}
                      >
                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                          {optionLabels[idx]}
                        </span>
                        <span className="flex-1">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanation & Next Button */}
              {bellIsAnswered && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-emerald-800 block">
                      💡 Lời giải thích & Mở rộng kiến thức:
                    </span>
                    <p className="text-xs text-emerald-950 font-medium">
                      {currentBellQuestion.explanation}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={nextBellQuestion}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                  >
                    Câu hỏi tiếp theo ➔
                  </button>
                </div>
              )}

              {!bellTimerActive && !bellIsAnswered && (
                <button
                  type="button"
                  onClick={startBellQuestion}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>BẮT ĐẦU ĐẾM NGƯỢC 15 GIÂY</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p>Chưa có câu hỏi trong bộ đề đang chọn. Vui lòng bấm vào tab "✨ AI Tạo Câu Hỏi" để tạo đề mới!</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: AI LÀ TRIỆU PHÚ (CLASS MILLIONAIRE)                                */}
      {/* ========================================================================= */}
      {activeGame === 'millionaire' && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <span>Ai Là Triệu Phú – Ghế Nóng Tri Thức Lớp Học</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Vượt qua 15 nấc thang câu hỏi trí tuệ với 3 quyền trợ giúp tương tác lớp học!
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Học sinh ghế nóng:</span>
              <select
                value={milStudentId}
                onChange={e => setMilStudentId(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 text-amber-300 font-bold border border-slate-700 rounded-xl text-xs"
              >
                <option value="">-- Chọn học sinh lên ghế nóng --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} (Tổ {s.groupId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Bank Toolbar for Millionaire */}
          {renderGameQuestionHeaderBar('Ai Là Triệu Phú', 'bg-purple-600')}
          {renderPedagogicalQualityWarningBanner()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Hot Seat & Lifelines */}
            <div className="lg:col-span-8 space-y-5">
              {/* 3 Lifelines */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleUseFiftyFifty}
                  disabled={!milLifelines.fiftyFifty || milIsAnswered || milGameOver}
                  className={`p-3 rounded-2xl border font-black text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    milLifelines.fiftyFifty
                      ? 'bg-blue-900/60 hover:bg-blue-800 border-blue-400 text-sky-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-600 line-through opacity-50'
                  }`}
                >
                  <span className="text-base">50:50</span>
                  <span>Loại 2 đáp án sai</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseAudience}
                  disabled={!milLifelines.audience || milIsAnswered || milGameOver}
                  className={`p-3 rounded-2xl border font-black text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    milLifelines.audience
                      ? 'bg-purple-900/60 hover:bg-purple-800 border-purple-400 text-purple-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-600 line-through opacity-50'
                  }`}
                >
                  <Users className="w-4 h-4 text-purple-300" />
                  <span>Hỏi ý kiến cả lớp</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseSwap}
                  disabled={!milLifelines.swap || milIsAnswered || milGameOver}
                  className={`p-3 rounded-2xl border font-black text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    milLifelines.swap
                      ? 'bg-amber-900/60 hover:bg-amber-800 border-amber-400 text-amber-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-600 line-through opacity-50'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-amber-300" />
                  <span>Đổi câu hỏi khác</span>
                </button>
              </div>

              {/* Audience Poll Result */}
              {milAudiencePoll && (
                <div className="p-3 bg-slate-800/80 border border-purple-500/40 rounded-2xl text-xs space-y-2">
                  <span className="text-purple-300 font-bold block">📊 Kết quả khảo sát ý kiến các bạn trong lớp:</span>
                  <div className="grid grid-cols-4 gap-2 text-center font-mono font-bold">
                    {['A', 'B', 'C', 'D'].map((opt, i) => (
                      <div key={opt} className="bg-slate-900 p-1.5 rounded-lg border border-slate-700">
                        <span className="text-slate-400">{opt}: </span>
                        <span className="text-amber-400">{milAudiencePoll[i]}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Millionaire Question Box */}
              {currentMilQuestion && (
                <div className="p-6 bg-gradient-to-b from-blue-950 to-slate-950 border-2 border-blue-500/60 rounded-3xl shadow-2xl space-y-5 text-center">
                  <div className="text-xs uppercase font-black tracking-widest text-blue-300 flex items-center justify-center gap-2">
                    <span>Câu số {milLevel + 1} • Giá trị: {millionaireLadders[milLevel]?.points} điểm</span>
                    <button
                      type="button"
                      onClick={() => handleStartEditQuestion(selectedSetId, currentMilQuestion)}
                      className="px-2 py-0.5 bg-blue-900/80 hover:bg-blue-800 text-sky-200 border border-blue-400/40 rounded-lg text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      title="Sửa nội dung hoặc đáp án câu hỏi này"
                    >
                      <Edit3 className="w-3 h-3 text-amber-300" />
                      <span>Sửa câu này</span>
                    </button>
                  </div>

                  <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {currentMilQuestion.question}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {currentMilQuestion.options.map((opt, idx) => {
                      const labels = ['A', 'B', 'C', 'D'];
                      const isEliminated = milEliminatedOptions.includes(idx);
                      const isSelected = milSelectedOption === idx;
                      const isCorrect = idx === currentMilQuestion.correctIndex;

                      if (isEliminated) {
                        return (
                          <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/30 border border-slate-800 text-slate-700 opacity-25">
                            {labels[idx]}: ---
                          </div>
                        );
                      }

                      let optClass = 'bg-slate-900 hover:bg-blue-900/60 text-slate-200 border-blue-800';
                      if (milIsAnswered) {
                        if (isCorrect) optClass = 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300';
                        else if (isSelected) optClass = 'bg-rose-600 text-white border-rose-400';
                        else optClass = 'bg-slate-900/50 text-slate-500 border-transparent';
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAnswerMillionaire(idx)}
                          disabled={milIsAnswered || milGameOver}
                          className={`p-3.5 rounded-2xl border font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer ${optClass}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-700/60 flex items-center justify-center text-xs font-black shrink-0">
                            {labels[idx]}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Millionaire Bottom Control */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={resetMillionaire}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Bắt đầu lại từ đầu
                </button>

                <div className="flex items-center gap-2">
                  {milIsAnswered && !milGameOver && (
                    <button
                      type="button"
                      onClick={nextMillionaireLevel}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Tiếp tục câu số {milLevel + 2} ➔
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={claimMillionaireScore}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Dừng cuộc chơi & Nhận thưởng
                  </button>
                </div>
              </div>
            </div>

            {/* Right: 15 Ladders */}
            <div className="lg:col-span-4 bg-slate-950 p-4 rounded-3xl border border-slate-800 space-y-1 font-mono text-xs">
              <h4 className="text-center font-sans font-black text-amber-400 uppercase tracking-wider text-xs pb-2 border-b border-slate-800">
                Thang Điểm Thưởng
              </h4>
              <div className="flex flex-col-reverse gap-1 pt-1">
                {millionaireLadders.map(ladder => {
                  const isCurrent = milLevel === ladder.level - 1;
                  const isPassed = milLevel >= ladder.level;
                  let bg = 'bg-slate-900/60 text-slate-400';
                  if (isCurrent) bg = 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md';
                  else if (isPassed) bg = 'bg-blue-900/40 text-blue-300 font-bold';
                  else if (ladder.safe) bg = 'bg-slate-900 text-amber-300 font-bold border border-amber-500/30';

                  return (
                    <div
                      key={ladder.level}
                      className={`px-3 py-1.5 rounded-xl flex items-center justify-between transition-all ${bg}`}
                    >
                      <span>{ladder.level.toString().padStart(2, '0')}.</span>
                      <span>{ladder.points.toLocaleString()} ĐIỂM</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: RÈN LUYỆN HÀNG NGÀY & TÍCH ĐIỂM (DAILY STREAK)                     */}
      {/* ========================================================================= */}
      {activeGame === 'streak' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider">
                  Trò chơi rèn luyện theo quy trình
                </span>
                <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                  <span>Thử Thách Rèn Luyện Hàng Ngày & Tích Điểm (Streak Master)</span>
                  <Flame className="w-6 h-6 text-red-600 animate-pulse fill-red-500" />
                </h2>
                <p className="text-xs sm:text-sm text-orange-100 max-w-2xl">
                  Duy trì chuỗi ngày liên tiếp (Streak), tích lũy điểm thưởng rèn luyện, nâng cấp huy hiệu và đổi thưởng thực tế trong lớp học!
                </p>
              </div>

              {/* Student selection for daily streak */}
              <div className="bg-white/95 p-3 rounded-2xl text-slate-900 shadow-md shrink-0 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">Chọn học sinh thực hiện:</span>
                <select
                  value={streakSelectedStudentId}
                  onChange={e => setStreakSelectedStudentId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none"
                >
                  <option value="">-- Chọn học sinh tích điểm --</option>
                  {students.map(s => {
                    const info = studentStreaksMap.get(s.id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.fullName} • Chuỗi: {info?.currentStreak || 0} ngày 🔥 ({info?.totalPoints || 0} sao)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Question Bank Toolbar for Streak */}
          {renderGameQuestionHeaderBar('Rèn Luyện Hàng Ngày (Streak)', 'bg-orange-600')}
          {renderPedagogicalQualityWarningBanner()}

          {/* Daily Quests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {streakDailyQuests.map(quest => (
              <div
                key={quest.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md hover:shadow-lg transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{quest.icon}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-xs">
                      +{quest.points} Sao
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{quest.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{quest.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCompleteDailyQuest(quest)}
                  className={`w-full py-2.5 px-3 ${
                    quest.type === 'quiz'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                  } font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95`}
                >
                  {quest.type === 'quiz' ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>🧠 Làm Đố Vui Ngay (+15 Sao)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-orange-200" />
                      <span>Hoàn thành & Cộng điểm</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Reward Exchange Store */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-rose-500" />
              <span>Cửa Hàng Đổi Thưởng Rèn Luyện (Quy Đổi Giá Trị Phần Thưởng)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {[
                { name: 'Sticker Ngôi Sao Thi Đua', cost: 50, icon: '⭐', desc: 'Dán bảng khen thưởng tuần' },
                { name: 'Phiếu Miễn 1 Lần Trực Nhật', cost: 100, icon: '🧹', desc: 'Dùng cho tuần học bất kỳ' },
                { name: 'Voucher Chọn Chỗ Ngồi 1 Tuần', cost: 150, icon: '🪑', desc: 'Chọn bạn cùng bàn yêu thích' },
                { name: 'Cộng Điểm Bài Kiểm Tra Miệng', cost: 200, icon: '💯', desc: 'Điểm 10 rèn luyện tích cực' },
              ].map((reward, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{reward.icon}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 font-mono font-bold text-slate-800 text-[11px]">
                      {reward.cost} Sao
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-900">{reward.name}</h5>
                  <p className="text-slate-500 text-[11px]">{reward.desc}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!streakSelectedStudentId) {
                        showToast('Vui lòng chọn học sinh để đổi thưởng!', 'error');
                        return;
                      }
                      const stu = students.find(s => s.id === streakSelectedStudentId);
                      showToast(`Đã duyệt đổi thưởng "${reward.name}" cho ${stu?.fullName}!`);
                    }}
                    className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    Đổi thưởng ngay
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: ĐUA THUYỀN TIẾP SỨC 4 TỔ (TEAM RELAY RACE)                         */}
      {/* ========================================================================= */}
      {activeGame === 'relay' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Đua Thuyền Tiếp Sức – Tranh Tài 4 Tổ</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các tổ lần lượt trả lời câu hỏi để đưa thuyền của tổ mình về đích nhanh nhất!
              </p>
            </div>

            <button
              type="button"
              onClick={resetRelayRace}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Thiết lập lại đường đua
            </button>
          </div>

          {/* Question Bank Toolbar for Relay */}
          {renderGameQuestionHeaderBar('Đua Thuyền Tiếp Sức 4 Tổ', 'bg-teal-600')}
          {renderPedagogicalQualityWarningBanner()}

          {/* 4 Race Tracks */}
          <div className="space-y-3 bg-slate-900 p-6 rounded-3xl text-white">
            {[1, 2, 3, 4].map(grp => {
              const pos = relayPositions[grp] || 0;
              const isTurn = relayActiveGroup === grp;
              const progressPct = (pos / 5) * 85;

              return (
                <div
                  key={grp}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isTurn
                      ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${grp === 1 ? 'bg-blue-400' : grp === 2 ? 'bg-emerald-400' : grp === 3 ? 'bg-amber-400' : 'bg-purple-400'}`} />
                      <span>TỔ {grp}</span>
                      {isTurn && <span className="text-amber-400 animate-pulse text-[11px]">(Đang đến lượt)</span>}
                    </span>
                    <span className="font-mono text-amber-300">Tiến độ: {pos} / 5 nấc</span>
                  </div>

                  {/* Water Track */}
                  <div className="relative h-12 bg-blue-950 rounded-xl border border-blue-800 overflow-hidden flex items-center px-2">
                    {/* Finish Line */}
                    <div className="absolute right-3 top-0 bottom-0 w-2 bg-rose-500 flex items-center justify-center text-[10px] font-black text-white">
                      🏁
                    </div>

                    {/* Boat Sprite */}
                    <div
                      className="absolute transition-all duration-700 ease-out flex items-center gap-1"
                      style={{ left: `${progressPct}%` }}
                    >
                      <span className="text-2xl drop-shadow-md">🚣</span>
                      <span className="text-[10px] font-bold bg-white text-slate-900 px-1.5 py-0.5 rounded shadow-xs">
                        Tổ {grp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Turn Question Box */}
          {relayQuestion && relayWinner === null && (
            <div className="p-6 bg-slate-50 border-2 border-teal-300 rounded-3xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-3 py-1 bg-teal-600 text-white font-black text-xs rounded-xl">
                  Lượt thi của: TỔ {relayActiveGroup}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">
                    Mức độ: <strong>{relayQuestion.level}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartEditQuestion(selectedSetId, relayQuestion)}
                    className="px-2 py-0.5 bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-300 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Sửa nội dung hoặc đáp án câu hỏi này"
                  >
                    <Edit3 className="w-3 h-3 text-teal-700" />
                    <span>Sửa câu này</span>
                  </button>
                </div>
              </div>

              <p className="text-base font-bold text-slate-900">
                {relayQuestion.question}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relayQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRelayAnswer(i)}
                    disabled={relayAnswerSelected !== null}
                    className="p-3.5 rounded-2xl bg-white hover:bg-teal-50 border border-slate-300 text-slate-800 font-semibold text-xs text-left transition-all cursor-pointer"
                  >
                    {['A', 'B', 'C', 'D'][i]}. {opt}
                  </button>
                ))}
              </div>

              {relayAnswerSelected !== null && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={nextRelayTurn}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Chuyển sang lượt của Tổ tiếp theo ➔
                  </button>
                </div>
              )}
            </div>
          )}

          {relayWinner !== null && (
            <div className="p-6 bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400 rounded-3xl text-center space-y-3">
              <h3 className="text-xl font-black text-amber-900">
                🏆 TỔ {relayWinner} ĐÃ XUẤT SẮC GIÀNH CHIẾN THẮNG!
              </h3>
              <p className="text-xs text-amber-800 font-semibold">
                Đã ghi nhận chiến thắng và cộng +50 điểm thi đua vào bảng tổng kết tuần 5 cho Tổ {relayWinner}!
              </p>
              <button
                type="button"
                onClick={resetRelayRace}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Chơi lại ván mới
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: AI QUESTION CREATOR                                               */}
      {/* ========================================================================= */}
      {activeGame === 'ai_creator' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>Ngân Hàng Đề & Trợ Lý AI Tạo Câu Hỏi Theo Chủ Đề</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập chủ đề hoặc tải file tài liệu (.docx, .doc, .xlsx, .txt, .csv). AI tự động sinh câu hỏi phân hóa và tích hợp trực tiếp sang cả 5 trò chơi!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleIntegrateQuestionsToAllGames(selectedSetId)}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>⚡ TÍCH HỢP BỘ NÀY VÀO 5 GAME</span>
              </button>

              <button
                type="button"
                onClick={handleReshuffleQuestions}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Xáo trộn ngẫu nhiên thứ tự câu hỏi và 4 đáp án A-B-C-D"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>🎲 Xáo trộn ngẫu nhiên</span>
              </button>
            </div>
          </div>

          {/* CẨM NANG & NGUỒN GỐC NỘI DUNG CÂU HỎI & TRÁCH NHIỆM KIỂM DUYỆT CỦA GV */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl border border-indigo-500/30 shadow-md space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm sm:text-base text-white flex items-center gap-2 flex-wrap">
                  <span>❓ CÓ CHỦ ĐỀ RÕ RÀNG MÀ RA CÂU HỎI THÌ NỘI DUNG ĐƯỢC LẤY Ở ĐÂU?</span>
                  <span className="px-2.5 py-0.5 bg-emerald-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                    Quy Chuẩn Sư Phạm 100%
                  </span>
                </h4>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Hệ thống cam kết minh bạch nguồn dữ liệu học thuật và bắt buộc Giáo viên thẩm định chất lượng trước khi tổ chức thi:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10 space-y-1.5">
                <span className="font-bold text-amber-300 block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Nguồn 1: AI (Google Gemini)</span>
                </span>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  Khi Thầy/Cô nhập <strong>Chủ đề</strong> (ví dụ: Di truyền NST, Chiến dịch Điện Biên Phủ, Este, Hàm số...), AI tra cứu tri thức chuẩn SGK GDPT để biên soạn câu hỏi kiểm tra đúng kiến thức cụ thể, kèm 4 phương án và lời giải khoa học.
                </p>
              </div>

              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10 space-y-1.5">
                <span className="font-bold text-teal-300 block flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-teal-300 shrink-0" />
                  <span>Nguồn 2: Tệp Tài Liệu Của Giáo Viên</span>
                </span>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  Tải file Word (.docx, .doc), Excel (.xlsx) hoặc Text. Hệ thống tự động sửa lỗi phông chữ (.VnTime ➔ Unicode) và <strong>trích xuất trực tiếp 100% câu hỏi thật</strong> từ đề thi do chính Thầy/Cô biên soạn.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-950/70 rounded-2xl border border-emerald-500/40 space-y-1.5">
                <span className="font-bold text-emerald-300 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Trách Nhiệm GV: Duyệt & Sửa Trước Khi Thi</span>
                </span>
                <p className="text-emerald-100 text-[11px] leading-relaxed">
                  AI chỉ là công cụ hỗ trợ sơ khởi. <strong>Thầy/Cô bắt buộc mở Bàn Duyệt Đề</strong> để tự xem lại nội dung, sửa câu chữ, kiểm tra đáp án đúng (tích xanh), tuyệt đối không để câu hỏi sơ sài hoặc sai sót hình thức!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Chủ đề câu hỏi (Topic) - AI sẽ sinh câu hỏi bám sát 100% chủ đề này:
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="ví dụ: An toàn giao thông, Di truyền NST, Lịch sử 12 bài 21, Toán học vui, Nội quy nề nếp..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    2. Tài liệu nguồn (Dán văn bản hoặc tải tệp lên):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFixFontInContent}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] rounded-lg border border-amber-300 transition-all cursor-pointer"
                      title="Chuyển đổi văn bản dùng phông cũ .VnTime (TCVN3) hoặc VNI sang phông tiếng Việt Unicode chuẩn 100%"
                    >
                      <span>🔧 Sửa lỗi font .VnTime ➔ Unicode</span>
                    </button>

                    <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải file Word / Excel / Text</span>
                      <input
                        type="file"
                        accept=".txt,.csv,.json,.xlsx,.docx,.doc,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {uploadedFileName && (
                  <div className="mb-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Tệp đã tải: <strong>{uploadedFileName}</strong></span>
                      {fileEncodingInfo && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          ✓ {fileEncodingInfo}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileName('');
                        setAiContent('');
                        setFileEncodingInfo('');
                      }}
                      className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5"
                    >
                      ✕ Xóa tệp
                    </button>
                  </div>
                )}

                <textarea
                  rows={6}
                  value={aiContent}
                  onChange={e => setAiContent(e.target.value)}
                  placeholder="Dán nội dung bài học, ghi chú hoặc bộ câu hỏi có sẵn vào đây. Hệ thống tự động sửa lỗi phông chữ tiếng Việt chuẩn 100%..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />

                {detectedFileQuestions.length > 0 && (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-2.5 shadow-sm animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>
                        Đã phát hiện sẵn <strong>{detectedFileQuestions.length} câu hỏi trắc nghiệm</strong> trong tệp Word!
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Tệp của Thầy/Cô đã có sẵn bộ câu hỏi và đáp án hoàn chỉnh. Nhấn nút bên dưới để nạp thẳng vào Ngân hàng câu hỏi của lớp và dùng ngay cho cả 5 trò chơi!
                    </p>
                    <button
                      type="button"
                      onClick={handleImportDetectedQuestions}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-200" />
                      <span>📥 NẠP NGAY {detectedFileQuestions.length} CÂU HỎI NÀY VÀO NGÂN HÀNG CÂU HỎI LỚP</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Number of questions */}
              <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Số lượng câu hỏi cần tạo:</span>
                <div className="flex gap-2">
                  {[5, 10, 15].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setAiQuestionCount(cnt)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        aiQuestionCount === cnt
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {cnt} câu
                    </button>
                  ))}
                </div>
              </div>

              {aiErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiErrorMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateQuestionsWithAI}
                disabled={aiIsLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {aiIsLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang phân tích tài liệu và tạo câu hỏi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>TẠO BỘ CÂU HỎI PHÂN HÓA ĐỘ KHÓ NGAY</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Question Sets Library */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Kho Bộ Đề Hiện Có Trong Hệ Thống ({savedQuestionSets.length})
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {savedQuestionSets.map(set => {
                  const isCurrent = set.id === selectedSetId;
                  const stats = getSetReviewStats(set);

                  return (
                    <div
                      key={set.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/20 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{set.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Chủ đề: {set.topic}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-md">
                              {set.questions.length} câu hỏi phân hóa
                            </span>
                            {stats.isFullyApproved ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>ĐÃ DUYỆT BỞI GV</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-md flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>CHỜ GV DUYỆT ({stats.approved}/{stats.total})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(set.id)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Duyệt và sửa từng câu hỏi trong bộ đề này"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Duyệt & Sửa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleIntegrateQuestionsToAllGames(set.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                              isCurrent
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                                : 'bg-slate-900 hover:bg-indigo-600 text-white shadow-xs'
                            }`}
                            title="Tích hợp bộ câu hỏi này và kích hoạt ngay cho toàn bộ 5 trò chơi"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>{isCurrent ? '⚡ ĐÃ TÍCH HỢP CHO 5 GAME' : '⚡ TÍCH HỢP VÀO GAME'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSetId(set.id);
                              handleReshuffleQuestions();
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer"
                            title="Xáo trộn ngẫu nhiên thứ tự câu hỏi và 4 đáp án A-B-C-D"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {savedQuestionSets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteQuestionSet(set.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 cursor-pointer"
                              title="Xóa bộ đề khỏi hệ thống"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BẢNG THẨM ĐỊNH & DUYỆT CÂU HỎI TRỰC TIẾP CỦA GIÁO VIÊN TRƯỚC KHI THI    */}
          {/* ========================================================================= */}
          {activeQuestionSet && (
            <div className="mt-8 pt-6 border-t-2 border-slate-200/80 space-y-5 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-lg font-black text-white">
                      Bảng Thẩm Định & Duyệt Câu Hỏi Của Giáo Viên: "{activeQuestionSet.title}"
                    </h3>
                    {(() => {
                      const stats = getSetReviewStats(activeQuestionSet);
                      return stats.isFullyApproved ? (
                        <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ĐÃ DUYỆT ĐẠT CHUẨN 100%</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>CHỜ GV DUYỆT ({stats.approved}/{stats.total} CÂU)</span>
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-300">
                    Chủ đề: <strong className="text-amber-300">{activeQuestionSet.topic}</strong> • Tổng số câu: <strong>{activeQuestionSet.questions.length} câu</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveAllQuestionsInSet(activeQuestionSet.id)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title="Xác nhận đã kiểm tra nội dung & đáp án, duyệt tất cả câu hỏi trong bộ đề này"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>✅ DUYỆT TẤT CẢ CÂU ĐẠT CHUẨN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartCreateQuestion(activeQuestionSet.id)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    title="Thêm một câu hỏi mới tự biên soạn vào bộ đề"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm câu hỏi mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReviewModal(activeQuestionSet.id)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Mở toàn màn hình bàn làm việc kiểm duyệt"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Mở bàn duyệt chuyên sâu</span>
                  </button>
                </div>
              </div>

              {/* Banner nhắc nhở quy chuẩn kiểm duyệt sư phạm */}
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-amber-900 font-black">
                    YÊU CẦU SƯ PHẠM VỀ KIỂM DUYỆT ĐỀ THI & TRÒ CHƠI HỌC TẬP:
                  </strong>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Giáo viên <strong>phải duyệt câu hỏi, sửa câu hỏi và đáp án trước khi tổ chức thi</strong>. Câu hỏi do AI sinh ra nhưng thầy/cô phải tự xem lại nội dung và đáp án mình làm đúng chưa, <strong>tuyệt đối không được làm cho có rồi giao bộ câu hỏi sơ sài về nội dung hoặc sai sót về hình thức</strong>. Hãy nhấn nút "✏️ Sửa câu này" để chỉnh sửa câu chữ, điều chỉnh các phương án nhiễu và chọn lại đáp án đúng nếu cần thiết.
                  </p>
                </div>
              </div>

              {/* Danh sách từng câu hỏi hiển thị chi tiết */}
              <div className="space-y-4">
                {activeQuestionSet.questions.map((q, idx) => {
                  const isApproved = !!q.isApproved;
                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border-2 transition-all ${
                        isApproved
                          ? 'bg-white border-emerald-300/80 shadow-xs'
                          : 'bg-amber-50/40 border-amber-300 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-black text-xs rounded-lg">
                            Câu {idx + 1}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              q.level === 'Dễ'
                                ? 'bg-emerald-100 text-emerald-800'
                                : q.level === 'Trung bình'
                                ? 'bg-blue-100 text-blue-800'
                                : q.level === 'Khó'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            Cấp độ: {q.level}
                          </span>
                          {isApproved ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã duyệt đạt chuẩn GV</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[11px] rounded-lg flex items-center gap-1 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                              <span>Chờ GV kiểm tra nội dung</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleQuestionApproval(activeQuestionSet.id, q.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isApproved
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                            title={isApproved ? 'Hủy trạng thái đã duyệt' : 'Xác nhận duyệt câu hỏi này'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isApproved ? 'Bỏ duyệt' : 'Duyệt câu này'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(activeQuestionSet.id, q)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer shadow-xs"
                            title="Chỉnh sửa nội dung câu hỏi, 4 phương án và chọn lại đáp án đúng"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa câu hỏi & đáp án</span>
                          </button>

                          {activeQuestionSet.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestionFromSet(activeQuestionSet.id, q.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                              title="Xóa câu hỏi này khỏi bộ đề"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nội dung câu hỏi */}
                      <p className="text-sm font-bold text-slate-900 my-3 leading-relaxed">
                        {q.question}
                      </p>

                      {/* 4 Phương án */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          return (
                            <div
                              key={oIdx}
                              className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50/90 border-2 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                              }`}
                            >
                              <span className="flex items-start gap-1.5">
                                <span className={`font-mono font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>
                                  {['A', 'B', 'C', 'D'][oIdx]}.
                                </span>
                                <span>{opt}</span>
                              </span>
                              {isCorrect && (
                                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black shrink-0 flex items-center gap-1">
                                  ✓ ĐÁP ÁN ĐÚNG
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Lời giải thích */}
                      {q.explanation && (
                        <div className="mt-3 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-indigo-900">
                            💡 Lời giải thích sư phạm cho học sinh:
                          </span>
                          <p className="text-indigo-800 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}

                      {/* Ghi chú của giáo viên nếu có */}
                      {q.notes && (
                        <div className="mt-2 text-[11px] text-slate-500 italic">
                          📝 Ghi chú của GV: {q.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB: BẢNG XẾP HẠNG & LỊCH SỬ TÍCH ĐIỂM (GOOGLE SHEET)                  */}
      {/* ========================================================================= */}
      {activeGame === 'leaderboard' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Bảng Tổng Hợp Tích Điểm & Chuỗi Rèn Luyện (Sheet GiaiTri_TichDiem)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Toàn bộ dữ liệu điểm trò chơi, streak hàng ngày và phần thưởng lưu trữ vĩnh viễn trên Google Sheets.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                syncAllToGoogleSheets();
                showToast('Đang đồng bộ dữ liệu điểm lên Google Sheets...');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ ngay</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">STT</th>
                  <th className="p-3">Học Sinh</th>
                  <th className="p-3">Tổ</th>
                  <th className="p-3">Trò Chơi</th>
                  <th className="p-3">Thử Thách / Nhiệm Vụ</th>
                  <th className="p-3 text-center">Điểm (+)</th>
                  <th className="p-3 text-center">Chuỗi Streak</th>
                  <th className="p-3">Danh Hiệu</th>
                  <th className="p-3">Phần Thưởng</th>
                  <th className="p-3">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyMissions.length > 0 ? (
                  dailyMissions.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{item.studentName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700 text-[10px]">
                          Tổ {item.groupId}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{item.gameName}</td>
                      <td className="p-3 text-slate-600">{item.missionTitle}</td>
                      <td className="p-3 text-center font-bold text-emerald-600 font-mono">
                        +{item.pointsEarned}
                      </td>
                      <td className="p-3 text-center font-bold text-orange-600 font-mono">
                        {item.streakDays} ngày 🔥
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.rewardTier === 'Kim Cương'
                            ? 'bg-cyan-100 text-cyan-800'
                            : item.rewardTier === 'Vàng'
                            ? 'bg-amber-100 text-amber-800'
                            : item.rewardTier === 'Bạc'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.rewardTier}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-semibold">{item.rewardItem}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{item.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      Chưa có nhật ký chơi trò chơi hoặc rèn luyện nào. Hãy bắt đầu quay may mắn hoặc hoàn thành thử thách ngày!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CỬA SỔ MODAL: ĐỐ VUI RÈN LUYỆN HÀNG NGÀY (QUEST 1) TỪ NGÂN HÀNG ĐỀ        */}
      {/* ========================================================================= */}
      {streakQuizModalOpen && currentStreakQuizQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-xl shadow-xs">
                  <Flame className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Thử Thách Đố Vui Rèn Luyện Hôm Nay</h3>
                  <p className="text-xs text-slate-500">
                    Học sinh: <strong className="text-slate-800">{students.find(s => s.id === streakSelectedStudentId)?.fullName || 'Học sinh'}</strong> • Cấp độ: <strong className="text-amber-600">{currentStreakQuizQuestion.level}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStreakQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-orange-700 block mb-1">
                Câu hỏi rút từ bộ đề "{activeQuestionSet?.title}":
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                {currentStreakQuizQuestion.question}
              </p>
            </div>

            <div className="space-y-2.5">
              {currentStreakQuizQuestion.options.map((opt, i) => {
                const isSelected = streakSelectedAnswer === i;
                const isCorrect = i === currentStreakQuizQuestion.correctIndex;
                let btnStyle = 'bg-slate-50 hover:bg-orange-50 border-slate-200 text-slate-800';
                if (streakQuizAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-600 border-emerald-600 text-white font-black ring-2 ring-emerald-300';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-600 border-rose-600 text-white font-bold';
                  } else {
                    btnStyle = 'bg-slate-100 border-slate-200 text-slate-400 opacity-60';
                  }
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={streakQuizAnswered}
                    onClick={() => handleAnswerStreakQuiz(i)}
                    className={`w-full p-3.5 rounded-2xl border text-xs text-left font-semibold transition-all cursor-pointer flex items-center justify-between gap-3 ${btnStyle}`}
                  >
                    <span>
                      <strong className="mr-2 font-mono text-sm">{['A', 'B', 'C', 'D'][i]}.</strong>
                      {opt}
                    </span>
                    {streakQuizAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />}
                    {streakQuizAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-200 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {streakQuizAnswered && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Giải thích chi tiết:</span>
                </span>
                <p className="text-slate-600 leading-relaxed">{currentStreakQuizQuestion.explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStreakQuizIndex(prev => prev + 1);
                    setStreakQuizAnswered(false);
                    setStreakSelectedAnswer(null);
                    sfx.playTick();
                  }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đổi câu hỏi đố vui khác</span>
                </button>

                {currentStreakQuizQuestion && (
                  <button
                    type="button"
                    onClick={() => handleStartEditQuestion(selectedSetId, currentStreakQuizQuestion)}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 shadow-xs"
                    title="Sửa nội dung hoặc đáp án câu hỏi này"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Sửa câu này</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStreakQuizModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BÀN LÀM VIỆC THẨM ĐỊNH & DUYỆT CÂU HỎI CỦA GIÁO VIÊN TRƯỚC KHI THI */}
      {/* ========================================================================= */}
      {reviewModalOpen && setBeingReviewed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4 border-b border-indigo-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-2xl shadow-md text-white">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                    <span>Trung Tâm Thẩm Định & Duyệt Câu Hỏi Trước Khi Thi</span>
                    <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                      GV Kiểm Duyệt Chất Lượng
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Thầy/Cô tự kiểm tra nội dung và đáp án, sửa chữa chu đáo, tuyệt đối không làm sơ sài hoặc sai sót hình thức trước khi tổ chức thi đấu!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Set selector & Stats bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Bộ đề đang duyệt:</span>
                  <select
                    value={reviewSetId}
                    onChange={e => setReviewSetId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {savedQuestionSets.map(s => {
                      const st = getSetReviewStats(s);
                      return (
                        <option key={s.id} value={s.id}>
                          {st.isFullyApproved ? '🛡️' : '⚠️'} {s.title} ({s.questions.length} câu)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  {(() => {
                    const stats = getSetReviewStats(setBeingReviewed);
                    return (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600">Tiến độ thẩm định:</span>
                        <div className="w-28 h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              stats.isFullyApproved ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${stats.percent}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-800">
                          {stats.approved}/{stats.total} câu ({stats.percent}%)
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveAllQuestionsInSet(setBeingReviewed.id)}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title="Duyệt tất cả câu hỏi sau khi Thầy/Cô đã kiểm tra kỹ"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>✅ DUYỆT TẤT CẢ CÂU ĐẠT CHUẨN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartCreateQuestion(setBeingReviewed.id)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Thêm một câu hỏi tự soạn vào bộ đề này"
                  >
                    <Plus className="w-4 h-4" />
                    <span>➕ Thêm câu hỏi mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSetId(setBeingReviewed.id);
                      handleReshuffleQuestions();
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Xáo trộn ngẫu nhiên thứ tự câu hỏi và 4 đáp án A-B-C-D"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>🎲 Xáo trộn ngẫu nhiên</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleIntegrateQuestionsToAllGames(setBeingReviewed.id);
                    setReviewModalOpen(false);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>⚡ TÍCH HỢP & BẮT ĐẦU THI</span>
                </button>
              </div>

              {/* Quality Checklist Alert */}
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Quy chuẩn sư phạm:</strong> Hãy nhấn <strong>"✏️ Sửa câu này"</strong> để kiểm tra kỹ 4 phương án, đảm bảo đã đánh dấu chính xác phương án đúng (có tích xanh), không có câu hỏi sơ sài hoặc sai kiến thức. Sau khi hoàn tất kiểm tra, nhấn <strong>"Duyệt câu này"</strong> để phê duyệt.
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3.5">
                {setBeingReviewed.questions.map((q, idx) => {
                  const isApproved = !!q.isApproved;
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isApproved
                          ? 'bg-white border-emerald-300 shadow-xs'
                          : 'bg-amber-50/40 border-amber-300 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-black text-xs rounded-lg">
                            Câu {idx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              q.level === 'Dễ'
                                ? 'bg-emerald-100 text-emerald-800'
                                : q.level === 'Trung bình'
                                ? 'bg-blue-100 text-blue-800'
                                : q.level === 'Khó'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {q.level}
                          </span>
                          {isApproved ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Đã duyệt đạt chuẩn</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-lg flex items-center gap-1 border border-amber-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>Chờ GV kiểm tra</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleQuestionApproval(setBeingReviewed.id, q.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isApproved
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isApproved ? 'Bỏ duyệt' : 'Duyệt câu này'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(setBeingReviewed.id, q)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer shadow-xs"
                            title="Sửa câu hỏi, các phương án và chọn lại đáp án đúng"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa câu này</span>
                          </button>

                          {setBeingReviewed.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestionFromSet(setBeingReviewed.id, q.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-900 my-2.5 leading-relaxed">
                        {q.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-xl border flex items-start justify-between gap-1.5 ${
                                isCorrect
                                  ? 'bg-emerald-50 border-2 border-emerald-500 font-bold text-emerald-950 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="flex items-start gap-1.5">
                                <span className={`font-mono font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>
                                  {['A', 'B', 'C', 'D'][oIdx]}.
                                </span>
                                <span>{opt}</span>
                              </span>
                              {isCorrect && (
                                <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-black shrink-0">
                                  ✓ ĐÁP ÁN ĐÚNG
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-2.5 p-2 bg-indigo-50/70 rounded-xl border border-indigo-200 text-[11px] text-indigo-900">
                          <strong>💡 Giải thích:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Đóng bàn làm việc
              </button>

              <button
                type="button"
                onClick={() => {
                  handleIntegrateQuestionsToAllGames(setBeingReviewed.id);
                  setReviewModalOpen(false);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>HOÀN TẤT DUYỆT & TÍCH HỢP VÀO 5 TRÒ CHƠI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHỈNH SỬA CÂU HỎI & CHỌN LẠI ĐÁP ÁN ĐÚNG                         */}
      {/* ========================================================================= */}
      {editQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[94vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between gap-3 border-b border-indigo-400/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isCreatingNewQuestion ? '➕ Thêm Câu Hỏi Mới Vào Bộ Đề' : '✏️ Chỉnh Sửa Câu Hỏi & Chọn Lại Đáp Án Đúng'}
                  </h3>
                  <p className="text-[11px] text-indigo-100">
                    Thầy/Cô hãy sửa nội dung câu hỏi, 4 phương án và nhấp chọn phương án đúng chuẩn mực.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditQuestionModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {editFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* 1. Nội dung câu hỏi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800">
                    1. Nội dung câu hỏi <span className="text-rose-500">*</span>:
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Đã nhập: {editFormText.length} ký tự (tối thiểu 10 ký tự, không đặt câu hỏi sơ sài)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={editFormText}
                  onChange={e => setEditFormText(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi rõ ràng, có ngữ cảnh và chuẩn mực sư phạm..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* 2. Cấp độ câu hỏi */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  2. Cấp độ phân hóa:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Dễ', 'Trung bình', 'Khó', 'Cực khó'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEditFormLevel(lvl)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                        editFormLevel === lvl
                          ? lvl === 'Dễ'
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                            : lvl === 'Trung bình'
                            ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300'
                            : lvl === 'Khó'
                            ? 'bg-orange-500 text-white shadow-xs ring-2 ring-orange-300'
                            : 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. 4 Phương án trả lời & Chọn đáp án đúng */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    3. 4 Phương án lựa chọn & Chọn đáp án đúng <span className="text-rose-500">*</span>:
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    👉 Bấm vào nhãn [A], [B], [C], [D] để đặt làm đáp án đúng
                  </span>
                </div>

                {([0, 1, 2, 3] as const).map(idx => {
                  const isCorrect = editFormCorrectIndex === idx;
                  const label = ['A', 'B', 'C', 'D'][idx];

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl border-2 transition-all flex items-center gap-2 ${
                        isCorrect
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setEditFormCorrectIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                        title={`Bấm để chọn [${label}] là đáp án đúng`}
                      >
                        {isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>[{label}] {isCorrect ? '✓ ĐÁP ÁN ĐÚNG' : 'Chọn đúng'}</span>
                      </button>

                      <input
                        type="text"
                        value={editFormOptions[idx]}
                        onChange={e => {
                          const val = e.target.value;
                          setEditFormOptions(prev => {
                            const clone = [...prev] as [string, string, string, string];
                            clone[idx] = val;
                            return clone;
                          });
                        }}
                        placeholder={`Nhập nội dung phương án ${label}...`}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {/* 4. Giải thích chi tiết */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  4. Lời giải thích chi tiết cho học sinh:
                </label>
                <textarea
                  rows={2}
                  value={editFormExplanation}
                  onChange={e => setEditFormExplanation(e.target.value)}
                  placeholder="Giải thích lý do đáp án này đúng để học sinh hiểu bản chất kiến thức sau khi trả lời..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* 5. Ghi chú sư phạm */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  5. Ghi chú sư phạm của giáo viên (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={editFormNotes}
                  onChange={e => setEditFormNotes(e.target.value)}
                  placeholder="ví dụ: Bẫy kiến thức thường gặp, học sinh trung bình dễ nhầm..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* 6. Checkbox đánh dấu đã duyệt */}
              <label className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFormApproved}
                  onChange={e => setEditFormApproved(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-emerald-950 text-xs">
                  ✅ Đánh dấu câu hỏi này ĐÃ KIỂM DUYỆT & ĐẠT CHUẨN SƯ PHẠM sau khi lưu
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEditQuestionModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveEditedQuestion}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>💾 LƯU THAY ĐỔI & CẬP NHẬT CÂU HỎI</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
