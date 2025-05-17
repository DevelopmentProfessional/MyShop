-- attendance.sql
-- Table definitions for attendance tracking

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100)
);

CREATE TABLE attendance (
    attendance_id INT PRIMARY KEY,
    employee_id INT,
    date DATE,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20),
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Sample data for employees
INSERT INTO employees (employee_id, first_name, last_name, email) VALUES
(1, 'John', 'Doe', 'john.doe@example.com'),
(2, 'Jane', 'Smith', 'jane.smith@example.com'),
(3, 'Alice', 'Johnson', 'alice.johnson@example.com');

-- Sample data for attendance
INSERT INTO attendance (attendance_id, employee_id, date, check_in, check_out, status) VALUES
(1, 1, '2023-01-01', '09:00:00', '17:00:00', 'Present'),
(2, 2, '2023-01-01', '09:15:00', '17:15:00', 'Present'),
(3, 3, '2023-01-01', '09:30:00', '17:30:00', 'Present'); 