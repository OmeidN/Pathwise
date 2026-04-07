-- Pathwise M3 demo seed for goals/projects/milestones relationships.
-- Run after 001 and 002.

INSERT INTO Goals (user_id, title, description, category, target_date, status)
SELECT u.user_id, 'Land Summer Internship', 'Track prep and application work for internships', 'Career', DATE_ADD(CURDATE(), INTERVAL 75 DAY), 'active'
FROM Users u
LIMIT 1;

INSERT INTO Projects (goal_id, title, description)
SELECT g.goal_id, 'Resume + Portfolio Polish', 'Improve resume bullet points and project portfolio'
FROM Goals g
ORDER BY g.goal_id DESC
LIMIT 1;

INSERT INTO Projects (goal_id, title, description)
SELECT g.goal_id, 'Interview Preparation', 'Practice STAR stories and technical interview rounds'
FROM Goals g
ORDER BY g.goal_id DESC
LIMIT 1;

INSERT INTO Milestones (project_id, title, description, target_date, is_completed, completed_at)
SELECT p.project_id, 'Draft resume v1', 'Complete first resume pass with metrics', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1, CURRENT_TIMESTAMP
FROM Projects p
ORDER BY p.project_id DESC
LIMIT 1;

INSERT INTO Milestones (project_id, title, description, target_date, is_completed)
SELECT p.project_id, 'Mock interview #1', 'Run one mock interview with a peer', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 0
FROM Projects p
ORDER BY p.project_id DESC
LIMIT 1;
