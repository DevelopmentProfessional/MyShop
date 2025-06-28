-- Fix Team Members for Project 1
-- This script adds members to existing teams and ensures proper project assignments

-- First, let's add members to the existing teams that are currently assigned to project 1

-- Add members to Orientation team (team_id = 3)
INSERT INTO team_members (team_id, employee_id) VALUES
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to IT Support team (team_id = 1) 
INSERT INTO team_members (team_id, employee_id) VALUES
(1, 3), (1, 24), (1, 25), (1, 12), (1, 18)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to HR Team (team_id = 2)
INSERT INTO team_members (team_id, employee_id) VALUES
(2, 2), (2, 20), (2, 21), (2, 19)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to Finance Team
INSERT INTO team_members (team_id, employee_id) VALUES
((SELECT team_id FROM teams WHERE name = 'Finance Team'), 22),
((SELECT team_id FROM teams WHERE name = 'Finance Team'), 23),
((SELECT team_id FROM teams WHERE name = 'Finance Team'), 14)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to IT Team
INSERT INTO team_members (team_id, employee_id) VALUES
((SELECT team_id FROM teams WHERE name = 'IT Team'), 24),
((SELECT team_id FROM teams WHERE name = 'IT Team'), 25),
((SELECT team_id FROM teams WHERE name = 'IT Team'), 12),
((SELECT team_id FROM teams WHERE name = 'IT Team'), 18)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to Facilities Team
INSERT INTO team_members (team_id, employee_id) VALUES
((SELECT team_id FROM teams WHERE name = 'Facilities Team'), 26),
((SELECT team_id FROM teams WHERE name = 'Facilities Team'), 27)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to Storehouse Team
INSERT INTO team_members (team_id, employee_id) VALUES
((SELECT team_id FROM teams WHERE name = 'Storehouse Team'), 28),
((SELECT team_id FROM teams WHERE name = 'Storehouse Team'), 29)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to Payroll Team
INSERT INTO team_members (team_id, employee_id) VALUES
((SELECT team_id FROM teams WHERE name = 'Payroll Team'), 21),
((SELECT team_id FROM teams WHERE name = 'Payroll Team'), 20)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Add members to Programming Team
INSERT INTO team_members (team_id, employee_id) VALUES
((SELECT team_id FROM teams WHERE name = 'Programming Team'), 25),
((SELECT team_id FROM teams WHERE name = 'Programming Team'), 4),
((SELECT team_id FROM teams WHERE name = 'Programming Team'), 16),
((SELECT team_id FROM teams WHERE name = 'Programming Team'), 17)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Now let's also assign our new specialized teams to project 1 (in addition to existing teams)
-- This will give us both the department teams and the project-specific teams

-- Assign our new specialized teams to project 1
INSERT INTO project_teams (project_id, team_id) VALUES
(1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9)
ON CONFLICT (project_id, team_id) DO NOTHING;

-- Update project 1 to have a better description
UPDATE projects SET 
    description = 'Comprehensive onboarding automation system that streamlines the entire new hire process from application to first day. Includes digital document management, automated workflows, and integrated training modules.',
    swot = 'Strengths: Strong development team, clear requirements, good stakeholder buy-in. Weaknesses: Tight timeline, limited budget for additional resources. Opportunities: Potential for similar projects, market demand for automation. Threats: Competing solutions, changing requirements.',
    roi = 25000.00,
    review_status = 'in_progress'
WHERE project_id = 1;

COMMIT; 