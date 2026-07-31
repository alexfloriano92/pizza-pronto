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

/** Buzina de moto — pedido saiu para a entrega. */
export function somBuzinaMoto() {
  const audio = contexto();
  if (!audio) return;
  const agora = audio.currentTime;

  const toque = (inicio: number, duracao: number) => {
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, agora + inicio);
    master.gain.exponentialRampToValueAtTime(0.28, agora + inicio + 0.03);
    master.gain.setValueAtTime(0.28, agora + inicio + duracao - 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, agora + inicio + duracao);
    master.connect(audio.destination);

    // Duas frequências próximas + harmônico dão o timbre estridente da buzina.
    for (const [freq, tipo, ganho] of [
      [420, "square", 0.5],
      [510, "square", 0.4],
      [840, "sawtooth", 0.18],
    ] as const) {
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, agora + inicio);
      g.gain.setValueAtTime(ganho, agora + inicio);
      osc.connect(g).connect(master);
      osc.start(agora + inicio);
      osc.stop(agora + inicio + duracao + 0.02);
    }
  };

  toque(0, 0.32);
  toque(0.42, 0.5);
}

/** Deve ser chamado num gesto do usuário para liberar o áudio no navegador. */
export function liberarAudio() {
  contexto();
}

/** Vibração casada com a buzina — dois toques curtos. */
export function vibrarEntrega() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([320, 100, 500]);
  } catch {
    // dispositivo sem suporte real a vibração
  }
}
