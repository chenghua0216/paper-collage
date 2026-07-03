import { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Transformer } from 'react-konva'
import PaperPiece from './components/PaperPiece.jsx'
import { SHAPES } from './shapes.js'
import { PALETTE, BACKGROUNDS } from './palette.js'
import ShapeThumb from './components/ShapeThumb.jsx'

let idCounter = 1

export default function App() {
  const [pieces, setPieces] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [currentColor, setCurrentColor] = useState(PALETTE[0])
  const [bgColor, setBgColor] = useState(BACKGROUNDS[0])
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  const stageRef = useRef(null)
  const transformerRef = useRef(null)
  const nodeRefs = useRef({})
  const canvasWrapRef = useRef(null)

  // 讓畫布填滿中央區域，並隨視窗縮放。
  useEffect(() => {
    const resize = () => {
      if (!canvasWrapRef.current) return
      const { clientWidth, clientHeight } = canvasWrapRef.current
      setStageSize({ width: clientWidth, height: clientHeight })
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // 把 Transformer 綁到目前選取的紙片。
  useEffect(() => {
    const tr = transformerRef.current
    if (!tr) return
    const node = selectedId ? nodeRefs.current[selectedId] : null
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [selectedId, pieces])

  const addPiece = useCallback(
    (shapeId) => {
      const id = idCounter++
      // 落點帶點隨機偏移與旋轉，貼起來更自然。
      const jitter = () => (Math.random() - 0.5) * 80
      const newPiece = {
        id,
        shapeId,
        x: stageSize.width / 2 + jitter(),
        y: stageSize.height / 2 + jitter(),
        rotation: (Math.random() - 0.5) * 30,
        scaleX: 1,
        scaleY: 1,
        fill: currentColor,
      }
      setPieces((prev) => [...prev, newPiece])
      setSelectedId(id)
    },
    [currentColor, stageSize],
  )

  const updatePiece = useCallback((updated) => {
    setPieces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const deleteSelected = useCallback(() => {
    if (selectedId == null) return
    setPieces((prev) => prev.filter((p) => p.id !== selectedId))
    delete nodeRefs.current[selectedId]
    setSelectedId(null)
  }, [selectedId])

  // 幫選取的紙片重新上色。
  const recolorSelected = useCallback(
    (color) => {
      setCurrentColor(color)
      if (selectedId == null) return
      setPieces((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, fill: color } : p)),
      )
    },
    [selectedId],
  )

  const moveLayer = useCallback(
    (dir) => {
      if (selectedId == null) return
      setPieces((prev) => {
        const idx = prev.findIndex((p) => p.id === selectedId)
        if (idx === -1) return prev
        const next = [...prev]
        const [item] = next.splice(idx, 1)
        if (dir === 'front') next.push(item)
        else if (dir === 'back') next.unshift(item)
        else if (dir === 'up') next.splice(Math.min(idx + 1, next.length), 0, item)
        else if (dir === 'down') next.splice(Math.max(idx - 1, 0), 0, item)
        return next
      })
    },
    [selectedId],
  )

  const clearAll = useCallback(() => {
    if (pieces.length && !window.confirm('清空整張畫布？')) return
    setPieces([])
    setSelectedId(null)
    nodeRefs.current = {}
  }, [pieces.length])

  const exportPNG = useCallback(() => {
    setSelectedId(null)
    // 等 Transformer 消失後再輸出，避免把控制框畫進去。
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = 'paper-collage.png'
      link.href = uri
      link.click()
    }, 50)
  }, [])

  // 鍵盤：Delete/Backspace 刪除選取的紙片。
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId != null) {
        const tag = e.target.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault()
          deleteSelected()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, deleteSelected])

  const deselectOnEmpty = (e) => {
    // 點到畫布空白處（Stage 本身）就取消選取。
    if (e.target === e.target.getStage()) setSelectedId(null)
  }

  return (
    <div className="app">
      {/* 左側：形狀庫 */}
      <aside className="panel panel-left">
        <h2>形狀</h2>
        <p className="hint">點一下把紙片加到畫布</p>
        <div className="shape-grid">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              className="shape-btn"
              title={s.name}
              onClick={() => addPiece(s.id)}
            >
              <ShapeThumb path={s.path} color={currentColor} />
            </button>
          ))}
        </div>
      </aside>

      {/* 中央：畫布 */}
      <main className="canvas-area">
        <div className="topbar">
          <span className="brand">剪紙拼貼 · Paper Collage</span>
          <div className="topbar-actions">
            <button onClick={exportPNG}>匯出 PNG</button>
            <button className="ghost" onClick={clearAll}>
              清空
            </button>
          </div>
        </div>
        <div className="canvas-wrap" ref={canvasWrapRef}>
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
            onMouseDown={deselectOnEmpty}
            onTouchStart={deselectOnEmpty}
          >
            <Layer>
              <Rect
                x={0}
                y={0}
                width={stageSize.width}
                height={stageSize.height}
                fill={bgColor}
                listening={false}
              />
              {pieces.map((piece) => (
                <PaperPiece
                  key={piece.id}
                  piece={piece}
                  isSelected={piece.id === selectedId}
                  onSelect={() => setSelectedId(piece.id)}
                  onChange={updatePiece}
                  nodeRef={(node) => {
                    if (node) nodeRefs.current[piece.id] = node
                  }}
                />
              ))}
              <Transformer
                ref={transformerRef}
                rotateEnabled
                anchorStroke="#1D6A96"
                anchorFill="#ffffff"
                anchorSize={9}
                borderStroke="#1D6A96"
                borderDash={[4, 4]}
                keepRatio={false}
              />
            </Layer>
          </Stage>
        </div>
      </main>

      {/* 右側：顏色 + 屬性 */}
      <aside className="panel panel-right">
        <h2>顏色</h2>
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={'swatch' + (c === currentColor ? ' active' : '')}
              style={{ background: c }}
              onClick={() => recolorSelected(c)}
              title={c}
            />
          ))}
        </div>

        <h2>畫布底色</h2>
        <div className="swatches">
          {BACKGROUNDS.map((c) => (
            <button
              key={c}
              className={'swatch' + (c === bgColor ? ' active' : '')}
              style={{ background: c }}
              onClick={() => setBgColor(c)}
              title={c}
            />
          ))}
        </div>

        <h2>選取的紙片</h2>
        {selectedId == null ? (
          <p className="hint">在畫布上點選一片紙來調整</p>
        ) : (
          <div className="controls">
            <div className="layer-row">
              <button onClick={() => moveLayer('front')}>移到最上</button>
              <button onClick={() => moveLayer('up')}>上一層</button>
              <button onClick={() => moveLayer('down')}>下一層</button>
              <button onClick={() => moveLayer('back')}>移到最下</button>
            </div>
            <button className="danger" onClick={deleteSelected}>
              刪除紙片（Delete）
            </button>
          </div>
        )}

        <p className="tip">
          提示：拖曳移動、四角縮放、頂端把手旋轉。點空白處取消選取。
        </p>
      </aside>
    </div>
  )
}
