export type VoiceCommand = "next" | "prev" | "replay" | "pause" | "resume" | "check";

const RULES: [VoiceCommand, RegExp][] = [
  ["check", /帮我看看|拍照|拍一张|检查一下/],
  ["replay", /再讲一遍|再说一遍|重复|没听清/],
  ["prev", /上一步|返回上一步|退回/],
  ["next", /^(好了|下一步|完成了|做完了|画好了|继续下一步)/],
  ["pause", /^(暂停|等一下|等等)/],
  ["resume", /^(继续|开始吧|接着来)/],
];

/** 只把短句识别为指令，长句交给对话模型，避免误触发 */
export function parseCommand(text: string): VoiceCommand | null {
  const t = text.replace(/[，。！？,.!?\s]/g, "");
  if (t.length > 10) return null;
  for (const [cmd, re] of RULES) if (re.test(t)) return cmd;
  return null;
}

export const VOICE_HINTS = ["下一步", "再讲一遍", "帮我看看", "暂停"];

export const QUICK_QUESTIONS = ["眉尾要画多长？", "颜色太深了怎么办？", "没有刷子可以吗？", "画歪了怎么补救？"];
