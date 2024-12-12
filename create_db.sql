# Create a database script for movies-reviewer

CREATE DATABASE IF NOT EXISTS movie_app;
USE movie_app;

CREATE TABLE IF NOT EXISTS user_details (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE, first_name VARCHAR(50), last_name VARCHAR(50), email VARCHAR(100) UNIQUE, hashedPassword VARCHAR(255))

CREATE USER IF NOT EXISTS 'movie_rater_app'@'localhost' IDENTIFIED BY 'minecraft'; 
GRANT ALL PRIVILEGES ON movie_app.* TO ' movie_rater_app'@'localhost';

CREATE TABLE IF NOT EXISTS movies (
    movie_id VARCHAR(255) PRIMARY KEY,
    movie_title VARCHAR(255) NOT NULL,
    movie_image TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id VARCHAR(255) NOT NULL,
    review_text TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id),
    FOREIGN KEY (user_id) REFERENCES user_details(id)
);


