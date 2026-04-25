# Enterprise SSO / SAML

This directory keeps operator-safe helpers for strict enterprise SAML setup.

Supabase is the Service Provider for Campus Platform. Customer identity
providers are registered remotely with the Supabase CLI:

```powershell
.\scripts\supabase-platform.ps1 sso info --project-ref exyewjzckgsesrsuqueh
.\scripts\supabase-platform.ps1 sso add --type saml --project-ref exyewjzckgsesrsuqueh --metadata-url "https://CLIENT-IDP/metadata" --domains cliente.com --attribute-mapping-file "campus-platform\supabase\sso\attribute-mapping.enterprise.example.json"
.\scripts\supabase-platform.ps1 sso list --project-ref exyewjzckgsesrsuqueh -o json
```

Use metadata URLs when possible so IdP key rotation can be handled without
committing XML files or secrets to the repo.

Do not use mapped SAML attributes from user metadata for authorization
decisions. Campus authorization must stay tied to Supabase user UUIDs and
server-side role records.
