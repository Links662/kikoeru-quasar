# kikoeru-quasar Agent Guide

## 适用范围

本文件约束 `kikoeru-quasar` 仓库。开始修改前先阅读工作区根目录的 `AGENTS.md`；本文件补充前端实现细节。

## 项目定位

- Node.js >= 22、npm >= 10。
- Vue 3 + Quasar v2（Webpack）+ Vuex 4 + Vue Router 4。
- 构建 SPA 和 PWA，生产环境通常由后端 `dist/` 或 Nginx 同源提供。
- 后端固定为 `kikoeru-express`，开发服务器通过代理访问其 `/api` 和 Socket.IO。

## 常用命令

```powershell
npm ci
npm run dev
npm test
npm run build
```

- `npm run dev`：Quasar 开发服务器，默认 `8080`，自动打开浏览器。
- `npm test`：仅运行 ESLint，没有单元测试框架。
- `npm run build`：执行 `quasar build && quasar build -m pwa`，生成 SPA 和 PWA。
- 开发时需要后端运行在 `http://localhost:8888`。

代理配置在 `quasar.config.js`：

- `/api` -> `http://localhost:8888`
- `/socket.io` -> `http://localhost:8888`（WebSocket）
- `/workbox` -> `http://localhost:8888`

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `src/boot/` | Axios、播放器、Socket.IO 全局初始化 |
| `src/services/AudioEngine.js` | 单例播放引擎、媒体事件、歌词、历史、MediaSession |
| `src/services/session.js` | 统一退登和会话失效处理 |
| `src/services/userWorkRecord.js` | 用户评分/进度/短评的共享响应式缓存与 API |
| `src/store/module-AudioPlayer/` | 播放器状态和 mutation |
| `src/store/module-User/` | 当前用户和是否启用认证 |
| `src/store/module-WorkPanel/` | 作品详情面板开关和宽度 |
| `src/layouts/` | 主站布局和管理员控制台布局 |
| `src/pages/` | 路由页面 |
| `src/components/` | 列表、卡片、详情、播放器 UI |
| `src/router/` | 路由表和全局守卫 |
| `src-pwa/` | PWA Service Worker |

## 启动与全局对象

- `quasar.config.js` 的 boot 顺序是 `axios`、`player`、`socket.io`。新增全局能力时优先放入 boot，并在配置中登记。
- `boot/axios.js` 设置全局 JSON 头和 JWT。切换会话必须调用 `setAxiosHeaders(token)`；无 token 时删除 Authorization 头，不要留下 `Bearer ` 空值。
- `boot/player.js` 在应用启动时创建唯一 `AudioEngine`，页面组件不负责创建或销毁它。
- `boot/socket.io.js` 导出单例 Socket：
  - 生产环境连接 `window.location.origin`，开发环境连接 `localhost:8888`；
  - `autoConnect: false`；
  - transport 顺序必须是 `polling` 再 `websocket`，以便 WebSocket 被拦截时继续轮询；
  - 组件通过 `sockets: { EVENT (payload) {} }` 声明监听，boot 中的全局 mixin 自动绑定和清理。

## 状态与数据流

| 模块 | 主要内容 |
| --- | --- |
| `User` | `auth`、`name`、`group` |
| `AudioPlayer` | 队列、当前曲目/作品、播放意图、进度、歌词、睡眠定时器 |
| `WorkPanel` | 当前详情作品 ID、面板宽度 |

- 开发环境 Vuex 开启 strict mode；只能通过 mutation 修改状态。
- `AudioPlayer.playing` 表示用户“想不想播放”，`elementPlaying` 表示媒体元素“实际是否在出声”。不要用 `elementPlaying` 反向驱动播放逻辑。
- 整个队列属于同一作品：作品名、社团和 R18 信息放在 `queueWork`；每条 track 只保存自己的 `hash`、标题和媒体 URL。
- 播放器数据流是单向的：
  - UI commit mutation -> store；
  - `AudioEngine` watch store -> 操作 `<audio>`；
  - 媒体事件 -> `AudioEngine` -> commit mutation -> UI。
- 切换路由、进入管理员页面或卸载播放器 UI 都不能停止播放。只有退登、token 失效、账户被禁用/删除等认证边界调用 `AudioEngine.stop()`。
- `services/userWorkRecord.js` 用共享响应式对象缓存同一作品的评分、进度和短评。详情面板、卡片和进度页应复用这组函数，不要各自维护副本。

