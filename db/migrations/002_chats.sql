-- Chat history for the connected wallet. Payments stay on Arc.

create table if not exists flow_conversations (
  id text primary key,
  wallet text not null,
  title text not null,
  agent_id text not null default 'general',
  pinned boolean not null default false,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists flow_conversations_wallet_idx
  on flow_conversations (wallet, updated_at desc);

create table if not exists flow_messages (
  id text primary key,
  conversation_id text not null references flow_conversations (id) on delete cascade,
  role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists flow_messages_conversation_idx
  on flow_messages (conversation_id, created_at);
