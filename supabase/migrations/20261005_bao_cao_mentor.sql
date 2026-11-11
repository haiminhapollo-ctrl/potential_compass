-- ============================================================================
-- MIGRATION 2026-10-05: xu ly "Bao cao danh gia loi Website" cua mentor
-- ----------------------------------------------------------------------------
-- Chay 1 LAN trong Supabase SQL Editor, TRUOC khi deploy code moi (code moi
-- doc/ghi cac cot & bang duoi day - deploy truoc se loi khi hoc sinh nop bai).
-- An toan chay lai nhieu lan (if not exists / chi dien noi dung con trong).
-- ============================================================================

-- 1) Hoat dong: anh/video minh hoa + vi du tham khao
alter table activities add column if not exists media_url text;
alter table activities add column if not exists example text not null default '';

-- 2) Phan hoi sau hoat dong: muc tu tin, do kho, phan tu viet, hoat dong kham pha them
alter table activity_logs add column if not exists confidence smallint check (confidence between 1 and 3);
alter table activity_logs add column if not exists difficulty smallint check (difficulty between 1 and 3);
alter table activity_logs add column if not exists note text not null default '';
alter table activity_logs add column if not exists is_extra boolean not null default false;

-- 3) Danh sach "de danh lam sau"
create table if not exists saved_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  activity_id text not null references activities(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (student_id, activity_id)
);
alter table saved_activities enable row level security;
drop policy if exists "saved_activities_self" on saved_activities;
create policy "saved_activities_self" on saved_activities for all
  using (student_id = current_student_id()) with check (student_id = current_student_id());
drop policy if exists "saved_activities_teacher_read" on saved_activities;
create policy "saved_activities_teacher_read" on saved_activities for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

-- 4) Noi dung: viet lai 2 hoat dong khong lam ngay duoc (chi khi giao vien
--    chua tu sua tieu de) + dien vi du tham khao cho hoat dong con trong.
update activities set title = 'Thử làm người hòa giải', description = 'Nhớ lại một lần bất đồng nhỏ (của em hoặc người quen), rồi nghĩ cách giúp hai bên hiểu nhau.',
  instructions = array['Nhớ lại 1 lần bất đồng nhỏ em từng gặp hoặc chứng kiến (tranh đồ chơi, chia việc nhà...).', 'Nói lại suy nghĩ của TỪNG bên: mỗi bên có lý do gì?', 'Nghĩ ra 1 câu em có thể nói để cả hai vui vẻ trở lại.']::text[],
  reflection_prompt = 'Em đã nghĩ ra cách hòa giải nào? Em thấy hiểu được cả hai phía có khó không?'
where id = 'act_xh_03' and title = 'Hòa giải một bất đồng nhỏ';

update activities set title = 'Quan sát kỹ 1 cây trồng quanh nhà', description = 'Chọn 1 cây quanh nhà, quan sát lá, thân, đất và đoán xem cây có khỏe không.',
  instructions = array['Chọn 1 cây (chậu hoa, luống rau, cây trong vườn).', 'Quan sát màu lá, thân cây và độ ẩm của đất trong 3 phút.', 'Ghi 1 câu: cây đang khỏe hay cần chăm sóc thêm gì?']::text[],
  reflection_prompt = 'Em thấy cây có khỏe không? Nếu cần, em sẽ chăm sóc nó thế nào?'
where id = 'act_nl_01' and title = 'Quan sát 1 cây trồng trong 3 ngày';

