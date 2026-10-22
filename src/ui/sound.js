/**
 * Tiny synthesized sound board: printer motor whir, feed chirp, tear, beeps.
 * No audio files, no dependencies. AudioContext is only created after a user
 * gesture, so browsers never block the page.
 */
export class SoundBoard {
  constructor(options = {}) {
    this.muted = Boolean(options.muted);
    this.context = null;
    this.motor = null;
    this.master = null;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.context.destination);
    return this.context;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.context.currentTime, 0.02);
    }
    if (this.muted) this.stopMotor();
    else this.ensure();
  }

  beep(frequency = 620, duration = 0.07, type = 'square', gain = 0.035) {
    if (this.muted) return;
    const context = this.ensure();
    if (!context) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.linearRampToValueAtTime(gain, context.currentTime + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  startMotor() {
    if (this.muted) return;
    const context = this.ensure();
    if (!context || this.motor) return;
    const now = context.currentTime;

    const hum = context.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 63;

    const buzz = context.createOscillator();
    buzz.type = 'square';
    buzz.frequency.value = 126;

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.32;
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.05, now + 0.08);

    hum.connect(filter);
    buzz.connect(filter);
    noise.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);

    hum.start();
    buzz.start();
    noise.start();
    this.motor = { hum, buzz, noise, filter, envelope, context };
  }

  stopMotor() {
    if (!this.motor) return;
    const { hum, buzz, noise, envelope, context } = this.motor;
    const now = context.currentTime;
    envelope.gain.cancelScheduledValues(now);
    envelope.gain.setTargetAtTime(0, now, 0.03);
    try {
      hum.stop(now + 0.15);
      buzz.stop(now + 0.15);
      noise.stop(now + 0.15);
    } catch {
      // Already stopped.
    }
    this.motor = null;
  }

  tear() {
    if (this.muted) return;
    const context = this.ensure();
    if (!context) return;
    const duration = 0.22;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.3) * 0.5;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const gain = context.createGain();
    gain.gain.value = 0.16;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  feed() {
    this.beep(240, 0.05, 'square', 0.022);
  }

  success() {
    this.beep(660, 0.07, 'square', 0.03);
    setTimeout(() => this.beep(880, 0.09, 'square', 0.028), 90);
  }

  error() {
    this.beep(150, 0.18, 'sawtooth', 0.035);
  }
}
