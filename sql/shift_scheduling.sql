-- shift_scheduling.sql
-- Table definitions for shift scheduling

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100)
);

CREATE TABLE shifts (
    shift_id INT PRIMARY KEY,
    employee_id INT,
    start_time TIME,
    end_time TIME,
    date DATE,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Sample data for employees
INSERT INTO employees (employee_id, first_name, last_name, email) VALUES
(1, 'John', 'Doe', 'john.doe@example.com'),
(2, 'Jane', 'Smith', 'jane.smith@example.com'),
(3, 'Alice', 'Johnson', 'alice.johnson@example.com');

-- Sample data for shifts
INSERT INTO shifts (shift_id, employee_id, start_time, end_time, date) VALUES
(1, 1, '09:00:00', '17:00:00', '2023-01-01'),
(2, 2, '10:00:00', '18:00:00', '2023-01-01'),
(3, 3, '11:00:00', '19:00:00', '2023-01-01'); 