
export const SoundManager = {
  ctx: null as AudioContext | null,
  isMuted: false, // Controls SFX only
  comboCount: 0,
  lastComboTime: 0,

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  play(type: 'pop' | 'blast' | 'booster' | 'win' | 'gameover' | 'click' | 'invalid' | 'combo') {
    if (this.isMuted) return;
    
    // Ensure context is ready
    const ctx = this.init();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'pop': // High "bloop"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        break;

      case 'blast': // Cute explosion
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        // Body
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        // Sparkle overlay
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, t);
        osc2.frequency.linearRampToValueAtTime(2000, t + 0.1);
        gain2.gain.setValueAtTime(0.1, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.3);
        osc2.start(t);
        osc2.stop(t + 0.2);
        break;

      case 'combo': // Rising pitch based on combo count
        const now = Date.now();
        if (now - this.lastComboTime > 2000) this.comboCount = 0;
        this.comboCount = Math.min(this.comboCount + 1, 8);
        this.lastComboTime = now;

        const baseFreq = 400 + (this.comboCount * 100);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.linearRampToValueAtTime(baseFreq * 2, t + 0.3);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;

      case 'booster': // Magic sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.linearRampToValueAtTime(1500, t + 0.5);
        
        // Tremolo
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 20;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 500;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + 0.5);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
        break;

      case 'invalid': // Low "bonk"
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        break;

      case 'win': // Major arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; 
        notes.forEach((f, i) => this.playNote(f, t + i * 0.08, 0.4, 'triangle'));
        break;

      case 'gameover': // Sad slide
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 1.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 1.2);
        osc.start(t);
        osc.stop(t + 1.2);
        break;

      case 'click': // Wood block
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
    }
  },

  playNote(freq: number, time: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    osc.start(time);
    osc.stop(time + duration);
  }
};

interface Track {
  name: string;
  melody: (string | null)[];
  tempo: number; // Duration of one note in ms
  wave: OscillatorType;
  style: 'chill' | 'action' | 'epic' | 'retro';
}

