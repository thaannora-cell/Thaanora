-- Fix (A2): the website saves a notification choice as "insert, or update if it exists", which also
-- writes customer_id and type. Allow those columns; Row Level Security still keeps every row to the
-- customer's own id, so she can't move or change anyone else's choices.
grant update (customer_id, type, channel, updated_at) on public.notification_prefs to authenticated;
