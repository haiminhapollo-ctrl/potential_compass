import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// ============================================================================
// LOCAL JSON STORE - CHI dung khi phat trien (DATA_BACKEND=local).
// ----------------------------------------------------------------------------
// KHONG dung cho production that: Vercel serverless co filesystem TAM THOI/
// chi-doc, ghi file se mat sau moi lan deploy hoac giua cac instance. Khi
// trien khai Pilot that, chuyen DATA_BACKEND=supabase (xem README).
//
// Co che: moi "collection" (students, activities...) la 1 file JSON trong
// thu muc /data. Doc/ghi don gian (khong khoa file) - du dung cho 1 nguoi
// may dev thao tac tuan tu; KHONG an toan cho nhieu tien trinh ghi dong thoi.
// ============================================================================

// LOCAL_DATA_DIR: tro sang thu muc khac (vd du lieu pilot gia lap sim-pilot/data - scripts/simulate-pilot.ts)
// de khong tron voi du lieu mau trong data/.
const DATA_DIR = process.env.LOCAL_DATA_DIR ? path.resolve(process.env.LOCAL_DATA_DIR) : path.join(process.cwd(), "data");

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function filePathFor(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

export async function readCollection<T>(collection: string, fallback: T[]): Promise<T[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(filePathFor(collection), "utf-8");
    return JSON.parse(raw) as T[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await writeCollection(collection, fallback);
      return fallback;
    }
    throw err;
  }
}

export async function writeCollection<T>(collection: string, data: T[]): Promise<void> {
  await ensureDataDir();
  await writeFile(filePathFor(collection), JSON.stringify(data, null, 2), "utf-8");
}

let idCounter = 0;
export function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}
