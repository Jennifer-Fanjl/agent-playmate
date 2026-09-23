# 陪玩 Agent

面向现场演示的全年龄陪玩 Agent Web 平台。2.0 版本提供语音与文字对话、游戏推荐、结构化玩法知识库、浏览器本地记忆，以及井字棋机械臂启动接口。

线上演示：<https://playmate-agent-lab-0923.tart-bowl-0082.chatgpt.site/>

## 版本 2.0 功能

- 活泼风格的 2D 角色交互界面
- DeepSeek 对话与规则安全层协作
- 阿里云百炼 `qwen3-asr-flash` 浏览器语音识别
- 主界面和输入框双麦克风入口
- 基于用户表达和最近对话的陪玩意图识别
- 多个结构化游戏知识条目
- 游戏规则、材料、适用场景、限制和主持流程展示
- 石头剪刀布对话状态机，支持“我出石头”等自然出招表达
- 井字棋机械臂标准化启动命令
- 机械臂未连接时的模拟响应
- 按昵称保存的浏览器本地记忆
- 只读知识库接口：`GET /api/knowledge/games`

## 当前架构

```text
用户输入
  → 规则意图识别
  → 知识库检索与推荐评分
  → DeepSeek 自然语言理解和回复
  → 推荐与动作安全校验
  → Web 页面 / 机械臂桥接接口
```

核心目录：

- `app/`：页面与 Web API
- `lib/agent/`：意图识别、知识库、推荐与 DeepSeek 协作
- `lib/robot/`：机械臂桥接协议
- `db/`：后续服务端持久化预留

## 本地运行

要求 Node.js 22.13 或更高版本，并使用项目声明的 pnpm 版本。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

在 `.env.local` 中配置：

```text
DEEPSEEK_API_KEY=your_key_here
DASHSCOPE_API_KEY=your_key_here
```

可选的机械臂桥接配置：

```text
ROBOT_BRIDGE_URL=http://127.0.0.1:8787
ROBOT_BRIDGE_TOKEN=replace_if_needed
```

没有配置机械臂桥接地址时，井字棋启动接口会进入模拟模式，方便独立演示 Web 平台。

## 验证

```bash
pnpm exec tsc --noEmit
pnpm build
```

## 当前限制

- 语音识别已接入；语音合成暂未接入。
- 用户记忆保存在浏览器本地，暂不支持跨设备同步。
- 除石头剪刀布外，其他对话小游戏仍需继续完善独立状态机。
- 真实井字棋落子依赖视觉识别、机械臂标定和本机桥接服务。

## 安全说明

- `.env.local` 与其他环境变量文件不会提交到 Git。
- API Key 只应存放在本地环境变量或线上密钥管理中。
- 不要将机械臂控制接口直接暴露到公网。
