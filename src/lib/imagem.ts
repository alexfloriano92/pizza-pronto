/**
 * Redimensiona e comprime imagens no navegador antes do upload,
 * para o cardápio carregar mais rápido.
 */

export const LARGURA_MAX = 1200;
export const ALTURA_MAX = 1200;
const QUALIDADE = 0.82;

function carregarBitmap(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao ler a imagem."));
    };
    img.src = url;
  });
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

/**
 * Devolve um novo File redimensionado (máx. 1200px no maior lado) e comprimido em WebP.
 * Se algo falhar (GIF animado, canvas indisponível), devolve o arquivo original.
 */
export async function otimizarImagem(arquivo: File): Promise<File> {
  if (typeof document === "undefined") return arquivo;
  if (arquivo.type === "image/gif") return arquivo;

  try {
    const img = await carregarBitmap(arquivo);
    const escala = Math.min(1, LARGURA_MAX / img.width, ALTURA_MAX / img.height);
    const largura = Math.max(1, Math.round(img.width * escala));
    const altura = Math.max(1, Math.round(img.height * escala));

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, largura, altura);

    const blob =
      (await paraBlob(canvas, "image/webp", QUALIDADE)) ??
      (await paraBlob(canvas, "image/jpeg", QUALIDADE));
    if (!blob) return arquivo;

    // Só troca se realmente ficou menor.
    if (blob.size >= arquivo.size && escala === 1) return arquivo;

    const extensao = blob.type === "image/webp" ? "webp" : "jpg";
    const base = arquivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.${extensao}`, { type: blob.type });
  } catch {
    return arquivo;
  }
}
