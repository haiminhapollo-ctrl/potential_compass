import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// Nunito co dau tieng Viet DAY DU (subset "vietnamese") - bat buoc phai khai
// bao subset nay, neu khong cac chu co dau se roi ve font he thong va lech
// net so voi phan chu khong dau. next/font tai font luc BUILD va tu host lai
// => khong goi ra Google luc chay, van hoat dong khi thiet bi offline (PWA).
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Potential Compass",
    template: "%s · Potential Compass",
  },
  description:
    "Khám phá sở thích và định hướng học tập, nghề nghiệp cho học sinh lớp 9 vùng cao.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Potential Compass",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF9F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={nunito.variable}>
      <body>
        <a
          href="#noi-dung"
          className="focus-ring sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4
                     focus:rounded-clay-sm focus:bg-brand-600 focus:px-4 focus:py-2
                     focus:text-sm focus:font-semibold focus:text-white focus:shadow-clay-brand"
        >
          Bỏ qua, tới nội dung chính
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
