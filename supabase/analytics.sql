-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.analytics_events (
  id uuid primary key,
  event_type text not null check (event_type in ('page_view', 'search', 'api_call')),
  occurred_at timestamptz not null default now(),
  session_id text,
  visitor_id text,
  path text,
  referrer text,
  search_query text,
  search_kind text check (search_kind is null or search_kind in ('university', 'subject', 'unknown')),
  search_result text,
  endpoint text,
  method text,
  status_code integer,
  duration_ms integer,
  country text,
  city text,
  device text check (device is null or device in ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
  browser text,
  operating_system text
);

create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_type_time_idx
  on public.analytics_events (event_type, occurred_at desc);
create index if not exists analytics_events_path_time_idx
  on public.analytics_events (path, occurred_at desc) where path is not null;
create index if not exists analytics_events_search_time_idx
  on public.analytics_events (search_kind, occurred_at desc) where event_type = 'search';
create index if not exists analytics_events_endpoint_time_idx
  on public.analytics_events (endpoint, occurred_at desc) where event_type = 'api_call';

alter table public.analytics_events enable row level security;

-- No anon/authenticated policies are intentionally created. Browser clients cannot
-- read or write this table. The Next.js server uses a Supabase secret/service-role key.
revoke all on table public.analytics_events from anon, authenticated;
grant select, insert on table public.analytics_events to service_role;

comment on table public.analytics_events is
  'Anonymous traffic, search and API telemetry recorded by the Tercih Pusulasi server.';

-- Optional manual retention cleanup (example: keep 180 days):
-- delete from public.analytics_events where occurred_at < now() - interval '180 days';
