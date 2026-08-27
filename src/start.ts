import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});
// Cabeçalhos de segurança aplicados a todas as respostas HTML/JSON.
// Obs.: não usamos X-Frame-Options/frame-ancestors para não quebrar o preview em iframe.
const CABECALHOS_SEGURANCA: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(), microphone=(), payment=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = (await next()) as unknown;
  const alvo =
    result instanceof Response
      ? result
      : ((result as { response?: unknown } | null)?.response as Response | undefined);
  try {
    if (alvo?.headers && typeof alvo.headers.set === "function") {
      for (const [nome, valor] of Object.entries(CABECALHOS_SEGURANCA)) {
        alvo.headers.set(nome, valor);
      }
    }
  } catch {
    /* headers imutáveis: ignora */
  }
  return result as never;
});


// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware, securityHeadersMiddleware],
}));

