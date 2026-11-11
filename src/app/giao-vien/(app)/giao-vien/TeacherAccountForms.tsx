"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { createTeacherAction, resetTeacherPasswordAction, type TempPasswordState } from "./actions";

/** Hien mat khau tam DUNG 1 LAN ngay sau khi tao/dat lai (khong luu lai o dau ca). */
function TempPasswordNotice({ state }: { state: TempPasswordState | null }) {
  if (!state) return null;
  return (
    <div role="status" className={`mt-3 rounded-clay-sm px-4 py-3 text-sm ${state.ok ? "bg-status-success-wash text-status-success" : "bg-status-error-wash text-status-error-deep"}`}>
      <p className="font-semibold">{state.message}</p>
      {state.tempPassword && (
        <p className="mt-1.5">
          Mật khẩu tạm cho <strong>{state.email}</strong>:{" "}
          <code className="nums rounded bg-white/70 px-2 py-0.5 text-base font-bold tracking-wide">{state.tempPassword}</code>
          <br />
          <span className="text-xs">
            Mật khẩu chỉ hiện một lần, hãy đưa trực tiếp cho thầy cô. Lần đầu đăng nhập, hệ thống sẽ bắt đổi mật khẩu.
          </span>
        </p>
      )}
    </div>
  );
}

export function CreateTeacherForm() {
  const [state, action, pending] = useActionState(createTeacherAction, null);
  return (
    <form action={action} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="fullName" required placeholder="Họ và tên" aria-label="Họ và tên" className="clay-input" />
        <input name="email" type="email" required placeholder="email@truong.edu.vn" aria-label="Email" className="clay-input" />
      </div>
      <label className="flex items-center gap-2.5 text-sm font-medium text-ink-600">
        <input type="checkbox" name="role" value="admin" className="focus-ring h-4 w-4 accent-brand-600" />
        Quản trị viên (được tạo tài khoản và đặt lại mật khẩu cho giáo viên khác)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Đang tạo..." : "+ Tạo tài khoản"}
      </Button>
      <TempPasswordNotice state={state} />
    </form>
  );
}

export function ResetPasswordButton({ teacherId, name }: { teacherId: string; name: string }) {
  const [state, action, pending] = useActionState(resetTeacherPasswordAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="teacherId" value={teacherId} />
      <Button type="submit" variant="ghost" disabled={pending} aria-label={`Đặt lại mật khẩu cho ${name}`}>
        {pending ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
      </Button>
      <TempPasswordNotice state={state} />
    </form>
  );
}
