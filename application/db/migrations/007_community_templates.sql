-- Pathwise: community-shared goal templates/workflows (FR_15)

CREATE TABLE IF NOT EXISTS CommunityTemplates (
  template_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NULL,
  workflow_steps TEXT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (template_id),
  KEY idx_templates_public_created (is_public, created_at),
  CONSTRAINT fk_templates_user FOREIGN KEY (created_by) REFERENCES Users (user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO CommunityTemplates (title, description, category, workflow_steps, is_public, created_by)
SELECT 'Weekly Study Plan', 'A reusable weekly planning template for classes and assignments.', 'academic',
       '1. Review syllabi and due dates\n2. Block study sessions\n3. Prioritize difficult tasks first\n4. Reflect on progress weekly',
       1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM CommunityTemplates WHERE title = 'Weekly Study Plan'
);
