import type { HTMLAttributes, ReactNode } from "react";

// Khung the: Nen trang nga (#FFFFFF), vien muc mong 1px (#E2DED5), khong do bong.
export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`clay above-grain p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`balance text-lg font-bold tracking-[-0.01em] text-ink-900 ${className}`}>{children}</h2>
  );
}

export function CardDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`pretty mt-1 text-[15px] text-ink-500 ${className}`}>{children}</p>;
}
