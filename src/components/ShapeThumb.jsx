// 形狀庫按鈕裡的小預覽圖，用當前選色填滿。
export default function ShapeThumb({ path, color }) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">
      <path d={path} fill={color} />
    </svg>
  )
}
