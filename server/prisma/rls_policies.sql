-- PostgreSQL Row-Level Security (RLS) Policies for Multi-Tenant Isolation
-- Applied to ensure no cross-tenant data leaks even if an application query has a bug.

-- 1. Enable RLS on tenant-scoped tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Companies table policy
-- Allow access only when the active company ID matches app.current_company_id
CREATE POLICY company_tenant_isolation ON companies
  FOR ALL
  USING (id = NULLIF(current_setting('app.current_company_id', true), '')::text);

-- 3. Memberships table policy
CREATE POLICY membership_tenant_isolation ON memberships
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::text);

-- 4. Invitations table policy
CREATE POLICY invitation_tenant_isolation ON invitations
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::text);

-- 5. Audit Logs table policy
CREATE POLICY audit_log_tenant_isolation ON audit_logs
  FOR ALL
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::text);
