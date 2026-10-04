import { Modal } from "./Modal";

// En v4 este modal existe pero nada lo abre; se mantiene por paridad. id: "showreel".
export function ShowreelModal() {
  return (
    <Modal id="showreel" title="Guillem Salvador · Showreel Oficial">
      <div className="relative aspect-video overflow-hidden bg-black">
        <iframe
          className="w-full h-full"
          src="https://www.youtube-nocookie.com/embed/Scxs7L0vhZ4?autoplay=0&controls=1&rel=0"
          title="Showreel"
          allowFullScreen
        />
      </div>
    </Modal>
  );
}
