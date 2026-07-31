let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Nota = { freq: number; inicio: number; duracao: number; volume?: number };

function tocarNotas(notas: Nota[]) {
  const audio = contexto();
  if (!audio) return;
  const agora = audio.currentTime;
  for (const nota of notas) {
    const osc = audio.createOscillator();
    const ganho = audio.createGain();
    const t0 = agora + nota.inicio;
    const t1 = t0 + nota.duracao;
    const vol = nota.volume ?? 0.18;

    osc.type = "sine";
    osc.frequency.setValueAtTime(nota.freq, t0);
    ganho.gain.setValueAtTime(0.0001, t0);
    ganho.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(ganho).connect(audio.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

/** Campainha alegre — novo pedido chegando na cozinha. */
export function somNovoPedido() {
  tocarNotas([
    { freq: 880, inicio: 0, duracao: 0.16, volume: 0.22 },
    { freq: 1174.7, inicio: 0.16, duracao: 0.18, volume: 0.22 },
    { freq: 1567.9, inicio: 0.34, duracao: 0.3, volume: 0.2 },
  ]);
}

/** Bipe curto — mudança de status do pedido. */
export function somMudancaStatus() {
  tocarNotas([
    { freq: 659.3, inicio: 0, duracao: 0.14 },
    { freq: 987.8, inicio: 0.14, duracao: 0.22 },
  ]);
}

/** Deve ser chamado num gesto do usuário para liberar o áudio no navegador. */
export function liberarAudio() {
  contexto();
}
