import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

/** Loi moi lam dot khao sat lai giao vien dang mo cho lop (de xuat B1) - hien o trang Ho so va Hoat dong. */
export function RetestInvite({ wave }: { wave: string }) {
  return (
    <Card className="animate-clay-rise bg-brand-100">
      <p className="pretty text-sm font-semibold leading-relaxed text-brand-800">
        Thầy cô mời em làm bài khảo sát lần {wave.slice(1)}. Em chọn theo suy nghĩ hiện tại, không cần nhớ
        lần trước đã chọn gì.
      </p>
      <LinkButton href={`/hoc-sinh/khao-sat?dot=${wave}`} className="mt-3 w-full">
        Làm khảo sát lần {wave.slice(1)}
      </LinkButton>
    </Card>
  );
}
