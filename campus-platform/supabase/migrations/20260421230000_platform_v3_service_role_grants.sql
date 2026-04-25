grant usage on schema identity, catalog, delivery, enrollment, learning, credentials to service_role;

grant usage, select on all sequences in schema identity to service_role;
grant usage, select on all sequences in schema catalog to service_role;
grant usage, select on all sequences in schema delivery to service_role;
grant usage, select on all sequences in schema enrollment to service_role;
grant usage, select on all sequences in schema learning to service_role;
grant usage, select on all sequences in schema credentials to service_role;

grant all on all tables in schema identity to service_role;
grant all on all tables in schema catalog to service_role;
grant all on all tables in schema delivery to service_role;
grant all on all tables in schema enrollment to service_role;
grant all on all tables in schema learning to service_role;
grant all on all tables in schema credentials to service_role;
