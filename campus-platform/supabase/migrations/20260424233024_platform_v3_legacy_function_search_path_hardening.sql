-- Harden legacy trigger/RPC functions flagged by Supabase Security Advisor
-- `function_search_path_mutable` without changing their signatures or behavior.

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, membership_plan, membership_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), ''),
    'free',
    'inactive'
  );
  return new;
end;
$$;

create or replace function public.add_xp_and_check_level_up(
  p_user_id uuid,
  p_xp_gained integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_xp integer;
  v_current_level integer;
  v_new_xp integer;
  v_new_level integer;
  v_level_up boolean := false;
begin
  select total_xp, current_level
  into v_current_xp, v_current_level
  from public.profiles
  where id = p_user_id;

  v_new_xp := v_current_xp + p_xp_gained;

  select orden
  into v_new_level
  from public.levels
  where xp_required <= v_new_xp
  order by orden desc
  limit 1;

  if v_new_level > v_current_level then
    v_level_up := true;
  else
    v_new_level := v_current_level;
  end if;

  update public.profiles
  set total_xp = v_new_xp,
      current_level = v_new_level,
      updated_at = now()
  where id = p_user_id;

  return v_level_up;
end;
$$;
