"use client";

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
} from "lucide-react";
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

// --- Message components ---

const ChatMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
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

const AssistantMessage: FC = () => {
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

// --- Thread ---

const GroupThread: FC<{ channelName: string }> = ({ channelName }) => {
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
              This is the start of #{channelName}. Send a message to collaborate with agents.
            </p>
          </div>
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ChatMessage />}
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

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <span className="text-sm font-semibold text-foreground">
          #{channelName}
        </span>
        <span className="text-xs text-muted-foreground">
          {agents.length} agents
        </span>
        <div className="ml-auto flex -space-x-1.5">
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
      <div className="flex-1 min-h-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <GroupThread channelName={channelName} />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}
