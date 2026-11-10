import type { ClipboardEvent } from "react";
import { toast } from "sonner";

// Buenas prácticas de seguridad para campos de contraseña: exige digitación manual
// (evita que la clave quede en el portapapeles o se pegue desde otro origen).
function blockClipboard(event: ClipboardEvent<HTMLInputElement>) {
  event.preventDefault();
  toast("Por seguridad, escribe tu contraseña manualmente. No se permite copiar ni pegar.");
}

export const noClipboardProps = {
  onCopy: blockClipboard,
  onCut: blockClipboard,
  onPaste: blockClipboard,
} as const;
