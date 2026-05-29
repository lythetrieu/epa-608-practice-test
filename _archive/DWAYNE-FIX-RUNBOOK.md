# Runbook — khắc phục cho khách (Dwayne) + áp dụng fix production

> Chạy theo thứ tự. Cần quyền vào **Supabase Dashboard** của project `epa608-platform`
> (ref `sequvmxgtmbirnixeril`) → mục **SQL Editor**.

---

## BƯỚC 1 — Áp migration sửa email hook (bắt buộc, sửa gốc rễ)

Mở **Supabase → SQL Editor**, dán **toàn bộ** nội dung file:
`supabase/migrations/024_fix_email_hook_links.sql`
rồi **Run**.

Việc này: link reset-password trong email trỏ thẳng `/reset-password?token_hash=...`
(không còn về `/login`), và `site_url` mặc định = domain production (sửa email signup).

---

## BƯỚC 2 — Đảm bảo `site_url` đúng trong app_config (khuyến nghị)

Trong SQL Editor:
```sql
-- xem giá trị hiện tại
select key, value from public.app_config where key in ('site_url','resend_api_key');

-- nếu site_url chưa có hoặc đang là localhost, set lại:
insert into public.app_config (key, value)
values ('site_url', 'https://epa608practicetest.net')
on conflict (key) do update set value = excluded.value;
```
> `resend_api_key` phải có giá trị, nếu không hook không gửi được email nào.

---

## BƯỚC 3 — Kiểm tra Auth Email Hook đã BẬT (nguyên nhân "không nhận email signup")

Supabase **Dashboard → Authentication → Hooks** (hoặc **Emails → Hook**):
- Phải có **"Send Email Hook"** trỏ tới function `public.send_email_hook` và **Enabled**.
- Nếu CHƯA bật → đó là lý do email signup/recovery không gửi. Bật nó lên.

Và **Authentication → Sign In / Providers → Email**: bật **"Confirm email"** (để signup gửi email xác nhận).

---

## BƯỚC 4 — Set mật khẩu TẠM cho Dwayne (để anh ấy login ngay, sau tự đổi)

> ⚠️ THAY `DWAYNE_EMAIL@example.com` bằng email thật của Dwayne, và đổi mật khẩu tạm.

**Cách A — SQL Editor (nhanh nhất):**
```sql
-- set mật khẩu tạm + đảm bảo email đã confirmed
update auth.users
set
  encrypted_password = crypt('TempPass#2026', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = lower('DWAYNE_EMAIL@example.com');

-- xác nhận đã update đúng 1 dòng + kiểm tra trạng thái Pro
select id, email, email_confirmed_at is not null as confirmed
from auth.users where email = lower('DWAYNE_EMAIL@example.com');

select email, tier, lifetime_access
from public.users_profile where email = lower('DWAYNE_EMAIL@example.com');
```
> `crypt`/`gen_salt` cần extension `pgcrypto` (Supabase có sẵn). Nếu báo thiếu:
> `create extension if not exists pgcrypto;`

Sau đó báo Dwayne: đăng nhập tại https://epa608practicetest.net/login
với email của anh ấy + mật khẩu **TempPass#2026**, rồi vào Settings đổi mật khẩu.

**Cách B — không dùng SQL, dùng nút có sẵn:** sau khi đã làm BƯỚC 1-3,
bảo Dwayne bấm **"Forgot password"** trên web — giờ link sẽ chạy đúng.

---

## BƯỚC 5 — Kiểm tra Pro của Dwayne còn nguyên
Nếu BƯỚC 4 cho thấy `tier` không phải Pro / `lifetime_access` = false mà anh ấy đã trả tiền:
```sql
update public.users_profile
set tier = 'starter', lifetime_access = true
where email = lower('DWAYNE_EMAIL@example.com');
```

---

## BƯỚC 6 — Deploy code
Merge PR #2 (https://github.com/lythetrieu/epa-608-practice-test/pull/2) → deploy Vercel.
Migration (BƯỚC 1) là thay đổi DB, độc lập với deploy, nên có thể chạy trước.
