-- Supabase SQL Editor에서 한 번 실행하세요.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro')),
  plan_expires_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now()
);

-- 빌링키는 사용자에게 노출하지 않는다 (정책 없음 = 서비스 롤만 접근).
create table public.billing (
  user_id uuid primary key references auth.users on delete cascade,
  billing_key text not null,
  updated_at timestamptz not null default now()
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform text not null,
  tone text not null,
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index generations_user_created_idx on public.generations (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.billing enable row level security;
alter table public.generations enable row level security;

-- 프로필은 본인 것만 읽기 가능, 쓰기는 서비스 롤만 (플랜 위조 방지)
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

create policy "generations_select_own" on public.generations for select using (auth.uid() = user_id);
create policy "generations_insert_own" on public.generations for insert with check (auth.uid() = user_id);
create policy "generations_delete_own" on public.generations for delete using (auth.uid() = user_id);

-- 가입 시 프로필 자동 생성
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
