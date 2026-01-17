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

