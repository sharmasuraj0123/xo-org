"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { CommandPalette } from "./command-palette";
import { ShortcutsHelp } from "./shortcuts-help";

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const handleCommandPalette = useCallback(() => {
    setCommandOpen((prev) => !prev);
  }, []);

  const handleShortcutsHelp = useCallback(() => {
    setShortcutsOpen((prev) => !prev);
  }, []);

  useKeyboardShortcuts({
    onCommandPalette: handleCommandPalette,
    onShortcutsHelp: handleShortcutsHelp,
    onNavigate: handleNavigate,
  });

  return (
    <>
      {children}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={handleNavigate}
        onShortcutsHelp={() => {
          setCommandOpen(false);
          setShortcutsOpen(true);
        }}
      />
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
