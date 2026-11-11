"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StarRating } from "@/components/student/StarRating";
import { FormDraft, clearFormDraft } from "@/components/student/FormDraft";
import { Button } from "@/components/ui/Button";
import { submitActivityLogAction, type SubmitActivityLogError } from "@/lib/actions/activity-log";
import { enqueueActivityLog } from "@/lib/offline/queue";
import { todayISOVN } from "@/lib/date";
import { CONFIDENCE_OPTIONS, DIFFICULTY_OPTIONS, FEELING_OPTIONS } from "@/lib/recommendation/feedback";

// ============================================================================
// PHAN HOI SAU HOAT DONG
// ----------------------------------------------------------------------------
// - So sao (BAT BUOC): muc hung thu - thanh phan DUY NHAT tinh vao diem ho so.
// - Cam nhan, muc tu tin, do kho: BAM CHON (hoc sinh vung cao go chu tren dien
//   thoai rat cham) - dung de he thong PHAN HOI lai ngay (feedback.ts) va cho
//   giao vien doc. Bao cao mentor: tu tin/do kho la tin hieu manh hon so sao.
// - O "ke them" tu luan: KHONG bat buoc, cho em nao muon viet nhieu ngu canh
//   hon (bao cao mentor). Goi y = reflectionPrompt rieng cua tung hoat dong.
// Nhan cam nhan luu vao cot reflection_text (du lieu cu tu viet van hien dung).
// ============================================================================

// Thong bao loi cho HOC SINH doc - dien dat nhe nhang, khong dung tu ky thuat.
const ERROR_MESSAGES: Record<SubmitActivityLogError, string> = {
  unauthorized: "Phiên đăng nhập của em đã hết. Câu trả lời vẫn còn trên máy này, em đăng nhập lại rồi mở lại hoạt động là thấy nhé.",
  invalid_date: "Ngày gửi không hợp lệ. Em thử tải lại trang rồi làm lại nhé.",
  invalid_input: "Phần trả lời chưa hợp lệ (có thể phần kể thêm quá dài). Em kiểm tra lại nhé.",
  daily_limit_reached: "Hôm nay em đã làm đủ số hoạt động rồi. Mai quay lại nhé!",
  server_error: "Chưa gửi được lúc này. Em thử lại sau một chút nhé.",
};

// THOI GIAN LAM THAT (de xuat A5): luc em mo trang hoat dong LAN DAU trong ngay tren may nay. Em hay mo trang
// doc huong dan, tat di lam ngoai doi roi quay lai cham sao => luu localStorage thay vi luc mo trang lan cuoi.
const START_KEY_PREFIX = "pc_activity_started:";
const startKey = (activityId: string) => `${START_KEY_PREFIX}${activityId}:${todayISOVN()}`;

