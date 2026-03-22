"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboardIcon,
  UsersIcon,
  TargetIcon,
  Settings2Icon,
  HashIcon,
  CircleHelpIcon,
  KeyboardIcon,
} from "lucide-react";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
  onShortcutsHelp: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onShortcutsHelp,
}: CommandPaletteProps) {
  const runCommand = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search for pages, channels, and actions..."
    >
      <Command className="rounded-xl border-none">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => runCommand(() => onNavigate("/"))}>
              <LayoutDashboardIcon />
              <span>Dashboard</span>
              <span className="ml-auto text-xs text-muted-foreground">G D</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onNavigate("#agents"))}>
              <UsersIcon />
              <span>Agents</span>
              <span className="ml-auto text-xs text-muted-foreground">G A</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onNavigate("/objectives"))}>
              <TargetIcon />
              <span>Objectives</span>
              <span className="ml-auto text-xs text-muted-foreground">G O</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onNavigate("#settings"))}>
              <Settings2Icon />
              <span>Settings</span>
              <span className="ml-auto text-xs text-muted-foreground">G S</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Channels">
            <CommandItem onSelect={() => runCommand(() => onNavigate("/channel/general"))}>
              <HashIcon />
              <span>general</span>
              <span className="ml-auto text-xs text-muted-foreground">G 1</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onNavigate("/channel/code-review"))}>
              <HashIcon />
              <span>code-review</span>
              <span className="ml-auto text-xs text-muted-foreground">G 2</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onNavigate("/channel/design"))}>
              <HashIcon />
              <span>design</span>
              <span className="ml-auto text-xs text-muted-foreground">G 3</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onNavigate("/channel/approvals"))}>
              <HashIcon />
              <span>approvals</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => onShortcutsHelp())}>
              <KeyboardIcon />
              <span>Keyboard shortcuts</span>
              <span className="ml-auto text-xs text-muted-foreground">?</span>
            </CommandItem>
            <CommandItem>
              <CircleHelpIcon />
              <span>Get help</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
