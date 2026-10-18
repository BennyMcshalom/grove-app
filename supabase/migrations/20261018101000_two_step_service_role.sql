-- Fix for 20261018100000_two_step_enforcement: PostgREST runs the pre-request
-- check for every role, including the service role (webhooks, billing sync,
-- email jobs, rate limits), which wasn't allowed to execute it. Its own check
-- only ever stops `authenticated` callers.
grant execute on function private.check_request() to service_role;
grant execute on function private.two_step_satisfied() to service_role;
grant usage on schema private to anon, service_role;
