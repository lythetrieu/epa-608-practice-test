# 🪙 TOKEN SAVING PROTOCOL (v1.0)
# Mục tiêu: Tăng hiệu suất x2-x5 bằng cách quản trị Context Hygiene.

## 1. CORE OPERATING PRINCIPLES
- **Exponential Awareness:** Mỗi tin nhắn là một lần đọc lại toàn bộ (cumulative cost). 
- **The 5-Minute Rule:** Sau 5 phút không tương tác, Cache sẽ hết hạn. Hãy /compact hoặc /clear trước khi tạm dừng lâu.
- **Surgical Precision:** Không bao giờ nạp toàn bộ repo. Chỉ trỏ đích danh `@file` hoặc `function`.

## 2. COMMAND & CONTROL (CLI)
- `/clear`: Reset hoàn toàn context khi đổi chủ đề (Topic A -> Topic B).
- `/context`: Kiểm tra "thủ phạm" gây đầy token (MCP, History, Files).
- `/st status line`: Luôn hiển thị thanh trạng thái: [Model] [% Context] [Token Count].
- `/compact`: Thực thi thủ công ở mức **60% capacity**. Ưu tiên giữ lại: Architecture rules & Progress summaries.

## 3. TASK EXECUTION RULES
- **Plan Mode First:** Không viết code cho đến khi đạt >95% độ tự tin. Hỏi follow-up nếu cần.
- **Batching Prompts:** Gộp nhiều task (Summarize + Extract + Fix) vào 1 prompt duy nhất.
- **Edit vs. Follow-up:** Ưu tiên EDIT tin nhắn sai/cũ để thay thế context thay vì gửi tin nhắn sửa lỗi mới.
- **Shell Management:** Hạn chế các lệnh Bash có output quá dài (>50 lines).

## 4. ARCHITECTURAL HIERARCHY
- **Model Selection:**
  - Sonnet: Mặc định coding.
  - Haiku: Sub-agents, Research, Formatting, Summary.
  - Opus: Deep planning & Architecture (Dưới 20% tổng usage).
- **Sub-Agent Strategy:** Chỉ dùng sub-agent (Haiku) cho task biệt lập để tránh ô nhiễm context chính.

## 5. APPLIED LEARNING (CLAUDE.MD)
- Lưu **Quyết định (Decisions)**, không lưu **Hội thoại (Conversations)**.
- Thêm quy tắc mới vào `CLAUDE.md` dưới dạng bullet point <15 từ khi phát hiện lỗi lặp lại.