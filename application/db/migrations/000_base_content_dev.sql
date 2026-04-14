-- Pathwise base content schema for fresh dev environments.
-- Run this BEFORE 001_m3_users_bookmarks.sql only if you do NOT already have the dump imported.

CREATE TABLE IF NOT EXISTS Categories (
  category_id INT NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_name (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Tags (
  tag_id INT NOT NULL AUTO_INCREMENT,
  tag_name VARCHAR(50) NOT NULL,
  PRIMARY KEY (tag_id),
  UNIQUE KEY uq_tags_name (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Resources (
  resource_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url VARCHAR(500) DEFAULT NULL,
  image_path VARCHAR(255) DEFAULT NULL,
  category_id INT NOT NULL,
  is_ai_enabled TINYINT(1) NOT NULL DEFAULT 0,
  visibility ENUM('public', 'private') NOT NULL DEFAULT 'public',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (resource_id),
  KEY idx_resources_category (category_id),
  CONSTRAINT fk_resources_category
    FOREIGN KEY (category_id) REFERENCES Categories (category_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ResourceTags (
  resource_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (resource_id, tag_id),
  KEY idx_resource_tags_tag (tag_id),
  CONSTRAINT fk_resource_tags_resource
    FOREIGN KEY (resource_id) REFERENCES Resources (resource_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_resource_tags_tag
    FOREIGN KEY (tag_id) REFERENCES Tags (tag_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO Categories (category_id, category_name) VALUES
  (1, 'Academic'),
  (2, 'Career'),
  (3, 'Personal'),
  (4, 'Wellness');

INSERT IGNORE INTO Tags (tag_name) VALUES
  ('resume'),
  ('internship'),
  ('study-skills');

-- How to use (new machine): run this file, then 001_m3_users_bookmarks.sql, then 002 through 006 in order.