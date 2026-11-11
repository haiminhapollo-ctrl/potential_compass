# Potential Compass

Ứng dụng giúp học sinh lớp 9 vùng cao tìm hiểu sở thích của mình để chọn hướng
học và nghề. Các em làm một bài khảo sát tình huống, sau đó mỗi ngày thử một
hoạt động ngắn 3–5 phút. Hồ sơ sở thích theo 8 nhóm lĩnh vực được cập nhật sau
mỗi hoạt động.

Tài liệu mô tả tính năng, hướng dẫn học sinh, hướng dẫn giáo viên/quản trị và
triển khai, vận hành nằm trong thư mục [`docs/`](./docs).

## Công nghệ

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Supabase
(Postgres), Google Gemini API, PWA (hoạt động hằng ngày làm được khi mất mạng).
Triển khai trên Vercel.

## Chạy trên máy (không cần Supabase)

```bash
npm install
cp .env.example .env.local        # mặc định DATA_BACKEND=local
npm run seed:local                # tạo 1 trường, 1 lớp, 1 quản trị viên, 3 học sinh mẫu
npm run dev                       # mở http://localhost:3000
```

Học sinh đăng nhập bằng mã `hs001`, `hs002` hoặc `hs003`. Quản trị viên đăng
nhập bằng `quantri@truong.local` và mật khẩu tạm in ra khi chạy `seed:local`
(lần đầu đăng nhập phải đặt mật khẩu mới). Quên mật khẩu:
`npm run teacher:account -- reset quantri@truong.local`.

Dữ liệu ở chế độ này là file JSON trong `data/` (không commit). Chỉ dùng khi
phát triển, không dùng cho trường thật.

## Dữ liệu & phương pháp

Pipeline: dữ liệu (khảo sát + đánh giá hoạt động) → **bộ chấm điểm theo quy tắc**
có phiên bản (`src/lib/recommendation/scoring.ts`) → Gemini/mẫu **chỉ diễn giải**
điểm thành lời. Không có mô hình học máy. Chi tiết công thức, quyền riêng tư,
quy trình thay đổi nội dung và giới hạn: [`docs/data-governance.md`](./docs/data-governance.md).
Từ điển dữ liệu: [`docs/data-dictionary.md`](./docs/data-dictionary.md).
Tổng hợp chức năng bổ sung theo đề xuất Data Science 10/2026: [`docs/tong-hop-de-xuat-data-science.md`](./docs/tong-hop-de-xuat-data-science.md).

| Lệnh | Việc |
|---|---|
| `npm run check:data` | Báo cáo chất lượng dữ liệu (thiếu, trùng, ngoài miền, chưa có đồng ý) |
| `npm run analyze:metrics` | Chỉ số đánh giá gợi ý, retention + Kaplan–Meier theo lớp, đánh giá luật "Nên hỏi thăm", đồng thuận với nhãn (trước/sau khi xem kết quả, kiểm định hoán vị), cỡ mẫu A/B |
| `npm run analyze:survey` | Cấu trúc & EDA bộ khảo sát, thiên lệch vị trí đáp án, test-retest T1→T2, ảnh hưởng từng câu, thời gian làm bài |
| `npm run analyze:scoring` | Phân tích độ nhạy tham số chấm điểm + hiệu chuẩn ngưỡng nhãn "Nổi bật" (mô phỏng có ground truth) |
| `npm run export:dataset` | Xuất CSV ẩn danh + bảng đặc trưng (cần `EXPORT_SALT`) |
| `npm run recompute:profiles` | Tính lại mọi hồ sơ sau khi đổi công thức/nội dung |

Cron Vercel `/api/cron/snapshot` (23:17 giờ VN hằng ngày, cần `CRON_SECRET`) tính lại
hồ sơ và ghi snapshot tuần cho mọi học sinh.

## Kiểm tra logic trước khi chạy UI

Nội dung 8 nhóm lĩnh vực, bộ câu hỏi khảo sát, cách chấm điểm, chọn hoạt động
hằng ngày và gom điểm toàn lớp đều là TypeScript thuần, không phụ thuộc
Next.js/React. Sau khi sửa nội dung, chạy bộ kiểm thử này là biết ngay có hỏng
gì không, chưa cần mở ứng dụng:

```bash
npm run check:logic
```

## Chạy thử phân tích sau pilot bằng dữ liệu giả lập

Chưa có dữ liệu pilot thì có thể sinh một bộ giả lập (140 học sinh, 4 lớp, 10 tuần) đi qua đúng logic của app, rồi chạy mọi phân tích trên đó:

```bash
npm run analyze:sim   # = simulate:pilot + analyze:survey + analyze:metrics + analyze:models
```

Dữ liệu nằm ở `sim-pilot/data/` (không commit), tách khỏi `data/` và không bao giờ ghi vào Supabase. Vì biết trước "sự thật" (`sim_truth.json`), `analyze:models` in kèm để kiểm tra mô hình có tìm lại đúng không. Muốn chạy một phân tích riêng trên dữ liệu này: `DATA_BACKEND=local LOCAL_DATA_DIR=sim-pilot/data npm run analyze:models`. Khi có dữ liệu pilot thật, chạy `npm run analyze:models` như các lệnh phân tích khác.

## Bài đối chiếu RIASEC (O*NET Mini-IP) — tạm dừng

