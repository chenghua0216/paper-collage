import './style.css'
import Konva from 'konva'
import * as audio from './audio.js'
import { makeTornPoints, makeTexture, randomColor, randomSize } from './papers.js'

const STORAGE_KEY = 'paper-collage-v1'

// ---- 舞台 ----
const container = document.getElementById('stage-container')
const stage = new Konva.Stage({
  container: 'stage-container',
  width: container.clientWidth,
  height: container.clientHeight,
})

const pieceLayer = new Konva.Layer()
const uiLayer = new Konva.Layer({ listening: false })
stage.add(pieceLayer)
stage.add(uiLayer)

const transformer = new Konva.Transformer({
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  anchorSize: 9,
  anchorCornerRadius: 4,
  borderStroke: '#e63946',
  anchorStroke: '#e63946',
  keepRatio: true,
})
pieceLayer.add(transformer)

const playhead = new Konva.Line({
  points: [0, 0, 0, stage.height()],
  stroke: '#e63946',
  strokeWidth: 2,
  shadowColor: '#e63946',
  shadowBlur: 8,
  visible: false,
})
uiLayer.add(playhead)

window.addEventListener('resize', () => {
  stage.width(container.clientWidth)
  stage.height(container.clientHeight)
  playhead.points([0, 0, 0, stage.height()])
})

// ---- 紙片 ----
function createPiece(attrs) {
  const piece = new Konva.Line({
    points: attrs.points,
    x: attrs.x,
    y: attrs.y,
    rotation: attrs.rotation || 0,
    scaleX: attrs.scaleX || 1,
    scaleY: attrs.scaleY || 1,
    closed: true,
    fillPatternImage: makeTexture(attrs.pieceType, attrs.baseColor),
    fillPatternRepeat: 'repeat',
    fillPatternOffset: { x: Math.random() * 160, y: Math.random() * 160 },
    shadowColor: 'rgba(40, 25, 10, 0.4)',
    shadowBlur: 6,
    shadowOffset: { x: 2, y: 4 },
    draggable: true,
    name: 'piece',
  })
  piece.setAttrs({ pieceType: attrs.pieceType, baseColor: attrs.baseColor })

  piece.on('dragend transformend', () => {
    save()
    previewSound(piece)
  })
  piece.on('mousedown touchstart', () => select(piece))

  pieceLayer.add(piece)
  transformer.moveToTop()
  return piece
}

function addPiece(typeId) {
  const { w, h } = randomSize(typeId)
  const piece = createPiece({
    pieceType: typeId,
    baseColor: randomColor(typeId),
    points: makeTornPoints(w, h),
    x: stage.width() * (0.25 + Math.random() * 0.5),
    y: stage.height() * (0.2 + Math.random() * 0.6),
    rotation: (Math.random() - 0.5) * 40,
  })
  select(piece)
  save()
  audio.ensureStarted().then(() => previewSound(piece))
}

function getPieces() {
  return pieceLayer.find('.piece')
}

// ---- 選取與刪除 ----
const deleteBtn = document.getElementById('delete-btn')
let selected = null

function select(piece) {
  selected = piece
  transformer.nodes(piece ? [piece] : [])
  deleteBtn.disabled = !piece
}

stage.on('mousedown touchstart', (e) => {
  if (e.target === stage) select(null)
})

function deleteSelected() {
  if (!selected) return
  selected.destroy()
  select(null)
  save()
}

deleteBtn.addEventListener('click', deleteSelected)
window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && e.target === document.body) {
    e.preventDefault()
    deleteSelected()
  }
})

document.getElementById('clear-btn').addEventListener('click', () => {
  if (getPieces().length === 0) return
  if (!confirm('確定要清空整個畫布嗎?')) return
  getPieces().forEach((p) => p.destroy())
  select(null)
  save()
})

// ---- 聲音對應 ----
function soundParams(piece) {
  const rect = piece.getClientRect()
  const yNorm = Math.min(1, Math.max(0, (rect.y + rect.height / 2) / stage.height()))
  const durSec = Math.min(1.2, Math.max(0.08, (rect.width / stage.width()) * loopDur * 0.5))
  const areaNorm = (rect.width * rect.height) / (stage.width() * stage.height())
  const velocity = Math.min(1, 0.35 + areaNorm * 12)
  return { yNorm, durSec, velocity }
}

function previewSound(piece) {
  const { yNorm, durSec, velocity } = soundParams(piece)
  audio.triggerPiece(piece.getAttr('pieceType'), yNorm, durSec, velocity)
}

function flash(piece) {
  piece.to({
    shadowBlur: 26,
    shadowOpacity: 1,
    duration: 0.06,
    onFinish: () => piece.to({ shadowBlur: 6, duration: 0.25 }),
  })
}

// ---- 播放 ----
const playBtn = document.getElementById('play-btn')
const loopSlider = document.getElementById('loop-slider')
const loopValue = document.getElementById('loop-value')

let loopDur = Number(loopSlider.value)
let playing = false
let startTime = 0
let prevX = 0

loopSlider.addEventListener('input', () => {
  loopDur = Number(loopSlider.value)
  loopValue.textContent = loopDur
})

const anim = new Konva.Animation(() => {
  const t = ((performance.now() - startTime) / 1000) % loopDur
  const x = (t / loopDur) * stage.width()
  playhead.points([x, 0, x, stage.height()])

  // 偵測播放線本幀掃過的區間,觸發區間內的紙片
  if (x >= prevX) {
    triggerInRange(prevX, x)
  } else {
    // 循環回捲:先掃尾段再掃頭段
    triggerInRange(prevX, stage.width())
    triggerInRange(-1, x)
  }
  prevX = x
}, uiLayer)

function triggerInRange(fromX, toX) {
  if (toX <= fromX) return
  for (const piece of getPieces()) {
    const cx = piece.x()
    if (cx > fromX && cx <= toX) {
      const { yNorm, durSec, velocity } = soundParams(piece)
      audio.triggerPiece(piece.getAttr('pieceType'), yNorm, durSec, velocity)
      flash(piece)
    }
  }
}

playBtn.addEventListener('click', async () => {
  if (playing) {
    playing = false
    anim.stop()
    playhead.visible(false)
    uiLayer.batchDraw()
    playBtn.textContent = '▶ 播放'
    playBtn.classList.remove('playing')
  } else {
    await audio.ensureStarted()
    playing = true
    startTime = performance.now()
    prevX = 0
    playhead.visible(true)
    anim.start()
    playBtn.textContent = '⏸ 停止'
    playBtn.classList.add('playing')
  }
})

// ---- 存檔 / 載入 ----
let saveTimer = null

function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const data = getPieces().map((p) => ({
      pieceType: p.getAttr('pieceType'),
      baseColor: p.getAttr('baseColor'),
      points: p.points(),
      x: p.x(),
      y: p.y(),
      rotation: p.rotation(),
      scaleX: p.scaleX(),
      scaleY: p.scaleY(),
    }))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // localStorage 不可用時略過(例如隱私模式)
    }
  }, 300)
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    for (const attrs of JSON.parse(raw)) createPiece(attrs)
  } catch {
    // 資料損毀時直接忽略,從空白畫布開始
  }
}

// ---- 工具列:加紙片 ----
for (const btn of document.querySelectorAll('.paper-btn')) {
  btn.addEventListener('click', () => addPiece(btn.dataset.type))
}

load()
