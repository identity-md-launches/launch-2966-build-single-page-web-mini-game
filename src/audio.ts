import type { GameEvent } from "./game";
export class ArcadeAudio {
  context: AudioContext | null = null;
  enabled = false;
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Gameplay works without audio support. */
    }
  }
  play(event: GameEvent) {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const c = this.context;
    const notes: Record<GameEvent, number[]> = {
      jump: [260, 390],
      seed: [740, 980],
      hit: [150, 80],
      block: [523, 659, 784, 1046],
      over: [392, 330, 262, 196],
    };
    notes[event].forEach((frequency, index) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const at = c.currentTime + index * 0.075;
      osc.type = "square";
      osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.028, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.09);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(at);
      osc.stop(at + 0.1);
    });
  }
}
