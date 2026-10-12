# Kikoeru前端


### 源码安装
#### 后端安装
```bash
# 安装依赖
npm install
# 启动服务器
npm start
# Express listening on http://[::]:8888
```

#### 前端启动
```bash
quasar dev
# 或者
npm run dev
```

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

## 其他
### TODO
- [x] 兼容iOS端设备展示播放信息
- [ ] 重构播放状态，兼容iOS端设备播放拖动功能
- [x] 前端页面优化，减少接口重复调用
- [x] 播放器重构：修复拖动进度条抖动问题，拆分播放状态变量，重构播放器按钮与播放列表展示方式
- [x] 新增作品详情叠层：作品详情改为在作品列表页以叠层展示，移除独立作品页面
- [x] 导航栏移至顶部，重构整体框架布局
- [x] 作品详情面板改用右侧贴边把手收起，导航按钮悬浮提示改为 aria-label
- [x] 列表页新增收藏功能：收藏项置顶，请求失败时回滚本地状态
