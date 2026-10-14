import { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { DEFAULT_RECIPIENT, parseAgentAsk } from "@/lib/agentAsk";
import {
  answerLiveFlow,
  confirmAgentSend,
  confirmAgentSwap,
  previewAgentSend,
  previewAgentSwap,
  requestSessionChallenge,
  verifySession,
  type AgentTaskResult,
} from "@/lib/arcApi";
import { signPersonalMessage } from "@/lib/wallet";
import { useProductWallet } from "@/lib/productWallet";
import { ChatColumn } from "@/components/flow/ChatColumn";
import { HistoryRail } from "@/components/flow/HistoryRail";
import { EvidencePanel } from "@/components/ExecutionDrawer";
import { WhyZeroGDrawer } from "@/components/landing/WhyZeroG";
import { useNavigate } from "react-router-dom";
import { shouldShowGetStarted } from "@/pages/GetStartedPage";
import {
  OnboardingWalkthrough,
  shouldShowOnboarding,
} from "@/components/onboarding/OnboardingWalkthrough";
import {
  findActiveExecution,
  inferSettledServiceIds,
  type CardExecutionState,
  type AgentCard,
} from "@/lib/executionPhases";
import {
  WELCOME,
  type AgentId,
  type ChatMsg,
  type ConvState,
  type FlowConv,
  type PaidResendMeta,
} from "@/lib/flowTypes";
import { cn } from "@/lib/utils";

export function FlowPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { wallet, connect, connecting, ready } = useProductWallet();
  const [agentId, setAgentId] = useState<AgentId>("general");
  const [input, setInput] = useState("");
  const [convState, setConvState] = useState<ConvState>(null);
  const [settledServiceIds, setSettledServiceIds] = useState<Set<string>>(() => new Set());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [convSearch, setConvSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [executionStates, setExecutionStates] = useState<Record<string, CardExecutionState>>({});
  const [historyOpen, setHistoryOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true,
  );
  const [dismissedExecKey, setDismissedExecKey] = useState<string | null>(null);
  const [whyZeroGOpen, setWhyZeroGOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [flowSession, setFlowSession] = useState<string | null>(null);
  const [pendingAsk, setPendingAsk] = useState<{ kind: "send" | "swap" | "revert"; amount: string; recipient?: string; preview?: AgentTaskResult } | null>(null);

  function fieldsText(preview: AgentTaskResult) {
    const a = preview.action;
    return [
      preview.label.replaceAll("\u2014", ". ").replaceAll("\u2013", "-"),
      `Agent ${a.agent}`,
      `Recipient ${a.recipient}`,
      `Amount ${a.amount} base units`,
      `Nonce ${a.nonce}`,
      `Deadline ${a.deadline}`,
      `Policy version ${a.policyVersion}`,
      preview.quote ? `Quote ${preview.quote.amountOut} EURC base units. Floor ${preview.quote.amountOutMin}, 1% under that quote (${preview.quote.venue}).` : "",
      "Reply confirm to broadcast this exact action. Anything else cancels it.",
    ].filter(Boolean).join("\n");
  }

  useEffect(() => {
    if (shouldShowGetStarted()) {
      navigate("/start", { replace: true });
      return;
    }
    setOnboardingOpen(shouldShowOnboarding());
  }, [navigate]);

  const onExecutionStateChange = useCallback((key: string, state: CardExecutionState) => {
    setExecutionStates((prev) => ({ ...prev, [key]: { ...prev[key], ...state } }));
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    try {
      sessionStorage.setItem(`beacon.exec.${conversationId}`, JSON.stringify(executionStates));
    } catch {
      /* ignore quota */
    }
  }, [conversationId, executionStates]);

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: async () => ({ agents: [] as { id: string; name: string; blurb: string; builtIn: boolean }[] }),
  });

  const balancesQuery = useQuery({
    queryKey: ["balances", wallet],
    queryFn: async () => ({ balances: null }),
    enabled: Boolean(wallet),
  });

  const conversationsQuery = useQuery({
    queryKey: ["flow-conversations", wallet],
    queryFn: async () => ({ conversations: [] as { id: string; title: string; last_message?: string | null }[] }),
    enabled: Boolean(wallet),
  });

  const activityQuery = useQuery({
    queryKey: ["flow-activity", wallet],
    queryFn: async () => ({ activity: [] }),
    enabled: Boolean(wallet),
  });

  async function loadConversation(id: string, _w: string) {
    setConversationId(id);
    const loaded: ChatMsg[] = [
      WELCOME,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Saved chats are not an Arc payment record. Open the vault activity list for Executed logs.",
        displayModel: "Arc vault",
      },
    ];
    setSettledServiceIds(inferSettledServiceIds(loaded));
    try {
      const raw = sessionStorage.getItem(`beacon.exec.${id}`);
      setExecutionStates(raw ? (JSON.parse(raw) as Record<string, CardExecutionState>) : {});
    } catch {
      setExecutionStates({});
    }
    setDismissedExecKey(null);
    setMessages(loaded);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setHistoryOpen(false);
    }
  }

  async function startNewChat() {
    setAgentId("general");
    setConversationId(null);
    setConvState(null);
    setSettledServiceIds(new Set());
    setExecutionStates({});
    setDismissedExecKey(null);
    setMessages([WELCOME]);
  }

  const chat = useMutation({
    mutationFn: async (message: string) => ({
      text: await answerLiveFlow(message, wallet),
      cards: [] as AgentCard[],
    }),
    onSuccess: (data, message) => {
      setDismissedExecKey(null);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "user", text: message, agentId },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          agentId,
          text: data.text,
          cards: data.cards,
          displayModel: "Arc vault",
        },
      ]);
      if (wallet) {
        void qc.invalidateQueries({ queryKey: ["balances", wallet] });
        void qc.invalidateQueries({ queryKey: ["flow-conversations", wallet] });
        void qc.invalidateQueries({ queryKey: ["flow-activity", wallet] });
      }
    },
    onError: (err) => {
      const detail = err instanceof Error && err.message ? err.message : "Could not read Arc.";
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: ["## Could not read Arc", detail, "Nothing was signed and no USDC moved. Try the chip again."].join(
            "\n",
          ),
          displayModel: "Arc vault",
        },
      ]);
    },
  });

  const agents = agentsQuery.data?.agents ?? [];
  const active = useMemo(
    () => agents.find((a) => a.id === agentId) ?? { id: agentId, name: agentId, blurb: "", builtIn: true },
    [agents, agentId],
  );

  const conversations = useMemo(() => {
    const list = (conversationsQuery.data?.conversations ?? []) as FlowConv[];
    const q = convSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversationsQuery.data, convSearch]);

  async function onConnect() {
    await connect();
  }

  async function ensureFlowSession() {
    if (flowSession) return flowSession;
    if (!wallet) throw new Error("Connect the vault owner wallet. The agent signs the spend after you sign in.");
    const challenge = await requestSessionChallenge(wallet);
    const signature = await signPersonalMessage(challenge.message);
    const verified = await verifySession(wallet, signature);
    setFlowSession(verified.token);
    return verified.token;
  }

  function pushPair(userText: string, assistantText: string) {
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text: userText, agentId },
      { id: crypto.randomUUID(), role: "assistant", agentId, text: assistantText, displayModel: "Arc vault" },
    ]);
  }

  function submit(raw: string) {
    const text = raw.trim();
    if (!text || chat.isPending || !ready) return;
    const ask = parseAgentAsk(text);
    if (ask?.kind === "revert") {
      setInput("");
      setPendingAsk({ kind: "revert", amount: "10001", recipient: DEFAULT_RECIPIENT });
      pushPair(text, [
        "Amount 10001 base units is above the cap of 10000.",
        `Recipient ${DEFAULT_RECIPIENT}.`,
        "Reply confirm to broadcast a real transaction that must revert OverCap. No USDC moves.",
        "The earlier refusal is https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83",
      ].join("\n"));
      return;
    }
    if (ask) {
      setInput("");
      setPendingAsk(null);
      void (async () => {
        try {
          const preview = ask.kind === "send"
            ? await previewAgentSend(ask.recipient, ask.amount)
            : await previewAgentSwap(ask.amount);
          setPendingAsk({ kind: ask.kind, amount: ask.amount, recipient: ask.kind === "send" ? ask.recipient : undefined, preview });
          pushPair(text, fieldsText(preview));
        } catch (error) {
          const message = error instanceof Error ? error.message : "The policy refused this. Nothing was signed.";
          pushPair(text, message);
        }
      })();
      return;
    }
    if (/^confirm$/i.test(text) && pendingAsk) {
      const current = pendingAsk;
      setInput("");
      setPendingAsk(null);
      void (async () => {
        try {
          const token = await ensureFlowSession();
          const done = current.kind === "swap"
            ? await confirmAgentSwap(token, current.amount)
            : await confirmAgentSend(token, current.recipient ?? DEFAULT_RECIPIENT, current.amount, current.kind === "revert");
          if (!done.txHash) throw new Error("No transaction hash. Beacon will not show success.");
          const status = current.kind === "revert"
            ? "Broadcast. Open the explorer and confirm the status is reverted. No USDC moved."
            : "Submitted.";
          pushPair(text, `${status}\nArc tx ${done.txHash}\nReceipt ${done.verifyUrl}\n${done.explorer}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "The task failed. Nothing was shown as success.";
          pushPair(text, message);
        }
      })();
      return;
    }
    setInput("");
    chat.mutate(text);
  }

  function send() {
    submit(input);
  }

  const bal = balancesQuery.data?.balances ?? null;
  const recentActivity = activityQuery.data?.activity?.slice(0, 5) ?? [];
  const latestModel = [...messages].reverse().find((m) => m.role === "assistant" && m.displayModel)?.displayModel;

  const activeExecution = useMemo(() => {
    const found = findActiveExecution(messages, executionStates, settledServiceIds, convState);
    if (!found) return null;
    const key = `${found.msgId}:${found.cardIndex}`;
    if (dismissedExecKey === key && found.dismissible) return null;
    return found;
  }, [messages, executionStates, settledServiceIds, convState, dismissedExecKey]);

  function handlePaidResend(
    _payment: Record<string, unknown>,
    _meta: PaidResendMeta,
    _card: AgentCard,
    _msg: ChatMsg,
  ) {
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "This chat does not settle USDC. Open the vault, sign the action, and wait for an Arc transaction hash.",
        displayModel: "Arc vault",
      },
    ]);
  }

  return (
    <div className="relative flex h-full max-h-dvh overflow-hidden bg-[var(--p-bg)] text-[var(--p-fg)]">
      {historyOpen && (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/40 md:hidden"
          aria-label="Close history"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      <HistoryRail
        open={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
        wallet={wallet}
        conversations={conversations}
        conversationId={conversationId}
        convSearch={convSearch}
        onSearch={setConvSearch}
        renamingId={renamingId}
        renameValue={renameValue}
        onRenameValue={setRenameValue}
        onStartRename={(id, title) => {
          setRenamingId(id);
          setRenameValue(title);
        }}
        onCancelRename={() => setRenamingId(null)}
        onCommitRename={() => {
          setRenamingId(null);
        }}
        onLoad={(id) => {
          if (wallet) void loadConversation(id, wallet);
        }}
        onPin={() => undefined}
        onArchive={(id) => {
          if (conversationId === id) void startNewChat();
        }}
        onNewChat={() => void startNewChat()}
        recentActivity={recentActivity}
        loading={conversationsQuery.isLoading}
        persistError={
          conversationsQuery.error instanceof ApiError
            ? conversationsQuery.error.message
            : conversationsQuery.error
              ? "Chat history could not be loaded."
              : null
        }
      />

      <main className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row")}>
        <ChatColumn
          agentName={active.name}
          displayModel={latestModel}
          wallet={wallet}
          connecting={connecting || !ready}
          balances={bal}
          onConnect={() => void onConnect()}
          onOpenHistory={() => setHistoryOpen(true)}
          historyOpen={historyOpen}
          onOpenWhyZeroG={() => setWhyZeroGOpen(true)}
          messages={messages}
          pending={chat.isPending}
          convState={convState}
          settledServiceIds={settledServiceIds}
          executionStates={executionStates}
          onExecutionStateChange={onExecutionStateChange}
          onBalancesRefresh={() => {
            if (wallet) void qc.invalidateQueries({ queryKey: ["balances", wallet] });
          }}
          onTxConfirmed={() => undefined}
          onQuickReply={(text) => {
            submit(text);
          }}
          onPaidResend={handlePaidResend}
          input={input}
          onInputChange={setInput}
          onSend={send}
        />

        <EvidencePanel
          active={activeExecution}
          onDismiss={() => {
            if (!activeExecution) return;
            setDismissedExecKey(`${activeExecution.msgId}:${activeExecution.cardIndex}`);
          }}
          onNextSuggestion={(text) => {
            setInput(text);
          }}
        />
      </main>

      <WhyZeroGDrawer open={whyZeroGOpen} onClose={() => setWhyZeroGOpen(false)} />
      <OnboardingWalkthrough open={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />
    </div>
  );
}