export function ActivityFeedbackForm({
  studentId,
  activityId,
  reflectionPrompt,
  defaultRating = 0,
  defaultReflection = "",
  defaultConfidence = null,
  defaultDifficulty = null,
  defaultNote = "",
  mode = "create",
}: {
  studentId: string;
  activityId: string;
  reflectionPrompt: string;
  defaultRating?: number;
  defaultReflection?: string;
  defaultConfidence?: number | null;
  defaultDifficulty?: number | null;
  defaultNote?: string;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<SubmitActivityLogError | "no_rating" | null>(null);
  // So sao lay tu nhap (FormDraft) khi mo lai trang - doi key de StarRating nhan gia tri moi.
  const [rating, setRating] = useState(defaultRating);
  const draftKey = `hoat-dong:${studentId}:${activityId}:${mode}`;
  const openedAt = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "create") return;
    openedAt.current = new Date().toISOString();
    try {
      // Don moc cua ngay khac (mo trang ma khong lam) de localStorage khong phinh dan.
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(START_KEY_PREFIX) && !k.endsWith(`:${todayISOVN()}`)) localStorage.removeItem(k);
      }
      if (!localStorage.getItem(startKey(activityId))) localStorage.setItem(startKey(activityId), openedAt.current);
    } catch {
      // Trinh duyet chan localStorage => dung luc mo trang lan nay.
    }
  }, [activityId, mode]);

  function readStart(): string | null {
    try {
      return localStorage.getItem(startKey(activityId)) ?? openedAt.current;
    } catch {
      return openedAt.current;
    }
  }
  function clearStart() {
    try {
      localStorage.removeItem(startKey(activityId));
    } catch {
      // khong sao
    }
  }

  function handleSubmit(formData: FormData) {
    setErrorMsg(null);
    const interestRating = Number(formData.get("interestRating") ?? 0);
    // Khong chon gi -> giu lai phan chu cu (neu co) thay vi xoa trang.
    const reflectionText =
      String(formData.get("reflectionText") ?? "").trim() ||
      String(formData.get("reflectionTextCu") ?? "").trim();

    if (!interestRating || interestRating < 1 || interestRating > 5) {
      setErrorMsg("no_rating");
      return;
    }

    const scale = (key: string) => (Number(formData.get(key)) || null) as 1 | 2 | 3 | null;
    const date = todayISOVN();
    const basePayload = {
      activityId,
      date,
      interestRating: interestRating as 1 | 2 | 3 | 4 | 5,
      reflectionText,
      confidence: scale("confidence"),
      difficulty: scale("difficulty"),
      note: String(formData.get("note") ?? "").trim(),
      startedAt: readStart(),
      finishedAt: new Date().toISOString(),
    };

    startTransition(async () => {
      const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;

      if (isOnline) {
        try {
          const result = await submitActivityLogAction({ ...basePayload, source: "online" });
          if (result.ok) {
            clearStart();
            clearFormDraft(draftKey);
            // Ve CHINH trang hoat dong nay: hien phan hoi theo cau tra loi + goi y kham pha them.
            router.push(`/hoc-sinh/hoat-dong/${activityId}?${result.updated ? "updated=1" : "done=1"}`);
            router.refresh();
            return;
          }
          // Server tu choi vi ly do NGHIEP VU (khong phai mat mang) -> hien loi
          // ngay. KHONG day vao hang doi offline, vi day vao thi no se thu lai
          // mai mai va lan nao cung bi tu choi voi cung ly do do.
          setErrorMsg(result.error ?? "server_error");
          return;
        } catch {
          // Goi that bai (mat mang giua duong) -> roi xuong nhanh offline duoi
        }
      }

      // Offline hoac goi server that bai -> luu vao hang doi IndexedDB, dong bo sau
      await enqueueActivityLog({ ...basePayload, source: "offline_sync" });
      clearStart();
      clearFormDraft(draftKey);
      router.push("/hoc-sinh/hoat-dong?queued=1");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="clay above-grain space-y-5 p-6">
      <FormDraft storageKey={draftKey} onRestore={(f) => setRating(Number(f.get("interestRating")) || defaultRating)} />
      <div>
        <p className="mb-2.5 text-sm font-bold text-ink-900">Mức độ hứng thú của em?</p>
        <StarRating key={rating} name="interestRating" defaultValue={rating} />
      </div>

      <ChoiceList
        legend="Sau hoạt động này, em thấy thế nào?"
        name="reflectionText"
        options={FEELING_OPTIONS.map((o) => ({ value: o, label: o }))}
        defaultValue={defaultReflection}
      />

      {/* Du lieu CU do hoc sinh tu go chu (truoc khi doi sang bam chon) van
          phai xem lai duoc, nen hien thi nguyen van thay vi lam mat. */}
      {defaultReflection && !FEELING_OPTIONS.includes(defaultReflection as (typeof FEELING_OPTIONS)[number]) && (
        <div>
          <p className="text-xs font-bold text-ink-500">Phần em đã viết trước đây</p>
          <p className="pretty clay-sunken mt-1.5 px-4 py-3 text-sm font-medium leading-relaxed text-ink-700">
            {defaultReflection}
          </p>
          <input type="hidden" name="reflectionTextCu" value={defaultReflection} />
        </div>
      )}

      <ChoiceList
        legend="Em thấy mình làm được không?"
        name="confidence"
        options={CONFIDENCE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
        defaultValue={defaultConfidence ? String(defaultConfidence) : ""}
        inline
      />

      <ChoiceList
        legend="Hoạt động này với em thế nào?"
        name="difficulty"
        options={DIFFICULTY_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
        defaultValue={defaultDifficulty ? String(defaultDifficulty) : ""}
        inline
      />

      <div>
        <label htmlFor="note" className="pretty mb-2.5 block text-sm font-bold text-ink-900">
          {reflectionPrompt || "Em muốn kể thêm gì không?"}{" "}
          <span className="font-medium text-ink-400">(không bắt buộc)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={1000}
          defaultValue={defaultNote}
          placeholder="Em có thể viết vài câu, hoặc bỏ trống."
          className="clay-input resize-y"
        />
      </div>

      {errorMsg && (
        <p role="alert" className="text-sm font-semibold text-status-error">
          {errorMsg === "no_rating" ? "Em hãy chọn mức độ hứng thú (bấm vào sao) trước nhé." : ERROR_MESSAGES[errorMsg]}
          {errorMsg === "unauthorized" && (
            <>
              {" "}
              <Link href="/hoc-sinh/dang-nhap" className="underline underline-offset-2">
                Đăng nhập lại
              </Link>
            </>
          )}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Đang gửi..." : mode === "edit" ? "Lưu thay đổi" : "Hoàn thành hoạt động"}
      </Button>
    </form>
  );
}

/** Nhom lua chon bam (radio an, nhan dang the dat set) - KHONG bat buoc chon. */
function ChoiceList({
  legend,
  name,
  options,
  defaultValue,
  inline = false,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  inline?: boolean;
}) {
  return (
    <fieldset>
      <legend className="pretty mb-2.5 text-sm font-bold text-ink-900">
        {legend} <span className="font-medium text-ink-400">(không bắt buộc)</span>
      </legend>
      <div className={inline ? "flex flex-wrap gap-2.5" : "space-y-2.5"}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className="group flex cursor-pointer items-start gap-3 rounded-clay-sm bg-clay-surface p-3.5
                       text-sm font-medium text-ink-700 shadow-clay-sm
                       transition-colors duration-150 hover:bg-clay-sunken
                       has-[:checked]:bg-brand-100 has-[:checked]:font-bold
                       has-[:checked]:text-brand-800 has-[:checked]:shadow-clay-inset
                       has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400
                       has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-clay-bg"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={defaultValue === opt.value}
              className="sr-only"
            />
            <span
              aria-hidden
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-clay-sunken
                         shadow-clay-inset transition-colors duration-200
                         group-has-[:checked]:bg-brand-600 group-has-[:checked]:shadow-clay-brand"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100" />
            </span>
            <span className="pretty leading-relaxed">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
