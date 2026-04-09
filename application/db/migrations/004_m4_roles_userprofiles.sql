-- Pathwise: user roles + extended profile (run after 001–003)

ALTER TABLE Users
  ADD COLUMN role ENUM('student', 'faculty', 'staff') NOT NULL DEFAULT 'student'
  AFTER password_hash;

CREATE TABLE IF NOT EXISTS UserProfiles (
  user_id INT NOT NULL,
  interests TEXT NULL,
  challenges TEXT NULL,
  workload VARCHAR(100) NULL,
  aspirations TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES Users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
