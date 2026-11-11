"use client";

import { useEffect, useRef } from "react";

/**
 * THOI GIAN TUNG CAU KHAO SAT (de xuat A4): dat trong form khao sat, ghi so ms tu luc mo trang toi luc em
 * chon LAN DAU moi cau (doi dap an sau do khong tinh lai) vao input an "answerTimes" = JSON {questionId: ms}.
 * Khong co JavaScript / loi => input rong, bai van nop binh thuong (server: parseAnswerTimes trong lib/survey.ts).
 */
export function AnswerTimer() {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    const form = input?.form;
    if (!input || !form) return;
    const openedAt = performance.now();
    const times = new Map<string, number>();
    const onChange = (e: Event) => {
      const name = (e.target as HTMLInputElement).name ?? "";
      if (!name.startsWith("q_") || times.has(name.slice(2))) return;
      times.set(name.slice(2), Math.round(performance.now() - openedAt));
      input.value = JSON.stringify(Object.fromEntries(times));
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return <input ref={ref} type="hidden" name="answerTimes" defaultValue="" />;
}
