-- org_chart.sql
-- Table definitions for organizational chart builder

CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    name VARCHAR(100),
    manager_id INT
);

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    department_id INT,
    position VARCHAR(100),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- Sample data for departments
INSERT INTO departments (department_id, name, manager_id) VALUES
(1, 'IT', 1),
(2, 'Human Resources', 2),
(3, 'Marketing', 3);

-- Sample data for employees
INSERT INTO employees (employee_id, first_name, last_name, email, department_id, position) VALUES
(1, 'John', 'Doe', 'john.doe@example.com', 1, 'IT Manager'),
(2, 'Jane', 'Smith', 'jane.smith@example.com', 2, 'HR Manager'),
(3, 'Alice', 'Johnson', 'alice.johnson@example.com', 3, 'Marketing Manager'); 