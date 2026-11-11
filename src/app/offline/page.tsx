export default function OfflinePage() {
  return (
    <main
      id="noi-dung"
      className="above-grain mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center"
    >
      <div className="clay animate-clay-rise p-8">
        <span
          className="mx-auto grid h-16 w-16 place-items-center rounded-clay bg-clay-sunken text-3xl shadow-clay-inset"
          aria-hidden
        >
          📡
        </span>
        <h1 className="balance mt-5 text-xl font-extrabold tracking-[-0.02em] text-ink-900">
          Đang mất kết nối mạng
        </h1>
        <p className="pretty mt-2 text-sm font-medium leading-relaxed text-ink-500">
          Trang này chưa được lưu sẵn trên máy nên chưa mở được khi mất mạng. Các hoạt động em đã làm hôm nay vẫn
          còn trên máy và sẽ tự gửi đi khi có mạng lại.
        </p>
      </div>
    </main>
  );
}
