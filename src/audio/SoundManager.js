/**
 * Web Audio API 기반 올림픽 및 코믹 사운드 매니저
 * 외부 에셋 다운로드 없이 내장 오디오 신디사이저로 모든 효과음 및 BGM 합성
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ambientGain = null;
    this.waterGain = null;
    this.isWaterPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime);
    }
    if (this.waterGain) {
      this.waterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.15, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // 올림픽 공식 호각 시퀀스: 짧은 호각 4회 후 긴 호각 1회 (스타트대 위로 올라서라는 신호)
  playCallToBlocksWhistles(callback) {
    if (this.isMuted) {
      if (callback) setTimeout(callback, 1200);
      return;
    }
    this.init();

    // 4회의 짧은 호각 (0.15초 간격)
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playShortWhistle(), i * 180);
    }

    // 1회의 긴 호각 (0.8초 후)
    setTimeout(() => {
      this.playLongWhistle();
      if (callback) setTimeout(callback, 800);
    }, 850);
  }

  playShortWhistle() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2800, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playLongWhistle() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(2600, now);

    mod.type = "triangle";
    mod.frequency.setValueAtTime(26, now);
    modGain.gain.setValueAtTime(200, now);

    mod.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.04);
    gain.gain.setValueAtTime(0.4, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    mod.start(now);
    osc.start(now);
    mod.stop(now + 0.7);
    osc.stop(now + 0.7);
  }

  // "Take Your Marks..." 스타트 준비 안내 톤
  playTakeYourMarksVoice() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    // 웅장한 경기장 안내음 저음 톤 (440Hz -> 330Hz)
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.6);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  // 스타트 비프음 (올림픽 공식 출발 버저 "삐---!")
  playStartBeep() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, now); // 1kHz 맑고 날카로운 비프음

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.setValueAtTime(0.4, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // 다이빙 입수 첨벙 소리 (Diving Splash)
  playDivingSplash() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    // 노이즈 버퍼 생성 (물보라 묵직한 타격음)
    const bufferSize = this.ctx.sampleRate * 1.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // 저역 통과 필터로 수중 물소리 연출
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  // 돌발 상황 코믹 사운드 FX
  playIncidentSfx(typeId) {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    switch (typeId) {
      case "U_TURN": {
        // 띠요오오옹~ (유턴 스프링음)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.8);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
      }
      case "ROPE_REST": {
        // 삑삑! 정지음
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.setValueAtTime(300, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case "SLOW_DOWN": {
        // 바람 빠지는 피유우우우~
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.9);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
        break;
      }
      case "CRAMP": {
        // 찌릿찌릿 전기/쥐 사운드
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(800, now);
        for (let i = 0; i < 6; i++) {
          osc.frequency.setValueAtTime(i % 2 === 0 ? 900 : 400, now + i * 0.08);
        }
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }
      case "BELLY_FLOP": {
        // 퍽!! 철퍽!!
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(400, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        break;
      }
      default: {
        // 기본 코믹 뿅 소리
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    }
  }

  // 결승선 터치패드 터치음 (FINISH BUZZER)
  playTouchPad() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc2.frequency.setValueAtTime(880.0, now);  // A5

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  }

  // 승리 팡파르 (Fanfare)
  playFanfare() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.15, t: 0.0 },  // C5
      { f: 523.25, d: 0.15, t: 0.15 }, // C5
      { f: 523.25, d: 0.15, t: 0.3 },  // C5
      { f: 659.25, d: 0.35, t: 0.45 }, // E5
      { f: 587.33, d: 0.15, t: 0.8 },  // D5
      { f: 659.25, d: 0.15, t: 0.95 }, // E5
      { f: 783.99, d: 0.7, t: 1.1 }   // G5 (길게)
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(0.3, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }

  // 버튼 클릭 UI음
  playClick() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 선수 등장 및 포즈 시 관중 환호 및 박수 갈채
  playApplause() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.0);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.6));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(1.2, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch (e) {}
  }
}

export const soundManager = new SoundManager();
