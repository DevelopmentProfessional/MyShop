-- Save this as describe_db.sql and run with: psql -d your_db -f describe_db.sql
SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, ordinal_position;

-- List all primary keys
SELECT 
    tc.table_schema, 
    tc.table_name, 
    kc.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
  ON kc.table_name = tc.table_name
  AND kc.table_schema = tc.table_schema
  AND kc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_schema, tc.table_name;

-- List all foreign keys
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_schema, tc.table_name;


"public"	"appointments"	"service_id"	"public"	"services"	"id"
"public"	"appointments"	"client_id"	"public"	"clients"	"id"
"public"	"assets"	"assigned_to"	"public"	"employees"	"id"
"public"	"contract_assets"	"contract_id"	"public"	"contracts"	"id"
"public"	"contract_assets"	"asset_id"	"public"	"assets"	"id"
"public"	"contract_history"	"contract_id"	"public"	"contracts"	"id"
"public"	"contract_history"	"performed_by"	"public"	"employees"	"id"
"public"	"contract_participants"	"contract_id"	"public"	"contracts"	"id"
"public"	"contract_signatures"	"signature_id"	"public"	"signatures"	"id"
"public"	"contract_signatures"	"contract_id"	"public"	"contracts"	"id"
"public"	"contract_signatures"	"signed_by"	"public"	"employees"	"id"
"public"	"contract_transactions"	"contract_id"	"public"	"contracts"	"id"
"public"	"contracts"	"created_by"	"public"	"employees"	"id"
"public"	"employee_benefits"	"benefit_id"	"public"	"benefits"	"id"
"public"	"employee_benefits"	"employee_id"	"public"	"employees"	"id"
"public"	"employee_deductions"	"deduction_id"	"public"	"deductions"	"id"
"public"	"employee_deductions"	"employee_id"	"public"	"employees"	"id"
"public"	"employees"	"supervisor_id"	"public"	"employees"	"id"
"public"	"one_time_payments"	"contract_id"	"public"	"contracts"	"id"
"public"	"payroll"	"employee_id"	"public"	"employees"	"id"
"public"	"payroll_details"	"benefit_id"	"public"	"benefits"	"id"
"public"	"payroll_details"	"deduction_id"	"public"	"deductions"	"id"
"public"	"payroll_details"	"performance_review_id"	"public"	"performance_reviews"	"id"
"public"	"payroll_details"	"payroll_id"	"public"	"payroll"	"payroll_id"
"public"	"performance_reviews"	"employee_id"	"public"	"employees"	"id"
"public"	"project_comments"	"project_id"	"public"	"projects"	"project_id"
"public"	"project_comments"	"author_id"	"public"	"employees"	"id"
"public"	"project_teams"	"project_id"	"public"	"projects"	"project_id"
"public"	"project_teams"	"team_id"	"public"	"teams"	"team_id"
"public"	"recurring_payment_contracts"	"contract_id"	"public"	"contracts"	"id"
"public"	"recurring_payment_contracts"	"recurring_payment_id"	"public"	"recurring_payments"	"id"
"public"	"recurring_payments"	"client_id"	"public"	"clients"	"id"
"public"	"recurring_payments"	"contract_id"	"public"	"contracts"	"id"
"public"	"recurring_shift_patterns"	"template_id"	"public"	"shift_templates"	"id"
"public"	"recurring_shift_patterns"	"employee_id"	"public"	"employees"	"id"
"public"	"role_permissions"	"permission_id"	"public"	"permissions"	"id"
"public"	"role_permissions"	"role_id"	"public"	"roles"	"id"
"public"	"rotation_employee_assignments"	"employee_id"	"public"	"employees"	"id"
"public"	"rotation_employee_assignments"	"rotation_id"	"public"	"shift_rotations"	"id"
"public"	"rotation_shift_assignments"	"rotation_id"	"public"	"shift_rotations"	"id"
"public"	"rotation_shift_assignments"	"template_id"	"public"	"shift_templates"	"id"
"public"	"sessions"	"user_id"	"public"	"users"	"id"
"public"	"shift_assignments"	"rotation_id"	"public"	"shift_rotations"	"id"
"public"	"shift_assignments"	"template_id"	"public"	"shift_templates"	"id"
"public"	"shift_assignments"	"employee_id"	"public"	"employees"	"id"
"public"	"signatures"	"employee_id"	"public"	"employees"	"id"
"public"	"task_comments"	"task_id"	"public"	"tasks"	"task_id"
"public"	"task_comments"	"author_id"	"public"	"employees"	"id"
"public"	"task_resources"	"task_id"	"public"	"tasks"	"task_id"
"public"	"task_resources"	"resource_id"	"public"	"resources"	"resource_id"
"public"	"tasks"	"assigned_to"	"public"	"employees"	"id"
"public"	"tasks"	"assigned_team_id"	"public"	"teams"	"team_id"
"public"	"tasks"	"project_id"	"public"	"projects"	"project_id"
"public"	"tasks"	"assigned_team_id"	"public"	"teams"	"team_id"
"public"	"tasks"	"successor_task_id"	"public"	"tasks"	"task_id"
"public"	"tasks"	"claimed_by"	"public"	"employees"	"id"
"public"	"tasks"	"assigned_to"	"public"	"employees"	"id"
"public"	"team_members"	"employee_id"	"public"	"employees"	"id"
"public"	"team_members"	"team_id"	"public"	"teams"	"team_id"
"public"	"transaction_items"	"transaction_id"	"public"	"transactions"	"id"
"public"	"transaction_items"	"product_id"	"public"	"products"	"id"
"public"	"transactions"	"client_id"	"public"	"clients"	"id"
"public"	"transactions"	"employee_id"	"public"	"employees"	"id"
"public"	"user_permissions"	"user_id"	"public"	"users"	"id"
"public"	"user_permissions"	"permission_id"	"public"	"permissions"	"id"
"public"	"users"	"role_id"	"public"	"roles"	"id"
























