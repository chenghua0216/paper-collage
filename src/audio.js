// 聲音引擎:每種紙材對應一種樂器,音高鎖在五聲音階
import * as Tone from 'tone'

const reverb = new Tone.Freeverb({ roomSize: 0.7, wet: 0.16 }).toDestination()
const bus = new Tone.Compressor(-18, 3).connect(reverb)

const instruments = {
  // 色紙:柔和的三角波合成器(旋律主角)
  colored: new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.18, sustain: 0.25, release: 0.5 },
    volume: -6,
  }).connect(bus),
  // 牛皮紙:撥弦聲(溫暖的中低音)
  kraft: new Tone.PluckSynth({
    attackNoise: 1,
    dampening: 3200,
    resonance: 0.92,
    volume: -2,
  }).connect(bus),
  // 報紙:粉紅噪音沙沙聲(類似沙鈴/鈸)
  newsprint: new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0 },
    volume: -14,
  }).connect(bus),
  // 瓦楞紙:膜式鼓聲(低音節奏)
  corrugated: new Tone.MembraneSynth({
    octaves: 5,
    pitchDecay: 0.05,
    volume: -5,
  }).connect(bus),
}

// C 大調五聲音階,隨便貼都不會難聽
const SCALE = ['C', 'D', 'E', 'G', 'A']

// yNorm: 0 = 畫布頂端(高音) ~ 1 = 底端(低音)
function yToNote(yNorm, minOct, maxOct) {
  const total = (maxOct - minOct + 1) * SCALE.length
  const idx = Math.min(total - 1, Math.max(0, Math.floor((1 - yNorm) * total)))
  const octave = minOct + Math.floor(idx / SCALE.length)
  return SCALE[idx % SCALE.length] + octave
}

let started = false

export async function ensureStarted() {
  if (!started) {
    await Tone.start()
    started = true
  }
}

/**
 * 觸發一張紙片的聲音。
 * @param {string} type 紙材 id
 * @param {number} yNorm 垂直位置 0(上)~1(下)
 * @param {number} durSec 音長(秒)
 * @param {number} velocity 力度 0~1(由紙片面積決定)
 */
export function triggerPiece(type, yNorm, durSec, velocity) {
  if (!started) return
  window.dispatchEvent(new CustomEvent('papercollage:trigger', { detail: { type, yNorm, durSec, velocity } }))
  const now = Tone.now()
  try {
    switch (type) {
      case 'colored':
        instruments.colored.triggerAttackRelease(yToNote(yNorm, 3, 5), durSec, now, velocity)
        break
      case 'kraft':
        instruments.kraft.triggerAttackRelease(yToNote(yNorm, 2, 4), durSec, now)
        break
      case 'newsprint':
        instruments.newsprint.triggerAttackRelease(Math.min(durSec, 0.3), now, velocity)
        break
      case 'corrugated':
        instruments.corrugated.triggerAttackRelease(yToNote(yNorm, 1, 2), Math.min(durSec, 0.5), now, velocity)
        break
    }
  } catch {
    // 極端快速的重複觸發可能拋出時間衝突錯誤,直接忽略
  }
}
