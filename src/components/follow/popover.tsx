"use client";

import type { ReactElement, ReactNode } from "react";
import { Popover as Root, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function Popover({ trigger, children }: { trigger: ReactElement; children: ReactNode }) {
  return (
    <Root>
      <PopoverTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-4 text-sm">
        {children}
      </PopoverContent>
    </Root>
  );
}