-- Database Structure Extraction Script
-- Run this with: psql -d shopy_db -f sql/get_db_structure.sql > sql/db_structure.txt

-- Get all tables and their columns
SELECT 
    'TABLE' as object_type,
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get primary keys
SELECT 
    'PRIMARY_KEY' as object_type,
    tc.table_schema, 
    tc.table_name, 
    kc.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
  ON kc.table_name = tc.table_name
  AND kc.table_schema = tc.table_schema
  AND kc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Get foreign keys
SELECT
    'FOREIGN_KEY' as object_type,
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Get sequences
SELECT 
    'SEQUENCE' as object_type,
    sequence_schema,
    sequence_name
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- Get indexes
SELECT 
    'INDEX' as object_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;



"INDEX"	"public"	"appointments"	"appointments_pkey"	"CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id)"
"INDEX"	"public"	"assets"	"assets_pkey"	"CREATE UNIQUE INDEX assets_pkey ON public.assets USING btree (id)"
"INDEX"	"public"	"assets"	"idx_assets_assigned_to"	"CREATE INDEX idx_assets_assigned_to ON public.assets USING btree (assigned_to)"
"INDEX"	"public"	"assets"	"idx_assets_department"	"CREATE INDEX idx_assets_department ON public.assets USING btree (department)"
"INDEX"	"public"	"assets"	"idx_assets_name"	"CREATE INDEX idx_assets_name ON public.assets USING btree (name)"
"INDEX"	"public"	"assets"	"idx_assets_status"	"CREATE INDEX idx_assets_status ON public.assets USING btree (status)"
"INDEX"	"public"	"assets"	"idx_assets_type"	"CREATE INDEX idx_assets_type ON public.assets USING btree (asset_type)"
"INDEX"	"public"	"benefits"	"benefits_pkey"	"CREATE UNIQUE INDEX benefits_pkey ON public.benefits USING btree (id)"
"INDEX"	"public"	"categories"	"categories_name_key"	"CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name)"
"INDEX"	"public"	"categories"	"categories_pkey"	"CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id)"
"INDEX"	"public"	"clients"	"clients_email_key"	"CREATE UNIQUE INDEX clients_email_key ON public.clients USING btree (email)"
"INDEX"	"public"	"clients"	"clients_pkey"	"CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id)"
"INDEX"	"public"	"contract_assets"	"contract_assets_contract_id_asset_id_key"	"CREATE UNIQUE INDEX contract_assets_contract_id_asset_id_key ON public.contract_assets USING btree (contract_id, asset_id)"
"INDEX"	"public"	"contract_assets"	"contract_assets_pkey"	"CREATE UNIQUE INDEX contract_assets_pkey ON public.contract_assets USING btree (id)"
"INDEX"	"public"	"contract_assets"	"idx_contract_assets_asset_id"	"CREATE INDEX idx_contract_assets_asset_id ON public.contract_assets USING btree (asset_id)"
"INDEX"	"public"	"contract_assets"	"idx_contract_assets_contract_id"	"CREATE INDEX idx_contract_assets_contract_id ON public.contract_assets USING btree (contract_id)"
"INDEX"	"public"	"contract_history"	"contract_history_pkey"	"CREATE UNIQUE INDEX contract_history_pkey ON public.contract_history USING btree (id)"
"INDEX"	"public"	"contract_history"	"idx_contract_history_action_type"	"CREATE INDEX idx_contract_history_action_type ON public.contract_history USING btree (action_type)"
"INDEX"	"public"	"contract_history"	"idx_contract_history_contract_id"	"CREATE INDEX idx_contract_history_contract_id ON public.contract_history USING btree (contract_id)"
"INDEX"	"public"	"contract_history"	"idx_contract_history_performed_at"	"CREATE INDEX idx_contract_history_performed_at ON public.contract_history USING btree (performed_at)"
"INDEX"	"public"	"contract_participants"	"contract_participants_pkey"	"CREATE UNIQUE INDEX contract_participants_pkey ON public.contract_participants USING btree (id)"
"INDEX"	"public"	"contract_participants"	"idx_contract_participants_contract_id"	"CREATE INDEX idx_contract_participants_contract_id ON public.contract_participants USING btree (contract_id)"
"INDEX"	"public"	"contract_participants"	"idx_contract_participants_participant_id"	"CREATE INDEX idx_contract_participants_participant_id ON public.contract_participants USING btree (participant_id)"
"INDEX"	"public"	"contract_participants"	"idx_contract_participants_type"	"CREATE INDEX idx_contract_participants_type ON public.contract_participants USING btree (participant_type)"
"INDEX"	"public"	"contract_signatures"	"contract_signatures_pkey"	"CREATE UNIQUE INDEX contract_signatures_pkey ON public.contract_signatures USING btree (id)"
"INDEX"	"public"	"contract_signatures"	"idx_contract_signatures_contract_id"	"CREATE INDEX idx_contract_signatures_contract_id ON public.contract_signatures USING btree (contract_id)"
"INDEX"	"public"	"contract_transactions"	"contract_transactions_pkey"	"CREATE UNIQUE INDEX contract_transactions_pkey ON public.contract_transactions USING btree (id)"
"INDEX"	"public"	"contract_transactions"	"idx_contract_transactions_contract_id"	"CREATE INDEX idx_contract_transactions_contract_id ON public.contract_transactions USING btree (contract_id)"
"INDEX"	"public"	"contract_transactions"	"idx_contract_transactions_transaction_id"	"CREATE INDEX idx_contract_transactions_transaction_id ON public.contract_transactions USING btree (transaction_id)"
"INDEX"	"public"	"contract_transactions"	"idx_contract_transactions_type"	"CREATE INDEX idx_contract_transactions_type ON public.contract_transactions USING btree (transaction_type)"
"INDEX"	"public"	"contracts"	"contracts_pkey"	"CREATE UNIQUE INDEX contracts_pkey ON public.contracts USING btree (id)"
"INDEX"	"public"	"contracts"	"idx_contracts_department"	"CREATE INDEX idx_contracts_department ON public.contracts USING btree (department)"
"INDEX"	"public"	"contracts"	"idx_contracts_expires_at"	"CREATE INDEX idx_contracts_expires_at ON public.contracts USING btree (expires_at)"
"INDEX"	"public"	"contracts"	"idx_contracts_status"	"CREATE INDEX idx_contracts_status ON public.contracts USING btree (status)"
"INDEX"	"public"	"contracts"	"idx_contracts_type"	"CREATE INDEX idx_contracts_type ON public.contracts USING btree (contract_type)"
"INDEX"	"public"	"customerreminders"	"customerreminders_pkey"	"CREATE UNIQUE INDEX customerreminders_pkey ON public.customerreminders USING btree (id)"
"INDEX"	"public"	"deductions"	"deductions_pkey"	"CREATE UNIQUE INDEX deductions_pkey ON public.deductions USING btree (id)"
"INDEX"	"public"	"employee_benefits"	"employee_benefits_pkey"	"CREATE UNIQUE INDEX employee_benefits_pkey ON public.employee_benefits USING btree (id)"
"INDEX"	"public"	"employee_deductions"	"employee_deductions_pkey"	"CREATE UNIQUE INDEX employee_deductions_pkey ON public.employee_deductions USING btree (id)"
"INDEX"	"public"	"employees"	"employees_email_key"	"CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email)"
"INDEX"	"public"	"employees"	"employees_pkey"	"CREATE UNIQUE INDEX employees_pkey ON public.employees USING btree (id)"
"INDEX"	"public"	"invoice_templates"	"invoice_templates_pkey"	"CREATE UNIQUE INDEX invoice_templates_pkey ON public.invoice_templates USING btree (id)"
"INDEX"	"public"	"one_time_payments"	"idx_one_time_payments_contract_id"	"CREATE INDEX idx_one_time_payments_contract_id ON public.one_time_payments USING btree (contract_id)"
"INDEX"	"public"	"one_time_payments"	"one_time_payments_pkey"	"CREATE UNIQUE INDEX one_time_payments_pkey ON public.one_time_payments USING btree (id)"
"INDEX"	"public"	"payroll"	"payroll_pkey"	"CREATE UNIQUE INDEX payroll_pkey ON public.payroll USING btree (payroll_id)"
"INDEX"	"public"	"payroll_details"	"payroll_details_pkey"	"CREATE UNIQUE INDEX payroll_details_pkey ON public.payroll_details USING btree (id)"
"INDEX"	"public"	"performance_reviews"	"performance_reviews_pkey"	"CREATE UNIQUE INDEX performance_reviews_pkey ON public.performance_reviews USING btree (id)"
"INDEX"	"public"	"permissions"	"permissions_name_key"	"CREATE UNIQUE INDEX permissions_name_key ON public.permissions USING btree (name)"
"INDEX"	"public"	"permissions"	"permissions_pkey"	"CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id)"
"INDEX"	"public"	"photos"	"photos_pkey1"	"CREATE UNIQUE INDEX photos_pkey1 ON public.photos USING btree (id)"
"INDEX"	"public"	"photos_products"	"photos_pkey"	"CREATE UNIQUE INDEX photos_pkey ON public.photos_products USING btree (id)"
"INDEX"	"public"	"photos_services"	"photos_services_pkey"	"CREATE UNIQUE INDEX photos_services_pkey ON public.photos_services USING btree (id)"
"INDEX"	"public"	"products"	"products_pkey"	"CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id)"
"INDEX"	"public"	"project_comments"	"project_comments_pkey"	"CREATE UNIQUE INDEX project_comments_pkey ON public.project_comments USING btree (comment_id)"
"INDEX"	"public"	"project_teams"	"project_teams_pkey"	"CREATE UNIQUE INDEX project_teams_pkey ON public.project_teams USING btree (project_id, team_id)"
"INDEX"	"public"	"projects"	"projects_pkey"	"CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (project_id)"
"INDEX"	"public"	"recruits"	"recruits_pkey"	"CREATE UNIQUE INDEX recruits_pkey ON public.recruits USING btree (id)"
"INDEX"	"public"	"recurring_payment_contracts"	"idx_recurring_payment_contracts_contract_id"	"CREATE INDEX idx_recurring_payment_contracts_contract_id ON public.recurring_payment_contracts USING btree (contract_id)"
"INDEX"	"public"	"recurring_payment_contracts"	"idx_recurring_payment_contracts_rp_id"	"CREATE INDEX idx_recurring_payment_contracts_rp_id ON public.recurring_payment_contracts USING btree (recurring_payment_id)"
"INDEX"	"public"	"recurring_payment_contracts"	"recurring_payment_contracts_pkey"	"CREATE UNIQUE INDEX recurring_payment_contracts_pkey ON public.recurring_payment_contracts USING btree (id)"
"INDEX"	"public"	"recurring_payments"	"recurring_payments_pkey"	"CREATE UNIQUE INDEX recurring_payments_pkey ON public.recurring_payments USING btree (id)"
"INDEX"	"public"	"recurring_shift_patterns"	"idx_recurring_shift_patterns_active"	"CREATE INDEX idx_recurring_shift_patterns_active ON public.recurring_shift_patterns USING btree (is_active)"
"INDEX"	"public"	"recurring_shift_patterns"	"idx_recurring_shift_patterns_date_range"	"CREATE INDEX idx_recurring_shift_patterns_date_range ON public.recurring_shift_patterns USING btree (start_date, end_date)"
"INDEX"	"public"	"recurring_shift_patterns"	"idx_recurring_shift_patterns_type"	"CREATE INDEX idx_recurring_shift_patterns_type ON public.recurring_shift_patterns USING btree (pattern_type)"
"INDEX"	"public"	"recurring_shift_patterns"	"recurring_shift_patterns_pkey"	"CREATE UNIQUE INDEX recurring_shift_patterns_pkey ON public.recurring_shift_patterns USING btree (id)"
"INDEX"	"public"	"resources"	"resources_pkey"	"CREATE UNIQUE INDEX resources_pkey ON public.resources USING btree (resource_id)"
"INDEX"	"public"	"role_permissions"	"role_permissions_pkey"	"CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (role_id, permission_id)"
"INDEX"	"public"	"roles"	"roles_name_key"	"CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name)"
"INDEX"	"public"	"roles"	"roles_pkey"	"CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)"
"INDEX"	"public"	"rotation_employee_assignments"	"idx_rotation_employee_assignments_employee"	"CREATE INDEX idx_rotation_employee_assignments_employee ON public.rotation_employee_assignments USING btree (employee_id)"
"INDEX"	"public"	"rotation_employee_assignments"	"idx_rotation_employee_assignments_rotation_position"	"CREATE INDEX idx_rotation_employee_assignments_rotation_position ON public.rotation_employee_assignments USING btree (rotation_id, ""position"")"
"INDEX"	"public"	"rotation_employee_assignments"	"rotation_employee_assignments_pkey"	"CREATE UNIQUE INDEX rotation_employee_assignments_pkey ON public.rotation_employee_assignments USING btree (id)"
"INDEX"	"public"	"rotation_employee_assignments"	"rotation_employee_assignments_rotation_id_position_employee_key"	"CREATE UNIQUE INDEX rotation_employee_assignments_rotation_id_position_employee_key ON public.rotation_employee_assignments USING btree (rotation_id, ""position"", employee_id)"
"INDEX"	"public"	"rotation_shift_assignments"	"idx_rotation_shift_assignments_rotation_position"	"CREATE INDEX idx_rotation_shift_assignments_rotation_position ON public.rotation_shift_assignments USING btree (rotation_id, ""position"")"
"INDEX"	"public"	"rotation_shift_assignments"	"rotation_shift_assignments_pkey"	"CREATE UNIQUE INDEX rotation_shift_assignments_pkey ON public.rotation_shift_assignments USING btree (id)"
"INDEX"	"public"	"rotation_shift_assignments"	"rotation_shift_assignments_rotation_id_position_key"	"CREATE UNIQUE INDEX rotation_shift_assignments_rotation_id_position_key ON public.rotation_shift_assignments USING btree (rotation_id, ""position"")"
"INDEX"	"public"	"services"	"services_pkey"	"CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id)"
"INDEX"	"public"	"sessions"	"sessions_pkey"	"CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id)"
"INDEX"	"public"	"shift_assignments"	"idx_shift_assignments_date"	"CREATE INDEX idx_shift_assignments_date ON public.shift_assignments USING btree (date)"
"INDEX"	"public"	"shift_assignments"	"idx_shift_assignments_employee_date"	"CREATE INDEX idx_shift_assignments_employee_date ON public.shift_assignments USING btree (employee_id, date)"
"INDEX"	"public"	"shift_assignments"	"idx_shift_assignments_rotation"	"CREATE INDEX idx_shift_assignments_rotation ON public.shift_assignments USING btree (rotation_id, rotation_position)"
"INDEX"	"public"	"shift_assignments"	"idx_shift_assignments_status"	"CREATE INDEX idx_shift_assignments_status ON public.shift_assignments USING btree (status)"
"INDEX"	"public"	"shift_assignments"	"shift_assignments_pkey"	"CREATE UNIQUE INDEX shift_assignments_pkey ON public.shift_assignments USING btree (id)"
"INDEX"	"public"	"shift_rotations"	"idx_shift_rotations_start_date"	"CREATE INDEX idx_shift_rotations_start_date ON public.shift_rotations USING btree (start_date)"
"INDEX"	"public"	"shift_rotations"	"idx_shift_rotations_status"	"CREATE INDEX idx_shift_rotations_status ON public.shift_rotations USING btree (status)"
"INDEX"	"public"	"shift_rotations"	"shift_rotations_pkey"	"CREATE UNIQUE INDEX shift_rotations_pkey ON public.shift_rotations USING btree (id)"
"INDEX"	"public"	"shift_templates"	"idx_shift_templates_active"	"CREATE INDEX idx_shift_templates_active ON public.shift_templates USING btree (is_active)"
"INDEX"	"public"	"shift_templates"	"idx_shift_templates_name"	"CREATE INDEX idx_shift_templates_name ON public.shift_templates USING btree (name)"
"INDEX"	"public"	"shift_templates"	"shift_templates_pkey"	"CREATE UNIQUE INDEX shift_templates_pkey ON public.shift_templates USING btree (id)"
"INDEX"	"public"	"signatures"	"idx_signatures_employee_id"	"CREATE INDEX idx_signatures_employee_id ON public.signatures USING btree (employee_id)"
"INDEX"	"public"	"signatures"	"signatures_employee_id_signature_name_key"	"CREATE UNIQUE INDEX signatures_employee_id_signature_name_key ON public.signatures USING btree (employee_id, signature_name)"
"INDEX"	"public"	"signatures"	"signatures_pkey"	"CREATE UNIQUE INDEX signatures_pkey ON public.signatures USING btree (id)"
"INDEX"	"public"	"task_comments"	"task_comments_pkey"	"CREATE UNIQUE INDEX task_comments_pkey ON public.task_comments USING btree (comment_id)"
"INDEX"	"public"	"task_resources"	"task_resources_pkey"	"CREATE UNIQUE INDEX task_resources_pkey ON public.task_resources USING btree (task_id, resource_id)"
"INDEX"	"public"	"tasks"	"tasks_pkey"	"CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (task_id)"
"INDEX"	"public"	"team_members"	"team_members_pkey"	"CREATE UNIQUE INDEX team_members_pkey ON public.team_members USING btree (team_id, employee_id)"
"INDEX"	"public"	"teams"	"teams_pkey"	"CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (team_id)"
"INDEX"	"public"	"transaction_items"	"transaction_items_pkey"	"CREATE UNIQUE INDEX transaction_items_pkey ON public.transaction_items USING btree (id)"
"INDEX"	"public"	"transactions"	"transactions_pkey"	"CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id)"
"INDEX"	"public"	"user_permissions"	"user_permissions_pkey"	"CREATE UNIQUE INDEX user_permissions_pkey ON public.user_permissions USING btree (user_id, permission_id)"
"INDEX"	"public"	"users"	"users_email_key"	"CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)"
"INDEX"	"public"	"users"	"users_pkey"	"CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)"
"INDEX"	"public"	"users"	"users_username_key"	"CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username)"
"INDEX"	"public"	"vendors"	"vendors_pkey"	"CREATE UNIQUE INDEX vendors_pkey ON public.vendors USING btree (id)"

