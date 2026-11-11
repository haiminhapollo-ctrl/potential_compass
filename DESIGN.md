---
name: Potential Compass
description: Sổ tay giấy mộc giúp học sinh lớp 9 vùng cao khám phá sở thích mỗi ngày
colors:
  forest-ink: "#1B4D3E"
  forest-hover: "#163F33"
  forest-deep: "#123329"
  forest-moss: "#2D6A4F"
  forest-fern: "#569A7E"
  forest-lichen: "#94C2AE"
  forest-mist: "#E3EFE9"
  terracotta: "#C2410C"
  terracotta-deep: "#9A3412"
  terracotta-blush: "#FFEDD5"
  terracotta-wash: "#FFF7ED"
  ochre: "#F59E0B"
  ochre-deep: "#D97706"
  parchment: "#FAF9F5"
  card-white: "#FFFFFF"
  paper-well: "#F3F1EA"
  ink-line: "#E2DED5"
  stone: "#C7C2B6"
  slate-moss: "#485950"
  ink-hint: "#627069"
  charcoal-forest: "#112A22"
  status-error: "#C2312F"
  status-error-deep: "#8F1F1D"
  status-error-wash: "#FBE3E2"
  status-success: "#15603F"
  status-success-deep: "#0F4A30"
  status-success-wash: "#DCF3E6"
  status-warning: "#7A5810"
  status-warning-wash: "#FDF0D2"
  domain-indigo-dye: "#2E4A7D"
  domain-iron: "#5E6B73"
  domain-rice: "#4D7C0F"
  domain-bronze: "#B7791F"
  domain-rose-clay: "#B4535A"
  domain-fired-clay: "#C2410C"
  domain-plum: "#6B4E71"
  domain-wood: "#8B5A2B"
typography:
  display:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.556
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.625
  action:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.5
  chip:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.333
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.333
    letterSpacing: "0.08em"
  meta:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
rounded:
  clay-sm: "0.5rem"
  clay: "0.75rem"
  full: "9999px"
spacing:
  gutter: "16px"
  stack: "20px"
  card: "20px"
  card-roomy: "24px"
  choice: "14px"
  choice-gap: "10px"
components:
  button-primary:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.card-white}"
    typography: "{typography.action}"
    rounded: "{rounded.clay-sm}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
  button-primary-active:
    backgroundColor: "{colors.forest-deep}"
  button-secondary:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.clay-sm}"
    padding: "12px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-well}"
  button-ghost:
    textColor: "{colors.slate-moss}"
    typography: "{typography.action}"
    rounded: "{rounded.clay-sm}"
    padding: "12px 20px"
  button-ghost-hover:
    backgroundColor: "{colors.paper-well}"
    textColor: "{colors.forest-ink}"
  button-danger:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.card-white}"
    typography: "{typography.action}"
    rounded: "{rounded.clay-sm}"
    padding: "12px 20px"
  button-danger-hover:
    backgroundColor: "{colors.terracotta-deep}"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.clay}"
    padding: "{spacing.card}"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.clay-sm}"
    padding: "12px 16px"
  choice-option:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.clay-sm}"
    padding: "{spacing.choice}"
  choice-option-selected:
    backgroundColor: "{colors.forest-mist}"
    textColor: "{colors.forest-deep}"
  badge-domain:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.forest-ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.clay-sm}"
    padding: "6px 12px"
  badge-notable:
    backgroundColor: "{colors.terracotta-wash}"
    textColor: "{colors.terracotta-deep}"
    rounded: "{rounded.clay-sm}"
    padding: "2px 8px"
  score-track:
    backgroundColor: "{colors.paper-well}"
    rounded: "{rounded.full}"
    height: "24px"
  score-bar:
    backgroundColor: "{colors.forest-moss}"
    rounded: "{rounded.full}"
    height: "24px"
  score-bar-notable:
    backgroundColor: "{colors.terracotta}"
  star-tray:
    backgroundColor: "{colors.paper-well}"
    rounded: "{rounded.clay-sm}"
    padding: "8px 14px"
  nav-item:
    textColor: "{colors.slate-moss}"
    typography: "{typography.chip}"
    rounded: "{rounded.clay-sm}"
    padding: "8px"
  nav-item-active:
    backgroundColor: "{colors.forest-mist}"
    textColor: "{colors.forest-hover}"
  logo-tile:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.ochre}"
    rounded: "{rounded.clay-sm}"
    size: "40px"
