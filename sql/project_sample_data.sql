-- Sample data for Project ID 1 - Comprehensive test data
-- This script adds extensive sample data for testing layouts and functionality

-- Insert additional employees for project teams
INSERT INTO employees (id, name, email, role, department) VALUES
(4, 'Michael Chen', 'michael.chen@myshop.com', 'Senior Developer', 'IT'),
(5, 'Sarah Wilson', 'sarah.wilson@myshop.com', 'UI/UX Designer', 'IT'),
(6, 'David Thompson', 'david.thompson@myshop.com', 'Project Manager', 'Management'),
(7, 'Emily Rodriguez', 'emily.rodriguez@myshop.com', 'Business Analyst', 'Analytics'),
(8, 'James Anderson', 'james.anderson@myshop.com', 'QA Engineer', 'IT'),
(9, 'Lisa Taylor', 'lisa.taylor@myshop.com', 'Marketing Specialist', 'Marketing'),
(10, 'Robert Martinez', 'robert.martinez@myshop.com', 'Sales Representative', 'Sales'),
(11, 'Jennifer Garcia', 'jennifer.garcia@myshop.com', 'Customer Success', 'Support'),
(12, 'Christopher Lee', 'christopher.lee@myshop.com', 'DevOps Engineer', 'IT'),
(13, 'Amanda White', 'amanda.white@myshop.com', 'Content Writer', 'Marketing'),
(14, 'Daniel Brown', 'daniel.brown@myshop.com', 'Data Analyst', 'Analytics'),
(15, 'Nicole Johnson', 'nicole.johnson@myshop.com', 'Product Manager', 'Product'),
(16, 'Kevin Davis', 'kevin.davis@myshop.com', 'Frontend Developer', 'IT'),
(17, 'Rachel Miller', 'rachel.miller@myshop.com', 'Backend Developer', 'IT'),
(18, 'Thomas Wilson', 'thomas.wilson@myshop.com', 'System Administrator', 'IT'),
(19, 'Jessica Moore', 'jessica.moore@myshop.com', 'HR Coordinator', 'HR'),
-- Additional employees for more populated teams
(20, 'Alex Turner', 'alex.turner@myshop.com', 'Full Stack Developer', 'IT'),
(21, 'Maria Santos', 'maria.santos@myshop.com', 'UX Researcher', 'Design'),
(22, 'Ryan Cooper', 'ryan.cooper@myshop.com', 'Mobile Developer', 'IT'),
(23, 'Sophie Kim', 'sophie.kim@myshop.com', 'Visual Designer', 'Design'),
(24, 'Carlos Mendez', 'carlos.mendez@myshop.com', 'Test Automation Engineer', 'IT'),
(25, 'Emma Thompson', 'emma.thompson@myshop.com', 'Performance Tester', 'IT'),
(26, 'Marcus Johnson', 'marcus.johnson@myshop.com', 'Digital Marketing Manager', 'Marketing'),
(27, 'Isabella Rodriguez', 'isabella.rodriguez@myshop.com', 'Social Media Specialist', 'Marketing'),
(28, 'Lucas Wang', 'lucas.wang@myshop.com', 'Data Scientist', 'Analytics'),
(29, 'Grace Lee', 'grace.lee@myshop.com', 'Business Intelligence Analyst', 'Analytics'),
(30, 'Oscar Martinez', 'oscar.martinez@myshop.com', 'Technical Writer', 'Support'),
(31, 'Ava Johnson', 'ava.johnson@myshop.com', 'Training Coordinator', 'Support'),
(32, 'Ethan Davis', 'ethan.davis@myshop.com', 'Security Engineer', 'IT'),
(33, 'Zoe Anderson', 'zoe.anderson@myshop.com', 'Database Administrator', 'IT'),
(34, 'Noah Garcia', 'noah.garcia@myshop.com', 'Cloud Architect', 'IT'),
(35, 'Mia Thompson', 'mia.thompson@myshop.com', 'Product Designer', 'Design')
ON CONFLICT (id) DO NOTHING;

-- Insert 6 teams for project
INSERT INTO teams (team_id, name, description) VALUES
(4, 'Development Team', 'Core development team for technical implementation'),
(5, 'Design Team', 'UI/UX and visual design specialists'),
(6, 'QA Team', 'Quality assurance and testing team'),
(7, 'Marketing Team', 'Marketing and communication specialists'),
(8, 'Analytics Team', 'Data analysis and reporting team'),
(9, 'Support Team', 'Customer support and documentation team')
ON CONFLICT (team_id) DO NOTHING;

