# lx-fo

> 本项目基于多个优秀的开源项目进行重构和优化，旨在提供一个更稳定、功能更完善的小智语音助手 Web 端体验。

## 简介

`lx-fo` 是一个基于 **Vue3 + Python FastAPI** 构建的 AI 语音助手 Web 应用。

**项目起源与参考：**
- 起源于 [虾哥](https://github.com/78) 的 [xiaozhi-esp32](https://github.com/78/xiaozhi-esp32) 项目
- 基于 [TOM88812](https://github.com/TOM88812) 的 [xiaozhi-web-client](https://github.com/TOM88812/xiaozhi-web-client) 进行重构
- 参考了 [Yang-ZhiHang](https://github.com/Yang-ZhiHang) 的 [xiaozhi-webui](https://github.com/Yang-ZhiHang/xiaozhi-webui) 项目

本项目让用户可以在没有硬件条件的情况下体验 AI 小智的对话功能。

## 功能特性

- ✅ **文字聊天**：支持文本消息交互，像聊天软件一样与小智对话
- ✅ **语音聊天**：支持实时语音对话，支持语音打断功能
- ✅ **自动配置**：自动获取设备 MAC 地址、更新 OTA 版本
- ✅ **反馈动效**：语音对话时显示波形动画和头像缩放效果
- ✅ **移动适配**：支持移动端访问和服务器地址配置

## 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue | 3.5.x |
| 语言 | TypeScript | 5.8.x |
| 状态管理 | Pinia | 3.0.x |
| 构建工具 | Vite | 6.2.x |
| UI 组件 | Element Plus | 2.9.x |
| 后端框架 | FastAPI | 0.104.x |
| Python | Python | 3.12+ |

## 快速开始

### 环境要求

- Python 3.12+
- Node.js 18+
- pnpm（推荐）或 npm
- uv（Python 包管理器）

### 安装与运行

```bash
# 克隆项目
git clone <repository-url>
cd lx-fo

# 安装前端依赖
pnpm install

# 安装后端依赖
cd backend
uv sync
cd ..

# 启动开发服务器（同时启动前后端）
pnpm dev
```

### 启动命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时启动前端和后端（开发模式） |
| `pnpm dev:frontend` | 仅启动前端 |
| `pnpm dev:backend` | 仅启动后端 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产构建 |

### 访问地址

- 前端页面：`http://localhost:5173`
- 后端 API：`http://localhost:8081`

## 项目结构

```
lx-fo/
├── backend/                    # Python 后端服务
│   ├── app/                   # 应用核心代码
│   │   ├── proxy/             # WebSocket 代理模块
│   │   ├── router/            # API 路由定义
│   │   ├── utils/             # 工具函数
│   │   ├── constant/          # 常量定义
│   │   ├── config.py          # 配置管理器
│   │   └── constants.py       # 路径常量
│   ├── config/                # 配置文件目录
│   ├── main.py                # 应用入口
│   └── .venv/                 # Python 虚拟环境
├── src/                       # Vue 前端源码
│   ├── components/            # Vue 组件
│   ├── services/              # 业务服务模块
│   ├── stores/                # Pinia 状态管理
│   ├── types/                 # TypeScript 类型定义
│   ├── lib/                   # 工具函数
│   ├── assets/                # 静态资源
│   ├── App.vue                # 根组件
│   └── main.ts                # 入口文件
├── public/                    # 静态资源目录
├── package.json               # 前端配置
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 配置
└── README.md                  # 项目说明
```

## 配置说明

后端配置文件位于 `backend/config/config.json`：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `WS_URL` | 小智服务器 WebSocket 地址 | `wss://api.tenclass.net/xiaozhi/v1/` |
| `WS_PROXY_URL` | 本地 WebSocket 代理地址 | `ws://0.0.0.0:5000` |
| `OTA_VERSION_URL` | OTA 版本更新地址 | `https://api.tenclass.net/xiaozhi/ota/` |
| `TOKEN_ENABLE` | 是否启用 token 验证 | `true` |
| `TOKEN` | 访问令牌 | `test_token` |
| `BACKEND_URL` | 后端服务地址 | `http://0.0.0.0:8081` |
| `CLIENT_ID` | 客户端唯一标识 | 自动生成 |
| `DEVICE_ID` | 设备 MAC 地址 | 自动获取 |

## 核心逻辑

项目采用状态驱动设计模式管理语音通话状态：

```
状态切换流程：
oldState.onExit → current_state = newState → newState.onEnter

用户说话流程：
getUserMediaStream → detect audio level → handleUserAudioLevel() (循环)

AI 说话流程：
audioQueue.empty() ? → [yes] state = idle → [no] audio = audioQueue.pop() → play audio → done
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 代码规范

- Python 代码遵循 PEP8 规范
- Vue/TypeScript 代码遵循单一职责原则
- 提交前请确保所有测试通过

## 致谢

感谢以下开源项目和贡献者：

- [虾哥](https://github.com/78) - 小智项目创始人
- [TOM88812](https://github.com/TOM88812) - xiaozhi-web-client 原作者
- [小红书 @涂丫丫](http://xhslink.com/a/ZWjAcoOzvzq9) - 小智头像提供者

## 许可证

MIT License

---

**注意**：本项目仅供学习交流使用。如有问题，请联系开发者。