import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth/session";

async function logoutAction(): Promise<void> {
  "use server";
  await clearSession();
  redirect("/");
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="focus-ring shrink-0 rounded-clay-sm bg-clay-surface px-3.5 py-2 text-xs font-bold text-ink-500 shadow-clay-sm transition-colors duration-150 hover:bg-clay-sunken hover:text-ink-800 active:translate-y-px active:shadow-clay-pressed">
        Đăng xuất
      </button>
    </form>
  );
}
