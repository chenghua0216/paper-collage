# 紙樂拼貼 Paper Collage

一個模擬剪紙拼貼、結合生成音樂的網頁藝術創作 App。
畫布就是樂譜:把撕好的紙片貼上畫布,按下播放後,播放線由左至右掃過,
掃到紙片就會發出對應的聲音。

## 聲音對應規則

| 視覺 | 聲音 |
| --- | --- |
| 紙材(色紙 / 牛皮紙 / 報紙 / 瓦楞紙) | 樂器(合成器 / 撥弦 / 噪音沙沙聲 / 低音鼓) |
| 水平位置 | 觸發時間(畫布 = 一個循環的時間軸) |
| 垂直位置 | 音高(越上面越高,鎖在 C 大調五聲音階) |
| 紙片寬度 | 音長 |
| 紙片面積 | 音量 |

作品會自動儲存在瀏覽器的 localStorage。

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # 打包到 dist/
```

## 技術

- [Konva](https://konvajs.org/) — 畫布拼貼互動(拖曳、旋轉、縮放)
- [Tone.js](https://tonejs.github.io/) — Web Audio 聲音引擎
- [Vite](https://vitejs.dev/) — 開發與打包
