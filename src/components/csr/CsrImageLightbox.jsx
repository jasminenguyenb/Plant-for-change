/**
 * Lightbox toàn màn hình cho ảnh CSR (founder / gallery).
 * @param {{ src: string | null; onClose: () => void }} props
 */
export function CsrImageLightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Đóng"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
      <img src={src} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
