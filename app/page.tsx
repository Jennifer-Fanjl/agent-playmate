"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  Clock3,
  Cpu,
  Gamepad2,
  History,
  Keyboard,
  LoaderCircle,
  MessageCircle,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { gameCatalog } from "@/lib/agent/game-catalog";
import type {
  AgentPhase,
  AgentResponse,
  GameRecommendation,
} from "@/lib/agent/types";
import type { RobotCommandResponse } from "@/lib/robot/types";

type AgentState = "idle" | "listening" | "thinking" | "speaking";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: AgentResponse["source"];
};
type StoredSession = {
  messages: ChatMessage[];
  phase: AgentPhase;
  recommendation: GameRecommendation | null;
  gameAccepted: boolean;
  updatedAt: string;
};

const stateCopy: Record<AgentState, { label: string; hint: string }> = {
  idle: { label: "准备好了", hint: "点一下麦克风，和我聊聊吧" },
  listening: { label: "我在听", hint: "说完后再点一次麦克风" },
  thinking: { label: "想一想", hint: "正在理解你的想法" },
  speaking: { label: "回复中", hint: "我有个陪玩建议" },
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "嗨！我已经准备好了。你可以说“有点无聊”，或者直接告诉我想玩什么。",
  },
];

const validPhases: AgentPhase[] = [
  "welcome",
  "chatting",
  "recommending",
  "confirmed",
  "playing",
  "finished",
];

const gameModeCopy = {
  robot: { label: "机械臂演示", icon: Cpu },
  conversation: { label: "可立即互动", icon: MessageCircle },
  planned: { label: "后续扩展", icon: Clock3 },
} as const;

const MAX_RECORDING_MS = 45_000;
const MAX_AUDIO_BYTES = 7_500_000;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("录音格式读取失败"));
    reader.onerror = () => reject(new Error("录音格式读取失败"));
    reader.readAsDataURL(blob);
  });
}

function getMemoryKey(name: string) {
  return `playmate_memory_${name.trim().toLocaleLowerCase()}`;
}

function getMeaningfulMessages(messages: ChatMessage[]) {
  return messages.filter(
    (message) =>
      message.id !== "welcome" && !message.id.startsWith("memory-return"),
  );
}