---

# Design System: Potential Compass

<!-- Nguồn chuẩn: "Bao Cao Cai Tien UI-UX Potential Compass.pdf" (báo cáo của học sinh, 10/2026), đã triển khai lên production (PR #1, #2). Token gốc nằm ở tailwind.config.ts và src/app/globals.css. -->

## Overview

**Creative North Star: "Sổ tay giấy mộc" (The Hillside Field Notebook)**

Potential Compass là cuốn sổ tay giấy mộc em mang theo lên nương. Trang giấy màu kem mờ, chữ viết bằng mực xanh rừng. Mỗi khối nội dung là một trang giấy phẳng, giới hạn bằng một nét mực mảnh. Không có khối nhựa nổi lên, không có ánh sáng tỏa, không có lớp kính mờ. Sổ tay phải đọc rõ dưới nắng gắt, trên màn hình điện thoại rẻ, kể cả khi kính đã nứt. Không chi tiết trang trí nào được tranh chỗ với chữ.

Bản sắc không nằm ở nền hay mảng màu lớn. Nó nằm ở vài dấu nhỏ, chính xác, mượn từ mặt Trống đồng Đông Sơn và vải thổ cẩm: ngôi sao mặt trời 14 cánh, đầu mũi tên chim Lạc, chấm hình thoi, dải kỷ hà thổ cẩm. Các dấu này đóng lên trang như con triện, không bao giờ trải thành giấy dán tường. Màu chia vai rõ ràng: xanh rừng để đọc và hành động, đất nung để báo "chú ý ở đây", vàng đất cho sao và huy hiệu.

Đây là giao diện để làm việc (Operate): làm khảo sát, chấm sao, bấm chọn cảm nhận. Mật độ thoáng, mỗi màn hình một cột trên điện thoại, vùng bấm rộng, câu nội dung tối thiểu 15px. Cùng một hệ phải dùng tốt trên màn hình máy tính phòng tin học. Báo cáo đã bác bỏ dứt khoát thế giới cũ: nền trắng phớt tím, nút tím kiểu SaaS, bóng "đất sét" nhiều lớp có màu, 8 thanh màu neon, lớp hạt nhiễu phủ toàn trang.

**Key Characteristics:**
- Ba tầng giấy phẳng (nền giấy kem → thẻ trắng → giếng giấy lõm), phân tách bằng nét mực 1px, không đổ bóng.
- Một giọng mực xanh rừng cho chữ thân, tiêu đề và nút chính.
- Đất nung chỉ xuất hiện khi cần chú ý; vàng đất chỉ là con triện (sao, huy hiệu, cột mốc).
- Hoa văn bản địa là SVG nội tuyến dưới 2KB, đứng yên, đặt ở điểm nhỏ.
- Một họ chữ Nunito, đầu nét tròn, đủ dấu tiếng Việt.

## Colors

Bảng màu "Tự nhiên – Đất – Giấy mộc": mực xanh rừng trên giấy kem, đất nung và vàng đất làm điểm nhấn hiếm.

### Primary
- **Xanh rừng sâu / Deep Forest Green** (forest-ink): nút chính, chữ thân, tiêu đề cấu trúc, focus ring, viên đồng bộ offline, nền ô logo. Đạt 9.15:1 trên nền giấy; chữ trắng trên nền này đạt 9.64:1.
- **Xanh rừng đêm** (forest-hover / forest-deep): trạng thái hover và nhấn của nút chính, viền nút chính, chữ trên nền chọn.
- **Xanh rêu** (forest-moss): màu duy nhất của thanh đo điểm 8 lĩnh vực.
- **Dương xỉ** (forest-fern): viền của link dạng thẻ khi rê chuột, tín hiệu "bấm được" trong một thế giới phẳng.
- **Rêu đá** (forest-lichen): dải Q1–Q3 trong biểu đồ phân bố của lớp (trang giáo viên).
- **Sương rừng** (forest-mist): nền trạng thái được chọn (đáp án, mục điều hướng đang mở), nền thẻ thông báo nhẹ và thẻ số tổng kết tuần.

### Secondary
- **Đất nung / Terracotta Orange** (terracotta, terracotta-deep): tương tác phụ và trạng thái cần chú ý. Gồm thanh của nhóm "Nổi bật", nút nguy hiểm (xóa), và thông báo hết phiên kiểu "đã lưu, làm tiếp được". Terracotta đạt 5.18:1 trên nền trắng.
- **Đất nung nhạt** (terracotta-wash, terracotta-blush): nền và viền của nhãn "Nổi bật".

### Tertiary
- **Vàng đất / Golden Ochre** (ochre, ochre-deep): sao đánh giá, ngôi sao mặt trời trong logo và huy hiệu, dấu cột mốc tuần (bản đậm ochre-deep trên nền sương rừng).

### Neutral
- **Giấy kem mộc / Warm Parchment** (parchment): nền mọi trang và theme-color của PWA. Mô phỏng mặt giấy học, chống lóa khi ngoài trời.
- **Trắng ngà** (card-white): nền thẻ, ô nhập, lựa chọn đáp án.
- **Giếng giấy** (paper-well): vùng lõm, gồm track thanh đo, khay sao, khối ghi chú và phần trả lời cũ.
- **Nét mực mảnh** (ink-line): viền 1px của mọi bề mặt.
- **Đá xám** (stone): sao chưa chọn, đường mốc trong biểu đồ. Không bao giờ dùng cho chữ (1.78:1).
- **Rêu xám / Slate Moss** (slate-moss): chữ phụ, ghi chú, nhãn "(không bắt buộc)", dòng meta. Đạt AAA: 7.07:1 trên nền giấy, 7.4:1 trên thẻ trắng.
- **Chữ gợi ý** (ink-hint): placeholder và chữ vô hiệu. Nhạt hơn chữ phụ để không giống chữ đã nhập, nhưng vẫn đạt 5.2:1 trên nền trắng.
- **Than rừng** (charcoal-forest): tiêu đề trang và tiêu đề thẻ.

### Status
Token Tailwind: `status-error`, `status-success`, `status-warning`, kèm các bậc `-wash` (nền) và `-deep` (chữ đậm trên nền wash).
- **Lỗi** (status-error trên parchment, 5.28:1; nền status-error-wash): thông báo lỗi nhập liệu, lỗi đăng nhập.
- **Thành công** (status-success trên status-success-wash, 6.48:1): "Đã lưu hoạt động", phản hồi sau khi nộp.
- **Cảnh báo** (status-warning trên status-warning-wash, 5.75:1): hết lượt trong ngày, tài nguyên cần kiểm tra.

### Domain dots
Tám tông đất/thổ cẩm trầm trong `src/lib/domains.ts`, mỗi tông gắn với một nhóm: chàm (Khoa học), xám sắt (Kỹ thuật), xanh lúa (Nông - Lâm - Ngư), đồng thau (Kinh doanh), hồng đất (Sức khỏe), đất nung (Nghệ thuật), tím than (Xã hội), nâu gỗ (Thể chất & Thủ công). Các màu này chỉ dùng cho chấm hình thoi trong huy hiệu, và tên nhóm luôn in ngay cạnh.

### Named Rules
**The Single-Hue Measure Rule.** Thanh đo điểm chỉ có một sắc xanh rêu. Nhóm "Nổi bật" đổi sang đất nung và luôn kèm nhãn chữ. Không bao giờ tô mỗi nhóm một màu.

**The Ochre Seal Rule.** Vàng đất là con triện: sao, huy hiệu, cột mốc. Không dùng vàng đất cho chữ, vì chỉ đạt 2.15:1 trên nền trắng.

**The Terracotta Attention Rule.** Đất nung nghĩa là "nhìn vào đây". Mỗi màn hình chỉ có vài điểm đất nung; dùng nhiều hơn thì nó mất nghĩa.

## Typography

**Display Font:** Nunito (với system-ui, sans-serif)
**Body Font:** Nunito (với system-ui, sans-serif)

**Character:** Một họ chữ duy nhất, đầu nét tròn, thân thiện như chữ viết tay gọn gàng. Bộ chữ có đủ subset tiếng Việt (nạp qua next/font với 5 độ đậm 400–800). Thứ bậc đến từ độ đậm và cỡ chữ, không đến từ việc đổi họ chữ.

### Hierarchy
- **Display** (800, 3rem, line-height 1, tracking -0.04em): con số lớn đứng một mình, như số hoạt động tuần hay ô thống kê.
- **Headline** (800, 1.5rem, tracking -0.025em, có cân dòng): tiêu đề trang ("Hồ sơ sở thích của em").
- **Title** (700, 1.125rem, tracking -0.01em): tiêu đề thẻ, tiêu đề biểu đồ.
- **Body** (500, 0.9375rem = 15px, line-height 1.625): mọi câu học sinh đọc, gồm nội dung, giải thích, ghi chú, đáp án. Từ md trở lên, chữ thân của trang là 16px.
- **Action** (700, 15px): chữ trên nút.
- **Chip** (700, 12px): huy hiệu nhóm, mục điều hướng trên điện thoại.
- **Label** (800, 12px, tracking 0.08em, IN HOA): nhãn mở đầu khối ("NHẬN XÉT DÀNH CHO EM", "VÍ DỤ THAM KHẢO").
- **Meta** (500, 12px): dòng phụ dạng "nhóm · ngày", chú thích trục biểu đồ.

### Named Rules
**The 15px Floor Rule.** Câu nội dung học sinh đọc dùng body (15px) trở lên. Cỡ 12px chỉ dành cho nhãn, chip, số thứ tự, dòng meta và thanh điều hướng.

**The Tabular Rows Rule.** Số đặt trong hàng hoặc cột (điểm từng nhóm, ngày tháng trong danh sách) dùng chữ số bằng nhau (`.nums`). Một con số đứng riêng thì giữ chữ số tỉ lệ.

## Layout

Phần học sinh là một cột giữa trang: tối đa 32rem trên điện thoại, 42rem từ md, 48rem từ lg, lề hai bên 16px. Trên điện thoại, đầu trang là một thẻ dính trên cùng (logo, lời chào, nút đăng xuất). Thanh điều hướng 3 mục nằm cố định ở đáy, nên nội dung chừa 7rem phía dưới. Từ lg (1024px), thanh điều hướng chuyển lên ngay dưới đầu trang và nằm ngang.

Phần giáo viên là không gian làm việc rộng tối đa 72rem.

Nhịp dọc giữa các khối là 20px. Thẻ đệm trong 20px, thẻ trọng tâm (form phản hồi, biểu đồ, thẻ tuần) đệm 24px. Các lựa chọn cách nhau 10px, mỗi lựa chọn đệm 14px. Nút nộp bài đặt cuối form, rộng hết cột, không dính trên màn hình.

**The Two-Screens Rule.** Mọi màn hình học sinh phải đúng ở cả hai khung: điện thoại 390px và màn hình máy tính phòng tin học (≥1024px).

## Elevation & Depth

Hệ này phẳng tuyệt đối. Chiều sâu đến từ ba tầng giấy theo tông: nền giấy kem, rồi thẻ trắng nằm trên, rồi giếng giấy lõm vào trong thẻ (track thanh đo, khay sao, khối ghi chú). Mỗi tầng được viền bằng nét mực 1px. Trạng thái được chọn là đổ nền sương rừng và chữ đậm, không phải nâng khối lên. Phản hồi khi bấm chỉ là dịch xuống 1px và đổi màu nền.

### Shadow Vocabulary
Các utility tên `shadow-clay*` còn giữ lại để tương thích với component cũ, nhưng giá trị đã là vòng viền phẳng không blur:
- **Viền giấy** (`box-shadow: 0 0 0 1px #E2DED5`): `shadow-clay`, `shadow-clay-sm`. Tương đương border ink-line.
- **Viền lõm** (`box-shadow: inset 0 0 0 1px #E2DED5`): `shadow-clay-inset`.
- **Viền mực** (`box-shadow: 0 0 0 1px #123329` / `#1B4D3E` / `#0D261E`): `shadow-clay-brand`, `shadow-clay-pressed`, `shadow-clay-brand-pressed`.

### Named Rules
**The Ink Line Rule.** Muốn tách một bề mặt thì dùng nét mực 1px hoặc đổi tông giấy. Không dùng box-shadow có blur, drop-shadow hay backdrop-filter: blur, vì máy rẻ phải cuộn mượt 60fps.

## Shapes

Góc bo gọn như mép giấy cắt, không tròn phồng kiểu SaaS:
- Thẻ và khối nội dung bo 12px.
- Nút, ô nhập, lựa chọn, huy hiệu, mục điều hướng bo 8px.
- Bo tròn hoàn toàn chỉ dành cho nút radio, track và thanh đo điểm, số thứ tự câu hỏi.

Hình học bản địa có bốn dạng, đều là SVG nội tuyến theo `currentColor` (`src/components/ui/Motifs.tsx`, `.tho-cam-top` trong globals.css):
- **Sao mặt trời:** 14 cánh nhọn cùng một vòng tròn mảnh, tinh giản từ tâm mặt trống Ngọc Lũ.
- **Mũi tên chim Lạc:** thân ngang, đầu nhọn dài như mỏ chim, hai vệt lông đuôi vuốt về sau.
- **Hình thoi:** hình vuông xoay 45°, dùng cho chấm phân loại và trạng thái.
- **Dải thổ cẩm:** cao 8px, ô hình thoi xen kẽ vàng đất và đất nung trên nền xanh rừng, lặp ngang ở mép trên thẻ.

**The Diamond-Not-Dot Rule.** Chấm phân loại và chấm trạng thái là hình thoi. Hình tròn chỉ dành cho nút radio, vì đó là quy ước bấm chọn người dùng đã quen.

## Components

### Buttons
Phẳng, chắc, viền một nét. Nút trông như con dấu mực, không phải viên kẹo.
- **Shape:** bo 8px, đệm 12px × 20px, chữ action 15px đậm, cao tối thiểu khoảng 46px.
- **Primary:** nền xanh rừng sâu, chữ trắng, viền 1px xanh rừng đêm. Dùng cho hành động chính của màn hình ("Hoàn thành hoạt động", "Vào học").
- **Hover / Active:** nền tối dần (forest-hover rồi forest-deep), chuyển màu trong 150ms, khi nhấn dịch xuống 1px.
- **Focus:** vòng 2px xanh rừng cách 2px trên nền giấy (`.focus-ring`).
- **Secondary:** nền trắng, viền ink-line, chữ xanh rừng; khi hover chuyển sang nền giếng giấy.
- **Ghost:** không nền, chữ rêu xám; khi hover hiện viền và nền giếng giấy.
- **Danger:** nền đất nung, chữ trắng; khi hover chuyển sang terracotta-deep.
- **Disabled:** nền nét mực (#E2DED5), chữ rêu xám, độ mờ 60%.

### Chips
- **Huy hiệu nhóm:** nền trắng, viền ink-line, chữ chip xanh rừng, chấm hình thoi 10px màu của nhóm, kèm emoji và tên nhóm.
- **Nhãn "Nổi bật":** nền đất nung nhạt, viền terracotta-blush, chữ đất nung đậm 10px in hoa, có sao mặt trời 12px phía trước.

### Cards / Containers
- **Corner Style:** bo 12px.
- **Background:** trắng ngà. Thẻ thông báo nhẹ dùng sương rừng; thẻ trạng thái dùng các cặp status.
- **Shadow Strategy:** không bóng (xem Elevation & Depth).
- **Border:** 1px ink-line.
- **Internal Padding:** 20px; thẻ trọng tâm 24px.
- **Thẻ kết quả tuần:** dải thổ cẩm 8px ở mép trên (đệm trên 32px), con số display màu xanh rừng, sao mặt trời 48px màu ochre-deep ở góc phải.

### Inputs / Fields
- **Style:** nền trắng, viền 1px ink-line, bo 8px, đệm 12px × 16px, chữ 15px. Ô mã đăng nhập dùng 16px.
- **Placeholder:** chữ gợi ý ink-hint (5.2:1).
- **Focus:** viền chuyển xanh rừng sâu, cộng vòng 2px xanh rừng.
- **Error:** câu báo lỗi màu status-error ngay dưới ô, liên kết bằng `aria-describedby`. Báo hết phiên (không phải lỗi của em) dùng chữ đất nung đậm.

### Navigation
- **Học sinh:** một thẻ trắng chứa 3 mục (Hoạt động, Hồ sơ, Tuần này). Trên điện thoại, thẻ cố định ở đáy, mỗi mục là emoji xếp trên nhãn chip 12px. Từ lg, thẻ nằm ngang dưới đầu trang với chữ 15px.
- **Mục đang mở:** nền sương rừng, chữ xanh rừng đêm, có `aria-current="page"`. Mục thường dùng chữ rêu xám; khi hover chuyển sang nền giếng giấy.
- **Liên kết chuyển trang dạng thẻ:** chữ đậm, một dòng mô tả 15px, mũi tên chim Lạc màu xanh rừng ở bên phải. Khi rê chuột, viền chuyển sang dương xỉ; khi nhấn, dịch xuống 1px.
- **Liên kết quay lại:** mũi tên chim Lạc lật ngược. Nút quay lại cuối trang dùng nút Secondary.
- **Giáo viên:** một hàng tab cuộn ngang trên điện thoại. Mục đang mở tự cuộn vào khung nhìn, thanh cuộn mảnh màu đá xám. Đầu trang cho tiêu đề xuống dòng và đẩy nút sang hàng dưới, thay vì cắt chữ.

### Lựa chọn đáp án (Signature)
Nút radio thật được ẩn đi, toàn bộ nhãn là vùng bấm. Thẻ nền trắng, viền ink-line, bo 8px, đệm 14px, có vòng tròn 20px tự vẽ. Khi chọn: nền sương rừng, chữ đậm xanh rừng đêm, vòng tròn đổ xanh rừng sâu với chấm trắng ở giữa. Focus bàn phím hiện vòng 2px quanh cả thẻ.

### Thanh đo 8 lĩnh vực (Signature)
Mỗi hàng gồm emoji, tên nhóm và điểm (chữ số đều) ở trên, track giếng giấy bo tròn cao 24px ở dưới. Thanh xanh rêu dài theo điểm (tối thiểu 4%). Vạch trắng ở giữa đánh dấu mức 50 (ngang người chọn ngẫu nhiên). Nhóm "Nổi bật" dùng thanh đất nung cùng nhãn "Nổi bật". Mỗi hàng có `role="img"` và nhãn đọc đầy đủ.

### Chấm sao
Năm ngôi sao 30px nằm trong khay giếng giấy bo 8px. Sao đã chọn màu vàng đất, sao chưa chọn màu đá xám. Dòng nhãn bên dưới ("Thích", "Rất thích!") là chữ 15px rêu xám. Mỗi sao là một radio có nhãn đọc.

### Hoa văn (Signature)
- **Ô logo:** ô vuông bo 8px (12px ở trang chủ và trang đăng nhập), nền xanh rừng sâu, sao mặt trời vàng đất chiếm khoảng 70% ô. Icon PWA và favicon dùng cùng hình.
- **Viên đồng bộ offline:** viên nền xanh rừng sâu, chữ trắng 15px, cố định ở giữa mép trên màn hình, tự ẩn sau 4 giây.

## Do's and Don'ts

### Do:
- **Do** dựng bề mặt bằng ba tầng giấy: nền giấy kem (#FAF9F5), thẻ trắng (#FFFFFF), giếng giấy (#F3F1EA). Tầng nào cũng có viền 1px #E2DED5.
- **Do** dùng xanh rừng sâu (#1B4D3E) cho nút chính và chữ thân, than rừng (#112A22) cho tiêu đề.
- **Do** giữ thanh đo một sắc xanh rêu (#2D6A4F). Chỉ nhóm "Nổi bật" đổi sang đất nung (#C2410C), và luôn kèm nhãn chữ cùng sao mặt trời.
- **Do** dùng cỡ 15px trở lên cho mọi câu học sinh đọc.
- **Do** thể hiện trạng thái được chọn bằng nền sương rừng (#E3EFE9) và chữ đậm.
- **Do** dùng hoa văn ở dạng dấu nhỏ, SVG nội tuyến dưới 2KB, theo currentColor: sao mặt trời cho logo, huy hiệu, cột mốc; mũi tên chim Lạc cho link chuyển trang; hình thoi cho chấm phân loại; dải thổ cẩm 8px cho mép trên thẻ kết quả tuần.
- **Do** giữ vòng focus 2px xanh rừng cho mọi phần tử bấm được.
- **Do** để phần trình duyệt tự vẽ mang màu sổ tay: bôi chọn chữ màu sương rừng, con trỏ nhập và checkbox gốc màu xanh rừng, thanh cuộn màu đá xám.
- **Do** báo trạng thái "bấm được" bằng đổi màu nền hoặc viền: nút và lựa chọn đổi sang giếng giấy, link dạng thẻ có viền dương xỉ.
- **Do** kiểm tra mọi màn hình học sinh ở cả 390px và ≥1024px.

### Don't:
- **Don't** dùng box-shadow có blur, drop-shadow hay backdrop-filter: blur.
- **Don't** quay lại nền trắng phớt tím (#F5F3FF), nút tím SaaS (#4F46E5) hay bóng "đất sét" nhiều lớp.
- **Don't** tô 8 thanh lĩnh vực bằng 8 màu. Màu nhóm chỉ dùng cho chấm hình thoi trong huy hiệu, luôn kèm tên nhóm.
- **Don't** phủ hoa văn chìm lên nền trang hay đặt sau chữ.
- **Don't** dùng ảnh bitmap PNG/JPG làm khung viền hay hoa văn.
- **Don't** vẽ lại trống đồng chi tiết. Chỉ dùng sao mặt trời 14 cánh đã tinh giản.
- **Don't** cho hoa văn chuyển động lặp. Chuyển động chỉ là phản hồi ngắn (≤ 200ms) và phải tôn trọng prefers-reduced-motion.
- **Don't** dùng vàng đất (#F59E0B) hay đá xám (#C7C2B6) cho chữ.
- **Don't** dùng xám nhạt độ tương phản thấp (kiểu #9CA3AF) cho chữ phụ.
- **Don't** dùng cỡ 12px cho câu nội dung.

### Chỗ code còn lệch so với chuẩn
Đợt polish ngày 25/10/2026 đã sửa: gom màu trạng thái thành token `status-*`; bỏ hiệu ứng nổi khi di chuột và `transition-all`; chữ phụ đổi sang #485950 để đạt AAA; thêm bậc ink-hint cho placeholder (trước đó chỉ đạt 3.9:1); bỏ viền đôi ở ô nhập trang giáo viên; mũi tên quay lại chuyển sang mũi tên chim Lạc lật ngược. Còn lại có chủ đích:
1. **Tên token cũ giữ để tương thích:** `clay-*`, `shadow-clay*`, `ease-clay`, `animate-clay-rise`, `.above-grain` (lớp hạt nhiễu đã bỏ). Giá trị đã đúng hệ giấy mộc, nên giữ tên cho đến khi có đợt đổi tên có chủ đích.
2. **Emoji và ký tự unicode làm biểu tượng:** emoji của 8 nhóm lĩnh vực và của thanh điều hướng là nội dung sẵn có, không đổi trong phạm vi polish. Ký tự ↻ ("làm lại") còn chờ một icon SVG cùng nét với bộ hoa văn.
