# Kikoeru前端

Kikoeru 的 Web 前端，基于 Vue 3 + Quasar v2，构建产物为 SPA / PWA，由 [kikoeru-express](https://github.com/kikoeru-project/kikoeru-express) 提供 API 与静态托管。

## 功能介绍

- 音声列表：按音声 / 进度 / 社团 / 标签 / 声优浏览，支持关键字检索与排序
- 作品详情以叠层形式在列表页展开，不再跳转独立页面
- 列表页可直接收藏，收藏项置顶展示
- 播放器：进度条拖动、播放列表、内嵌歌词条，并支持 MediaSession（锁屏 / 通知栏播放信息）
- 隐私模式：一键给 R18 作品的封面打码
- 移动端 PWA，可直接添加到主屏

## 环境要求

- Node.js >= 22、npm >= 10（见 `package.json` 的 `engines`）

## 项目目录结构

```
├── public/                  # 静态资源与 PWA 图标
├── src/
│   ├── boot/                # 启动文件（axios / socket.io / player）
│   ├── components/          # 组件（播放器、封面、列表项等）
│   ├── css/                 # 全局样式与 Quasar 变量
│   ├── layouts/             # MainLayout / DashboardLayout
│   ├── mixins/              # 混入（通知等）
│   ├── pages/               # 页面（音声 / 列表 / 收藏 / 控制台）
│   ├── router/              # 路由
│   ├── services/            # AudioEngine（播放引擎）
│   └── store/               # Vuex 模块
├── src-pwa/                 # PWA 相关配置
├── docs/nginx/              # nginx 反向代理示例配置
├── quasar.config.js         # Quasar 构建配置
├── Dockerfile               # 单独部署（Nginx 提供静态资源）时使用
├── package.json             # npm 脚本和依赖项
└── .eslintrc.json           # ESLint
```

## 技术栈

- vue 3 (视图层)
- quasar v2 (UI 框架与构建工具链)
- vuex 4 / vue-router 4 (状态与路由)
- axios (网络请求)
- socket.io-client (接收后端扫描进度)
- lrc-file-parser (解析播放LRC歌词文件)

## 源码安装

### 前端启动
```bash
# 安装依赖
npm install
# 启动开发服务器
quasar dev
# 或者
npm run dev
```

### 构建
```bash
npm run build
# 等价于 quasar build && quasar build -m pwa
```

### 后端
前端需要有一个运行中的 kikoeru-express 提供 `/api`，安装与配置见 [kikoeru-express](https://github.com/kikoeru-project/kikoeru-express)。

### Docker安装
将kikoeru-quasar源码文件夹复制到kikoeru-express文件夹内，目录结构如下：

```bash
kikoeru-express
├── ...
├── kikoeru-quasar
└── ...
```

手动编译构建镜像
```bash
docker build -t links/kikoeru-dev .
```

调整`docker-compose.yml`内的挂载位置，启动服务
```bash
docker compose up -d
```

> 本仓库自带的 `Dockerfile` 用于单独部署前端：构建 SPA / PWA 后交给 Nginx，由 Nginx 反向代理 `/api` 到后端，配置示例见 `docs/nginx`。

## 其他

### TODO
- [x] 兼容iOS端设备展示播放信息
- [x] 兼容 iOS 端设备播放拖动功能
- [x] 前端页面优化，减少接口重复调用
- [x] 播放器重构：修复拖动进度条抖动问题，拆分播放状态变量，重构播放器按钮与播放列表展示方式
- [x] 新增作品详情叠层：作品详情改为在作品列表页以叠层展示，移除独立作品页面
- [x] 导航栏移至顶部，重构整体框架布局
- [x] 作品详情面板改用右侧贴边把手收起，导航按钮悬浮提示改为 aria-label
- [x] 列表页新增收藏功能：收藏项置顶，请求失败时回滚本地状态
- [x] 项目迁移到 Vue 3 + Quasar v2，前端工程整理
- [x] 重构搜索框
- [x] 新增隐私模式（NSFW）：`body.nsfw-mode` + `.cover-mask` 统一给 R18 封面打码，RJ 号与发售日不受影响
- [x] 重构悬浮歌词栏，改为嵌入播放器
- [x] 重构封面展示：改用后端新的 `sam` 缩略图，修复封面链接重复与封面 / 标题上多余的跳转链接

### 感谢
本项目为开源项目 [kikoeru](https://github.com/nortonandrews/kikoeru) 的前端部分。

### 声明
本项目作为开源软件，本身不包含任何版权内容或其它违反法律的内容。项目中的程序是为了个人用户管理自己所有的合法数据资料而设计的。  
程序作者并不能防止内容提供商（如各类网站）或其它用户使用本程序提供侵权或其它非法内容。程序作者与使用本程序的各类内容提供商并无联系，不为其提供技术支持，也不为其不当使用承担法律责任。

### 许可协议
GNU General Public License v3.0
