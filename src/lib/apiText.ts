// El backend Nest devuelve `message` como string o string[] (validación de DTO).
// Normaliza a un string legible para toasts / errores inline.

// Textos de error comunes. El usuario nunca ve mensajes internos (validación de
// DTO, errores de fetch o de base de datos): ve el texto de la pantalla o uno de
// estos, y el detalle queda en la consola para depurar.
export const GENERIC_ERROR_TEXT = 'Something went wrong. Please try again.';
export const NETWORK_ERROR_TEXT =
  "We couldn't reach the server. Check your connection and try again.";
export const TIMEOUT_ERROR_TEXT =
  'The server took too long to respond. Please try again in a few minutes.';
export const SERVER_ERROR_TEXT =
  'Something went wrong on our side. Please try again in a few minutes.';

const TECHNICAL_PATTERNS: RegExp[] = [
  // class-validator: "property firstName should not exist",
  // "lead_status must be one of the following values: …", "email must be an email".
  /^property \S+ should not exist/i,
  /^(each value in |nested property )?[a-z][\w.]* (must|should) /,
  /an unknown value was passed to the validate function/i,
  // Pipes de Nest (ParseIntPipe, ParseFilePipe…) y rutas inexistentes.
  /^Validation failed/i,
  /^Cannot (GET|POST|PUT|PATCH|DELETE) \//,
  // Frase HTTP sola ("Bad Request", "Internal Server Error"…).
  /^(Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Payload Too Large|Unprocessable Entity|Too Many Requests|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout|Request Timeout|Http Exception)$/i,
  // fetch / JSON del navegador.
  /Failed to fetch|NetworkError|Load failed|network error|aborted|Unexpected (token|end of JSON)/i,
  // Errores de base de datos o de código que se colaron en el mensaje.
  /QueryFailedError|ER_[A-Z_]{3,}|Duplicate entry|foreign key constraint|Data too long|Unknown column|Incorrect \w+ value|Cannot (read|set) properties of|is not a function|is not defined/i,
];

export const isTechnicalMessage = (text: string): boolean =>
  TECHNICAL_PATTERNS.some((re) => re.test(text.trim()));

const toParts = (message: unknown): string[] =>
  (Array.isArray(message) ? message : [message]).filter(
    (m): m is string => typeof m === 'string' && m.trim().length > 0
  );

// Texto del backend apto para el usuario, o undefined si no hay o es técnico.
export const humanMessage = (message: unknown): string | undefined => {
  const parts = toParts(message);
  if (parts.length === 0) return undefined;
  if (parts.some(isTechnicalMessage)) {
    console.warn('[api] technical error message hidden from the user:', message);
    return undefined;
  }
  return parts.join(', ');
};

export const apiText = (message: unknown, fallback = ''): string => {
  const human = humanMessage(message);
  if (human) return human;
  // Había mensaje pero era técnico: nunca devolver vacío (la pantalla lo
  // tomaría como "sin error").
  return toParts(message).length > 0 ? fallback || GENERIC_ERROR_TEXT : fallback;
};

// Mensaje según el status HTTP: sin conexión (0), timeout (408/504/524) y
// fallos del servidor (5xx) tienen texto propio; el resto, el del backend si es
// apto. undefined = la pantalla usa su propio texto.
export const errorTextFor = (
  code: number | undefined,
  message: unknown
): string | undefined => {
  if (code === 0) return NETWORK_ERROR_TEXT;
  if (code === 408 || code === 504 || code === 524) return TIMEOUT_ERROR_TEXT;
  if (typeof code === 'number' && code >= 500) return SERVER_ERROR_TEXT;
  return humanMessage(message);
};

export const apiErrorText = (
  code: number | undefined,
  message: unknown,
  fallback: string
): string => errorTextFor(code, message) ?? fallback;