-- Assign team members to teams (enhanced with more members)
INSERT INTO team_members (team_id, employee_id) VALUES
-- Development Team (6 members)
(4, 4), (4, 16), (4, 17), (4, 12), (4, 20), (4, 22),
-- Design Team (5 members)
(5, 5), (5, 13), (5, 21), (5, 23), (5, 35),
-- QA Team (4 members)
(6, 8), (6, 18), (6, 24), (6, 25),
-- Marketing Team (4 members)
(7, 9), (7, 13), (7, 26), (7, 27),
-- Analytics Team (4 members)
(8, 7), (8, 14), (8, 28), (8, 29),
-- Support Team (4 members)
(9, 11), (9, 19), (9, 30), (9, 31)
ON CONFLICT (team_id, employee_id) DO NOTHING;

-- Assign teams to project 1
INSERT INTO project_teams (project_id, team_id) VALUES
(1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9)
ON CONFLICT (project_id, team_id) DO NOTHING;

-- Insert 30 tasks with various assignments
INSERT INTO tasks (task_id, project_id, title, description, assigned_team_id, assigned_to, status, is_milestone, start_time, end_time) VALUES
-- Milestone tasks
(4, 1, 'Project Planning Complete', 'Initial project planning and requirements gathering', 4, 6, 'completed', TRUE, '2024-01-01 09:00:00', '2024-01-15 17:00:00'),
(5, 1, 'Design Phase Complete', 'UI/UX design and wireframes approved', 5, 5, 'completed', TRUE, '2024-01-16 09:00:00', '2024-02-01 17:00:00'),
(6, 1, 'Development Phase Complete', 'Core functionality implemented', 4, 4, 'in_progress', TRUE, '2024-02-02 09:00:00', '2024-03-15 17:00:00'),
(7, 1, 'Testing Phase Complete', 'QA testing and bug fixes complete', 6, 8, 'pending', TRUE, '2024-03-16 09:00:00', '2024-04-01 17:00:00'),
(8, 1, 'Launch Ready', 'Project ready for production launch', 4, 6, 'pending', TRUE, '2024-04-02 09:00:00', '2024-04-15 17:00:00'),

-- Development tasks
(9, 1, 'Database Schema Design', 'Design and implement database structure', 4, 17, 'completed', FALSE, '2024-01-20 09:00:00', '2024-01-25 17:00:00'),
(10, 1, 'API Development', 'Develop RESTful API endpoints', 4, 16, 'in_progress', FALSE, '2024-01-26 09:00:00', '2024-02-10 17:00:00'),
(11, 1, 'Frontend Components', 'Build reusable UI components', 4, 16, 'in_progress', FALSE, '2024-02-01 09:00:00', '2024-02-20 17:00:00'),
(12, 1, 'User Authentication', 'Implement user login and registration', 4, 17, 'completed', FALSE, '2024-01-30 09:00:00', '2024-02-05 17:00:00'),
(13, 1, 'Dashboard Development', 'Create main dashboard interface', 4, 16, 'in_progress', FALSE, '2024-02-15 09:00:00', '2024-03-01 17:00:00'),

-- Design tasks
(14, 1, 'Wireframe Creation', 'Create detailed wireframes', 5, 5, 'completed', FALSE, '2024-01-10 09:00:00', '2024-01-20 17:00:00'),
(15, 1, 'UI Design System', 'Design component library and style guide', 5, 5, 'completed', FALSE, '2024-01-21 09:00:00', '2024-01-30 17:00:00'),
(16, 1, 'Mobile Responsive Design', 'Ensure mobile compatibility', 5, 5, 'in_progress', FALSE, '2024-02-01 09:00:00', '2024-02-15 17:00:00'),
(17, 1, 'Icon and Asset Creation', 'Create custom icons and graphics', 5, 13, 'pending', FALSE, '2024-02-16 09:00:00', '2024-02-25 17:00:00'),

