import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // API Endpoint: Tạo câu hỏi bằng AI với mức độ khó tăng dần
  app.post('/api/generate-questions', async (req, res) => {
    const { topic = '', content = '', questionCount = 10 } = req.body || {};
    const count = Math.min(Math.max(Number(questionCount) || 5, 3), 20);
    const safeTopic = String(topic || '').trim();
    const safeContent = String(content || '').trim();

    try {
      if (!safeTopic && !safeContent) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp Chủ đề hoặc Nội dung tài liệu để tạo câu hỏi.',
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback generator when running locally without API key
        const generated = generateServerQuestions(safeTopic, safeContent, count);
        return res.json({
          success: true,
          count: generated.length,
          questions: generated,
          topic: safeTopic,
          source: 'local_engine',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemPrompt = `Bạn là một chuyên gia khảo thí, biên soạn đề thi quốc gia và giáo viên cốt cán giàu kinh nghiệm sư phạm.
Nhiệm vụ của bạn là biên soạn một bộ gồm chính xác ${count} câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D) CHUẨN MỰC SƯ PHẠM, ĐỘC ĐÁO, CHÍNH XÁC TUYỆT ĐỐI VỀ MẶT KHOA HỌC để giáo viên thẩm định và tổ chức thi đua/trò chơi cho học sinh.

TIÊU CHUẨN CHẤT LƯỢNG NGHIÊM NGẶT (TUYỆT ĐỐI TUÂN THỦ - KHÔNG LÀM SƠ SÀI, KHÔNG LÀM CHO CÓ):
1. NỘI DUNG CHUYÊN MÔN SÂU SẮC, ĐÚNG TRỌNG TÂM:
${safeTopic ? `- Chủ đề bắt buộc: ${safeTopic}` : ''}
${safeContent ? `- Tài liệu nguồn của giáo viên:\n"""\n${safeContent.slice(0, 12000)}\n"""` : ''}
- Câu hỏi PHẢI kiểm tra đúng kiến thức cốt lõi, hiện tượng, định lý, khái niệm, bản chất khoa học hoặc tình huống thực tế của chủ đề.
- TUYỆT ĐỐI KHÔNG tạo câu hỏi chung chung vô nghĩa kiểu "Khẳng định nào đúng", "Ý nào sau đây là đúng" mà không có nội dung học thuật.
- 4 phương án A, B, C, D phải rõ ràng, độc lập, có độ dài cân đối, ngữ pháp chuẩn xác.
- 3 phương án gây nhiễu (distractors) phải hợp lý, dựa trên các lỗi sai thường gặp của học sinh (misconceptions), không được đưa ra các phương án ngô nghê, hiển nhiên sai hoặc "Cả 3 phương án đều đúng/sai".

2. TỰ ĐỘNG THẨM ĐỊNH VÀ PHÂN BỐ ĐÁP ÁN ĐÚNG:
- "correctIndex" (0, 1, 2, 3) PHẢI CHỈ CHÍNH XÁC vào đáp án đúng nhất (0 tương ứng lựa chọn thứ nhất, 1 tương ứng lựa chọn thứ hai, 2 tương ứng lựa chọn thứ ba, 3 tương ứng lựa chọn thứ tư).
- Phân bố đều ngẫu nhiên các đáp án đúng vào cả 4 vị trí (khoảng 25% cho mỗi vị trí 0, 1, 2, 3), TUYỆT ĐỐI KHÔNG để tất cả đáp án đúng đều nằm ở vị trí 0.

3. PHÂN BỐ ĐỘ KHÓ TĂNG DẦN:
- Khoảng 30% câu đầu: Cấp độ "Dễ" (Nhận biết kiến thức cơ bản, định nghĩa, mốc thời gian, tên gọi).
- Khoảng 35% câu tiếp theo: Cấp độ "Trung bình" (Thông hiểu, giải thích nguyên nhân, so sánh, phân biệt).
- Khoảng 20% câu kế: Cấp độ "Khó" (Vận dụng, tính toán hoặc phân tích mối liên hệ phức tạp).
- Khoảng 15% câu cuối: Cấp độ "Cực khó" (Vận dụng cao, giải quyết tình huống thực tiễn, phân loại học sinh xuất sắc).

4. LỜI GIẢI THÍCH (EXPLANATION) CHI TIẾT & TÍNH SƯ PHẠM:
- Nêu rõ cơ sở khoa học, công thức hoặc dẫn chứng sách giáo khoa tại sao phương án đó đúng và vì sao các phương án khác sai để giáo viên và học sinh đối chiếu.

5. ĐỊNH DẠNG ĐẦU RA (JSON THUẦN TÚY):
Trả về MỘT mảng JSON các đối tượng, mỗi đối tượng có đúng cấu trúc:
[
  {
    "question": "Nội dung câu hỏi sâu sắc, rõ ràng?",
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correctIndex": 0, // số nguyên từ 0 đến 3 chỉ vị trí đáp án đúng
    "level": "Dễ", // chính xác 1 trong 4 giá trị: "Dễ", "Trung bình", "Khó", "Cực khó"
    "explanation": "Giải thích chi tiết cơ sở khoa học tại sao đáp án này đúng."
  }
]
Không kèm bất kỳ lời dẫn hay markdown nào ngoài mảng JSON hợp lệ.`;

      const candidateModels = [
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
      ];

      let response: any = null;
      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout với model ${modelName}`)), 12000)
          );

          const result: any = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: systemPrompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.7,
              },
            }),
            timeoutPromise,
          ]);

          if (result && result.text) {
            response = result;
            console.log(`[API AI] Sinh câu hỏi thành công bằng model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[API AI] Model ${modelName} lỗi (${err.status || err.message}), thử model tiếp theo...`);
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('Không thể kết nối đến các model AI.');
      }

      const responseText = response.text || '';
      let parsedQuestions = [];
      try {
        parsedQuestions = JSON.parse(responseText);
      } catch (e) {
        // Fallback extract json array
        const match = responseText.match(/\[\s*\{.*\}\s*\]/s);
        if (match) {
          parsedQuestions = JSON.parse(match[0]);
        } else {
          throw new Error('Không thể phân tích dữ liệu JSON từ AI.');
        }
      }

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('Dữ liệu câu hỏi trả về từ AI không hợp lệ.');
      }

      const formattedQuestions = parsedQuestions.map((q: any, idx: number) => ({
        id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        question: String(q.question || `Câu hỏi ${idx + 1}`),
        options: Array.isArray(q.options) && q.options.length === 4
          ? q.options.map((opt: any) => String(opt || ''))
          : ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
          ? q.correctIndex
          : 0,
        level: ['Dễ', 'Trung bình', 'Khó', 'Cực khó'].includes(q.level)
          ? q.level
          : (idx < count * 0.3 ? 'Dễ' : idx < count * 0.6 ? 'Trung bình' : idx < count * 0.85 ? 'Khó' : 'Cực khó'),
        explanation: String(q.explanation || 'Đáp án chính xác theo tài liệu.'),
      }));

      return res.json({
        success: true,
        count: formattedQuestions.length,
        questions: formattedQuestions,
        topic: safeTopic,
        source: 'gemini_ai',
      });
    } catch (err: any) {
      console.warn('Lỗi gọi Gemini API, kích hoạt bộ ngân hàng sư phạm chuyên sâu:', err);
      const generated = generateServerQuestions(safeTopic, safeContent, count);
      return res.json({
        success: true,
        count: generated.length,
        questions: generated,
        topic: safeTopic,
        source: 'server_pedagogical_engine',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // In development, hook up Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

function randomizeQuestionOptions(q: { question: string; options: string[]; correctIndex: number; level: string; explanation: string; id: string }) {
  const correctText = q.options[q.correctIndex] || q.options[0];
  const shuffledOptions = [...q.options];
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }
  const newCorrectIndex = shuffledOptions.indexOf(correctText);
  return {
    ...q,
    options: shuffledOptions,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

function normalizeVietnamese(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function generateServerQuestions(topic: string, content: string, count: number) {
  const safeTopic = topic || 'Kiến thức theo chủ đề';
  const norm = normalizeVietnamese(safeTopic);
  
  // 1. Nếu trong content đã có sẵn câu hỏi trắc nghiệm (ví dụ: Câu 1: ... A. ... B. ...)
  const parsedDirectly = parseQuestionsFromTextContent(content, safeTopic);
  if (parsedDirectly.length > 0) {
    return parsedDirectly.slice(0, count);
  }

  // 2. Trích xuất câu từ content để tạo câu hỏi bám sát 100% tài liệu
  const cleanSentences = (content || '')
    .split(/[.\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.startsWith('PK'));

  const list = [];
  const total = Math.max(count, 3);

  // Nhận diện chuyên môn chính xác từ chủ đề tiếng Việt
  const isMitosisMeiosis = norm.includes('nguyen phan') || norm.includes('giam phan') || norm.includes('phan bao') || norm.includes('te bao');
  const isBiology = isMitosisMeiosis || norm.includes('sinh') || norm.includes('di truyen') || norm.includes('nst') || norm.includes('gen') || norm.includes('adn') || norm.includes('arn') || norm.includes('dot bien') || norm.includes('quang hop') || norm.includes('sinh thai');
  const isHistory = norm.includes('lich su') || norm.includes('khang chien') || norm.includes('dien bien phu') || norm.includes('cach mang') || norm.includes('1975') || norm.includes('1945') || norm.includes('chien thang') || norm.includes('ho chi minh');
  const isGeography = norm.includes('dia ly') || norm.includes('khi hau') || norm.includes('song ngoi') || norm.includes('dong bang') || norm.includes('bien dong') || norm.includes('lanh tho');
  const isPhysics = norm.includes('vat ly') || norm.includes('dao dong') || norm.includes('song co') || norm.includes('dien xoay chieu') || norm.includes('quang hoc') || norm.includes('luc');
  const isChemistry = norm.includes('hoa hoc') || norm.includes('este') || norm.includes('kim loai') || norm.includes('axit') || norm.includes('polime') || norm.includes('phan ung');
  const isMath = norm.includes('toan') || norm.includes('ham so') || norm.includes('dao ham') || norm.includes('tich phan') || norm.includes('hinh hoc') || norm.includes('xac suat');

  // Ngân hàng câu hỏi Sinh học THPT chuyên sâu chuẩn xác 100% về Nguyên phân - Giảm phân
  const mitosisMeiosisBank = [
    {
      q: 'Trong quá trình nguyên phân, các nhiễm sắc thể (NST) co xoắn cực đại và tập trung thành 1 hàng ở mặt phẳng xích đạo của thoi phân bào tại kỳ nào?',
      opts: ['Kỳ giữa', 'Kỳ đầu', 'Kỳ sau', 'Kỳ cuối'],
      c: 0,
      level: 'Dễ',
      exp: 'Ở kỳ giữa của nguyên phân, các NST kép co xoắn cực đại và xếp thành một hàng dọc trên mặt phẳng xích đạo thoi vô sắc.'
    },
    {
      q: 'Sự kiện quan trọng nhất diễn ra ở kỳ sau của quá trình nguyên phân là gì?',
      opts: ['Các crômatit trong từng NST kép tách nhau ở tâm động thành 2 NST đơn và phân li về 2 cực', 'Các NST kép bắt đầu co xoắn và dính vào thoi phân bào', 'Màng nhân và nhân con tiêu biến hoàn toàn', 'Màng nhân xuất hiện trở lại và tế bào chất phân chia'],
      c: 0,
      level: 'Trung bình',
      exp: 'Kỳ sau nguyên phân đặc trưng bởi sự tách tâm động của từng NST kép, hình thành 2 NST đơn phân li đồng đều về hai cực tế bào.'
    },
    {
      q: 'Ý nghĩa sinh học quan trọng nhất của quá trình nguyên phân đối với cơ thể đa bào là gì?',
      opts: ['Giúp cơ thể lớn lên, thay thế tế bào già/tổn thương và duy trì ổn định bộ NST 2n', 'Tạo ra vô số biến dị tổ hợp phong phú cho chọn giống', 'Làm giảm bộ nhiễm sắc thể đi một nửa để tạo giao tử', 'Làm tăng tần số đột biến cấu trúc nhiễm sắc thể có lợi'],
      c: 0,
      level: 'Dễ',
      exp: 'Nguyên phân là phương thức phân bào sinh dưỡng, đảm bảo sao chép và duy trì ổn định bộ NST lưỡng bội 2n qua các thế hệ tế bào.'
    },
    {
      q: 'Hiện tượng tiếp hợp và trao đổi chéo giữa các crômatit khác nguồn của cặp NST tương đồng diễn ra ở kỳ nào của giảm phân?',
      opts: ['Kỳ đầu của giảm phân I', 'Kỳ giữa của giảm phân I', 'Kỳ đầu của giảm phân II', 'Kỳ sau của giảm phân II'],
      c: 0,
      level: 'Trung bình',
      exp: 'Sự tiếp hợp và trao đổi chéo chỉ xảy ra ở kỳ đầu giảm phân I, là cơ sở tế bào học dẫn đến hiện tượng hoán vị gen và biến dị tổ hợp.'
    },
    {
      q: 'Kết thúc quá trình giảm phân, từ 1 tế bào sinh dục chín có bộ NST lưỡng bội (2n) sẽ tạo ra bao nhiêu tế bào con có bộ NST như thế nào?',
      opts: ['4 tế bào con có bộ NST đơn bội (n)', '2 tế bào con có bộ NST lưỡng bội (2n)', '2 tế bào con có bộ NST đơn bội (n)', '4 tế bào con có bộ NST lưỡng bội (2n)'],
      c: 0,
      level: 'Dễ',
      exp: 'Giảm phân trải qua 2 lần phân bào liên tiếp nhưng chỉ nhân đôi ADN 1 lần, kết quả từ 1 tế bào 2n tạo ra 4 tế bào con mang bộ NST giảm đi một nửa (n).'
    },
    {
      q: 'Ở kỳ giữa của giảm phân I, các cặp nhiễm sắc thể tương đồng tập trung ở mặt phẳng xích đạo xếp thành mấy hàng?',
      opts: ['Xếp thành 2 hàng song song', 'Xếp thành 1 hàng duy nhất', 'Phân tán ngẫu nhiên không theo quy luật', 'Xếp thành 4 hàng tách biệt'],
      c: 0,
      level: 'Khó',
      exp: 'Khác với nguyên phân (xếp 1 hàng), ở kỳ giữa giảm phân I, các cặp NST tương đồng xếp thành 2 hàng song song trên mặt phẳng xích đạo.'
    },
    {
      q: 'Điểm khác biệt căn bản nhất giữa kỳ sau của giảm phân I và kỳ sau của nguyên phân là gì?',
      opts: ['Ở giảm phân I, các NST kép trong cặp tương đồng phân li độc lập về 2 cực mà không chẻ dọc tâm động', 'Ở giảm phân I, tâm động chẻ dọc ngay từ đầu kỳ', 'Ở nguyên phân, các NST kép không bị tách crômatit', 'Ở giảm phân I không có sự tham gia của thoi phân bào'],
      c: 0,
      level: 'Khó',
      exp: 'Kỳ sau giảm phân I chứng kiến sự phân li độc lập của các NST kép về hai cực mà tâm động chưa hề tách đôi.'
    },
    {
      q: 'Một tế bào sinh dưỡng ở người (2n = 46) đang ở kỳ giữa của quá trình nguyên phân có số lượng crômatit là bao nhiêu?',
      opts: ['92 crômatit', '46 crômatit', '23 crômatit', '184 crômatit'],
      c: 0,
      level: 'Khó',
      exp: 'Ở kỳ giữa nguyên phân, tế bào có 46 NST kép, mỗi NST kép gồm 2 crômatit nên tổng số crômatit là 46 x 2 = 92.'
    },
    {
      q: 'Bộ ba quá trình nào đóng vai trò cốt lõi trong việc duy trì ổn định bộ NST đặc trưng của loài sinh sản hữu tính qua các thế hệ?',
      opts: ['Nguyên phân, giảm phân và thụ tinh', 'Nguyên phân, phiên mã và dịch mã', 'Giảm phân, thụ tinh và đột biến', 'Tự nhân đôi ADN, giảm phân và phát sinh giao tử'],
      c: 0,
      level: 'Trung bình',
      exp: 'Giảm phân tạo giao tử n, thụ tinh khôi phục 2n, và nguyên phân giúp hợp tử phát triển thành cơ thể duy trì ổn định bộ NST đặc trưng của loài.'
    },
    {
      q: 'Một tế bào mẹ (2n = 8) thực hiện nguyên phân liên tiếp 3 lần, tổng số tế bào con thu được sau 3 lần phân bào là bao nhiêu?',
      opts: ['8 tế bào con', '6 tế bào con', '16 tế bào con', '24 tế bào con'],
      c: 0,
      level: 'Dễ',
      exp: 'Số tế bào con tạo thành qua k lần nguyên phân được tính theo công thức 2^k = 2^3 = 8 tế bào.'
    }
  ];

  // Ngân hàng Lịch sử
  const historyBank = [
    {
      q: 'Chiến thắng nào của quân và dân ta đã làm phá sản hoàn toàn kế hoạch Nava, giáng đòn quyết định đập tan ý chí xâm lược của thực dân Pháp?',
      opts: ['Chiến dịch Điện Biên Phủ 1954', 'Chiến dịch Việt Bắc thu - đông 1947', 'Chiến dịch Biên giới thu - đông 1950', 'Chiến dịch Tây Bắc 1952'],
      c: 0,
      level: 'Dễ',
      exp: 'Chiến thắng lịch sử Điện Biên Phủ (07/05/1954) đã đập tan tập đoàn cứ điểm mạnh nhất Đông Dương của Pháp, buộc Pháp phải ký Hiệp định Giơ-ne-vơ.'
    },
    {
      q: 'Sự kiện mang tính bước ngoặt vĩ đại mở ra kỷ nguyên độc lập, tự do cho dân tộc Việt Nam trong thế kỷ XX là gì?',
      opts: ['Thắng lợi của Cách mạng tháng Tám năm 1945', 'Chiến thắng Điện Biên Phủ trên không 1972', 'Phong trào Đồng Khởi 1960', 'Hiệp định Paris 1973'],
      c: 0,
      level: 'Trung bình',
      exp: 'Cách mạng tháng Tám năm 1945 đã lật đổ ách thống trị của phát xít - thực dân và chế độ phong kiến ngàn năm, khai sinh nước Việt Nam Dân chủ Cộng hòa.'
    },
    {
      q: 'Chiến dịch Hồ Chí Minh lịch sử giải phóng hoàn toàn miền Nam, thống nhất đất nước chính thức toàn thắng vào ngày nào?',
      opts: ['30 tháng 4 năm 1975', '26 tháng 4 năm 1975', '01 tháng 5 năm 1975', '02 tháng 9 năm 1975'],
      c: 0,
      level: 'Dễ',
      exp: 'Vào lúc 11h30 ngày 30/4/1975, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập, chiến dịch Hồ Chí Minh toàn thắng.'
    }
  ];

  // Ngân hàng Địa lý Việt Nam
  const geographyBank = [
    {
      q: 'Đặc điểm nổi bật nhất của vị trí địa lý nước ta đối với sự hình thành khí hậu là gì?',
      opts: ['Nằm hoàn toàn trong vùng nội chí tuyến Bắc bán cầu, tiếp giáp Biển Đông giàu ẩm', 'Nằm ở trung tâm lục địa Á - Âu nên chịu ảnh hưởng sâu sắc của gió mùa lục địa khô', 'Nằm gần xích đạo nhưng có mùa đông lạnh do địa hình núi cao che chắn', 'Nằm hoàn toàn trong vành đai sinh khoáng Thái Bình Dương'],
      c: 0,
      level: 'Dễ',
      exp: 'Vị trí nội chí tuyến cùng sự tác động của Biển Đông mang lại cho nước ta nền nhiệt ẩm dồi dào, mưa nhiều, thiên nhiên xanh tốt quanh năm.'
    },
    {
      q: 'Gió mùa mùa đông (gió mùa Đông Bắc) ở miền Bắc nước ta có tính chất biến tính ẩm và mưa phùn vào thời kỳ nào?',
      opts: ['Nửa cuối mùa đông (tháng 2 - 3)', 'Nửa đầu mùa đông (tháng 11 - 12)', 'Giữa mùa đông (tháng 1)', 'Đầu mùa hạ (tháng 5)'],
      c: 0,
      level: 'Trung bình',
      exp: 'Vào nửa cuối mùa đông, khối khí lạnh di chuyển lệch đông qua biển ấm, tăng cường hơi ẩm gây ra thời tiết ẩm ướt và mưa phùn dai dẳng ở Bắc Bộ.'
    },
    {
      q: 'Đồng bằng sông Cửu Long có đặc điểm địa hình và chế độ nước nổi bật nào so với đồng bằng sông Hồng?',
      opts: ['Địa hình thấp, bằng phẳng, mạng lưới kênh rạch chằng chịt và mùa lũ ngập trên diện rộng', 'Có hệ thống đê sông dài hơn 2.700 km kiên cố chia cắt thành nhiều ô trũng', 'Địa hình dốc từ tây bắc xuống đông nam với nhiều bậc thềm phù sa cổ', 'Không có mùa lũ nhưng thường xuyên chịu ảnh hưởng của bão và gió phơn tây nam'],
      c: 0,
      level: 'Khó',
      exp: 'ĐBSCL là đồng bằng châu thổ thấp, không có đê bao bọc như đồng bằng sông Hồng, mùa lũ nước dâng tràn đồng mang lại nguồn lợi thủy sản và phù sa.'
    },
    {
      q: 'Vùng biển nước ta tiếp giáp với vùng biển của bao nhiêu quốc gia trong khu vực Biển Đông?',
      opts: ['8 quốc gia', '6 quốc gia', '10 quốc gia', '12 quốc gia'],
      c: 0,
      level: 'Dễ',
      exp: 'Vùng biển Việt Nam tiếp giáp với vùng biển của 8 quốc gia: Trung Quốc, Campuchia, Thái Lan, Malaysia, Singapore, Indonesia, Brunei và Philippines.'
    }
  ];

  // Ngân hàng Vật lý THPT
  const physicsBank = [
    {
      q: 'Một chất điểm dao động điều hòa với phương trình x = A*cos(ωt + φ). Vận tốc của chất điểm biến thiên điều hòa theo thời gian và sớm pha so với li độ một góc là bao nhiêu?',
      opts: ['π/2 rad (sớm pha 90 độ)', 'π rad (ngược pha)', 'π/4 rad (sớm pha 45 độ)', '0 rad (cùng pha)'],
      c: 0,
      level: 'Dễ',
      exp: 'Vận tốc v = -ωA*sin(ωt + φ) = ωA*cos(ωt + φ + π/2), do đó vận tốc sớm pha π/2 rad so với li độ dao động.'
    },
    {
      q: 'Trong hiện tượng giao thoa sóng cơ trên mặt nước của 2 nguồn kết hợp cùng pha, các điểm dao động với biên độ cực đại có hiệu đường đi từ 2 nguồn (d2 - d1) thỏa mãn điều kiện nào?',
      opts: ['d2 - d1 = k*λ (với k là số nguyên)', 'd2 - d1 = (k + 0,5)*λ', 'd2 - d1 = (2k + 1)*λ/4', 'd2 - d1 = k*λ/2'],
      c: 0,
      level: 'Trung bình',
      exp: 'Cực đại giao thoa ứng với hiệu khoảng cách d2 - d1 bằng một số nguyên lần bước sóng: d2 - d1 = k*λ (k = 0, ±1, ±2...).'
    },
    {
      q: 'Hiện tượng cộng hưởng điện trong mạch RLC nối tiếp xảy ra khi tần số góc ω của dòng điện xoay chiều thỏa mãn hệ thức nào?',
      opts: ['ω = 1 / √(L*C)', 'ω = √(L*C)', 'ω = L / C', 'ω = R / √(L*C)'],
      c: 0,
      level: 'Trung bình',
      exp: 'Khi ZL = ZC <=> ωL = 1/(ωC) <=> ω^2 = 1/(LC) <=> ω = 1/√(LC), mạch xảy ra cộng hưởng điện, cường độ dòng điện đạt giá trị cực đại.'
    },
    {
      q: 'Hạt nhân nguyên tử cấu tạo từ các nucleon, gồm những hạt nào sau đây?',
      opts: ['Proton mang điện tích dương và nơtron không mang điện', 'Proton mang điện tích dương và electron mang điện tích âm', 'Nơtron không mang điện và electron mang điện tích âm', 'Chỉ gồm các hạt proton liên kết chặt chẽ với nhau'],
      c: 0,
      level: 'Dễ',
      exp: 'Hạt nhân nguyên tử được cấu tạo bởi các nucleon gồm proton (p) mang điện +1 và neutron (n) trung hòa về điện.'
    }
  ];

  // Ngân hàng Hóa học
  const chemistryBank = [
    {
      q: 'Hợp chất este etyl axetat có công thức cấu tạo thu gọn là gì?',
      opts: ['CH3COOC2H5', 'C2H5COOCH3', 'HCOOCH2CH3', 'CH3COOCH3'],
      c: 0,
      level: 'Dễ',
      exp: 'Etyl axetat được tạo thành từ gốc axetat (CH3COO-) và gốc etyl (-C2H5), công thức thu gọn là CH3COOC2H5.'
    },
    {
      q: 'Chất nào sau đây thuộc nhóm đisaccarit và bị thủy phân trong môi trường axit đun nóng tạo thành glucozơ và fructozơ?',
      opts: ['Saccarozơ', 'Tinh bột', 'Xenlulozơ', 'Mantozo'],
      c: 0,
      level: 'Dễ',
      exp: 'Saccarozơ (C12H22O11) là đisaccarit, khi thủy phân tạo ra 1 phân tử glucozơ và 1 phân tử fructozơ.'
    },
    {
      q: 'Kim loại nào sau đây có tính khử mạnh nhất và phải được bảo quản bằng cách ngâm chìm trong dầu hỏa khan?',
      opts: ['Natri (Na)', 'Nhôm (Al)', 'Đồng (Cu)', 'Sắt (Fe)'],
      c: 0,
      level: 'Dễ',
      exp: 'Natri (Na) là kim loại kiềm hoạt động hóa học rất mạnh, tác dụng mãnh liệt với nước và oxi trong không khí nên phải ngâm trong dầu hỏa.'
    },
    {
      q: 'Để phân biệt 2 dung dịch mất nhãn glucozơ và glixerol, ta có thể dùng thuốc thử nào sau đây khi đun nóng?',
      opts: ['Dung dịch AgNO3 trong NH3 (phản ứng tráng bạc)', 'Dung dịch Cu(OH)2 ở nhiệt độ phòng', 'Dung dịch quỳ tím', 'Dung dịch phenolphtalein'],
      c: 0,
      level: 'Khó',
      exp: 'Cả 2 chất đều hòa tan Cu(OH)2 tạo dung dịch xanh lam, nhưng chỉ glucozơ có nhóm -CHO nên tham gia phản ứng tráng bạc tạo kết tủa Ag sáng bóng.'
    }
  ];

  // Ngân hàng Toán học
  const mathBank = [
    {
      q: 'Cho hàm số y = f(x) có đạo hàm f\'(x) trên khoảng (a; b). Nếu f\'(x) > 0 với mọi x thuộc (a; b) thì hàm số f(x) có tính chất gì trên khoảng đó?',
      opts: ['Đồng biến trên khoảng (a; b)', 'Nghịch biến trên khoảng (a; b)', 'Là hàm hằng không đổi trên (a; b)', 'Không xác định được chiều biến thiên'],
      c: 0,
      level: 'Dễ',
      exp: 'Theo định lý về tính đơn điệu: Nếu đạo hàm f\'(x) > 0 với mọi x thuộc (a; b) thì hàm số y = f(x) đồng biến trên khoảng đó.'
    },
    {
      q: 'Khối chóp có diện tích đáy là B và chiều cao là h thì thể tích V của khối chóp được tính theo công thức nào?',
      opts: ['V = (1/3) * B * h', 'V = B * h', 'V = (1/2) * B * h', 'V = (4/3) * B * h'],
      c: 0,
      level: 'Dễ',
      exp: 'Công thức tính thể tích khối chóp là V = 1/3 * B * h (với B là diện tích đáy và h là chiều cao tương ứng).'
    },
    {
      q: 'Đạo hàm của hàm số y = ln(x) với x > 0 là gì?',
      opts: ['y\' = 1 / x', 'y\' = 1 / (x * ln(10))', 'y\' = -1 / x^2', 'y\' = e^x'],
      c: 0,
      level: 'Dễ',
      exp: 'Đạo hàm cơ bản của hàm số logarit tự nhiên ln(x) với x > 0 là (ln x)\' = 1/x.'
    }
  ];

  // Ngân hàng Ngữ văn & Tiếng Việt
  const literatureBank = [
    {
      q: 'Tác phẩm "Truyện Kiều" của Đại thi hào Nguyễn Du được viết bằng thể thơ truyền thống nào của dân tộc?',
      opts: ['Thể thơ lục bát', 'Thể thơ song thất lục bát', 'Thể thơ thất ngôn bát cú Đường luật', 'Thể thơ tự do'],
      c: 0,
      level: 'Dễ',
      exp: 'Đoạn trường tân thanh (Truyện Kiều) gồm 3254 câu thơ lục bát, là đỉnh cao chói lọi của văn học chữ Nôm Việt Nam.'
    },
    {
      q: 'Nhân vật anh thanh niên trong truyện ngắn "Lặng lẽ Sa Pa" của nhà văn Nguyễn Thành Long làm công tác gì trên đỉnh Yên Sơn cao 2600m?',
      opts: ['Công tác khí tượng kiêm vật lý địa cầu', 'Kiểm lâm bảo vệ rừng quốc gia', 'Kỹ sư trắc địa đo vẽ bản đồ', 'Bác sĩ nghiên cứu dược liệu'],
      c: 0,
      level: 'Trung bình',
      exp: 'Anh thanh niên làm công tác khí tượng kiêm vật lý địa cầu, đo gió, đo mưa, đo nắng, tính mây nhằm phục vụ sản xuất và chiến đấu.'
    },
    {
      q: 'Biện pháp tu từ nào được sử dụng chủ đạo trong câu thơ: "Bàn tay ta làm nên tất cả / Có sức người sỏi đá cũng thành cơm" (Hoàng Trung Thông)?',
      opts: ['Hoán dụ kết hợp ẩn dụ', 'So sánh ngang bằng', 'Nói quá phóng đại phi lý', 'Chơi chữ đồng âm'],
      c: 0,
      level: 'Trung bình',
      exp: '"Bàn tay ta" là hoán dụ chỉ người lao động; "sỏi đá cũng thành cơm" là ẩn dụ chỉ thành quả lao động cải tạo tự nhiên.'
    }
  ];

  // Ngân hàng Tiếng Anh
  const englishBank = [
    {
      q: 'Choose the best option to complete the sentence: "If she _______ harder, she would pass the final examination with flying colors."',
      opts: ['studied', 'studies', 'will study', 'has studied'],
      c: 0,
      level: 'Trung bình',
      exp: 'Đây là câu điều kiện loại 2 (Conditional Type 2) diễn tả điều kiện không có thật ở hiện tại: If + S + V-ed/V2, S + would/could + V-bare.'
    },
    {
      q: 'Choose the correct passive voice form: "They built this bridge in 1995."',
      opts: ['This bridge was built in 1995.', 'This bridge is built in 1995.', 'This bridge had built in 1995.', 'This bridge was builded in 1995.'],
      c: 0,
      level: 'Dễ',
      exp: 'Câu chủ động ở thì quá khứ đơn (built). Thể bị động quá khứ đơn có cấu trúc: S + was/were + V3/V-ed (was built).'
    },
    {
      q: 'Identify the synonym of the word "ENORMOUS":',
      opts: ['Gigantic', 'Tiny', 'Fragile', 'Narrow'],
      c: 0,
      level: 'Dễ',
      exp: '"Enormous" có nghĩa là to lớn, khổng lồ; đồng nghĩa với "Gigantic" (rất to lớn).'
    }
  ];

  // Ngân hàng An toàn giao thông & Kỹ năng nề nếp
  const trafficSafetyBank = [
    {
      q: 'Người điều khiển xe mô tô, xe gắn máy, xe đạp điện bắt buộc phải đội mũ bảo hiểm có cài quai đúng quy cách khi nào?',
      opts: ['Khi tham gia giao thông trên tất cả các tuyến đường bộ', 'Chỉ khi đi trên quốc lộ và đường cao tốc', 'Chỉ khi chở thêm người phía sau', 'Chỉ khi nhìn thấy lực lượng cảnh sát giao thông'],
      c: 0,
      level: 'Dễ',
      exp: 'Luật Giao thông đường bộ quy định người ngồi trên mô tô, xe gắn máy, xe đạp điện phải đội mũ bảo hiểm cài quai đúng quy cách trên mọi tuyến đường bộ.'
    },
    {
      q: 'Khi gặp tín hiệu đèn giao thông màu vàng bật sáng, người điều khiển phương tiện phải xử lý như thế nào là đúng quy tắc giao thông?',
      opts: ['Phải dừng lại trước vạch dừng; nếu đã đi quá vạch dừng thì được đi tiếp', 'Tăng tốc thật nhanh để vượt qua nút giao trước khi đèn chuyển đỏ', 'Bấm còi liên tục và rẽ phải ngay lập tức', 'Được phép tiếp tục di chuyển bình thường mà không cần giảm tốc'],
      c: 0,
      level: 'Trung bình',
      exp: 'Khi đèn vàng bật, phương tiện phải dừng lại trước vạch dừng. Trường hợp đã vượt quá vạch dừng thì được phép tiếp tục di chuyển an toàn.'
    },
    {
      q: 'Học sinh từ đủ 16 tuổi đến dưới 18 tuổi được phép điều khiển loại phương tiện nào sau đây?',
      opts: ['Xe gắn máy có dung tích xi-lanh dưới 50 cm3', 'Xe mô tô hai bánh có dung tích xi-lanh từ 50 cm3 trở lên', 'Xe ô tô con dưới 9 chỗ ngồi', 'Xe máy điện có vận tốc tối đa trên 70 km/h'],
      c: 0,
      level: 'Trung bình',
      exp: 'Theo Luật Giao thông đường bộ, người đủ 16 tuổi trở lên được lái xe gắn máy có dung tích xi lanh dưới 50 cm3.'
    }
  ];

  for (let i = 0; i < total; i++) {
    let level: 'Dễ' | 'Trung bình' | 'Khó' | 'Cực khó' = 'Dễ';
    if (i >= total * 0.75) level = 'Cực khó';
    else if (i >= total * 0.5) level = 'Khó';
    else if (i >= total * 0.25) level = 'Trung bình';

    let rawQuestion;

    if (cleanSentences.length > i && cleanSentences[i].length > 25) {
      const sentence = cleanSentences[i];
      rawQuestion = {
        id: `q_srv_doc_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${level}] Theo tài liệu bài học về "${safeTopic}": Nhận định nào sau đây là nội dung cốt lõi chính xác?`,
        options: [
          sentence,
          `Khẳng định trái ngược: Hiện tượng trên hoàn toàn không diễn ra trong điều kiện bài học.`,
          `Nội dung này đã bị bác bỏ và không còn đúng theo chương trình chuẩn hiện hành.`,
          `Chỉ áp dụng với một trường hợp ngoại lệ hiếm gặp, không mang tính quy luật phổ quát.`,
        ],
        correctIndex: 0,
        level,
        explanation: `Theo tài liệu giảng dạy về "${safeTopic}": "${sentence}" là khẳng định chuẩn mực và chính xác nhất.`,
      };
    } else if (isMitosisMeiosis || isBiology) {
      const qItem = mitosisMeiosisBank[i % mitosisMeiosisBank.length];
      rawQuestion = {
        id: `q_srv_mitosis_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (isHistory) {
      const qItem = historyBank[i % historyBank.length];
      rawQuestion = {
        id: `q_srv_hist_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (isGeography) {
      const qItem = geographyBank[i % geographyBank.length];
      rawQuestion = {
        id: `q_srv_geo_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (isPhysics) {
      const qItem = physicsBank[i % physicsBank.length];
      rawQuestion = {
        id: `q_srv_phy_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (isChemistry) {
      const qItem = chemistryBank[i % chemistryBank.length];
      rawQuestion = {
        id: `q_srv_chem_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (isMath) {
      const qItem = mathBank[i % mathBank.length];
      rawQuestion = {
        id: `q_srv_math_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (norm.includes('van') || norm.includes('tieng viet') || norm.includes('tho') || norm.includes('truyen')) {
      const qItem = literatureBank[i % literatureBank.length];
      rawQuestion = {
        id: `q_srv_lit_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (norm.includes('anh') || norm.includes('english') || norm.includes('ngoai ngu')) {
      const qItem = englishBank[i % englishBank.length];
      rawQuestion = {
        id: `q_srv_eng_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else if (norm.includes('giao thong') || norm.includes('ne nep') || norm.includes('dao duc') || norm.includes('an toan') || norm.includes('noi quy')) {
      const qItem = trafficSafetyBank[i % trafficSafetyBank.length];
      rawQuestion = {
        id: `q_srv_safe_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    } else {
      // Khi chủ đề chưa nhận diện được môn cụ thể, phân bổ xoay vòng các câu hỏi thực tế đa môn học chuẩn mực
      const generalPool = [
        ...trafficSafetyBank,
        ...mitosisMeiosisBank,
        ...historyBank,
        ...geographyBank,
        ...physicsBank,
        ...chemistryBank,
      ];
      const qItem = generalPool[i % generalPool.length];
      rawQuestion = {
        id: `q_srv_all_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        question: `[Câu ${i + 1} - Cấp độ ${qItem.level}] ${qItem.q}`,
        options: qItem.opts,
        correctIndex: qItem.c,
        level: qItem.level as any,
        explanation: qItem.exp,
      };
    }

    list.push(randomizeQuestionOptions(rawQuestion));
  }
  return list;
}

function parseQuestionsFromTextContent(rawText: string, topic: string) {
  if (!rawText || rawText.length < 30) return [];
  const clean = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const qRegex = /(?:^|\n)\s*(?:(?:Câu|Bài)\s*\d+[\s:.)-]|(?:\d+)[\s:.)-])\s*/gi;
  const matches = [];
  let m;
  while ((m = qRegex.exec(clean)) !== null) {
    matches.push({ index: m.index, text: m[0] });
  }
  if (matches.length < 2) return [];

  const list = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].text.length;
    const end = (i + 1 < matches.length) ? matches[i + 1].index : clean.length;
    const block = clean.slice(start, end).trim();

    const optAReg = /(?:^|\n|\s+)[A|a][\s.:)\-]\s*/;
    const optBReg = /(?:^|\n|\s+)[B|b][\s.:)\-]\s*/;
    const optCReg = /(?:^|\n|\s+)[C|c][\s.:)\-]\s*/;
    const optDReg = /(?:^|\n|\s+)[D|d][\s.:)\-]\s*/;

    const aIdx = block.search(optAReg);
    const bIdx = block.search(optBReg);
    const cIdx = block.search(optCReg);
    const dIdx = block.search(optDReg);

    if (aIdx !== -1 && bIdx !== -1 && cIdx !== -1 && dIdx !== -1 && aIdx < bIdx && bIdx < cIdx && cIdx < dIdx) {
      const qText = block.slice(0, aIdx).trim();
      const optA = block.slice(aIdx, bIdx).replace(/^[A|a][\s.:)\-]\s*/, '').trim();
      const optB = block.slice(bIdx, cIdx).replace(/^[B|b][\s.:)\-]\s*/, '').trim();
      const optC = block.slice(cIdx, dIdx).replace(/^[C|c][\s.:)\-]\s*/, '').trim();
      let optD = block.slice(dIdx).replace(/^[D|d][\s.:)\-]\s*/, '').trim();

      const endMatch = optD.match(/(?:Đáp\s*án|Chọn|Key|Lời\s*giải|Hướng\s*dẫn)/i);
      if (endMatch && endMatch.index !== undefined) {
        optD = optD.slice(0, endMatch.index).trim();
      }

      let correctIndex = 0;
      const ansMatch = block.match(/(?:Đáp\s*án|Chọn|Key|Đ\/A|ĐA)[\s:.]*\s*([A-Da-d])/i);
      if (ansMatch) {
        const letter = ansMatch[1].toUpperCase();
        if (letter === 'A') correctIndex = 0;
        else if (letter === 'B') correctIndex = 1;
        else if (letter === 'C') correctIndex = 2;
        else if (letter === 'D') correctIndex = 3;
      }

      let explanation = `Đáp án ${['A', 'B', 'C', 'D'][correctIndex]} theo tài liệu ${topic}.`;
      const explMatch = block.match(/(?:Lời\s*giải|Hướng\s*dẫn|Giải\s*thích)[\s:.]*([\s\S]*)/i);
      if (explMatch) {
        explanation = explMatch[1].trim().slice(0, 300);
      }

      const pct = (i + 1) / matches.length;
      let level: 'Dễ' | 'Trung bình' | 'Khó' | 'Cực khó' = 'Dễ';
      if (pct > 0.8) level = 'Cực khó';
      else if (pct > 0.55) level = 'Khó';
      else if (pct > 0.3) level = 'Trung bình';

      list.push({
        id: `q_parsed_${Date.now()}_${i + 1}`,
        question: qText || `Câu hỏi số ${i + 1}`,
        options: [optA || 'Lựa chọn A', optB || 'Lựa chọn B', optC || 'Lựa chọn C', optD || 'Lựa chọn D'],
        correctIndex,
        level,
        explanation,
      });
    }
  }
  return list;
}

startServer().catch(err => {
  console.error('Không thể khởi động server:', err);
  process.exit(1);
});
