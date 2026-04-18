# 🛠 ĐẶC TẢ TÍNH NĂNG (FEATURE REQUIREMENTS) - EPT MASTER APP

Để chuyển từ "giấy" sang Code thực tế, đây là bộ tính năng (Backlog) được chia block rõ ràng cho Đội Dev. Đã tích hợp các Idea đột phá dựa trên hành vi thợ HVAC.

---

## MODULE 1: CORE EXAM ENGINE (Hệ thống Lõi)
*Phải làm cực mượt, tải siêu nhanh, thao tác bằng 1 ngón tay cái.*

1. **Test Mode (Chế độ thi thực tế):**
    *   Tách biệt 4 Section (Core, Type I, Type II, Type III).
    *   Mỗi Section bốc ngẫu nhiên 25 câu hỏi từ Ngân hàng (Bank).
    *   Đồng hồ đếm ngược (Session Timer).
    *   **Logic Chấm Điểm Độc Lập:** Phải qua 18/25 (72%) *của mỗi phần* mới gọi là đỗ. (Các app khác gom 100 câu rồi tính %. EPA không tính thế, rớt 1 phần là rớt).
2. **Practice Mode (Chế độ luyện tập):**
    *   Làm đến câu nào, báo Xanh/Đỏ ngay câu đó.
    *   Hiển thị giải thích chi tiết (Text Explanation tĩnh) luôn dưới câu hỏi.
3. **Database Architecture (Kiến trúc Dữ Liệu):**
    *   Gắn Tag cho từng câu hỏi (VD: `[A2L]`, `[R-22]`, `[Ozone]`, `[Safety]`). Nhờ hệ thống Tag này mà sau này AI mới biết User yếu phần nào để gom bài tập riêng.
    *   Gắn Metadata: `Năm cập nhật` (VD: 2026) để trấn an User rắng đề này mới.

---

## MODULE 2: AI & SMART COACH (Trí tuệ Nhân tạo - USP Cốt lõi)

4. **"Explain Like I'm 5" AI Button:**
    *   Nút bấm cạnh câu trả lời sai: *"AI Tự động giải thích câu này"*. Prompt API (OpenAI/Claude) phải được thiết lập cứng: chỉ dùng ví dụ điện lạnh, giọng văn dân dã cho thợ đọc hiểu, giới hạn 100 chữ.
5. **Smart Weakness Radar (Radar Bắt Bệnh):**
    *   Đồ thị mạng nhện (Spider chart) thống kê độ thành thạo theo từng Tag.
    *   Ví dụ: *Luật Clean Air Act (90%) / Môi chất A2L (30%)* -> Radar báo Đỏ mảng A2L.
6. **Adaptive Drill (Xoáy sâu Điểm mù):**
    *   Nút "Generate Custom Quiz": AI tự động bốc 20 câu hỏi tỷ lệ rớt cao nhất của chính user đó dồn thành 1 đề riêng để vá lỗ hổng.

---

## MODULE 3: ONBOARDING & GAMIFICATION (Tâm lý học giữ chân User)

7. **Tinder-style Flashcards (Gợi ý Mới & Cực Cuốn):**
    *   Chế độ ôm điện thoại lướt: Hiện câu hỏi + 2 Trạng thái (Đúng / Sai). 
    *   Quẹt Trái = Sai, Quẹt Phải = Đúng. Hiệu ứng haptic feedback (rung điện thoại) cực êm. Gắn tệp học viên trẻ (Gen Z vào nghề hvac).
8. **Streak Board (Chuỗi học tập):**
    *   Giao diện lịch giống Github/Duolingo. Học 1 ngày sáng 1 nốt xanh.
    *   Tâm lý: Thợ tự ép mình mở app lên làm 5 câu quẹt Flashcard mỗi sáng ngồi nhà vệ sinh để giữ chuỗi, không muốn bị vỡ kỷ lục.
9. **Pass Predictor % (Thanh đo Sẵn sàng):**
    *   Một đồng hồ tốc độ từ 0% - 100%. Nếu user làm 3 mock test đạt trên 75%, thanh này chỉ vào vùng xanh lá: *"Bạn đã sẵn sàng đi thi!"*. Cực kỳ kích thích dopamine.

---

## MODULE 4: HACKS DÀNH RIÊNG CHO NGÀNH HVAC (Đột phá)

10. **Offline Mode (PWA Service Worker - BẮT BUỘC):**
    *   Thợ thường xuống tầng hầm (Basement) hoặc trèo lên mái nhà cao tầng (Rooftop) để làm việc và rảnh rỗi lấy máy ra học. Những nơi này **thường mất sóng 4G/Wifi**.
    *   App phải cache (lưu lại) 100 câu hỏi vào bộ nhớ trình duyệt để họ Quẹt Flashcard không cần mạng.
11. **Hands-free Podcast Mode (Học bằng Tai lái xe - Gợi ý Siêu Cấp):**
    *   Thợ mất 2-3 tiếng lái xe Truck đi từ nhà này sang nhà khách khác.
    *   Tính năng: Đọc câu hỏi bằng giọng nói (Text-to-Speech) -> Chờ 5s -> Đọc đáp án đúng. Màn hình tự động Darkmode. Vô địch thị trường vì đánh đúng Insight lãng phí thời gian lái xe!
12. **The "I Passed" Certificate Generator (Kích hoạt Viral):**
    *   Khi thanh "Pass Predictor" đạt 100%, tự động cấp 1 tấm thiệp xịn xò (Digital Card): *"Sẵn sàng chinh phục EPA 608 Universal cùng EPT Master"*. Đi kèm Nút chia sẻ thẳng lên Facebook Group khoe mẽ kiếm Traffic Free.

---

## MODULE 5: BUSINESS & PAYWALL (Cổng Thu Tiền)

13. **Paywall Engine (Freemium):**
    *   Core Section: `UNLIMITED` miễn phí 100%. Lâu lâu chèn popup: "Ready for Type I? Unlock full access".
    *   Type I, II, III: Bị Khóa.
    *   AI Button: Mỗi ngày free 3 tín dụng (Tokens/lượt hỏi). Hết lượt => *Nâng cấp Premium để hỏi AI thâu đêm*.
14. **Error Reporting (Report Nút Sai):**
    *   Tại mỗi câu hỏi có nút Cờ (Report). Nếu user thấy câu mâu thuẫn báo cáo ngay. 
    *   Tool này giúp Database của mình lúc nào cũng "Sạch" và chuẩn xác nhất nhờ cộng đồng làm QC test hộ.

---

### TÓM TẮT LỘ TRÌNH CODE CHO ĐỘI DEV:

*   **PHASE 1 (MVP - Ra lò sau 3 Tuần):** Chỉ cần Test Mode, Báo Xanh Đỏ, Database mượt, Paywall cơ bản, và Nút Report Lỗi. Tung ra thu Feedback Reddit.
*   **PHASE 2 (The Hook):** Thêm Spider Chart, Tính năng quẹt thẻ Tinder-Flashcard, Streak Board xanh đỏ. 
*   **PHASE 3 (The Ultimate Edge):** Đẩy AI Voice (Học trên xe tải), Offline Cache (Học dưới hầm) làm đòn bẩy Marketing B2B để bán App trực tiếp cho các Công ty Điện Lạnh (Đưa cho lính của họ học tự động).
