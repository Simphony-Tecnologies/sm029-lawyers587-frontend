// Copia texto al portapapeles: Clipboard API y, si no está disponible (http,
// permisos, navegador viejo), el fallback con textarea + execCommand. El
// textarea se monta dentro de `container` para no chocar con el focus trap de
// los diálogos (headlessui).
export const copyText = async (text: string, container?: HTMLElement | null): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // sigue con el fallback
  }
  try {
    const host = container ?? document.body;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    host.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    host.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
