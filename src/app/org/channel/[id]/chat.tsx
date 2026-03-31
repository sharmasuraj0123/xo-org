"use client";

import { useState } from "react";
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  AuiIf,
  useAuiState,
  useLocalRuntime,
  AssistantRuntimeProvider,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  ArrowUpIcon,
  PaperclipIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  SquareIcon,
  TargetIcon,
  PlusIcon,
  UserIcon,
  BotIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChannelObjectivePanel } from "@/components/channel-objective-panel";
import { NewObjectiveDialog } from "@/components/new-objective-dialog";
import { OBJECTIVES, AGENTS, type Objective } from "@/lib/mock-data";
import type { FC } from "react";

const agents = [
  { name: "Architect", initials: "AR", color: "text-blue-400" },
  { name: "Coder 1", initials: "C1", color: "text-primary" },
  { name: "Coder 2", initials: "C2", color: "text-primary" },
  { name: "Tester", initials: "TE", color: "text-amber-400" },
  { name: "Lint Bot", initials: "LB", color: "text-purple-400" },
];

const agentResponses = [
  (msg: string) => `I'll review the architecture for this. "${msg}" — let me check the system design docs and get back with a plan.`,
  (msg: string) => `On it. I'll start implementing this: "${msg}". Creating a branch now.`,
  (msg: string) => `I can pick this up too. "${msg}" — I'll handle the tests for this change.`,
  (msg: string) => `Running test suite against "${msg}". Will report back with results shortly.`,
  (msg: string) => `Linting check for "${msg}" — all clear, no style violations detected.`,
];

let agentIndex = 0;

const MockChatAdapter: ChatModelAdapter = {
  async *run({ messages }) {
    const lastUserMessage =
      messages.filter((m) => m.role === "user").at(-1)?.content ?? [];
    const userText = lastUserMessage
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ");

    const agent = agents[agentIndex % agents.length];
    const responseFn = agentResponses[agentIndex % agentResponses.length];
    agentIndex++;

    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    yield {
      content: [
        {
          type: "text" as const,
          text: `**${agent.name}:** ${responseFn(userText)}`,
        },
      ],
    };
  },
};

// --- Status dots ---
const STATUS_DOTS: Record<string, string> = {
  "On Track": "bg-primary",
  "At Risk": "bg-amber-400",
  Behind: "bg-red-400",
  Completed: "bg-primary",
  "Not Started": "bg-muted-foreground",
};

// --- Message components ---

const ChatMessage: FC<{ onCreateObjective: () => void }> = ({
  onCreateObjective,
}) => {
  const role = useAuiState((s) => s.message.role);
  if (role === "user") return <UserMessage />;
  return <AssistantMessage onCreateObjective={onCreateObjective} />;
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="px-4 py-2" data-role="user">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">
          XO
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-amber-400">xo</span>
          <div className="text-sm leading-relaxed text-foreground mt-0.5">
            <MessagePrimitive.Parts />
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC<{ onCreateObjective: () => void }> = ({
  onCreateObjective,
}) => {
  return (
    <MessagePrimitive.Root
      className="group px-4 py-2"
      data-role="assistant"
    >
      <div className="flex items-start gap-3 max-w-3xl">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[11px] font-semibold text-primary">
          AG
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-relaxed text-foreground">
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === "text") return <MarkdownText />;
                return null;
              }}
            </MessagePrimitive.Parts>
          </div>
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <ActionBarPrimitive.Root
              hideWhenRunning
              className="flex items-center gap-1 text-muted-foreground"
            >
              <ActionBarPrimitive.Copy className="flex size-6 items-center justify-center rounded-md hover:bg-muted">
                <AuiIf condition={(s) => s.message.isCopied}>
                  <CheckIcon className="size-3" />
                </AuiIf>
                <AuiIf condition={(s) => !s.message.isCopied}>
                  <CopyIcon className="size-3" />
                </AuiIf>
              </ActionBarPrimitive.Copy>
              <ActionBarPrimitive.Reload className="flex size-6 items-center justify-center rounded-md hover:bg-muted">
                <RefreshCwIcon className="size-3" />
              </ActionBarPrimitive.Reload>
            </ActionBarPrimitive.Root>
            <button
              onClick={onCreateObjective}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Create Objective"
            >
              <TargetIcon className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

// --- Composer ---