function getMemorySummary(
  messages: ChatMessage[],
  recommendation: GameRecommendation | null,
) {
  if (recommendation) {
    return `最近我们聊到了${recommendation.name}，你可以继续上次的选择。`;
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  if (lastUserMessage) {
    const excerpt = lastUserMessage.content.trim().slice(0, 28);
    return `你上次提到“${excerpt}${lastUserMessage.content.length > 28 ? "…" : ""}”。`;
  }

  return "我们还在互相了解，聊得越多，我给出的陪玩建议会越贴合。";
}

function getPreferenceTags(
  messages: ChatMessage[],
  recommendation: GameRecommendation | null,
) {
  const tags = new Set<string>(recommendation?.tags ?? []);
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
  const signals: Array<[string, string[]]> = [
    ["轻松", ["轻松", "随便", "放松", "无聊"]],
    ["短时", ["快一点", "几分钟", "短时间"]],
    ["策略", ["策略", "认真", "思考", "挑战"]],
    ["棋类", ["棋", "井字棋", "五子棋"]],
  ];

  signals.forEach(([tag, keywords]) => {
    if (keywords.some((keyword) => userText.includes(keyword))) tags.add(tag);
  });

  return [...tags].slice(0, 4);
}

function formatMemoryTime(value: string) {
  if (!value) return "还没有记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "还没有记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [draftName, setDraftName] = useState("");
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [phase, setPhase] = useState<AgentPhase>("chatting");
  const [recommendation, setRecommendation] = useState<GameRecommendation | null>(null);
  const [gameAccepted, setGameAccepted] = useState(false);
  const [memoryRestored, setMemoryRestored] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [gameLibraryOpen, setGameLibraryOpen] = useState(false);
  const [lastMemoryUpdate, setLastMemoryUpdate] = useState("");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [permissionError, setPermissionError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStartingRobot, setIsStartingRobot] = useState(false);
  const [robotCommand, setRobotCommand] = useState<RobotCommandResponse | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const sessionIdRef = useRef("");
  const memoryReadyRef = useRef(false);
  const skipNextMemorySaveRef = useRef(false);

  useEffect(() => {
    const savedName = window.localStorage.getItem("playmate_nickname");
    const savedSession = window.localStorage.getItem("playmate_session_id");
    const sessionId = savedSession || window.crypto.randomUUID();
    window.localStorage.setItem("playmate_session_id", sessionId);
    sessionIdRef.current = sessionId;
    if (savedName) {
      setDraftName(savedName);
      restoreMemory(savedName);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!nickname || !memoryReadyRef.current) return;
    if (skipNextMemorySaveRef.current) {
      skipNextMemorySaveRef.current = false;
      return;
    }
    if (getMeaningfulMessages(messages).length === 0 && !recommendation) return;

    const updatedAt = new Date().toISOString();

    const storedSession: StoredSession = {
      messages: messages.slice(-20),
      phase,
      recommendation,
      gameAccepted,
      updatedAt,
    };
    window.localStorage.setItem(
      getMemoryKey(nickname),
      JSON.stringify(storedSession),
    );
    setLastMemoryUpdate(updatedAt);
  }, [nickname, messages, phase, recommendation, gameAccepted]);

  function restoreMemory(name: string) {
    let restored = false;

    try {
      const raw = window.localStorage.getItem(getMemoryKey(name));
      if (raw) {
        const saved = JSON.parse(raw) as Partial<StoredSession>;
        const savedMessages = Array.isArray(saved.messages)
          ? saved.messages
              .filter(
                (item): item is ChatMessage =>
                  Boolean(
                    item &&
                      (item.role === "user" || item.role === "assistant") &&
                      typeof item.content === "string" &&
                      item.content.trim(),
                  ),
              )
              .slice(-20)
          : [];

        if (savedMessages.length) {
          const summary = getMemorySummary(
            savedMessages,
            saved.recommendation ?? null,
          );
          setMessages([
            ...savedMessages,
            {
              id: `memory-return-${Date.now()}`,
              role: "assistant" as const,
              content: `欢迎回来，${name}！${summary}`,
            },
          ].slice(-20));
          restored = true;
          skipNextMemorySaveRef.current = true;
        } else {
          setMessages(initialMessages);
        }
        setPhase(
          saved.phase && validPhases.includes(saved.phase)
            ? saved.phase
            : "chatting",
        );
        setRecommendation(saved.recommendation ?? null);
        setGameAccepted(Boolean(saved.gameAccepted));
        setLastMemoryUpdate(saved.updatedAt ?? "");
      } else {
        setMessages(initialMessages);
        setPhase("chatting");
        setRecommendation(null);
        setGameAccepted(false);
        setLastMemoryUpdate("");
      }
    } catch {
      setMessages(initialMessages);
      setPhase("chatting");
      setRecommendation(null);
      setGameAccepted(false);
      setLastMemoryUpdate("");
    }

    memoryReadyRef.current = true;
    setMemoryRestored(restored);
    setNickname(name);
  }

  function enterExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = draftName.trim().slice(0, 16);
    if (!cleanName) return;
    window.localStorage.setItem("playmate_nickname", cleanName);
    restoreMemory(cleanName);
  }

  function appendMessage(
    role: ChatMessage["role"],
    content: string,
    source?: AgentResponse["source"],
  ) {
    setMessages((current) => [
      ...current,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, content, source },
    ]);
  }

  async function dispatchRobotCommand(
    action: Extract<AgentResponse["action"], { type: "start_game" }>,
  ) {
    setIsStartingRobot(true);
    setRobotCommand(null);

    try {
      const response = await fetch("/api/robot/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          command: "start_game",
          payload: action.payload,
        }),
      });
      const data = (await response.json()) as RobotCommandResponse & {
        error?: string;
      };

      if (typeof data.commandId === "string") {
        setRobotCommand(data);
      } else {
        setRobotCommand({
          accepted: false,
          mode: "bridge",
          commandId: "unavailable",
          status: "failed",
          message: data.error || "机械臂接口暂时没有响应。",
        });
      }
    } catch {
      setRobotCommand({
        accepted: false,
        mode: "bridge",
        commandId: "unavailable",
        status: "failed",
        message: "机械臂接口暂时没有响应，游戏会话已保留。",
      });
    } finally {
      setIsStartingRobot(false);
    }
  }

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || isSending) return;

    appendMessage("user", message);
    setTextInput("");
    setIsSending(true);
    setAgentState("thinking");

    try {
      const response = await fetch("/api/agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          nickname,
          message,
          phase,
          activeGameId: recommendation?.id ?? null,
          history: messages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json()) as AgentResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Agent 请求失败");

      setPhase(data.phase);
      setRecommendation(data.recommendation);
      if (data.action.type === "start_game") {
        setGameAccepted(true);
        void dispatchRobotCommand(data.action);
      } else if (data.action.type === "start_conversation_game") {
        setGameAccepted(true);
        setRobotCommand(null);
      } else if (
        data.intent === "reject_recommendation" ||
        data.intent === "end_game"
      ) {
        setGameAccepted(false);
        setRobotCommand(null);
      } else if (data.recommendation?.id !== recommendation?.id) {
        setGameAccepted(false);
        setRobotCommand(null);
      }
      setAgentState("speaking");
      appendMessage("assistant", data.reply, data.source);
      window.setTimeout(() => setAgentState("idle"), 1200);
    } catch (error) {
      appendMessage(
        "assistant",
        error instanceof Error ? error.message : "我刚刚走神了，请再试一次。",
      );
      setAgentState("idle");
    } finally {
      setIsSending(false);
    }
  }

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(textInput);
  }

  async function transcribeAudio(blob: Blob) {
    if (blob.size < 800) {
      setPermissionError("录音太短了，请按下麦克风后说一句完整的话。");
      setAgentState("idle");
      return;
    }
    if (blob.size > MAX_AUDIO_BYTES) {
      setPermissionError("录音内容过长，请控制在 45 秒以内再试。");
      setAgentState("idle");
      return;
    }

    setIsTranscribing(true);
    setPermissionError("");
    try {
      const audio = await blobToDataUrl(blob);
      const response = await fetch("/api/speech/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text?.trim()) {
        throw new Error(data.error || "没有识别出清晰内容，请再说一次。");
      }
      await sendMessage(data.text);
    } catch (error) {
      setPermissionError(
        error instanceof Error ? error.message : "语音识别暂时不可用，请再试一次。",
      );
      setAgentState("idle");
    } finally {
      setIsTranscribing(false);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    setAgentState("thinking");
    recorder.stop();
  }

  async function toggleRecording() {
    setPermissionError("");
    if (agentState === "listening") {
      stopRecording();
      return;
    }
    if (agentState !== "idle" || isSending || isTranscribing) return;

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setPermissionError("当前浏览器不支持录音，请使用最新版 Chrome、Edge 或 Safari。");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setPermissionError("录音没有成功，请检查麦克风后再试。");
        setAgentState("idle");
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        streamRef.current = null;
        audioChunksRef.current = [];
        void transcribeAudio(audioBlob);
      };
      recorder.start(250);
      setAgentState("listening");
      recordingTimeoutRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      setPermissionError("没有获得麦克风权限，请在浏览器设置中允许后再试。当前仍可使用文字测试。 ");
    }
  }

  function resetDemo() {
    if (nickname) {
      window.localStorage.removeItem(getMemoryKey(nickname));
    }
    setMessages(initialMessages);
    setRecommendation(null);
    setGameAccepted(false);
    setRobotCommand(null);
    setIsStartingRobot(false);
    setPhase("chatting");
    setAgentState("idle");
    setMemoryRestored(false);
    setMemoryOpen(false);
    setGameLibraryOpen(false);
    setLastMemoryUpdate("");
  }

  const meaningfulMessages = getMeaningfulMessages(messages);
  const memorySummary = getMemorySummary(messages, recommendation);
  const preferenceTags = getPreferenceTags(messages, recommendation);
  const recommendationMode =
    recommendation?.playMode ??
    (recommendation?.id === "tic_tac_toe" ? "robot" : "planned");

  return (
    <main className="playmate-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Bot size={22} strokeWidth={2.2} />
          </span>
          <div>
            <p className="brand-name">陪玩 Agent</p>
            <p className="brand-caption">SHELL//NODE · 01</p>
          </div>
        </div>
        <div className="topbar-actions">
          <Sheet open={gameLibraryOpen} onOpenChange={setGameLibraryOpen}>
            <SheetTrigger asChild>
              <Button className="memory-trigger library-trigger" variant="ghost">
                <BookOpen size={17} />
                游戏库
                <span className="memory-count">{gameCatalog.length}</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="memory-sheet game-library-sheet">
              <SheetHeader className="memory-sheet-header">
                <p className="memory-kicker">PLAY ARCHIVE</p>
                <SheetTitle>陪玩项目库</SheetTitle>
                <SheetDescription>
                  Agent 会结合你的状态、偏好和最近对话选择项目。
                </SheetDescription>
              </SheetHeader>

              <div className="game-library-list">
                {gameCatalog.map((game) => {
                  const mode = gameModeCopy[game.playMode];
                  const ModeIcon = mode.icon;

                  return (
                    <article className="library-game-card" key={game.id}>
                      <div className="library-game-heading">
                        <div>
                          <span className={`library-mode mode-${game.playMode}`}>
                            <ModeIcon size={14} />
                            {mode.label}
                          </span>
                          <h3>{game.name}</h3>
                        </div>
                        <span className="library-duration">{game.durationMinutes} 分钟</span>
                      </div>
                      <p>{game.summary}</p>
                      <div className="library-tags">
                        {game.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                      <details className="knowledge-entry">
                        <summary>查看玩法知识</summary>
                        <div className="knowledge-entry-body">
                          <dl>
                            <div><dt>目标</dt><dd>{game.objective}</dd></div>
                            <div><dt>参与</dt><dd>{game.players}</dd></div>
                            <div><dt>准备</dt><dd>{game.materials.join("、")}</dd></div>
                            <div><dt>适合</dt><dd>{game.recommendWhen.join("、")}</dd></div>
                          </dl>
                          <div className="knowledge-rules">
                            <strong>核心规则</strong>
                            <ol>
                              {game.rules.map((rule) => <li key={rule}>{rule}</li>)}
                            </ol>
                          </div>
                          <p className="knowledge-limit">当前限制：{game.limitations.join(" ")}</p>
                        </div>
                      </details>
                      <button
                        type="button"
                        onClick={() => {
                          setGameLibraryOpen(false);
                          void sendMessage(`我想玩${game.name}`);
                        }}
                        disabled={isSending}
                      >
                        {game.playMode === "planned" ? "了解玩法" : "让 Agent 推荐它"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={memoryOpen} onOpenChange={setMemoryOpen}>
            <SheetTrigger asChild>
              <Button className="memory-trigger" variant="ghost">
                <BrainCircuit size={17} />
                我的记忆
                <span className="memory-count">{meaningfulMessages.length}</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="memory-sheet">
              <SheetHeader className="memory-sheet-header">
                <p className="memory-kicker">MEMORY ARCHIVE</p>
                <SheetTitle>关于 {nickname || "你"} 的记忆</SheetTitle>
                <SheetDescription>
                  这些内容只保存在当前浏览器中，用于延续对话和改善推荐。
                </SheetDescription>
              </SheetHeader>

              <div className="memory-sheet-body">
                <div className="memory-stats">
                  <div>
                    <History size={18} />
                    <strong>{meaningfulMessages.length}</strong>
                    <span>条近期对话</span>
                  </div>
                  <div>
                    <Clock3 size={18} />
                    <strong>{formatMemoryTime(lastMemoryUpdate)}</strong>
                    <span>上次互动</span>
                  </div>
                </div>

                <section className="memory-block">
                  <span className="memory-label">记忆摘要</span>
                  <p>{memorySummary}</p>
                </section>

                <section className="memory-block">
                  <span className="memory-label">推测偏好</span>
                  <div className="memory-tags">
                    {preferenceTags.length ? (
                      preferenceTags.map((tag) => <span key={tag}>{tag}</span>)
                    ) : (
                      <span className="memory-empty-tag">等待更多互动</span>
                    )}
                  </div>
                </section>

                <section className="memory-block memory-game-row">
                  <span className="memory-label">最近游戏</span>
                  <div>
                    <Gamepad2 size={19} />
                    <strong>{recommendation?.name ?? "暂未推荐"}</strong>
                  </div>
                </section>
              </div>

              <SheetFooter className="memory-sheet-footer">
                <Button
                  variant="outline"
                  onClick={resetDemo}
                  disabled={meaningfulMessages.length === 0 && !recommendation}
                >
                  <Trash2 size={16} />
                  清除这个昵称的记忆
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <div className="header-status" aria-label="机械臂桥接状态">
            <span className="status-dot" />
            神经链路在线
            <span className="header-divider" />
            <WifiOff size={16} />
            <span>
              {robotCommand?.mode === "bridge" && robotCommand.status === "sent"
                ? "机械臂指令已发送"
                : "机械臂待接入"}
            </span>
          </div>
        </div>
      </header>

      <section className="experience-grid" aria-label="陪玩 Agent 交互区">
        <div className="conversation-panel">
          <div className="eyebrow">
            <Sparkles size={16} />
            陪玩协议 · 在线
          </div>
          <h1>{nickname ? `${nickname}，今天想玩点什么？` : "今天想玩点什么？"}</h1>
          <p className="intro-copy">
            {memoryRestored
              ? "欢迎回来，我还记得我们上次聊到的内容。可以接着聊，也可以让我重新推荐。"
              : "不确定也没关系。说说你现在的心情，我会从你的喜好和过去互动里挑一个合适的玩法。"}
          </p>

          <div className="dialogue-stream" aria-live="polite">
            {messages.map((message) => (
              <div
                className={`message ${message.role === "assistant" ? "agent-message" : "user-message"}`}
                key={message.id}
              >
                {message.role === "assistant" && (
                  <span className="message-avatar"><Bot size={18} /></span>
                )}
                <div>
                  <p className="message-author">
                    <span>{message.role === "assistant" ? "陪玩搭子" : nickname}</span>
                    {message.role === "assistant" && message.source && (
                      <span className={`response-source source-${message.source}`}>
                        {message.source === "llm" ? "DeepSeek" : "规则安全层"}
                      </span>
                    )}
                  </p>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="message agent-message thinking-message">
                <span className="message-avatar"><LoaderCircle size={18} className="spinner" /></span>
                <div>
                  <p className="message-author">陪玩搭子</p>
                  <p>让我想想……</p>
                </div>
              </div>
            )}

            {recommendation && (
              <article className="game-card">
                <div className="game-icon"><Gamepad2 size={25} /></div>
                <div className="game-details">
                  <div className="game-title-row">
                    <h2>{recommendation.name}</h2>
                    <span className={`recommendation-mode mode-${recommendationMode}`}>
                      {gameModeCopy[recommendationMode].label}
                    </span>
                  </div>
                  <p>约 {recommendation.durationMinutes} 分钟 · {recommendation.difficulty} · {recommendation.tags.join(" · ")}</p>
                  {gameAccepted ? (
                    recommendationMode === "conversation" ? (
                      <div className="accepted-state conversation-started">
                        <MessageCircle size={18} />
                        <div>
                          <strong>对话互动进行中</strong>
                          <span>直接在下方输入回答，我会继续主持下一轮。</span>
                        </div>
                      </div>
                    ) : (
                      <div className={`accepted-state robot-${robotCommand?.status ?? "idle"}`}>
                        {isStartingRobot ? (
                          <LoaderCircle size={18} className="spinner" />
                        ) : robotCommand?.status === "failed" ? (
                          <WifiOff size={18} />
                        ) : (
                          <Check size={18} />
                        )}
                        <div>
                          <strong>
                            {isStartingRobot
                              ? "正在创建游戏指令"
                              : robotCommand?.status === "sent"
                                ? "指令已发送到机械臂"
                                : robotCommand?.status === "failed"
                                  ? "机械臂接口暂不可用"
                                  : "软件游戏指令已创建"}
                          </strong>
                          <span>
                            {isStartingRobot
                              ? "正在连接机械臂桥接服务…"
                              : robotCommand?.message ?? "当前为模拟模式，等待机械臂服务接入。"}
                          </span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="game-actions">
                      <Button onClick={() => void sendMessage(
                        recommendationMode === "planned"
                          ? `${recommendation.name}怎么玩`
                          : "好，开始吧",
                      )}>
                        {recommendationMode === "planned" ? "了解玩法" : "好，开始吧"}
                      </Button>
                      <Button variant="ghost" onClick={() => void sendMessage("换一个别的")}>换一个</Button>
                    </div>
                  )}
                </div>
              </article>
            )}
          </div>

          <div className="text-test-panel">
            <div className="text-test-heading">
              <span><Keyboard size={16} /> 文字输入</span>
              <span>输入或直接说话</span>
            </div>
            <form className="text-compose" onSubmit={submitText}>
              <Input
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                placeholder="试试输入：我有点无聊，不知道玩什么"
                maxLength={500}
                disabled={isSending || isTranscribing}
                aria-label="输入消息"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={`compose-mic ${agentState === "listening" ? "is-recording" : ""}`}
                onClick={toggleRecording}
                disabled={agentState === "thinking" || agentState === "speaking" || isTranscribing}
                aria-label={agentState === "listening" ? "结束录音" : "开始录音"}
                title={agentState === "listening" ? "结束录音" : "点击说话"}
              >
                {agentState === "listening" ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              <Button type="submit" size="icon" disabled={!textInput.trim() || isSending || isTranscribing} aria-label="发送消息">
                <Send size={18} />
              </Button>
            </form>
            <div className="quick-prompts" aria-label="快捷测试语句">
              {["我有点无聊", "推荐一个游戏", "换一个别的"].map((prompt) => (
                <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={isSending || isTranscribing}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className={`companion-stage state-${agentState}`}>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="scan-line" />
          <div className="hud-readout hud-top">NEURAL LINK // STANDBY</div>
          <div className="hud-readout hud-side">UNIT 01 · ACTIVE</div>
          <div className="robot-wrap">
            <div className="voice-ripple ripple-one" />
            <div className="voice-ripple ripple-two" />
            <Image
              src="/motoko-ui.png"
              alt="草薙素子赛博义体形象"
              width={420}
              height={500}
              priority
              className="robot-image"
            />
          </div>

          <div className="agent-status-card">
            <span className="status-icon" aria-hidden="true">
              {agentState === "listening" ? <Mic size={19} /> : <Volume2 size={19} />}
            </span>
            <div>
              <strong>{stateCopy[agentState].label}</strong>
              <p>{stateCopy[agentState].hint}</p>
            </div>
          </div>

          <Button
            className={`mic-button ${agentState === "listening" ? "is-recording" : ""}`}
            size="lg"
            onClick={toggleRecording}
            disabled={agentState === "thinking" || agentState === "speaking" || isTranscribing}
            aria-label={agentState === "listening" ? "结束录音" : "开始录音"}
          >
            {agentState === "listening" ? <MicOff size={23} /> : <Mic size={23} />}
            {agentState === "listening" ? "结束录音" : "点击说话"}
          </Button>

          {messages.length > 1 && (
            <button className="reset-demo" type="button" onClick={resetDemo}>
              <RotateCcw size={15} />
              重置对话
            </button>
          )}
          {permissionError && <p className="permission-error" role="alert">{permissionError}</p>}
        </aside>
      </section>

      {!nickname && (
        <div className="welcome-layer">
          <form className="welcome-card" onSubmit={enterExperience}>
            <div className="welcome-robot">
              <Image src="/motoko-ui.png" alt="草薙素子赛博义体形象" width={180} height={210} priority />
            </div>
            <p className="welcome-kicker">IDENTITY HANDSHAKE</p>
            <h2>先让我认识你</h2>
            <p className="welcome-copy">输入一个昵称即可开始，不需要注册账号。</p>
            <label htmlFor="nickname">你的昵称</label>
            <Input
              id="nickname"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="例如：小宇"
              maxLength={16}
              autoComplete="nickname"
              autoFocus
            />
            <Button type="submit" size="lg" disabled={!draftName.trim()}>
              进入陪玩空间
            </Button>
            <p className="privacy-note">昵称和偏好仅用于改善你的陪玩体验</p>
          </form>
        </div>
      )}
    </main>
  );
}