-- QA tasks
(18, 1, 'Test Plan Creation', 'Create comprehensive test plan', 6, 8, 'completed', FALSE, '2024-02-01 09:00:00', '2024-02-10 17:00:00'),
(19, 1, 'Unit Testing', 'Write and execute unit tests', 6, 8, 'in_progress', FALSE, '2024-02-15 09:00:00', '2024-03-01 17:00:00'),
(20, 1, 'Integration Testing', 'Test component integration', 6, 18, 'pending', FALSE, '2024-03-02 09:00:00', '2024-03-15 17:00:00'),
(21, 1, 'User Acceptance Testing', 'Conduct UAT with stakeholders', 6, 8, 'pending', FALSE, '2024-03-16 09:00:00', '2024-03-25 17:00:00'),

-- Marketing tasks
(22, 1, 'Marketing Strategy', 'Develop marketing strategy', 7, 9, 'completed', FALSE, '2024-01-05 09:00:00', '2024-01-15 17:00:00'),
(23, 1, 'Content Creation', 'Create marketing content', 7, 13, 'in_progress', FALSE, '2024-02-01 09:00:00', '2024-02-20 17:00:00'),
(24, 1, 'Launch Campaign', 'Prepare launch campaign materials', 7, 9, 'pending', FALSE, '2024-03-20 09:00:00', '2024-04-01 17:00:00'),

-- Analytics tasks
(25, 1, 'Analytics Setup', 'Set up tracking and analytics', 8, 14, 'completed', FALSE, '2024-01-15 09:00:00', '2024-01-25 17:00:00'),
(26, 1, 'Data Dashboard', 'Create analytics dashboard', 8, 7, 'in_progress', FALSE, '2024-02-10 09:00:00', '2024-02-25 17:00:00'),
(27, 1, 'Performance Monitoring', 'Set up performance monitoring', 8, 14, 'pending', FALSE, '2024-03-01 09:00:00', '2024-03-10 17:00:00'),

-- Support tasks
(28, 1, 'Documentation Creation', 'Create user and technical documentation', 9, 11, 'in_progress', FALSE, '2024-02-15 09:00:00', '2024-03-01 17:00:00'),
(29, 1, 'Training Materials', 'Prepare training materials', 9, 19, 'pending', FALSE, '2024-03-10 09:00:00', '2024-03-20 17:00:00'),
(30, 1, 'Support Process Setup', 'Establish support processes', 9, 11, 'pending', FALSE, '2024-03-25 09:00:00', '2024-04-05 17:00:00'),

-- Additional development tasks
(31, 1, 'Performance Optimization', 'Optimize application performance', 4, 12, 'pending', FALSE, '2024-03-01 09:00:00', '2024-03-10 17:00:00'),
(32, 1, 'Security Implementation', 'Implement security measures', 4, 17, 'pending', FALSE, '2024-03-05 09:00:00', '2024-03-15 17:00:00'),
(33, 1, 'Deployment Setup', 'Set up CI/CD pipeline', 4, 12, 'in_progress', FALSE, '2024-02-20 09:00:00', '2024-03-05 17:00:00')
ON CONFLICT (task_id) DO NOTHING;

-- Insert 10 resources
INSERT INTO resources (resource_id, name, type, description) VALUES
(3, 'High-Performance Server', 'asset', 'Dedicated server for development and testing'),
(4, 'Design Software Licenses', 'asset', 'Adobe Creative Suite and Figma licenses'),
(5, 'Testing Environment', 'asset', 'Staging environment for QA testing'),
(6, 'Conference Room B', 'facility', 'Large meeting room for team collaboration'),
(7, 'Development Workstations', 'asset', 'High-end workstations for development team'),
(8, 'Video Conferencing Equipment', 'asset', 'Equipment for remote team meetings'),
(9, 'Cloud Infrastructure', 'asset', 'AWS/Azure cloud resources'),
(10, 'Mobile Testing Devices', 'asset', 'Various mobile devices for testing'),
(11, 'Documentation Platform', 'asset', 'Confluence/wiki platform for documentation'),
(12, 'Project Management Tools', 'asset', 'Jira and project management software')
ON CONFLICT (resource_id) DO NOTHING;

-- Assign resources to tasks
INSERT INTO task_resources (task_id, resource_id, checked_out_at) VALUES
(9, 3, '2024-01-20 09:00:00'),
(10, 7, '2024-01-26 09:00:00'),
(11, 7, '2024-02-01 09:00:00'),
(14, 4, '2024-01-10 09:00:00'),
(15, 4, '2024-01-21 09:00:00'),
(18, 5, '2024-02-01 09:00:00'),
(19, 5, '2024-02-15 09:00:00'),
(22, 6, '2024-01-05 09:00:00'),
(25, 9, '2024-01-15 09:00:00'),
(28, 11, '2024-02-15 09:00:00'),
(31, 3, '2024-03-01 09:00:00'),
(32, 9, '2024-03-05 09:00:00'),
(33, 9, '2024-02-20 09:00:00')
ON CONFLICT (task_id, resource_id) DO NOTHING;

