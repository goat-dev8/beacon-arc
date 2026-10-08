-- Coordination only. Balances, policy, and receipts stay on Arc.

create table if not exists sessions (
  address text primary key,
  nonce text not null,
  expires_at timestamptz not null
);

create table if not exists session_tokens (
  token_hash text primary key,
  address text not null,
  expires_at timestamptz not null
);

create table if not exists agent_grants (
  id text primary key,
  vault text not null,
  agent text not null,
  bearer_hash text not null unique,
  scopes text not null,
  max_per_tx numeric not null,
  expires_at timestamptz not null,
  revoked boolean not null default false
);

create table if not exists action_idempotency (
  action_hash text primary key,
  tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists deny_log (
  id bigserial primary key,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists indexer_cursor (
  name text primary key,
  block bigint not null
);
