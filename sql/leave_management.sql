-- leave_management.sql
-- Table definitions for leave management

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100)
);

CREATE TABLE leave_requests (
    request_id INT PRIMARY KEY,
    employee_id INT,
    start_date DATE,
    end_date DATE,
    leave_type VARCHAR(50),
    status VARCHAR(20),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Sample data for employees
INSERT INTO employees (employee_id, first_name, last_name, email) VALUES
(1, 'John', 'Doe', 'john.doe@example.com'),
(2, 'Jane', 'Smith', 'jane.smith@example.com'),
(3, 'Alice', 'Johnson', 'alice.johnson@example.com');

-- Sample data for leave requests
INSERT INTO leave_requests (request_id, employee_id, start_date, end_date, leave_type, status) VALUES
(1, 1, '2023-02-01', '2023-02-05', 'Vacation', 'Approved'),
(2, 2, '2023-02-10', '2023-02-12', 'Sick', 'Pending'),
(3, 3, '2023-02-15', '2023-02-20', 'Vacation', 'Approved'); 