CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE github_analyzer;

CREATE TABLE IF NOT EXISTS github_profiles (
  username      VARCHAR(255)  NOT NULL,
  name          VARCHAR(255)  DEFAULT NULL,
  bio           TEXT          DEFAULT NULL,
  public_repos  INT UNSIGNED  NOT NULL DEFAULT 0,
  followers     INT UNSIGNED  NOT NULL DEFAULT 0,
  following     INT UNSIGNED  NOT NULL DEFAULT 0,
  top_language  VARCHAR(100)  DEFAULT NULL,
  profile_score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  analyzed_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (username),
  INDEX idx_profile_score (profile_score DESC),
  INDEX idx_analyzed_at (analyzed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