Tạm dừng từ 18/10/2026 (chưa có bản dịch; tính năng khóa, học sinh không thấy). Khi làm tiếp: lớp nào được giáo viên bật (trang "Lớp học") thì học sinh làm thêm 30 câu O*NET Interest Profiler bản rút gọn (Mini-IP) để kiểm định bộ khảo sát (`npm run analyze:survey`, mục F). Bản dịch 30 câu **chưa có trong code**: nhóm dự án lấy câu hỏi và khóa chấm từ O*NET, dịch, rồi điền vào `src/lib/content/riasec-items.ts`. Bảng ánh xạ 8 nhóm → RIASEC phải được duyệt trước khi xem dữ liệu (`src/lib/riasec.ts`). Chi tiết: `docs/data-governance.md`.

This product includes content from the O*NET Interest Profiler (Mini-IP) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the [O*NET Tools Developer License](https://www.onetcenter.org/license_toolsdev.html). Potential Compass has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.

## Chuyển sang dữ liệu thật (Supabase)

1. Tạo project miễn phí tại [supabase.com](https://supabase.com).
2. Chạy `supabase/schema.sql` rồi `supabase/policies.sql` trong SQL Editor.
3. Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` vào `.env.local`.
4. Đổi `DATA_BACKEND=supabase`.
5. Chạy `npm run seed:supabase` để nạp nội dung (8 nhóm lĩnh vực, câu hỏi
   khảo sát, hoạt động, tài nguyên). Script không tạo trường hay tài khoản nào.
6. Tạo trường và quản trị viên đầu tiên:

   ```bash
   npm run teacher:account -- school "<Tên trường>" "<Tỉnh>"           # in ra schoolId
   npm run teacher:account -- create <email> "<Họ tên>" <schoolId> --admin  # in ra mật khẩu tạm
   ```

   Từ đó quản trị viên tự tạo lớp, học sinh và tài khoản giáo viên khác trong ứng dụng.

Bước 5 bắt buộc: `schema.sql` chỉ tạo bảng, còn `SupabaseRepository` đọc nội
dung thẳng từ DB (chế độ local thì lấy từ `src/lib/content`). Bỏ qua bước này
thì khảo sát sẽ có 0 câu.

Project Supabase đã tạo từ trước: chạy lần lượt các file trong `supabase/migrations/` (theo ngày, đọc ghi chú đầu file) **trước** khi deploy code mới, rồi `npm run recompute:profiles`.

## Triển khai trên Vercel

Đã triển khai: <https://potential-compass.vercel.app>

Biến môi trường cần đặt trong Vercel Project Settings (Production + Preview):
`DATA_BACKEND=supabase`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SESSION_SECRET`, `CRON_SECRET` (cron snapshot hằng ngày).

Lưu ý: biến có tiền tố `NEXT_PUBLIC_` **không** dùng được chế độ "Sensitive"
của Vercel (chúng vốn hiển thị công khai trong bundle client) — thêm bằng
`vercel env add <TEN> production --no-sensitive`.

`DATA_BACKEND=local` **không chạy được** trên Vercel: kho JSON ghi file vào
`process.cwd()/data`, còn filesystem của serverless là chỉ-đọc — xem ghi chú
đầu `src/lib/data/local/store.ts`.

Chi tiết đầy đủ (kể cả checklist bảo mật cần nâng cấp trước khi dùng dữ liệu
học sinh thật): xem `docs/Potential_Compass_Trien_Khai_Van_Hanh.docx`.

## Cấu trúc thư mục

```
src/app/                  Next.js App Router — trang & Server Actions
  hoc-sinh/                 Phân hệ Học sinh (đăng nhập công khai, còn lại yêu cầu đăng nhập)
  giao-vien/                Phân hệ Giáo viên/Quản trị
src/components/            Component UI dùng chung + theo phân hệ
src/lib/
  types.ts                  Kiểu dữ liệu dùng chung (nguồn sự thật, đối chiếu supabase/schema.sql)
  domains.ts                Nội dung 8 nhóm lĩnh vực
  content/                   Bộ câu hỏi khảo sát, hoạt động, tài nguyên ban đầu
  recommendation/            Chấm điểm, chọn hoạt động hằng ngày, tích hợp Gemini
  data/                      Repository: local (JSON) hoặc supabase, chọn qua DATA_BACKEND
  auth/                      Phiên đăng nhập (cookie ký HMAC), mật khẩu giáo viên
  offline/queue.ts           Hàng đợi IndexedDB cho phản hồi hoạt động khi mất mạng
supabase/                  schema.sql, policies.sql (RLS), migrations/
scripts/                   seed, kiểm thử logic, phân tích dữ liệu, quản lý tài khoản
docs/                      Tài liệu bàn giao (.docx) và tài liệu dữ liệu (.md)
```

## Trạng thái & giới hạn đã biết

- Logic chấm điểm, gợi ý, đăng nhập được kiểm thử tự động (`npm run
  check:logic`, gồm kiểm thử tính chất và mô phỏng) và chạy trong CI
  (`.github/workflows/ci.yml`); ứng dụng đã build và triển khai trên Vercel.
- Kho tài nguyên: 54/56 mục và 42/48 hoạt động đã có link thật (kiểm tra còn
  hoạt động 10/2026, ưu tiên tiếng Việt). Mục còn trống tự mở trang tìm kiếm.
  Giáo viên nên xem lại trước khi dùng với học sinh, xem
  `docs/Potential_Compass_Huong_Dan_Giao_Vien_Quan_Tri.docx`.
- Đăng nhập giáo viên: tài khoản riêng từng người (email + mật khẩu scrypt,
  bắt đổi mật khẩu tạm, khóa 15 phút sau 5 lần sai, đổi mật khẩu đăng xuất mọi
  phiên cũ). Quản trị viên tạo/đặt lại mật khẩu ở trang "Giáo viên".