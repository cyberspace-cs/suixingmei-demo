"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Clock3, FlaskConical, RotateCcw, Sparkles, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/lib/store";
import type { DemoScenario } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "妆容工作台", match: ["/", "/plan", "/follow", "/complete"] },
  { href: "/looks", label: "我的妆容", match: ["/looks", "/score"] },
];

export const SCENARIOS: { value: DemoScenario; label: string; hint: string }[] = [
  { value: "normal", label: "正常流程", hint: "所有接口正常返回" },
  { value: "analysis-timeout", label: "云端识别超时", hint: "妆面解析降级为本机识别" },
  { value: "selfie-bad", label: "自拍不合格", hint: "自拍质检提示光线 / 美颜问题" },
  { value: "camera-denied", label: "摄像头被拒绝", hint: "跟妆页展示权限引导" },
  { value: "vision-timeout", label: "检查接口超时", hint: "帮我看看降级为本机检查" },
];

export function AppHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const scenario = useApp((s) => s.settings.scenario);
  const setSettings = useApp((s) => s.setSettings);
  const resetDemo = useApp((s) => s.resetDemo);
  const clearAll = useApp((s) => s.clearAll);

  return (
    <header className={cn("relative z-30 flex h-16 items-center justify-between px-5 md:px-8", className)}>
      <Logo />

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex" aria-label="主导航">
        {NAV.map((item) => {
          const active = item.match.includes(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative py-2 text-[15px] transition-colors",
                active ? "font-semibold text-ink" : "text-ink/60 hover:text-ink",
              )}
            >
              {item.label}
              {active && <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-[2px] w-full rounded-full bg-ink" />}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/history"
          className={cn(
            "glass-strong hidden h-10 items-center gap-2 rounded-full px-4 text-sm text-ink transition hover:bg-white sm:flex",
            pathname === "/history" && "ring-1 ring-ink/20",
          )}
        >
          <Clock3 className="size-4" />
          历史妆容
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1.5 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="账户与演示设置"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/user-bare.jpg"
              alt=""
              className="size-10 rounded-full border-2 border-white object-cover object-[50%_35%] shadow-sm"
            />
            <ChevronDown className="size-4 text-ink/60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel>小雨 · 偏圆脸</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push("/looks")}>
                <UserRound /> 我的妆容
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/history")}>
                <Clock3 /> 历史妆容
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/score")}>
                <Sparkles /> 直接打分
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <FlaskConical className="size-3.5" /> 演示设置 · 模拟场景
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={scenario}
                onValueChange={(v) => {
                  setSettings({ scenario: v as DemoScenario });
                  const s = SCENARIOS.find((x) => x.value === v);
                  toast(`已切换：${s?.label}`, { description: s?.hint });
                }}
              >
                {SCENARIOS.map((s) => (
                  <DropdownMenuRadioItem key={s.value} value={s.value}>
                    {s.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                resetDemo();
                toast.success("已恢复演示数据");
                router.push("/");
              }}
            >
              <RotateCcw /> 恢复演示数据
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                clearAll();
                toast("本机数据已清空", { description: "历史记录与收藏已删除，可查看空状态" });
                router.push("/");
              }}
            >
              <Trash2 /> 清空本机数据
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
