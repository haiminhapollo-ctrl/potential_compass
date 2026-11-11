"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { updateActivityQuizAction } from "./actions";

/** O soan quiz cua 1 hoat dong: loi dinh dang hien tai cho, ban nhap dang go KHONG bi mat. */
export function QuizEditor({ activityId, title, initialText }: { activityId: string; title: string; initialText: string }) {
  const [text, setText] = useState(initialText);
  const [state, action, pending] = useActionState(updateActivityQuizAction, { error: null, saved: false });
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={activityId} />
      <p className="pretty text-xs font-medium leading-relaxed text-ink-500">
        Mỗi câu: dòng đầu là câu hỏi; <code>*</code> trước đáp án đúng, <code>-</code> trước đáp án sai (2–4 đáp án); dòng{" "}
        <code>Giải thích: ...</code> không bắt buộc. Các câu cách nhau 1 dòng trống, tối đa 5 câu; xóa hết thì hoạt động không có quiz. Học
        sinh làm sau khi xong hoạt động và thấy điểm, nhưng điểm không tính vào hồ sơ sở thích. Câu nào sửa thêm nên nhờ một giáo
        viên khác đọc lại đáp án.
      </p>
      {state.error && (
        <p role="alert" className="text-xs font-semibold text-status-error">
          Chưa lưu: {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p role="status" className="text-xs font-semibold text-status-success">
          Đã lưu câu hỏi.
        </p>
      )}
      <textarea
        name="quizText"
        rows={9}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={`Câu hỏi ôn nhanh của ${title}`}
        className="clay-input resize-y font-mono text-xs"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu..." : "Lưu câu hỏi"}
      </Button>
    </form>
  );
}
