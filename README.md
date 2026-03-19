<h1 align="center">AI Mind Map - 智能思维导图</h1>

<p align="center">
  <strong>基于 <a href="https://github.com/wanglin2/mind-map">Simple Mind Map</a> 开源项目深度增强的 AI 驱动思维导图工具</strong>
</p>

<p align="center">
  <a href="https://github.com/wanglin2/mind-map">
    <img src="https://img.shields.io/badge/基于-Simple%20Mind%20Map-blue" alt="Based On">
  </a>
  <img src="https://img.shields.io/badge/AI%20增强-智能画图-green" alt="AI Drawing">
  <img src="https://img.shields.io/badge/AI%20对话-智能助手-purple" alt="AI Chat">
  <img src="https://img.shields.io/badge/模型支持-在线%2F本地-orange" alt="Model Support">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="License">
</p>

---

## 🎯 项目简介

本项目是基于优秀的开源项目 [Simple Mind Map](https://github.com/wanglin2/mind-map) 进行深度增强开发的智能思维导图工具。在继承原项目强大功能的基础上，我们重点强化了 **AI 能力**，让思维导图创作更加智能化、高效化。

### 🚀 核心增强特性

#### 1. AI 智能画图
- **一键生成思维导图**：输入主题或关键词，AI 自动生成完整思维导图结构
- **智能内容扩展**：基于现有节点，AI 自动补充相关子主题和内容
- **文档智能解析**：上传 PDF、Markdown、TXT 等文档，AI 自动提取关键信息并生成思维导图
- **多轮优化**：支持对生成的思维导图进行多轮对话式优化调整

#### 2. AI 智能对话
- **节点级对话**：选中任意节点，与 AI 进行针对性讨论和头脑风暴
- **全局对话**：就整个思维导图内容与 AI 进行深度交流
- **上下文感知**：AI 能够理解思维导图的层级结构和逻辑关系
- **智能建议**：根据当前内容自动提供优化建议和扩展思路

#### 3. 丰富的 AI 模型支持

**在线模型**
- OpenAI GPT 系列（GPT-4、GPT-4o、GPT-3.5-turbo 等）
- Anthropic Claude 系列（Claude 3.5 Sonnet、Claude 3 Opus 等）
- Google Gemini 系列
- 阿里云通义千问
- 百度文心一言
- 智谱 AI（GLM-4、GLM-3-turbo 等）
- 讯飞星火
- Moonshot AI（Kimi）
- DeepSeek
- 零一万物
- 更多在线模型持续接入中...

**本地模型**
- Ollama 本地部署支持
- LM Studio 兼容
- LocalAI 接口支持
- 支持任意兼容 OpenAI API 格式的本地大模型
- 私有化部署，数据安全可控

#### 4. 灵活的模型配置
- **多模型管理**：同时配置多个 AI 模型，按需切换
- **自定义参数**：支持调整 temperature、max_tokens 等参数
- **API 代理**：支持自定义 API 代理地址
- **密钥管理**：安全的 API Key 存储和管理机制

---

## 📦 项目结构

```
mind-map/
├── simple-mind-map/    # 核心思维导图库（基于原版增强）
├── web/                # Vue2 前端应用（AI 功能主要在此）
└── mind-server/        # Python FastAPI 后端（AI 服务层）
```

---

## 🛠️ 快速开始

### 环境要求
- Node.js >= 16
- Python >= 3.9
- npm 或 yarn

### 安装步骤

#### 1. 安装前端依赖

```bash
cd mind-map/web
npm install
```

#### 2. 安装后端依赖

```bash
cd mind-server
pip install -r requirements.txt
```

#### 3. 配置 AI 模型

在 `mind-map/web/src/config/ai.js` 中配置你的 AI 模型 API 密钥：

```javascript
export default {
  // OpenAI 配置
  openai: {
    apiKey: 'your-openai-api-key',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4'
  },
  // 本地模型配置（Ollama）
  ollama: {
    baseURL: 'http://localhost:11434',
    model: 'llama2'
  }
  // ... 其他模型配置
}
```

#### 4. 启动服务

**启动后端服务：**
```bash
cd mind-server
python main.py
# 或
uvicorn main:app --reload --host 0.0.0.0 --port 9999
```

**启动前端开发服务器：**
```bash
cd mind-map/web
npm run serve
```

访问 http://localhost:8080 即可使用。

---

## 🎨 功能特性

### 继承自 Simple Mind Map 的基础功能

- [x] 插件化架构，按需加载，体积小巧
- [x] 支持多种结构：逻辑结构图、思维导图、组织结构图、目录组织图、时间轴、鱼骨图
- [x] 内置多种主题，支持高度自定义样式
- [x] 节点支持文本（普通/富文本）、图片、图标、超链接、备注、标签、概要、数学公式
- [x] 节点拖拽、多种形状、扩展内容、自定义渲染
- [x] 画布拖动、缩放
- [x] 鼠标多选、Ctrl+左键选择
- [x] 导出：JSON、PNG、SVG、PDF、Markdown、XMind、TXT
- [x] 导入：JSON、XMind、Markdown
- [x] 快捷键、前进后退、关联线、搜索替换、小地图、水印、滚动条
- [x] 手绘风格、彩虹线条、标记、外框
- [x] 协同编辑、演示模式

### 本项目新增 AI 特性

- [x] AI 一键生成思维导图
- [x] AI 智能扩展节点内容
- [x] PDF/文档智能解析生成导图
- [x] 节点级 AI 对话
- [x] 全局 AI 对话助手
- [x] 支持 15+ 在线大模型
- [x] 支持本地模型部署（Ollama、LM Studio 等）
- [x] 多模型配置管理
- [x] 自定义 AI 参数调整
- [x] 对话历史记录

---

## 💡 使用指南

### AI 画图

1. 点击工具栏「AI 画图」按钮
2. 输入主题描述（如："人工智能发展历程"）
3. 选择 AI 模型
4. 点击生成，等待 AI 创建思维导图

### AI 对话

1. 选中思维导图中任意节点
2. 点击「AI 对话」按钮或右键选择「与 AI 讨论」
3. 在对话框中输入问题或指令
4. AI 会基于选中节点内容进行回复和建议

### 文档解析

1. 点击「导入」→「AI 解析文档」
2. 上传 PDF、Markdown 或 TXT 文件
3. AI 自动分析文档内容并生成思维导图
4. 支持对生成的导图进行进一步优化

---

## 🔧 技术栈

### 前端
- **框架**: Vue 2.x
- **UI 组件**: Element UI
- **核心库**: Simple Mind Map（增强版）
- **状态管理**: Vuex
- **HTTP 客户端**: Axios

### 后端
- **框架**: FastAPI (Python)
- **AI 接口**: 兼容 OpenAI API 格式
- **文档解析**: PyPDF2、python-docx 等
- **异步支持**: asyncio、aiohttp

---

## 🤝 致谢

本项目基于 [Simple Mind Map](https://github.com/wanglin2/mind-map) 开源项目进行开发，衷心感谢原作者 [@wanglin2](https://github.com/wanglin2) 及所有贡献者的杰出工作！

原项目功能强大、架构清晰、文档完善，为我们在此基础上进行 AI 增强开发提供了坚实的基础。

### 主要增强点对比

| 功能 | Simple Mind Map | 本项目 (AI Mind Map) |
|------|----------------|---------------------|
| 基础画图 | ✅ | ✅ 继承全部功能 |
| 导入导出 | ✅ | ✅ 继承全部功能 |
| 协同编辑 | ✅ | ✅ 继承全部功能 |
| AI 画图 | ❌ | ✅ 核心增强 |
| AI 对话 | ❌ | ✅ 核心增强 |
| 在线模型支持 | ❌ | ✅ 15+ 模型 |
| 本地模型支持 | ❌ | ✅ Ollama等 |
| 文档智能解析 | ❌ | ✅ PDF/Markdown |

---

## 📄 开源协议

本项目遵循 [MIT](./LICENSE) 开源协议。

原项目 Simple Mind Map 同样采用 MIT 协议，允许在保留版权声明的前提下自由使用和修改。

---

## 🌟 参与贡献

欢迎提交 Issue 和 Pull Request！

### 贡献方向
- 接入更多 AI 模型
- 优化 AI 提示词
- 提升文档解析准确率
- UI/UX 改进
- Bug 修复

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 GitHub Issue

---

<p align="center">
  <strong>如果觉得本项目对你有帮助，欢迎点个 Star ⭐ 支持一下！</strong>
</p>
