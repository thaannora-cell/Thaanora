// Short, human reference for a customer request, shown on the website and in WhatsApp, e.g. R-3F9A1C.
export const refOf = (id: string) => `R-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