update activities set example = 'Ví dụ: Trên lá khoai môn, giọt nước tròn như hạt ngọc và lăn đi; trên lá chuối, nước loang ra. Có thể vì lá khoai có lớp phấn mỏng không thấm nước.' where id = 'act_kh_01' and example = '';
update activities set example = 'Ví dụ: Phía bắc có 7 ngôi sao xếp hình cái gáo múc nước (chòm Bắc Đẩu). Em vẽ 7 chấm rồi nối lại là xong.' where id = 'act_kh_02' and example = '';
update activities set example = 'Ví dụ: "Bọt khí là hơi nước. Đáy nồi nóng nhất nên nước ở đó biến thành hơi trước rồi nổi lên."' where id = 'act_kh_03' and example = '';
update activities set example = 'Ví dụ: "Vì sao mưa xong lại có cầu vồng?" Em hỏi thầy cô hoặc tìm trong sách: ánh nắng đi qua giọt mưa bị tách thành nhiều màu.' where id = 'act_kh_04' and example = '';
update activities set example = 'Ví dụ: Tháo 1 chiếc bút bi bấm ra được vỏ, lò xo, ruột bút, nút bấm. Lắp lại rồi đoán xem lò xo dùng để làm gì.' where id = 'act_kt_01' and example = '';
update activities set example = 'Ví dụ: Ghế bị lung lay, em siết lại con ốc ở chân ghế bằng tua vít, hoặc chêm 1 miếng bìa gấp nhỏ vào chân ghế.' where id = 'act_kt_02' and example = '';
update activities set example = 'Ví dụ: Vẽ đường nước từ bể chứa đến ống dẫn rồi tới vòi nước trong bếp, dùng mũi tên chỉ chiều nước chảy.' where id = 'act_kt_03' and example = '';
update activities set example = 'Ví dụ: Dùng 10 chiếc đũa và dây chun làm 1 cây cầu nối 2 quyển sách, rồi đặt 1 cục tẩy lên xem cầu có đứng vững không.' where id = 'act_kt_04' and example = '';
update activities set example = 'Ví dụ: Cây cải ngoài vườn có vài lá vàng ở gốc, đất khô và nứt. Em đoán cây đang thiếu nước nên sẽ tưới vào buổi chiều.' where id = 'act_nl_01' and example = '';
update activities set example = 'Ví dụ: Đất vườn màu nâu sẫm, bóp thấy hơi ẩm và tơi, có thể hợp trồng rau. Đất đồi màu đỏ, khô và dính hơn.' where id = 'act_nl_02' and example = '';
update activities set example = 'Ví dụ: Lúc cho gà ăn, em thấy 1 con đứng riêng, ít ăn và xù lông. Có thể nó bị mệt, em báo cho bố mẹ.' where id = 'act_nl_03' and example = '';
update activities set example = 'Ví dụ: Em nhặt được 5 vỏ chai nhựa (để bán ve chai hoặc làm chậu cây) và 3 túi ni lông (gom lại bỏ đúng chỗ).' where id = 'act_nl_04' and example = '';
update activities set example = 'Ví dụ: Gạo 10.000đ + rau 5.000đ + trứng 12.000đ + mắm muối 3.000đ = khoảng 30.000đ cho cả nhà 5 người.' where id = 'act_kd_01' and example = '';
update activities set example = 'Ví dụ: Làm vòng tay hạt cườm bán cho bạn cùng trường, giá 5.000đ/chiếc; mỗi chiếc tốn khoảng 2.000đ tiền hạt.' where id = 'act_kd_02' and example = '';
update activities set example = 'Ví dụ: Cô bán rau ở chợ luôn chào khách và cho thêm vài cọng hành, nhờ vậy khách quen hay quay lại.' where id = 'act_kd_03' and example = '';
update activities set example = 'Ví dụ: Mục tiêu tiết kiệm 20.000đ trong tuần để mua sách: mỗi ngày bớt 1 gói bim bim (khoảng 3.000đ).' where id = 'act_kd_04' and example = '';
update activities set example = 'Ví dụ: Em kê bàn học gần cửa sổ để đủ sáng, ngồi thẳng lưng, mắt cách vở khoảng 30 cm.' where id = 'act_sk_01' and example = '';
update activities set example = 'Ví dụ: Bị bỏng nhẹ thì xả vết bỏng dưới vòi nước mát khoảng 15 phút, không chườm đá, không bôi kem đánh răng.' where id = 'act_sk_02' and example = '';
update activities set example = 'Ví dụ: Em hỏi bà hôm nay có đau lưng không, rồi rót cho bà cốc nước ấm và nhắc bà nghỉ ngơi.' where id = 'act_sk_02b' and example = '';
update activities set example = 'Ví dụ: Học xong 45 phút, em đứng dậy vươn vai 10 lần, xoay cổ, đi lại quanh nhà 2 phút và thấy mắt đỡ mỏi hơn.' where id = 'act_sk_03' and example = '';
update activities set example = 'Ví dụ: Vẽ cảnh cả nhà ngồi ăn cơm tối: vài hình tròn làm mặt người, 1 mâm cơm ở giữa. Không cần đẹp, chỉ cần em nhớ được khoảnh khắc đó.' where id = 'act_nt_01' and example = '';
update activities set example = 'Ví dụ: "Sáng nay sương phủ đồi chè / Em đi học sớm, gió về mát ghê / Bạn bè ríu rít bốn bề / Tan trường cùng hẹn rủ về bản xa."' where id = 'act_nt_02' and example = '';
update activities set example = 'Ví dụ: Chụp chiếc dép từ sát mặt đất nhìn lên, hoặc chụp cái chén qua kẽ tay. Vật quen thuộc nhưng trông rất khác.' where id = 'act_nt_03' and example = '';
update activities set example = 'Ví dụ: Cho 1 nắm sỏi vào lon rỗng rồi bịt miệng lại là có cái lắc; căng vài sợi dây chun quanh hộp bìa là có cây đàn.' where id = 'act_nt_04' and example = '';
update activities set example = 'Ví dụ: Em giảng cho em trai vì sao có ngày và đêm: dùng quả cam làm Trái Đất, đèn pin làm Mặt Trời, rồi xoay quả cam.' where id = 'act_xh_01' and example = '';
update activities set example = 'Ví dụ: Em hỏi "Ngày xưa bà đi học thế nào?". Bà kể phải đi bộ 2 tiếng qua đồi, mang theo cơm nắm.' where id = 'act_xh_02' and example = '';
update activities set example = 'Ví dụ: Hai em nhỏ giành nhau điều khiển TV: em gái muốn xem hoạt hình, em trai muốn xem bóng đá. Em có thể nói: "Mỗi người xem 1 lượt, mình bốc thăm xem ai xem trước nhé."' where id = 'act_xh_03' and example = '';
update activities set example = 'Ví dụ: "Lan ơi, lâu rồi tớ chưa gặp cậu. Ở trường mới cậu có vui không? Bản mình vừa vào mùa gặt, tớ nhớ hồi mình đi bắt cá ở suối lắm."' where id = 'act_xh_04' and example = '';
update activities set example = 'Ví dụ: 1 phút chạy tại chỗ, 1 phút nhảy dây (hoặc nhảy cóc), 1 phút gập bụng, 2 phút vươn vai thả lỏng.' where id = 'act_tc_01' and example = '';
update activities set example = 'Ví dụ: Nhờ mẹ chỉ mũi khâu thường (lên xuống đều tay) trên 1 mảnh vải vụn, khâu được 1 đường dài khoảng 1 gang tay.' where id = 'act_tc_02' and example = '';
update activities set example = 'Ví dụ: Pha 1 cốc nước chanh cho cả nhà, hoặc luộc 1 đĩa rau (có người lớn ở gần khi đun bếp).' where id = 'act_tc_03' and example = '';
update activities set example = 'Ví dụ: Chơi ô ăn quan bằng sỏi trên sân đất, hoặc dạy em nhỏ chơi bịt mắt bắt dê.' where id = 'act_tc_04' and example = '';