-- Insert task comments
INSERT INTO task_comments (comment_id, task_id, author_id, comment, created_at) VALUES
(3, 4, 6, 'Project planning phase completed successfully. All requirements documented and approved.', '2024-01-15 17:30:00'),
(4, 5, 5, 'Design system approved by stakeholders. Ready to move to development phase.', '2024-02-01 16:45:00'),
(5, 6, 4, 'Core functionality is 80% complete. On track for March 15th deadline.', '2024-02-28 14:20:00'),
(6, 9, 17, 'Database schema implemented and tested. All tables and relationships working correctly.', '2024-01-25 15:10:00'),
(7, 10, 16, 'API development progressing well. 15 out of 20 endpoints completed.', '2024-02-05 11:30:00'),
(8, 11, 16, 'Component library created with 25 reusable components. Ready for integration.', '2024-02-15 13:45:00'),
(9, 12, 17, 'Authentication system implemented with JWT tokens and role-based access.', '2024-02-05 16:20:00'),
(10, 13, 16, 'Dashboard layout completed. Working on data visualization components.', '2024-02-20 10:15:00'),
(11, 14, 5, 'Wireframes approved by product team. Moving to high-fidelity design.', '2024-01-20 14:30:00'),
(12, 15, 5, 'Design system completed with color palette, typography, and component guidelines.', '2024-01-30 17:00:00'),
(13, 18, 8, 'Test plan created covering unit, integration, and user acceptance testing.', '2024-02-10 12:45:00'),
(14, 19, 8, 'Unit tests written for 90% of backend functions. Coverage at 85%.', '2024-02-25 15:30:00'),
(15, 22, 9, 'Marketing strategy approved. Focus on digital channels and content marketing.', '2024-01-15 16:20:00'),
(16, 25, 14, 'Analytics setup complete. Google Analytics and custom tracking implemented.', '2024-01-25 11:15:00'),
(17, 28, 11, 'User documentation 60% complete. Technical documentation started.', '2024-02-25 13:40:00'),
(18, 31, 12, 'Performance optimization identified 3 major bottlenecks. Working on solutions.', '2024-03-05 14:50:00'),
(19, 32, 17, 'Security audit completed. Implementing OWASP recommendations.', '2024-03-10 16:30:00'),
(20, 33, 12, 'CI/CD pipeline 70% complete. Automated testing and deployment configured.', '2024-02-28 12:20:00')
ON CONFLICT (comment_id) DO NOTHING;

-- Update project with comprehensive SWOT analysis and details
UPDATE projects SET 
    swot = 'Strengths: Strong development team, clear requirements, good stakeholder buy-in. Weaknesses: Tight timeline, limited budget for additional resources. Opportunities: Potential for similar projects, market demand for automation. Threats: Competing solutions, changing requirements.',
    roi = 25000.00,
    review_status = 'in_progress',
    description = 'Comprehensive onboarding automation system that streamlines the entire new hire process from application to first day. Includes digital document management, automated workflows, and integrated training modules.'
WHERE project_id = 1;

-- Insert project comments
INSERT INTO project_comments (comment_id, project_id, author_id, comment, created_at) VALUES
(3, 1, 6, 'Project is progressing well. Development team is meeting milestones on schedule.', '2024-02-15 10:30:00'),
(4, 1, 4, 'Technical architecture is solid. No major blockers identified.', '2024-02-20 14:15:00'),
(5, 1, 8, 'QA team ready to begin testing phase. Test environment configured.', '2024-03-01 09:45:00'),
(6, 1, 9, 'Marketing materials prepared for launch. Ready to execute campaign.', '2024-03-10 16:20:00'),
(7, 1, 14, 'Analytics dashboard providing valuable insights into user behavior.', '2024-03-15 11:30:00'),
(8, 1, 11, 'Documentation team working closely with development to ensure accuracy.', '2024-03-20 13:45:00')
ON CONFLICT (comment_id) DO NOTHING;

COMMIT;
