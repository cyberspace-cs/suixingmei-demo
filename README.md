# 随行美 · AI 跟妆助手（可交互 Demo）

上传一张喜欢的妆容和一张素颜自拍，AI 识别妆面、分析脸型、把妆容适配到你的脸上，再像化妆师一样一步步带你画：摄像头当镜子，语音讲解 + 语音指令，随时「帮我看看」拍照检查，画完拍妆后照打分。

这个仓库是 PRD 2.0 的可点击 Demo，所有 AI / 摄像头 / 语音能力都有**本地 mock 或降级实现**，不需要任何 API Key 就能完整走通。

在线体验：<https://elizabettgoodman-art.github.io/suixingmei-demo/>（GitHub Pages，`main` 分支每次 push 自动部署）

## 本地运行

需要 Node.js 20+。

```bash
npm install
npm run dev        # http://localhost:4317
```

其他脚本：

| 命令 | 作用 |
| --- | --- |
| `npm run build && npm start` | 生产构建并在 4317 端口启动 |
| `npm run build:pages` | GitHub Pages 静态构建，输出到 `out/` |
| `npm run lint` | ESLint（含 React Compiler 规则） |
| `npm run typecheck` | TypeScript 检查 |

## 部署到 GitHub Pages

`.github/workflows/deploy-pages.yml` 在每次 push 到 `main` 时运行 `npm run build:pages`，把 `out/` 发布到 GitHub Pages（仓库 Settings → Pages 的 Source 为 GitHub Actions）。

`build:pages` 设置 `GITHUB_PAGES=true`，`next.config.ts` 只在这个开关下启用：

- `output: "export"` 纯静态导出，`trailingSlash: true`（每个页面输出为 `xxx/index.html`，刷新子页面不会 404）
- `basePath: "/suixingmei-demo"`（可用 `PAGES_BASE_PATH` 覆盖）；`public/` 下的图片通过 `src/lib/utils.ts` 的 `asset()` 补上前缀
- `images.unoptimized`，以及 `pageExtensions: ["tsx"]`：静态托管跑不了 `route.ts`，mock API 不参与导出
- 客户端改为在浏览器内直接调用 `src/lib/server/handlers.ts`（与 API 路由同一套 mock，保留延迟和演示场景），见 `src/lib/api.ts`

`npm run dev`、`npm run build` 不受影响，仍走 `/api/v2/sessions/...`。

技术栈：Next.js 16（App Router）· React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui（Base UI）· zustand（本机持久化）。

## 页面

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 妆容工作台 | 上传参考妆 + 自拍（或用示例照片），4 步识别：妆面解析 → 脸型分析 → 适配 → 生成步骤 |
| `/plan` | 专属方案 | 参考妆 vs 你的版本：适配后的涂抹区域、逐部位开关、每处「为你调整」的原因 |
| `/follow` | 跟妆（二级页，重做） | 部位进度条 + 镜面（摄像头/演示画面、涂抹示意、局部放大、字幕）+ 步骤指导 / 帮我看看 / AI 对话 + 底部语音坞 |
| `/complete` | 完成 & 评分 | 拍妆后照 → 上传并打分 → 妆前妆后对比 + 5 维参考分 → 保存到我的妆容 |
| `/score` | 直接打分 | 不跟妆，直接拍妆后照打分（妆前照可选） |
| `/history` | 历史妆容 | 按天分组的跟妆记录，未完成可继续，检查照片可回看评价 |
| `/looks` | 我的妆容 | 收藏的妆容（一键再跟一次）、直接打分入口、脸型档案、手边工具 |

## 演示设置

右上角头像菜单 →「演示设置 · 模拟场景」可以切换异常路径，方便评审：

| 场景 | 效果 |
| --- | --- |
| 正常流程 | 所有接口正常返回 |
| 云端识别超时 | 妆面解析 504 → 自动降级为本机识别，界面提示「结果仅供参考」并可重试 |
| 自拍不合格 | 自拍质检提示光线 / 美颜问题，需「重新上传」或「仍然使用」 |
| 摄像头被拒绝 | 跟妆页展示权限引导，继续用演示画面 |
| 检查接口超时 | 「帮我看看」降级为本机基础检查 |

同一菜单里还有「恢复演示数据」（重置为 3 条示例历史 + 3 个收藏）和「清空本机数据」（查看各页空状态）。

## Mock 与真实 API 的接入点

前端只依赖 `src/lib/types.ts` 中的数据结构，替换实现时页面无需改动。

| 能力 | 当前实现 | 接入真实服务 |
| --- | --- | --- |
| 接口层 | `src/app/api/v2/sessions/[id]/[action]/route.ts` 分发到 `src/lib/server/handlers.ts`（mock，带延迟与场景注入） | 把各 handler 换成对 beauty-mvp/server 或阿里云百炼 DashScope 的调用；接口路径与 code-plan §4 一致：`makeup-analysis` / `face-analysis` / `adapt` / `steps` / `vision` / `dialogue` / `score` |
| 前端降级 | `src/lib/api.ts`：每个请求超时或失败都会回落到 `src/lib/engine.ts` 的本机规则，并打上 `fallback` 标记 | 保留，作为线上降级策略 |
| 妆面解析 F1 | 示例图按预设识别；自定义图按画面主色相推断风格 | qwen-vl 多模态 |
| 脸型分析 F2 | `analyzeFaceLocal`（模拟 wasm 推理耗时，自拍不出本机） | face-parsing.wasm + beauty_vision.wasm |
| 适配 F3 | `src/lib/looks.ts` 的脸型调整表 + `src/lib/face-geometry.ts` 的区域几何 | 仿射 + TPS 形变（code-plan M3） |
| 帮我看看 F5 | 本机先做亮度 / 清晰度质检（`src/lib/local/image.ts`，真实计算），再调 `vision` | v1.0 vision 接口 |
| 对话 F4 | 关键词规则回复 | v1.0 dialogue；语音通话走 realtime.mjs |
| 语音讲解 | `src/hooks/use-voice.ts`：浏览器 `speechSynthesis` 中文音色，无音色时按字数模拟时长 | realtime.mjs TTS |
| 语音指令 | Chrome 下用 Web Speech API（zh-CN）；不支持时切到「模拟收音」，点底部快捷语句触发同一流程。播报期间忽略识别结果，避免自触发 | realtime.mjs ASR |
| 摄像头 | `src/hooks/use-camera.ts`，`getUserMedia`；拒绝或无设备时用演示画面 | — |
| 镜面叠加 | 演示画面按已完成部位逐步显露妆后效果，涂抹示意基于静态关键点 | MediaPipe Face Mesh 实时追踪 |
| 妆后打分 F6 | 按完成度和检查结果生成 5 维分数 | 多模态打分模型 |

## 隐私与数据

- 自拍质检、脸型分析在浏览器本机完成；镜面画面始终只在本机显示。
- 「帮我看看」和打分会先说明要上传哪张照片，用户确认后才上传；可勾选「本次跟妆不再询问」。
- 跟妆进度、检查记录、收藏都存在浏览器 localStorage（键名 `suixingmei-demo-v1`），不经过服务器。

## 目录

```
src/
  app/                     路由页面与 mock API
  components/
    home/ plan/ follow/    工作台、方案页、跟妆页
    complete/ score/       完成评分、直接打分
    history/ looks/        历史妆容、我的妆容
    common/ shell/ ui/     通用组件、页面框架、shadcn/ui 基础组件
  hooks/                   摄像头、语音、识别流程
  lib/                     类型、妆容数据、几何、引擎、接口客户端、本机图像处理、状态
public/images/             示例参考妆与自拍（AI 生成）
```