const Composer: FC<{ channelName: string }> = ({ channelName }) => {
  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-1 shadow-sm">
      <ComposerPrimitive.Input
        placeholder={`Message #${channelName}...`}
        className="min-h-[2.5rem] w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        rows={1}
        autoFocus
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <div className="flex items-center gap-1">
          <ComposerPrimitive.AddAttachment className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
            <PaperclipIcon className="size-4" />
          </ComposerPrimitive.AddAttachment>
        </div>
        <div className="flex items-center gap-2">
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30">
              <ArrowUpIcon className="size-4" />
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <ComposerPrimitive.Cancel className="flex size-8 items-center justify-center rounded-lg bg-destructive text-white transition-colors hover:bg-destructive/90">
              <SquareIcon className="size-3 fill-current" />
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

// --- Channel Thread (main chat area) ---

const GroupThread: FC<{
  channelName: string;
  onCreateObjective: () => void;
}> = ({ channelName, onCreateObjective }) => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-scroll scroll-smooth">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 mb-4">
              <span className="text-lg font-bold text-primary">#</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              #{channelName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the start of #{channelName}. Send a message to collaborate
              with agents.
            </p>
          </div>
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ChatMessage onCreateObjective={onCreateObjective} />}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background px-4 pb-4 pt-2">
          <Composer channelName={channelName} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

// --- Main export ---

export function ChannelChat({ channelName }: { channelName: string }) {
  const runtime = useLocalRuntime(MockChatAdapter);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>(
    OBJECTIVES.filter((o) => o.channelId === channelName)
  );

  function handleCreateObjectiveFromMessage() {
    const newObj: Objective = {
      id: `obj-${Date.now()}`,
      channelId: channelName,
      title: "New Objective",
      humanOwner: "xo",
      humanOwnerInitials: "XO",
      aiOwner: AGENTS.find((a) => a.channels.includes(channelName))?.id ?? "aria",
      status: "Not Started",
      progress: 0,
      timePeriod: "Q1 2026",
      createdAt: "just now",
      lastActivity: "just now",
      keyResults: [],
      skills: [],
      artifacts: [],
      instructions: "",
      parentMessageId: `msg-${Date.now()}`,
    };
    setObjectives((prev) => [newObj, ...prev]);
    setSelectedObjective(newObj);
  }

  function handleCreateObjective(objective: Objective) {
    setObjectives((prev) => [objective, ...prev]);
    setSelectedObjective(objective);
  }

  function handleUpdateObjective(updated: Objective) {
    setObjectives((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
    setSelectedObjective(updated);
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col">
      {/* Channel Header */}
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <span className="text-sm font-semibold text-foreground">
          #{channelName}
        </span>
        <span className="text-xs text-muted-foreground">
          {agents.length} agents
        </span>

        {/* Objective indicators */}
        {objectives.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <TargetIcon className="size-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              {objectives.slice(0, 3).map((obj) => {
                const dotColor = STATUS_DOTS[obj.status] ?? "bg-muted-foreground";
                return (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObjective(obj)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] transition-colors hover:bg-muted/50 ${
                      selectedObjective?.id === obj.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <div className={`size-1.5 rounded-full ${dotColor}`} />
                    {obj.title.length > 18
                      ? obj.title.slice(0, 18) + "..."
                      : obj.title}
                  </button>
                );
              })}
              {objectives.length > 3 && (
                <span className="text-[11px] text-muted-foreground self-center">
                  +{objectives.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <NewObjectiveDialog
            channelId={channelName}
            onCreateObjective={handleCreateObjective}
          >
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <PlusIcon className="size-3" />
              New Objective
            </Button>
          </NewObjectiveDialog>
          <div className="flex -space-x-1.5">
            {agents.slice(0, 4).map((a) => (
              <div
                key={a.name}
                className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground"
                title={a.name}
              >
                {a.initials}
              </div>
            ))}
            {agents.length > 4 && (
              <div className="flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground">
                +{agents.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content: Chat + Objective Panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <AssistantRuntimeProvider runtime={runtime}>
            <GroupThread
              channelName={channelName}
              onCreateObjective={handleCreateObjectiveFromMessage}
            />
          </AssistantRuntimeProvider>
        </div>

        {selectedObjective && (
          <ChannelObjectivePanel
            objective={selectedObjective}
            onClose={() => setSelectedObjective(null)}
            onUpdateObjective={handleUpdateObjective}
          />
        )}
      </div>
    </div>
  );
}