-- 5) Link that (da kiem tra con hoat dong 10/2026): chi dien cho muc CON TRONG.
update resources set url = 'https://www.youtube.com/watch?v=CNPW2AdHJag' where id = 'res_kho_001' and url is null;
update resources set url = 'https://vnexpress.net/6-thi-nghiem-khoa-hoc-tre-de-thuc-hien-tai-nha-4090597.html' where id = 'res_kho_002' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=SCcsIxvyYjA' where id = 'res_kho_003' and url is null;
update resources set url = 'https://dantri.com.vn/khoa-hoc/co-bao-nhieu-ngoi-sao-trong-vu-tru-20210923113838585.htm' where id = 'res_kho_005' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=tP7R24AtkxQ' where id = 'res_kho_006' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=0AgudISAmA0' where id = 'res_ky__008' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=ofTjsZPHQ-E' where id = 'res_ky__009' and url is null;
update resources set url = 'https://studio.code.org/courses/express-2025/units/1' where id = 'res_ky__010' and url is null;
update resources set url = 'https://vnexpress.net/vi-sao-mot-so-phich-cam-dien-co-ba-chau-4914749.html' where id = 'res_ky__011' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=Y5X-S2exEKk' where id = 'res_ky__012' and url is null;
update resources set url = 'https://genk.vn/huong-dan-tu-che-robot-mini-cuc-don-gian-20161001164537777.chn' where id = 'res_ky__013' and url is null;
update resources set url = 'https://dantri.com.vn/giao-duc/hoc-nganh-dien-co-de-kiem-viec-lam-20220825061209753.htm' where id = 'res_ky__014' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=hASJjPUyGv8' where id = 'res_non_015' and url is null;
update resources set url = 'https://vi.wikipedia.org/wiki/Lu%C3%A2n_canh' where id = 'res_non_016' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=CvUkzbh01Zc' where id = 'res_non_017' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=1meuGckusMY' where id = 'res_non_018' and url is null;
update resources set url = 'https://nongnghiepmoitruong.vn/co-trang-khuyen-nong-va-hanh-trinh-gieo-niem-tin-d818065.html' where id = 'res_non_019' and url is null;
update resources set url = 'https://tuoitre.vn/phunuonline/5-phuong-phap-u-phan-huu-co-bien-rac-nha-bep-thanh-vang-cho-khu-vuon-1101567878.htm' where id = 'res_non_020' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=tpPJB-5flYI' where id = 'res_kin_022' and url is null;
update resources set url = 'https://vov2.vov.vn/doi-song-xa-hoi/khi-teen-tap-tanh-kinh-doanh-57577.vov2' where id = 'res_kin_023' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=v24lAvLCblk' where id = 'res_kin_024' and url is null;
update resources set url = 'https://vi.wikipedia.org/wiki/H%E1%BB%A3p_t%C3%A1c_x%C3%A3_n%C3%B4ng_nghi%E1%BB%87p' where id = 'res_kin_025' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=dQvNIv-hr04' where id = 'res_kin_027' and url is null;
update resources set url = 'https://vi.wikipedia.org/wiki/%C4%90%E1%BB%8Bnh_gi%C3%A1_d%E1%BB%B1a_tr%C3%AAn_ph%C3%AD_t%E1%BB%95n' where id = 'res_kin_028' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=6JnCTc-qFHw' where id = 'res_suc_029' and url is null;
update resources set url = 'https://www.vinmec.com/vie/bai-viet/xay-khau-phan-hop-ly-cho-tuoi-day-thi-vi' where id = 'res_suc_030' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=PsO2k9w0BXY' where id = 'res_suc_031' and url is null;
update resources set url = 'https://www.vietnamplus.vn/nganh-y-te-huong-dan-nguoi-dan-tu-phong-dich-benh-trong-mua-mua-lu-post670944.vnp' where id = 'res_suc_032' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=P48Zv-Tg_GM' where id = 'res_suc_033' and url is null;
update resources set url = 'https://www.vinmec.com/vie/bai-viet/cach-de-tro-thanh-mot-nguoi-biet-lang-nghe-vi' where id = 'res_suc_034' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=RGzjZZNf1n4' where id = 'res_ngh_036' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=OXBLMcXoJ84' where id = 'res_ngh_037' and url is null;
update resources set url = 'https://tuoitre.vn/giaoduc/dac-trung-cua-truyen-ngan-10815734.htm' where id = 'res_ngh_038' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=Q2Q346Hpius' where id = 'res_ngh_039' and url is null;
update resources set url = 'https://lifestyle.zingnews.vn/3-yeu-to-giup-thoi-hon-vao-buc-anh-post414479.html' where id = 'res_ngh_041' and url is null;
update resources set url = 'https://vietnamnet.vn/hoc-nganh-thiet-ke-do-hoa-ra-truong-lam-gi-2497754.html' where id = 'res_ngh_042' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=034ICVi8iJA' where id = 'res_xa__043' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=bvcsGYIEe-c' where id = 'res_xa__044' and url is null;
update resources set url = 'https://tuoitre.vn/ky-nang-lam-viec-nhom-hieu-qua-474516.htm' where id = 'res_xa__045' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=Q5PXa6cAA10' where id = 'res_xa__046' and url is null;
update resources set url = 'https://voh.com.vn/huong-nghiep/hoc-nganh-cong-tac-xa-hoi-ra-truong-se-lam-cong-viec-gi-469646.html' where id = 'res_xa__047' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=5-Pu5TkJt_k' where id = 'res_xa__048' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=xD7_RIIQ3g4' where id = 'res_the_050' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=xcb4fHeC_Fs' where id = 'res_the_051' and url is null;
update resources set url = 'https://vi.wikipedia.org/wiki/Lu%E1%BA%ADt_b%C3%B3ng_%C4%91%C3%A1' where id = 'res_the_052' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=eDJS5shXivc' where id = 'res_the_053' and url is null;
update resources set url = 'https://baophapluat.vn/truong-dai-hoc-the-duc-the-thao-bac-ninh-gioi-thieu-chuong-trinh-dao-tao-nganh-huan-luyen-the-thao-post543749.html' where id = 'res_the_054' and url is null;
update resources set url = 'https://www.youtube.com/watch?v=_I3FpiZEKjI' where id = 'res_the_055' and url is null;
update resources set url = 'https://daibieunhandan.vn/van-hoa-ban-dia-hon-cot-cua-du-lich-cong-dong-10397284.html' where id = 'res_the_056' and url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=SUrl45JJRX4' where id = 'act_kh_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=bS3pl34SJ_k' where id = 'act_kh_02' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=E-vPl-gZS0Q' where id = 'act_kh_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=cpM2x5PUVjY' where id = 'act_kt_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=_2Mm4Nvqchk' where id = 'act_kt_02' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=ZQosW6gkEQ8' where id = 'act_kt_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=sDaWQbG_w30' where id = 'act_kt_04' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=JiSuHiPaYro' where id = 'act_nl_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=LgX9AZW1oiQ' where id = 'act_nl_02' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=i2H9A1WNMUw' where id = 'act_nl_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=fYRzg6nYLEc' where id = 'act_nl_04' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=MJmwvnV5Ktw' where id = 'act_kd_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=suAkvt5TqZg' where id = 'act_kd_02' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=wulvd-S-lTg' where id = 'act_kd_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=ePLXqafJzy8' where id = 'act_kd_04' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=8Hf8iyTTIDc' where id = 'act_sk_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=zzRrTPQnN7Y' where id = 'act_sk_02' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=oSO5TdozKII' where id = 'act_sk_02b' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=TWvFQY8QYXo' where id = 'act_sk_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=Iv2KttfEB0c' where id = 'act_nt_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=KKTh0wkez1I' where id = 'act_nt_02' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=aSLL07EnBx0' where id = 'act_nt_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=-CAM4xiTBL8' where id = 'act_nt_04' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=XCd8tC1fei0' where id = 'act_xh_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=JTZotEWgX_M' where id = 'act_xh_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=vhB-AOClW_0' where id = 'act_tc_01' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=MzWD-K7f8Es' where id = 'act_tc_02' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=3ZlVvkfeGmA' where id = 'act_tc_03' and media_url is null;
update activities set media_url = 'https://www.youtube.com/watch?v=0FQsTsZWf50' where id = 'act_tc_04' and media_url is null;
