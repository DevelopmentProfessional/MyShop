# Shift Scheduling System

A comprehensive shift scheduling system for managing employee shifts, templates, rotations, and assignments.

## Features

- **Shift Templates**: Create and manage shift time templates (e.g., Morning Shift, Night Shift)
- **Shift Rotations**: Create rotation patterns with automatic employee progression
- **Employee Assignments**: Assign employees to shifts with conflict checking
- **Recurring Patterns**: Set up daily, weekly, monthly, or yearly recurring shifts
- **Conflict Detection**: Automatically detect and prevent scheduling conflicts
- **Rotation Advancement**: Automatically advance rotations to the next position

## Database Schema

### Core Tables

1. **shift_templates** - Defines shift time patterns
2. **shift_rotations** - Defines rotation sequences
3. **rotation_shift_assignments** - Links templates to rotation positions
4. **rotation_employee_assignments** - Assigns employees to rotation positions
5. **shift_assignments** - Individual shift assignments
6. **recurring_shift_patterns** - Recurring shift patterns

### Views

- **active_shift_templates** - Active shift templates
- **rotation_details** - Rotation information with counts
- **current_shift_assignments** - Current assignments with details

### Functions

- **advance_rotation(rotation_id)** - Advances rotation to next position
- **create_rotation_assignments(rotation_id, start_date, days_count)** - Generates assignments from rotation
- **update_updated_at_column()** - Trigger function to update timestamps

## Setup Instructions

### 1. Database Setup

Run the SQL schema file to create the necessary tables in PostgreSQL:

```bash
psql -U your_username -d your_database -f sql/shift_scheduling.sql
```

Or connect to PostgreSQL and run the commands directly:

