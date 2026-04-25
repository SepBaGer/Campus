alter role authenticator
set pgrst.db_schemas = 'public, graphql_public, identity, catalog, delivery, enrollment, learning, credentials';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
