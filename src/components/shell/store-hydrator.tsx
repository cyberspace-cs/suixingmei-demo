"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

export function StoreHydrator() {
  useEffect(() => {
    const finish = () => {
      if (!useApp.getState().seeded) useApp.getState().resetDemo();
      useApp.setState({ hydrated: true });
    };
    const res = useApp.persist.rehydrate();
    if (res && typeof (res as Promise<void>).then === "function") (res as Promise<void>).then(finish);
    else finish();
  }, []);
  return null;
}