-- Complete Database Schema Description
-- Run this to get all table structures for comparison with API queries

-- Main query: All tables and columns with data types
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    CASE 
        WHEN c.character_maximum_length IS NOT NULL 
        THEN c.data_type || '(' || c.character_maximum_length || ')'
        WHEN c.numeric_precision IS NOT NULL AND c.numeric_scale IS NOT NULL
        THEN c.data_type || '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
        ELSE c.data_type
    END as full_data_type,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
        ELSE ''
    END as key_type,
    CASE 
        WHEN fk.column_name IS NOT NULL THEN 
            fk.foreign_table_name || '.' || fk.foreign_column_name
        ELSE ''
    END as foreign_key_reference
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON t.table_name = fk.table_name AND c.column_name = fk.column_name
LEFT JOIN (
    SELECT 
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- Summary: Just table names
SELECT '=== TABLE LIST ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Foreign Key Relationships
SELECT '=== FOREIGN KEY RELATIONSHIPS ===' as info;
SELECT 
    tc.table_name as table_name,
    kcu.column_name as column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Primary Keys
SELECT '=== PRIMARY KEYS ===' as info;
SELECT 
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Indexes
SELECT '=== INDEXES ===' as info;
SELECT 
    t.relname as table_name,
    i.relname as index_name,
    array_to_string(array_agg(a.attname), ', ') as column_names,
    ix.indisunique as is_unique,
    ix.indisprimary as is_primary
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relkind = 'r' 
    AND t.relname IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
    )
GROUP BY t.relname, i.relname, ix.indisunique, ix.indisprimary
ORDER BY t.relname, i.relname;