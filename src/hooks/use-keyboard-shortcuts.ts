// @ts-nocheck
"use client";

import { useEffect } from "react";
import { tinykeys } from "tinykeys";
import { getMode } from "@/lib/mode";

type ShortcutHandlers = {
  onCommandPalette?: () => void;
  onShortcutsHelp?: () => void;
  onNavigate?: (path: string) => void;
};

function orgPrefix(path: string): string {
  const mode = getMode();
  if (mode === "agent") return `/agent${path}`;
  return `/org${path}`;
}

export function useKeyboardShortcuts({
  onCommandPalette,
  onShortcutsHelp,
  onNavigate,
}: ShortcutHandlers) {
  useEffect(() => {
    const isInput = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
    };

    const unsubscribe = tinykeys(window, {
      // Command palette
      "$mod+KeyK": (e) => {
        e.preventDefault();
        onCommandPalette?.();
      },
      // Shortcuts help
      "Shift+?": (e) => {
        if (isInput(e)) return;
        e.preventDefault();
        onShortcutsHelp?.();
      },
      // Go-to sequences (Linear style: g then letter)
      "g d": (e) => {
        if (isInput(e)) return;
        onNavigate?.(getMode() === "agent" ? "/agent" : "/org");
      },
      "g a": (e) => {
        if (isInput(e)) return;
        onNavigate?.(getMode() === "agent" ? "/agent" : "/org/agents");
      },
      "g o": (e) => {
        if (isInput(e)) return;
        onNavigate?.(orgPrefix("/objectives"));
      },
      "g s": (e) => {
        if (isInput(e)) return;
        onNavigate?.("#settings");
      },
      // Channel shortcuts (org mode only)
      "g 1": (e) => {
        if (isInput(e)) return;
        if (getMode() === "org") onNavigate?.("/org/channel/general");
      },
      "g 2": (e) => {
        if (isInput(e)) return;
        if (getMode() === "org") onNavigate?.("/org/channel/code-review");
      },
      "g 3": (e) => {
        if (isInput(e)) return;
        if (getMode() === "org") onNavigate?.("/org/channel/design");
      },
    });

    return unsubscribe;
  }, [onCommandPalette, onShortcutsHelp, onNavigate]);
}

// Shortcut definitions for display in help dialog and command palette
export const shortcutDefinitions = [
  {
    group: "General",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    group: "Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "A"], description: "Go to Agents" },
      { keys: ["G", "O"], description: "Go to Objectives" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ],
  },
  {
    group: "Channels",
    shortcuts: [
      { keys: ["G", "1"], description: "Go to #general" },
      { keys: ["G", "2"], description: "Go to #code-review" },
      { keys: ["G", "3"], description: "Go to #design" },
    ],
  },
];
