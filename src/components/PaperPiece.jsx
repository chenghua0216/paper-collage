import { Path } from 'react-konva'
import { SHAPES } from '../shapes.js'

const SHAPE_MAP = Object.fromEntries(SHAPES.map((s) => [s.id, s]))

// 一片「紙」。用 offset 讓旋轉/縮放都繞著形狀中心（形狀畫在 200×200 框裡）。
export default function PaperPiece({ piece, isSelected, onSelect, onChange, nodeRef }) {
  const shape = SHAPE_MAP[piece.shapeId]
  if (!shape) return null

  return (
    <Path
      ref={nodeRef}
      data={shape.path}
      x={piece.x}
      y={piece.y}
      offsetX={100}
      offsetY={100}
      rotation={piece.rotation}
      scaleX={piece.scaleX}
      scaleY={piece.scaleY}
      fill={piece.fill}
      // 讓紙片微微浮起：柔和的投影模擬剪紙貼在底紙上的立體感。
      shadowColor="#000000"
      shadowBlur={12}
      shadowOpacity={0.28}
      shadowOffsetX={4}
      shadowOffsetY={7}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ ...piece, x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target
        onChange({
          ...piece,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        })
      }}
    />
  )
}
