// El backend Nest devuelve `message` como string o string[] (validación de DTO).
// Normaliza a un string legible para toasts / errores inline.
export const apiText = (message: unknown, fallback = ''): string => {
  if (Array.isArray(message)) return message.filter(Boolean).join(', ');
  if (typeof message === 'string' && message.length > 0) return message;
  return fallback;
};