```bash
psql -U your_username -d your_database
\i sql/shift_scheduling.sql
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Database

Update the database configuration in `js/shift-scheduling-api.js`:

```javascript
const dbConfig = {
    host: 'localhost',
    user: 'postgres',
    password: 'your_password',
    database: 'your_database',
    port: 5432,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
```

### 4. Start the Server

```bash
npm start
```

## API Endpoints

### Shift Templates

- `GET /api/shift-scheduling/templates` - Get all templates
- `GET /api/shift-scheduling/templates/active` - Get active templates
- `POST /api/shift-scheduling/templates` - Create template
- `PUT /api/shift-scheduling/templates/:id` - Update template
- `DELETE /api/shift-scheduling/templates/:id` - Delete template

### Shift Rotations

- `GET /api/shift-scheduling/rotations` - Get all rotations
- `GET /api/shift-scheduling/rotations/:id` - Get rotation details
- `POST /api/shift-scheduling/rotations` - Create rotation
- `PUT /api/shift-scheduling/rotations/:id` - Update rotation
- `DELETE /api/shift-scheduling/rotations/:id` - Delete rotation
- `POST /api/shift-scheduling/rotations/:id/advance` - Advance rotation
- `POST /api/shift-scheduling/rotations/:id/generate-assignments` - Generate assignments

### Rotation Management

- `POST /api/shift-scheduling/rotations/:id/templates` - Add template to rotation
- `DELETE /api/shift-scheduling/rotations/:id/templates/:position` - Remove template from rotation
- `POST /api/shift-scheduling/rotations/:id/employees` - Add employee to rotation
- `DELETE /api/shift-scheduling/rotations/:id/employees/:employee_id/:position` - Remove employee from rotation

### Shift Assignments

- `GET /api/shift-scheduling/assignments` - Get assignments with filters
- `POST /api/shift-scheduling/assignments` - Create assignment
- `PUT /api/shift-scheduling/assignments/:id` - Update assignment
- `DELETE /api/shift-scheduling/assignments/:id` - Delete assignment

### Recurring Patterns

- `GET /api/shift-scheduling/recurring-patterns` - Get recurring patterns
- `POST /api/shift-scheduling/recurring-patterns` - Create recurring pattern
- `PUT /api/shift-scheduling/recurring-patterns/:id` - Update recurring pattern
- `DELETE /api/shift-scheduling/recurring-patterns/:id` - Delete recurring pattern

### Utilities

- `GET /api/shift-scheduling/employees` - Get employees
- `POST /api/shift-scheduling/check-conflicts` - Check for scheduling conflicts

## Usage Examples

### Creating a Shift Template

```javascript
const templateData = {
    name: "Morning Shift",
    start_time: "06:00:00",
    end_time: "14:00:00",
    description: "Early morning shift for opening operations",
    color: "#28a745"
};

const template = await shiftSchedulingAPI.createTemplate(templateData);
```

### Creating a Shift Rotation

```javascript
const rotationData = {
    name: "Morning-Evening-Night Rotation",
    description: "3-shift rotation covering 24 hours",
    start_date: "2024-01-01",
    cycle_duration: 3
};

const rotation = await shiftSchedulingAPI.createRotation(rotationData);
```

### Adding Templates to Rotation

```javascript
// Add morning shift to position 1
await shiftSchedulingAPI.addTemplateToRotation(rotationId, morningTemplateId, 1);

// Add afternoon shift to position 2
await shiftSchedulingAPI.addTemplateToRotation(rotationId, afternoonTemplateId, 2);

// Add night shift to position 3
await shiftSchedulingAPI.addTemplateToRotation(rotationId, nightTemplateId, 3);
```

### Assigning Employees to Rotation Positions

```javascript
// Assign employee to position 1 of rotation
await shiftSchedulingAPI.addEmployeeToRotation(rotationId, employeeId, 1);
```

### Creating Individual Shift Assignment

```javascript
const assignmentData = {
    template_id: 1,
    employee_id: 5,
    date: "2024-01-15",
    start_time: "06:00:00",
    end_time: "14:00:00",
    notes: "Regular morning shift"
};

const assignment = await shiftSchedulingAPI.createAssignment(assignmentData);
```

### Checking for Conflicts

```javascript
const conflictData = {
    employee_id: 5,
    date: "2024-01-15",
    start_time: "06:00:00",
    end_time: "14:00:00"
};

const conflictCheck = await shiftSchedulingAPI.checkConflicts(conflictData);
if (conflictCheck.has_conflicts) {
    console.log("Scheduling conflict detected!");
}
```

### Generating Assignments from Rotation

```javascript
// Generate assignments for the next 30 days
await shiftSchedulingAPI.generateAssignmentsFromRotation(rotationId, "2024-01-01", 30);
```

### Advancing a Rotation

```javascript
// Advance rotation to next position
const updatedRotation = await shiftSchedulingAPI.advanceRotation(rotationId);
console.log(`Rotation advanced to position ${updatedRotation.current_position}`);
```

## Frontend Integration

Include the client API script in your HTML:

```html
<script src="js/shift-scheduling-client.js"></script>
```

The API is available globally as `window.shiftSchedulingAPI`.

## File Structure

```
├── sql/
│   └── shift_scheduling.sql          # Database schema (PostgreSQL)
├── js/
│   ├── shift-scheduling-api.js       # Backend API (PostgreSQL)
│   ├── shift-scheduling-client.js    # Frontend API client
│   └── server.js                     # Main server (updated)
├── HumanResources/
│   ├── shift_scheduling.html         # Main scheduling page
│   ├── ShiftTemplate.html            # Template management
│   └── ShiftRotationTemplate.html    # Rotation management
└── SHIFT_SCHEDULING_README.md        # This file
```

## Error Handling

The API returns consistent error responses:

```javascript
{
    success: false,
    error: "Error message"
}
```

Successful responses include:

```javascript
{
    success: true,
    data: {...} // or message: "Success message"
}
```

## Security Considerations

- All API endpoints validate input data
- SQL injection protection through parameterized queries
- Conflict detection prevents double-booking
- Employee assignment validation

## Performance Optimization

- Database indexes on frequently queried columns
- Client-side caching for frequently accessed data
- Efficient queries with proper JOINs
- PostgreSQL functions for complex operations

## Troubleshooting

### Common Issues

1. **Database Connection Error**: Check database configuration in `shift-scheduling-api.js`
2. **Port Already in Use**: Change port in `server.js` or kill existing process
3. **Missing Dependencies**: Run `npm install` to install all dependencies
4. **Permission Errors**: Ensure PostgreSQL user has proper permissions
5. **PostgreSQL Not Running**: Start PostgreSQL service

### PostgreSQL Setup

If PostgreSQL is not installed:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### Debug Mode

Enable debug logging by setting environment variable:

```bash
NODE_ENV=development npm start
```

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Update documentation for new features
5. Test thoroughly before submitting

## License

This project is licensed under the MIT License. 