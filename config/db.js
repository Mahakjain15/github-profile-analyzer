const mysql = require('mysql2/promise');
require('dotenv').config();

const basePool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '9977321765',
    waitForConnections: true,
    connectionLimit: 5
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '9977321765',
    database: 'github_analyzer',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initializeDatabase() {
    try {
        const connection = await basePool.getConnection();
        await connection.query(`CREATE DATABASE IF NOT EXISTS github_analyzer;`);
        connection.release();

        const dbConnection = await pool.getConnection();
        // पुरानी टेबल हटाकर सारे कॉलम्स वाली नई टेबल बनाएंगे
        await dbConnection.query(`DROP TABLE IF EXISTS github_profiles;`); 
        
        await dbConnection.query(`
            CREATE TABLE github_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                avatar_url VARCHAR(255),
                bio TEXT,
                location VARCHAR(255),
                company VARCHAR(255),
                blog VARCHAR(255),
                email VARCHAR(255),
                followers INT DEFAULT 0,
                following INT DEFAULT 0,
                public_repos INT DEFAULT 0,
                public_gists INT DEFAULT 0,
                total_stars INT DEFAULT 0,
                total_forks INT DEFAULT 0,
                total_commits INT DEFAULT 0,
                top_language VARCHAR(100),
                profile_score INT DEFAULT 0,
                analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("🚀 MEGA DATABASE READY! NO MORE COLUMN ERRORS POSSIBLE!");
        dbConnection.release();
    } catch (error) {
        console.error("❌ Database setup failed:", error.message);
    }
}

initializeDatabase();

module.exports = pool;