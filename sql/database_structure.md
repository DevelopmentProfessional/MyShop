# Database Structure Documentation

## Shift Scheduling Tables

Based on the foreign key relationships and indexes found in the database, the following shift scheduling tables exist:

### 1. shift_templates
- **Primary Key**: `id`
- **Indexes**: 
  - `shift_templates_pkey` (PRIMARY KEY)
  - `idx_shift_templates_active` (on `is_active`)
  - `idx_shift_templates_name` (on `name`)

### 2. shift_assignments
- **Primary Key**: `id`
- **Foreign Keys**:
  - `template_id` → `shift_templates.id`
  - `employee_id` → `employees.id`
  - `rotation_id` → `shift_rotations.id`
- **Indexes**:
  - `shift_assignments_pkey` (PRIMARY KEY)
  - `idx_shift_assignments_date` (on `date`)
  - `idx_shift_assignments_employee_date` (on `employee_id`, `date`)
  - `idx_shift_assignments_rotation` (on `rotation_id`, `rotation_position`)
  - `idx_shift_assignments_status` (on `status`)

### 3. shift_rotations
- **Primary Key**: `id`
- **Indexes**:
  - `shift_rotations_pkey` (PRIMARY KEY)
  - `idx_shift_rotations_start_date` (on `start_date`)
  - `idx_shift_rotations_status` (on `status`)

### 4. rotation_shift_assignments
- **Primary Key**: `id`
- **Foreign Keys**:
  - `rotation_id` → `shift_rotations.id`
  - `template_id` → `shift_templates.id`
- **Indexes**:
  - `rotation_shift_assignments_pkey` (PRIMARY KEY)
  - `idx_rotation_shift_assignments_rotation_position` (on `rotation_id`, `position`)
  - `rotation_shift_assignments_rotation_id_position_key` (UNIQUE on `rotation_id`, `position`)

### 5. rotation_employee_assignments
- **Primary Key**: `id`
- **Foreign Keys**:
  - `rotation_id` → `shift_rotations.id`
  - `employee_id` → `employees.id`
- **Indexes**:
  - `rotation_employee_assignments_pkey` (PRIMARY KEY)
  - `idx_rotation_employee_assignments_employee` (on `employee_id`)
  - `idx_rotation_employee_assignments_rotation_position` (on `rotation_id`, `position`)
  - `rotation_employee_assignments_rotation_id_position_employee_key` (UNIQUE on `rotation_id`, `position`, `employee_id`)

### 6. recurring_shift_patterns
- **Primary Key**: `id`
- **Foreign Keys**:
  - `template_id` → `shift_templates.id`
  - `employee_id` → `employees.id`
- **Indexes**:
  - `recurring_shift_patterns_pkey` (PRIMARY KEY)
  - `idx_recurring_shift_patterns_active` (on `is_active`)
  - `idx_recurring_shift_patterns_date_range` (on `start_date`, `end_date`)
  - `idx_recurring_shift_patterns_type` (on `pattern_type`)

### 7. employees
- **Primary Key**: `id`
- **Foreign Keys**:
  - `supervisor_id` → `employees.id` (self-referencing)
- **Indexes**:
  - `employees_pkey` (PRIMARY KEY)
  - `employees_email_key` (UNIQUE on `email`)

## Database Connection Issue

The current issue is with the database connection configuration. The error "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string" indicates that:

1. PostgreSQL is configured to require authentication
2. The password field is being set to `null` or `undefined` instead of a string
3. An empty string `''` works for the password

## Required Fix

Update all database connection configurations to use:
```javascript
{
    host: 'localhost',
    user: 'postgres',
    password: '', // Empty string, not null or undefined
    database: 'shopy_db',
    port: 5432
}
```

## Next Steps

1. Verify the exact column structure of each table
2. Update API queries to match the actual database schema
3. Test all shift scheduling functionality 