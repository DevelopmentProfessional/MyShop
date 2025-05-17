-- payroll.sql
-- Table definitions for payroll management

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10, 2)
);

CREATE TABLE payroll (
    payroll_id INT PRIMARY KEY,
    employee_id INT,
    pay_date DATE,
    gross_salary DECIMAL(10, 2),
    deductions DECIMAL(10, 2),
    net_salary DECIMAL(10, 2),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Sample data for employees
INSERT INTO employees (employee_id, first_name, last_name, email, hire_date, salary) VALUES
(1, 'John', 'Doe', 'john.doe@example.com', '2020-01-15', 50000.00),
(2, 'Jane', 'Smith', 'jane.smith@example.com', '2019-05-20', 55000.00),
(3, 'Alice', 'Johnson', 'alice.johnson@example.com', '2021-03-10', 48000.00);

-- Sample data for payroll
INSERT INTO payroll (payroll_id, employee_id, pay_date, gross_salary, deductions, net_salary) VALUES
(1, 1, '2023-01-31', 50000.00, 5000.00, 45000.00),
(2, 2, '2023-01-31', 55000.00, 5500.00, 49500.00),
(3, 3, '2023-01-31', 48000.00, 4800.00, 43200.00); 