## 路由与页面

- 主站路由：`/works`、`/circles`、`/tags`、`/vas`、`/progress`、`/login`。
- 管理路由：`/admin`、`/admin/scanner`、`/admin/advanced`、`/admin/usermanage`。
- 作品详情不是独立页面。访问 `/work/:id` 时，路由守卫打开 `WorkPanel`：
  - 应用内跳转取消原导航，只打开左侧/移动端面板；
  - 直接访问或刷新则回到 `/works` 并打开面板。
- 不要新增 `Work.vue` 独立详情页；继续使用 `WorkPanel` 和 `WorkPanel` 状态模块。
- `Works.vue` 被 `keep-alive` 缓存，拥有全局键盘和触摸监听器，必须在 `beforeUnmount()` 中对称清理。
- `Works.vue` 和 `Favourites.vue` 使用递增 `requestId` 丢弃过期响应；新增请求链路时保留竞态保护。
- `List.vue` 管理社团、标签、声优列表；这里的收藏操作针对社团/标签/声优，不是作品收藏。
- `Favourites.vue` 实际是“进度/评分”页面，通过 `/api/review` 查询，不要按文件名误认为标签收藏页。

## API 约定

- 所有 HTTP 请求使用全局 Axios；默认同源，开发环境由代理转发。
- 登录：`POST /api/auth/me` 返回 `{ token }`；当前用户：`GET /api/auth/me` 返回 `{ user, auth }`。
- 作品列表响应：`{ works, pagination }`。
- 作品元数据字段包括：
  - `id`、`title`、`release`；
  - `circle: { id, name }`；
  - `tags: [{ id, name }]`、`vas: [{ id, name }]`；
  - `nsfw`、`subtitle` 布尔值；
  - `rate_count_detail` 数组；`rank` 为对象或 `null`。
- 作品筛选：
  - “全年齢”勾选时发送 `nsfw=false`；
  - “有字幕”勾选时发送 `subtitle=true`。
- 媒体封面、音频和下载链接会在 URL 查询参数中携带 `?token=`，因为浏览器媒体元素无法附加 Axios 头。
- 封面类型：`main`、`sam`、`240x240`。列表和播放器优先用 `sam`，进度页用 `240x240`；缺失回退由后端处理。
- RJ 号统一使用 `src/utils/rjCode.js` 的 `formatRJLabel()`，不要在各组件手写补零逻辑。

## 认证与会话

- JWT 保存在 LocalStorage 的 `jwt-token`。
- 登录成功后同时写入 token、调用 `setAxiosHeaders()`，再跳转主页。
- 主动退登、修改自己的密码、账户被禁用/删除、任意请求返回 401，都必须走 `services/session.js` 的 `endSession(vm)`：
  - 停止播放；
  - 清空 token 和 Axios 头；
  - 关闭 Socket；
  - 跳转 `/login`。
- `endSession()` 返回调用前是否仍处于登录状态，用于避免 Socket 断开与 HTTP 401 同时到达时重复提示。
- 管理后台 Socket 在 `DashboardLayout.created()` 中把 token 写入 handshake query 后连接。`connect_error` 或服务端主动断开 `io server disconnect` 时按现有逻辑退回登录。
- 路由里的 `meta.auth` 目前没有全局认证守卫强制生效；不要假设未登录用户一定无法进入页面，实际边界是 API 401 和 Socket 鉴权错误。

## 播放器规则

- `AudioEngine` 是单例，`<audio>` 元素挂到 `document.body`，不随组件卸载。
- 切源流程依赖 `desiredSource` 与 `readySource`：新源未 `canplay` 前不要直接 `play()`。
- `play()` 的 Promise 可能因换源或 seek 被拒绝；沿用 `playSafely()`，不要恢复成未处理的 `media.play()`。
- 暂停事件可能来自换源、seek、缓冲、线控或用户操作。判断是否为用户暂停时必须保留现有 `stopping`、source readiness、`seeking` 和延迟确认逻辑。
- 进度条拖动期间只改组件本地 `seekValue`，松手后才 commit `SET_SEEKTIME`。
- 歌词只认可后端 `check-lrc` 找到的 `.lrc`。`lyricAvailable`、`lyricLoading`、`lyricsWanted` 三者含义不同，修改 UI 前先阅读 `AudioPlayer` 状态注释。
- 播放历史每 30 秒及暂停/切歌时写入；`hash` 的 `${workId}/${index}` 是历史定位依据。
- MediaSession 锁屏封面受 NSFW 模式影响；R18 作品在 NSFW 模式下不提供锁屏 artwork。
- 当前目录的音频会组成播放队列；点击某个音频播放的是同目录下的音频列表，而不是整个作品的所有音频。

