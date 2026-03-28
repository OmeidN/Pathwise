# Database migrations (Pathwise)

## M3 — `001_m3_users_bookmarks.sql`

Creates:

- **`Users`** — `user_id`, `email`, `username`, `password_hash`, `created_at`
- **`Bookmarks`** — composite PK `(user_id, resource_id)` with FKs to `Users` and `Resources`
- **`Resources`** — adds **`submitted_by`** (nullable FK to `Users`) and **`cost`** (nullable `VARCHAR(32)` for filters like free/paid)

Existing seeded rows keep `submitted_by = NULL` and `cost = NULL`.

### How to apply

1. Connect to **RDS** (not localhost MySQL), database **`pathwise`**:

   ```bash
   mysql -h pathwise-db.c18i0cuaoe4f.us-east-2.rds.amazonaws.com -P 3306 -u team2 -p pathwise
   ```

2. Either paste the SQL from `001_m3_users_bookmarks.sql`, or from your machine:

   ```bash
   mysql -h <RDS_HOST> -P 3306 -u <USER> -p pathwise < application/db/migrations/001_m3_users_bookmarks.sql
   ```

3. Verify:

   ```sql
   SHOW TABLES;
   DESCRIBE Users;
   DESCRIBE Bookmarks;
   DESCRIBE Resources;
   ```

### Re-running

Do **not** run the full file twice: `CREATE TABLE IF NOT EXISTS` is fine, but `ALTER TABLE ... ADD COLUMN` will error if columns already exist. If you need to reset M3 tables in a dev DB only, drop in reverse order (Bookmarks → remove FK/columns on Resources → Users) before re-applying.
