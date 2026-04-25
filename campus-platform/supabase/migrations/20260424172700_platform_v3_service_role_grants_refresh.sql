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

alter default privileges in schema identity grant all on tables to service_role;
alter default privileges in schema catalog grant all on tables to service_role;
alter default privileges in schema delivery grant all on tables to service_role;
alter default privileges in schema enrollment grant all on tables to service_role;
alter default privileges in schema learning grant all on tables to service_role;
alter default privileges in schema credentials grant all on tables to service_role;

alter default privileges in schema identity grant usage, select on sequences to service_role;
alter default privileges in schema catalog grant usage, select on sequences to service_role;
alter default privileges in schema delivery grant usage, select on sequences to service_role;
alter default privileges in schema enrollment grant usage, select on sequences to service_role;
alter default privileges in schema learning grant usage, select on sequences to service_role;
alter default privileges in schema credentials grant usage, select on sequences to service_role;
