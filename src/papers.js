// 紙材定義與紙片外形/材質產生器

export const PAPER_TYPES = {
  colored: {
    label: '色紙',
    colors: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5', '#f4845f'],
    size: { w: [70, 160], h: [60, 140] },
  },
  kraft: {
    label: '牛皮紙',
    colors: ['#c8a97e', '#b08b57', '#d9b98c', '#a5835a'],
    size: { w: [90, 200], h: [70, 150] },
  },
  newsprint: {
    label: '報紙',
    colors: ['#d8d5cd', '#c9c5ba', '#e3e0d8'],
    size: { w: [120, 240], h: [50, 90] },
  },
  corrugated: {
    label: '瓦楞紙',
    colors: ['#a9927d', '#8a7462', '#bfa58c'],
    size: { w: [100, 200], h: [90, 170] },
  },
}

const rand = (min, max) => min + Math.random() * (max - min)

export function randomColor(typeId) {
  const colors = PAPER_TYPES[typeId].colors
  return colors[Math.floor(Math.random() * colors.length)]
}

export function randomSize(typeId) {
  const { w, h } = PAPER_TYPES[typeId].size
  return { w: rand(w[0], w[1]), h: rand(h[0], h[1]) }
}

// 以中心點為原點,產生一圈帶毛邊抖動的多邊形頂點(模擬撕紙邊緣)
export function makeTornPoints(w, h) {
  const n = Math.floor(rand(26, 40))
  const points = []
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2
    // 大尺度的不規則 + 小尺度的鋸齒毛邊
    const wobble = 0.82 + Math.random() * 0.3
    const jag = 1 + (Math.random() - 0.5) * 0.08
    const rx = (w / 2) * wobble * jag
    const ry = (h / 2) * wobble * jag
    points.push(Math.cos(angle) * rx, Math.sin(angle) * ry)
  }
  return points
}

// 產生帶紙纖維顆粒感的材質貼圖(以底色染色)
const textureCache = new Map()

export function makeTexture(typeId, color) {
  const key = `${typeId}:${color}`
  if (textureCache.has(key)) return textureCache.get(key)

  const size = 160
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = color
  ctx.fillRect(0, 0, size, size)

  // 顆粒
  for (let i = 0; i < 700; i++) {
    const light = Math.random() > 0.5
    ctx.fillStyle = light
      ? `rgba(255,255,255,${Math.random() * 0.07})`
      : `rgba(60,40,20,${Math.random() * 0.06})`
    ctx.fillRect(Math.random() * size, Math.random() * size, rand(1, 2.5), rand(1, 2.5))
  }

  // 纖維細線
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.moveTo(x, y)
    ctx.lineTo(x + rand(-25, 25), y + rand(-4, 4))
    ctx.stroke()
  }

  // 瓦楞紙:加上規律直條紋
  if (typeId === 'corrugated') {
    ctx.fillStyle = 'rgba(60,40,20,0.10)'
    for (let x = 0; x < size; x += 12) {
      ctx.fillRect(x, 0, 4, size)
    }
  }

  // 報紙:加上模糊的假文字行
  if (typeId === 'newsprint') {
    ctx.fillStyle = 'rgba(50,50,50,0.22)'
    for (let y = 10; y < size; y += 12) {
      let x = rand(2, 14)
      while (x < size - 8) {
        const wordW = rand(6, 22)
        ctx.fillRect(x, y, wordW, 3)
        x += wordW + rand(3, 7)
      }
    }
  }

  textureCache.set(key, canvas)
  return canvas
}
