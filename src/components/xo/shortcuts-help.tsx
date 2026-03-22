"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shortcutDefinitions } from "@/hooks/use-keyboard-shortcuts";

type ShortcutsHelpProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate faster with keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {shortcutDefinitions.map((group) => (
            <div key={group.group}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.group}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="mx-0.5 text-[10px] text-muted-foreground">
                              then
                            </span>
                          )}
                          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
