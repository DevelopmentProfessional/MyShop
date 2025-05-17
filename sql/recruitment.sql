-- recruitment.sql
-- Table definitions for recruitment and onboarding

CREATE TABLE candidates (
    candidate_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    application_date DATE,
    status VARCHAR(20)
);

CREATE TABLE jobs (
    job_id INT PRIMARY KEY,
    title VARCHAR(100),
    department VARCHAR(50),
    location VARCHAR(100),
    salary_range VARCHAR(50)
);

CREATE TABLE applications (
    application_id INT PRIMARY KEY,
    candidate_id INT,
    job_id INT,
    application_date DATE,
    status VARCHAR(20),
    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id)
);

-- Sample data for candidates
INSERT INTO candidates (candidate_id, first_name, last_name, email, phone, application_date, status) VALUES
(1, 'Bob', 'Brown', 'bob.brown@example.com', '555-1234', '2023-01-10', 'Applied'),
(2, 'Carol', 'Davis', 'carol.davis@example.com', '555-5678', '2023-01-15', 'Interviewed'),
(3, 'Dave', 'Wilson', 'dave.wilson@example.com', '555-9012', '2023-01-20', 'Hired');

-- Sample data for jobs
INSERT INTO jobs (job_id, title, department, location, salary_range) VALUES
(1, 'Software Developer', 'IT', 'New York', '80,000 - 100,000'),
(2, 'HR Manager', 'Human Resources', 'Chicago', '70,000 - 90,000'),
(3, 'Marketing Specialist', 'Marketing', 'Los Angeles', '60,000 - 80,000');

-- Sample data for applications
INSERT INTO applications (application_id, candidate_id, job_id, application_date, status) VALUES
(1, 1, 1, '2023-01-10', 'Applied'),
(2, 2, 2, '2023-01-15', 'Interviewed'),
(3, 3, 3, '2023-01-20', 'Hired'); 