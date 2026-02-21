**[English](README_EN.md)** | 中文

# 🎆 2026 马年烟花模拟器

一个用手势控制的网页烟花模拟器，为 2026 马年春节打造。对着摄像头捏合手指就能放烟花，也可以直接通过鼠标点击屏幕。

## 在线体验

| 方式 | 地址 |
|------|------|
| HTTPS（支持摄像头手势） | https://58.87.67.161 |
| HTTP（自动跳转 HTTPS） | http://58.87.67.161:8080 |

> ⚠️ 由于使用自签证书，浏览器会提示"不安全"。点击 **"高级"** → **"继续访问"** 即可正常使用。不想折腾的话，也可以 clone 到本地直接打开 `index.html`。

## 玩法

- **捏合手指** → 发射一枚烟花
- **握拳** → 连续绽放
- **点击屏幕** → 不想开摄像头也能玩

## 功能

- 三种绽放形状：球形、爱心、星形
- 文字烟花：输入任意文字，烟花炸出来就是那几个字（行楷渲染）
- 内置马年祝福语一键发射：马到成功、龙马精神、万马奔腾…
- 8 种预设颜色 + 自定义色相滑块
- 爆炸规模可调（0.5x ~ 2.0x）
- 动态星空 + 城市天际线背景

## 本地运行

```bash
git clone https://github.com/Trossiyea/Firework_wowow.git
cd Firework_wowow
```

直接用浏览器打开 `index.html` 就行，点击屏幕即可发射烟花。

如果想用摄像头手势功能，需要起个本地服务：

```bash
# Python
python -m http.server 8080

# 或者 Node.js
npx serve .
```

然后访问 http://localhost:8080

## 技术实现

纯前端，零构建依赖。一共就三个文件：

- `index.html` — 页面结构
- `style.css` — 样式和动画
- `script.js` — 粒子引擎 + 手势识别 + UI 控制

用到的外部资源：
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)（手势识别，CDN 加载）
- [霞鹜文楷](https://github.com/lxgw/LxgwWenKai)（行楷字体，CDN 加载）

## 浏览器支持

Chrome / Edge 90+ 体验最佳。Firefox 和 Safari 基本能用，手势部分可能有兼容问题。

## 协议

MIT

---

by 橙C美事
