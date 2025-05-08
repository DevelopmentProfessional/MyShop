# Shopy - Salon Management System

A comprehensive salon management system built with Node.js, Express, and PostgreSQL.

## Features

- Appointment Management
- Client Management
- Service Management
- Product Inventory
- Employee Management
- User Authentication & Authorization
- Role-based Access Control

## Tech Stack

- Backend: Node.js, Express.js
- Database: PostgreSQL
- Frontend: HTML, CSS, JavaScript
- UI Framework: Bootstrap 5
- Icons: Bootstrap Icons

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shopy.git
cd shopy
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL=your_database_connection_string
PORT=3000
NODE_ENV=development
```

4. Initialize the database:
```bash
psql -U your_username -d your_database -f schema.sql
```

5. Start the server:
```bash
npm start
```

## API Endpoints

### Authentication
- POST /api/auth/login
- POST /api/auth/logout

### Appointments
- GET /api/appointments
- POST /api/appointments
- PUT /api/appointments/:id
- DELETE /api/appointments/:id

### Clients
- GET /api/clients
- POST /api/clients
- PUT /api/clients/:id
- DELETE /api/clients/:id

### Services
- GET /api/services
- POST /api/services
- PUT /api/services/:id
- DELETE /api/services/:id

### Products
- GET /api/products
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id

### Employees
- GET /api/employees
- POST /api/employees
- PUT /api/employees/:id
- DELETE /api/employees/:id

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@shopy.com or create an issue in the repository. 