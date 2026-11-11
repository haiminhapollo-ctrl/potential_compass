/**
 * QUAN TRI TAI KHOAN GIAO VIEN tu dong lenh (khi chua co quan tri vien nao dang
 * nhap duoc, hoac quan tri vien quen mat khau). Binh thuong dung trang
 * "Giao vien" trong phan he giao vien.
 *
 *   npm run teacher:account -- school "<Ten truong>" "<Tinh>"   (in ra schoolId)
 *   npm run teacher:account -- create <email> "<Ho ten>" <schoolId> [--admin]
 *   npm run teacher:account -- reset <email>
 *
 * In MAT KHAU TAM ra man hinh 1 lan - dua truc tiep cho giao vien; lan dau dang
 * nhap he thong bat doi. Dung backend theo DATA_BACKEND trong .env.local.
 */
import { getRepository } from "../src/lib/data";
import { issueTempPassword } from "../src/lib/auth/teacher-auth";

async function main() {
  const [cmd, email, name, schoolId] = process.argv.slice(2);
  const repo = getRepository();
  if (cmd === "reset" && email) {
    const t = await repo.getTeacherByEmail(email);
    if (!t) throw new Error(`Khong tim thay giao vien ${email}`);
    console.log(`Mat khau tam cho ${t.fullName} <${t.email}> (${t.role}): ${await issueTempPassword(t.id)}`);
    return;
  }
  const [, schoolName, province] = process.argv.slice(2);
  if (cmd === "school" && schoolName && province) {
    const s = await repo.createSchool({ name: schoolName, province });
    console.log(`Da tao truong ${s.name} (${s.province}). schoolId: ${s.id}`);
    return;
  }
  if (cmd === "create" && email && name && schoolId) {
    if (!(await repo.getSchool(schoolId))) throw new Error(`Khong tim thay truong ${schoolId}`);
    const t = await repo.createTeacher({ schoolId, fullName: name, email, role: process.argv.includes("--admin") ? "admin" : "teacher" });
    console.log(`Da tao ${t.fullName} <${t.email}> (${t.role}). Mat khau tam: ${await issueTempPassword(t.id)}`);
    return;
  }
  console.log(
    'Cach dung:\n  npm run teacher:account -- school "<Ten truong>" "<Tinh>"\n' +
      '  npm run teacher:account -- create <email> "<Ho ten>" <schoolId> [--admin]\n  npm run teacher:account -- reset <email>'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
