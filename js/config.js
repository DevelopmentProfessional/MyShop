// Email Configuration
const emailConfig = {
    gmail: {
        user: 'ShopyTester123@gmail.com',
        pass: 'bnzdpfachubdtupj', // App Password (spaces removed)
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
    }
};

// Database Configuration
const dbConfig = {
    connectionString: process.env.DATABASE_URL || 'your_database_url_here'
};

// Server Configuration
const serverConfig = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = {
    emailConfig,
    dbConfig,
    serverConfig
}; 