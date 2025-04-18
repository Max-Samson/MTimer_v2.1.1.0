# MTimer - 专业的计时器应用

## 项目结构

```
.
├── app.go              # Wails应用主入口
├── main.go             # 应用程序主入口
├── build/              # 构建相关文件
│   ├── bin/           # 编译后的二进制文件
│   ├── darwin/        # macOS相关配置
│   └── windows/       # Windows相关配置
├── frontend/          # 前端代码
│   ├── src/           # 源代码
│   │   ├── assets/    # 静态资源
│   │   ├── components/# Vue组件
│   │   └── App.vue    # 主应用组件
│   └── wailsjs/       # Wails生成的JS绑定
├── internal/          # 内部包
│   ├── controllers/   # 控制器
│   ├── models/        # 数据模型
│   ├── routes/        # 路由定义
│   └── services/      # 业务逻辑
└── go.mod             # Go模块定义
```

## 技术栈

- 前端：Vue 3 + TypeScript + Tailwind CSS
- 后端：Go + Wails
- 构建工具：Vite

## 开发说明

1. 前端开发
   - 所有UI组件位于 `frontend/src/components`
   - 静态资源存放于 `frontend/src/assets`
   - 使用 TypeScript 进行开发

2. 后端开发
   - 业务逻辑位于 `internal` 目录
   - 遵循Go标准项目布局
   - 使用Wails进行前后端通信

3. 构建部署
   - 使用 `wails build` 命令构建应用
   - 构建产物位于 `build/bin` 目录
