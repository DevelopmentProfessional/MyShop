-- performance_reviews.sql
-- Table definitions for performance reviews

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100)
);

CREATE TABLE performance_reviews (
    review_id INT PRIMARY KEY,
    employee_id INT,
    review_date DATE,
    rating INT,
    comments TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Sample data for employees
INSERT INTO employees (employee_id, first_name, last_name, email) VALUES
(1, 'John', 'Doe', 'john.doe@example.com'),
(2, 'Jane', 'Smith', 'jane.smith@example.com'),
(3, 'Alice', 'Johnson', 'alice.johnson@example.com');

-- Sample data for performance reviews
INSERT INTO performance_reviews (review_id, employee_id, review_date, rating, comments) VALUES
(1, 1, '2023-01-15', 4, 'Great performance overall.'),
(2, 2, '2023-01-20', 5, 'Outstanding work and dedication.'),
(3, 3, '2023-01-25', 3, 'Good performance, but room for improvement.'); 