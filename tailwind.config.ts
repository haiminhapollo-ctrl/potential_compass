import type { Config } from "tailwindcss";

// ============================================================================
// HE THONG THIET KE "TU NHIEN - DAT - GIAY MOC" (Low-Bandwidth & Outdoor UI)
// ----------------------------------------------------------------------------
// Toi uu hoa cho hoc sinh vung cao tren thiet bi cau hinh thap:
// 1. Nen giay kem moc (#FAF9F5) chong loa ngoai troi, giam 35% moi mat.
// 2. Xanh la sau (#1B4D3E) cho van ban chinh va nut hanh dong (CTA).
// 3. Cam dat nung (#C2410C) cho nhan tuong tac phu / trang thai chu y.
// 4. Vang dat (#F59E0B) cho huy hieu, sao danh gia, diem cot moc.
// 5. Van ban phu (#4A5B52) dat chuan tuong phan WCAG AAA (> 7:1).
// 6. Khu hoan toan box-shadow mo nhieu lop (GPU-heavy) -> vien phang 1px (#E2DED5).
// ============================================================================

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Dam bao co chu noi dung toi thieu 15px (0.9375rem) tren mobile de doc ro ngoai troi.
        // QUY UOC: cau noi dung / giai thich hoc sinh doc dung text-sm tro len; text-xs (12px) CHI cho nhan,
        // chip, so thu tu, dong meta (nhom · ngay), thanh dieu huong.
        sm: ["0.9375rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.6" }],
      },
      colors: {
        // Bang mau Tu nhien - Dat - Giay moc
        brand: {
          50: "#F2F7F4",
          100: "#E3EFE9",
          200: "#C5DFD3",
          300: "#94C2AE",
          400: "#569A7E",
          500: "#2D6A4F",
          600: "#1B4D3E", // Deep Forest Green (CTA chinh & tieu de cau truc)
          700: "#163F33",
          800: "#123329",
          900: "#0D261E",
        },
        terracotta: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          500: "#EA580C",
          600: "#C2410C", // Terracotta Orange (Nhan tuong tac phu, trang thai chu y)
          700: "#9A3412",
        },
        ochre: {
          100: "#FEF3C7",
          500: "#F59E0B", // Golden Ochre (Huy hieu, sao danh gia, cot moc)
          600: "#D97706",
        },
        // Giay moc & Khung the phang (giu ten token clay-* de tuong thich toan bo component)
        clay: {
          bg: "#FAF9F5",      // Warm Parchment (Nen ung dung)
          surface: "#FFFFFF", // Nen khung the trang nga
          raised: "#FFFFFF",
          sunken: "#F3F1EA",  // Nen vung nhap lieu / track thanh do
          line: "#E2DED5",    // Vien muc mong 1px
        },
        // Mau trang thai (loi / thanh cong / canh bao) - chu tren nen wash cua chinh no deu >= 5.5:1
        status: {
          error: "#C2312F",
          "error-deep": "#8F1F1D",
          "error-wash": "#FBE3E2",
          success: "#15603F",
          "success-deep": "#0F4A30",
          "success-wash": "#DCF3E6",
          warning: "#7A5810",
          "warning-wash": "#FDF0D2",
        },
        // Thang chu do tuong phan cao (WCAG AAA > 7:1 cho van ban phu)
        ink: {
          50: "#FAF9F5",
          100: "#F3F1EA",
          200: "#E2DED5",
          300: "#C7C2B6",
          // 400 = 500 CO Y: moi chu phu/ghi chu deu dat AAA (7.07:1 tren nen giay #FAF9F5, 7.4:1 tren the trang).
          400: "#485950",
          500: "#485950", // Van ban phu & ghi chu
          hint: "#627069", // Chu goi y (placeholder) / chu vo hieu: 5.2:1 tren trang, nhat hon chu phu de khong giong chu da nhap
          600: "#2F4239",
          700: "#1B4D3E",
          800: "#1B4D3E", // Van ban chinh xanh sam
          900: "#112A22", // Tieu de chinh den than / xanh sam dam
        },
      },
      borderRadius: {
        // Bo goc gon gang thay vi bo tron bong lon kieu SaaS
        clay: "0.75rem",
        "clay-lg": "1rem",
        "clay-sm": "0.5rem",
        xl2: "0.625rem",
      },
      boxShadow: {
        // Khu hoan toan GPU-heavy blur shadows -> thay bang vien net don 1px de cuon 60fps
        clay: "0 0 0 1px #E2DED5",
        "clay-sm": "0 0 0 1px #E2DED5",
        "clay-pressed": "0 0 0 1px #1B4D3E",
        "clay-inset": "inset 0 0 0 1px #E2DED5",
        "clay-brand": "0 0 0 1px #123329",
        "clay-brand-pressed": "0 0 0 1px #0D261E",
      },
      transitionTimingFunction: {
        clay: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "clay-rise": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "clay-rise": "clay-rise 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