export const MusicManager = {
  isPlaying: false,
  isMuted: false, 
  timer: null as any,
  noteIndex: 0,
  baseVolume: 0.1,
  currentVolume: 0.1,
  currentTrackIndex: 0,

  freqMap: {
    'C3': 130.81, 'E3': 164.81, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50, 'D6': 1174.66
  } as Record<string, number>,

  tracks: [
    {
      name: "standard",
      style: 'chill',
      wave: 'sine',
      tempo: 250,
      melody: [
        'C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'C5', null,
        'F5', 'A5', 'C6', 'A5', 'G5', 'E5', 'D5', null,
        'E5', 'G5', 'B5', 'C6', 'B5', 'G5', 'E5', null,
        'D5', 'F5', 'A5', 'G5', 'B5', 'D6', 'C6', null
      ]
    },
    {
      name: "action",
      style: 'action',
      wave: 'triangle',
      tempo: 160,
      melody: [
        'C5', 'C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'C5',
        'F5', 'F5', 'A5', 'C6', 'F6', 'C6', 'A5', 'F5',
        'G5', 'G5', 'B5', 'D6', 'G6', 'D6', 'B5', 'G5',
        'C6', null, 'C6', null, 'C5', 'E5', 'G5', 'C6'
      ]
    },
    {
      name: "chill",
      style: 'chill',
      wave: 'sine',
      tempo: 400,
      melody: [
        'E4', null, 'G4', null, 'A4', null, 'G4', null,
        'C5', null, 'A4', null, 'G4', null, 'E4', null,
        'D4', null, 'E4', null, 'G4', null, 'E4', null,
        'C4', null, 'D4', null, 'C4', null, null, null
      ]
    },
    {
      name: "retro",
      style: 'retro',
      wave: 'square',
      tempo: 150,
      melody: [
        'C4', 'E4', 'G4', null, 'E4', 'G4', 'C5', null,
        'A4', 'C5', 'E5', null, 'C5', 'E5', 'A5', null,
        'G4', 'B4', 'D5', null, 'B4', 'D5', 'G5', null,
        'C5', null, 'E5', null, 'C5', null, null, null
      ]
    },
    {
      name: "epic",
      style: 'epic',
      wave: 'triangle',
      tempo: 120, // Fast
      melody: [
        'A3', 'A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3',
        'G3', 'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G3',
        'F3', 'F3', 'A3', 'C4', 'F4', 'C4', 'A3', 'F3',
        'E3', 'E3', 'G3', 'B3', 'E4', 'B3', 'G3', 'E3'
      ]
    },
    {
        name: "hero",
        style: 'action',
        wave: 'square',
        tempo: 200,
        melody: [
          'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', null,
          'D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'D4', null,
          'E4', 'G4', 'B4', 'E5', 'B4', 'G4', 'E4', null,
          'F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4', null
        ]
    }
  ] as Track[],

  ensureContext() {
    return SoundManager.init();
  },

  start() {
    if (this.isPlaying) return;
    this.ensureContext();
    if (!this.isMuted) {
       this.isPlaying = true;
       this.currentVolume = this.baseVolume;
       this.loop();
    }
  },

  stop() {
    this.isPlaying = false;
    if (this.timer) clearTimeout(this.timer);
  },

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (mute) {
      this.stop();
    } else {
      this.start();
    }
  },

  setVolume(vol: number) {
    this.baseVolume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted) {
      this.currentVolume = this.baseVolume;
    }
  },

  setLowPass(enable: boolean) {
    const target = enable ? this.baseVolume * 0.3 : this.baseVolume;
    this.currentVolume = target;
  },

  setTrack(index: number) {
    if (this.currentTrackIndex === index && this.isPlaying) return;
    
    const wasPlaying = this.isPlaying;
    this.stop();
    this.currentTrackIndex = Math.max(0, Math.min(index, this.tracks.length - 1));
    this.noteIndex = 0;
    if (wasPlaying || !this.isMuted) {
      // Auto start if switched
      this.isPlaying = true; 
      this.loop();
    }
  },

  // Logic to pick BGM based on Game Context
  playThemeForCharacter(charId: string) {
    // Determine track based on character tier/type
    // c1-c2 (Free): 0 (Ceria)
    // c3-c6 (Tier 1): 2 (Santai) or 3 (Retro)
    // c7-c9 (Tier 2): 1 (Semangat)
    // c10-c12 (Tier 3): 5 (Pahlawan)
    
    let trackIndex = 0;
    const tier1 = ['c3', 'c4', 'c5', 'c6'];
    const tier2 = ['c7', 'c8', 'c9'];
    const tier3 = ['c10', 'c11', 'c12'];

    if (tier1.includes(charId)) trackIndex = 2; // Santai
    else if (tier2.includes(charId)) trackIndex = 1; // Semangat
    else if (tier3.includes(charId)) trackIndex = 5; // Pahlawan
    else trackIndex = 0; // Default Ceria

    this.setTrack(trackIndex);
  },

  playThemeForLevel(levelId: number) {
    // 1-20: Ceria (0)
    // 21-50: Semangat (1)
    // 51-80: Action/Hero (5)
    // 81+: Tegang (4)
    let trackIndex = 0;
    if (levelId > 80) trackIndex = 4;
    else if (levelId > 50) trackIndex = 5;
    else if (levelId > 20) trackIndex = 1;
    else trackIndex = 0;

    this.setTrack(trackIndex);
  },

  getCurrentTrackName() {
    return this.tracks[this.currentTrackIndex].name;
  },

  loop() {
    if (!this.isPlaying) return;

    if (this.isMuted) {
      this.stop();
      return;
    }

    const currentTrack = this.tracks[this.currentTrackIndex];
    const note = currentTrack.melody[this.noteIndex % currentTrack.melody.length];
    
    if (note && this.freqMap[note]) {
       this.playTone(this.freqMap[note], currentTrack.wave);
    }

    this.noteIndex++;
    this.timer = setTimeout(() => this.loop(), currentTrack.tempo);
  },

  playTone(freq: number, type: OscillatorType) {
    const ctx = SoundManager.ctx;
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Low volume for BGM
    gain.gain.setValueAtTime(this.currentVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }
};
