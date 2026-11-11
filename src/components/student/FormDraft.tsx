"use client";

import { useEffect, useRef } from "react";

/**
 * BO DEM LUU NHAP (bao cao cai tien UI 10/2026, muc 4): dat trong form, luu bai em dang lam vao localStorage
 * NGAY khi bam chon / go chu, va dien lai khi mo lai trang. Phien dang nhap het hoac mat song giua chung
 * => em dang nhap lai, mo lai trang la thay bai cu, khong phai lam lai tu dau.
 *
 * - React 19 tu reset form sau moi lan chay action (ca khi bao loi) => nghe su kien reset va dien lai tu nhap.
 *   Nop thanh cong: goi clearFormDraft TRUOC khi chuyen trang.
 * - Chi dien lai o em nhap (radio/select/textarea); input AN (thoi diem mo trang, thoi gian tung cau, sao danh
 *   gia) khong bi ghi de - gia tri da luu van duoc dua cho onRestore (vd. StarRating tu dien lai so sao).
 * - Dien lai KHONG phat su kien change => AnswerTimer khong tinh cau dien lai la "vua tra loi".
 * - Khoa nhap gom ma hoc sinh: may dung chung khong hien bai cua ban khac. Nhap qua DRAFT_MAX_DAYS tu bo.
 */
const PREFIX = "pc_draft:";
const DRAFT_MAX_DAYS = 2;

type Fields = [string, string][];

function read(key: string): { t: number; f: Fields } | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null; // bi chan / du lieu hong
  }
}

export function clearFormDraft(storageKey: string) {
  try {
    localStorage.removeItem(PREFIX + storageKey);
  } catch {
    // trinh duyet chan localStorage - khong co nhap de xoa
  }
}

export function FormDraft({
  storageKey,
  onRestore,
}: {
  storageKey: string;
  onRestore?: (fields: Map<string, string>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const key = PREFIX + storageKey;

    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(PREFIX) && !(Date.now() - Number(read(k)?.t) < DRAFT_MAX_DAYS * 86_400_000)) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // localStorage bi chan => khong co nhap, form van dung binh thuong
    }

    const fill = () => {
      const saved = read(key);
      if (!saved) return;
      restore(form, saved.f);
      onRestoreRef.current?.(new Map(saved.f));
    };
    fill();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      // Doi React ve xong (StarRating cap nhat input an sau cu bam) roi moi doc form.
      clearTimeout(timer);
      timer = setTimeout(() => {
        const f = [...new FormData(form)].filter((e): e is [string, string] => typeof e[1] === "string");
        try {
          localStorage.setItem(key, JSON.stringify({ t: Date.now(), f }));
        } catch {
          // het dung luong / bi chan - bo qua
        }
      }, 0);
    };
    // Su kien reset phat TRUOC khi trinh duyet xoa form => dien lai o tick sau.
    const refill = () => {
      clearTimeout(timer);
      setTimeout(fill, 0);
    };
    const events = ["change", "input", "click"] as const;
    for (const e of events) form.addEventListener(e, save);
    form.addEventListener("reset", refill);
    return () => {
      clearTimeout(timer);
      for (const e of events) form.removeEventListener(e, save);
      form.removeEventListener("reset", refill);
    };
  }, [storageKey]);

  return <input ref={ref} type="hidden" disabled />;
}

function restore(form: HTMLFormElement, fields: Fields) {
  const seen = new Map<string, number>(); // ten lap lai (3 o selfPick) => dien theo thu tu
  for (const [name, value] of fields) {
    const i = seen.get(name) ?? 0;
    seen.set(name, i + 1);
    const els = [...form.elements].filter(
      (el): el is HTMLInputElement => (el as HTMLInputElement).name === name && (el as HTMLInputElement).type !== "hidden"
    );
    const radio = els.find((el) => el.type === "radio" && el.value === value);
    if (radio) radio.checked = true;
    else if (els[i] && els[i].type !== "radio") els[i].value = value;
  }
}
