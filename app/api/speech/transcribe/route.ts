import { NextResponse } from "next/server";

const MODEL = "qwen3-asr-flash";
const ENDPOINT =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MAX_DATA_URL_LENGTH = 10_100_000;
const AUDIO_DATA_URL = /^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,[a-z0-9+/=\s]+$/i;

type AsrResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
};

function getTranscript(payload: AsrResponse) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item.text === "string" ? item.text : ""))
      .join("")
      .trim();
  }
  return "";
}

export async function POST(request: Request) {
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "语音服务尚未配置，请联系演示管理员。" },
      { status: 503 },
    );
  }

  let audio = "";
  try {
    const body = (await request.json()) as { audio?: unknown };
    audio = typeof body.audio === "string" ? body.audio : "";
  } catch {
    return NextResponse.json({ error: "录音数据格式不正确。" }, { status: 400 });
  }

  if (
    !audio ||
    audio.length > MAX_DATA_URL_LENGTH ||
    !AUDIO_DATA_URL.test(audio)
  ) {
    return NextResponse.json(
      { error: "录音格式不受支持或内容过长，请重新录制。" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: { data: audio },
              },
            ],
          },
        ],
        stream: false,
        asr_options: {
          language: "zh",
          enable_itn: true,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "语音服务暂时没有响应，请稍后再试。" },
        { status: 502 },
      );
    }

    const transcript = getTranscript((await response.json()) as AsrResponse);
    if (!transcript) {
      return NextResponse.json(
        { error: "没有识别出清晰内容，请靠近麦克风再说一次。" },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: transcript, model: MODEL });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name === "AbortError"
            ? "语音识别等待超时，请再试一次。"
            : "语音服务连接失败，请稍后再试。",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
