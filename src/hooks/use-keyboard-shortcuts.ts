// @ts-nocheck
"use client";

import { useEffect } from "react";
import { tinykeys } from "tinykeys";

type ShortcutHandlers = {
  onCommandPalette?: () => void;
  onShortcutsHelp?: () => void;
  onNavigate?: (path: string) => void;
};

export function useKeyboardShortcuts({
  onCommandPalette,
  onShortcutsHelp,
  onNavigate,
}: ShortcutHandlers) {
  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      // Command palette
      "$mod+KeyK": (e) => {
        e.preventDefault();
        onCommandPalette?.();
      },
      // Shortcuts help
      "Shift+?": (e) => {
        // Don't trigger in inputs
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        onShortcutsHelp?.();
      },
      // Go-to sequences (Linear style: g then letter)
      "g d": (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        onNavigate?.("/");
      },
      "g a": (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        onNavigate?.("#agents");
      },
      "g o": (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        onNavigate?.("/objectives");
      },
      "g s": (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        onNavigate?.("#settings");
      },
      // Channel shortcuts
      "g 1": (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        onNavigate?.("/channel/general");
      },
      "g 2": (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        onNavigate?.("/channel/code-review");
      },
      "g 3": (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        onNavigate?.("/channel/design");
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