## UI 与响应式约定

- 使用 Quasar 组件和 `src/css/quasar.variables.scss` 中的主题变量。
- 通知统一通过 `mixins/Notification.js` 的 `showSuccNotif`、`showWarnNotif`、`showErrNotif`。
- 手写组件优先沿用现有 Vue Options API 风格；服务层可以使用 Composition API 的 `reactive`。
- NSFW 打码由全局 CSS `body.nsfw-mode .cover-mask` 控制：
  - R18 封面节点按条件添加 `cover-mask`；
  - 最近播放列表是特殊例外，开启 NSFW 模式时统一打码；
  - 普通文字、RJ 号和发售日不应被模糊。
- 移动端详情面板覆盖内容区，桌面端使用左侧抽屉；两者状态都来自 `WorkPanel`。
- 移动端详情面板和展开播放器会互相遮挡，保持现有“后打开者优先、另一方收起”的行为。
- 顶部导航会在空间不足时把项目收进“更多”菜单；修改导航项时检查 `measureNav()` 的宽度计算。

## 本地持久化键

- LocalStorage：`jwt-token`、`nsfwMode`、`sortOption`、`workFilters`、`sortByFavourites`、`listMode`、`detailMode`、`showLabel`。
- SessionStorage：`sleepTime`、`sleepMode`。
- 修改键名时必须考虑旧用户本地状态；读取失败或非法 JSON 应回退默认值。

## 编码约定

- ES modules、2 空格缩进，无 TypeScript。
- 使用 `jsconfig.json` 别名：`src/*`、`components/*`、`layouts/*`、`pages/*`、`assets/*`、`boot/*`。
- 组件设置稳定的 `name`，尤其是依赖 `keep-alive include="Works"` 的页面。
- 新增 Quasar 插件、boot 文件或全局 CSS 时同步修改 `quasar.config.js`。
- 事件监听器、计时器、Socket 监听和工作区全局监听必须在卸载时清理。
- 对外请求失败时沿用现有做法：401 交给会话边界，其他错误通过通知展示；不要吞掉用户可见错误。
- 尽量不要使用硬编码style，能用quasar类就尽量使用，以简化样式代码

## 验证清单

- 修改前端代码后运行 `npm test`。
- 涉及构建配置、路由、PWA、Nginx 或依赖时运行 `npm run build`，确认 SPA 和 PWA 都能生成。
- 临时启动 `kikoeru-express`，至少手动验证：登录、作品列表、详情面板、播放/暂停/seek、歌词、历史、管理后台扫描状态。
- 涉及认证变更时验证：401 退登、主动退登、修改自己密码、账户禁用后的 Socket 断开。
- 涉及移动端 UI 时检查窄屏、触摸、软键盘和播放器/详情面板互斥。
- 仓库没有前端单元测试；不要声称仅靠 `npm test` 验证了业务行为。

## 易踩坑

- 不要改回 Socket 默认仅尝试 WebSocket；当前顺序是为了代理环境下的轮询兜底。
- 不要用 `elementPlaying` 直接写入 `playing`；否则缓冲、seek、换源会被误判为用户暂停。
- 不要在路由切换或播放器组件卸载时调用 `stop()`。
- 退出登录必须清 Axios 头和 Socket，不能只删除 LocalStorage。
- 媒体和封面 URL 必须带 token 查询参数。
- `WorkPanel` 加载元数据和曲目树是两次请求；切换作品后要检查 `workid` 是否仍匹配，避免旧响应覆盖新作品。
- `Works.vue` 被 keep-alive 缓存，`mounted` 不等于每次进入页面；需要每次进入执行的逻辑放在 `activated()`。
- 不要直接编辑 `node_modules/`、`dist/` 或 `.quasar/`。
