# Database Migrations

Overview:
1) Migrations are done by producing new tables within the existing db, rather than creating a new db. Pros:  
	A) Reduces amount of data copied, for migrations on only certain tables.  
	B) There is no need to connect to additional databases to: A) perform the migration, B) read the new (not yet renamed) tables for pre-commit testing.

Steps:
1) [script] For each table that is being changed/added, create a table named "vX_draft_MYTABLE" (where X = current version), with the desired shape/columns. (deleting any existing draft-table by that name)
2) [script] Fill in the data for the new draft-table by copying data from the previous-version table, adjusting the data's shape/format as needed. (table without version-prefix is assumed to be from previous-version)
3) [manual] Check the contents of the draft table using a db explorer program (eg. pgAdmin), ensuring it looks correct. (if incorrect, make needed changes and go back to step 1)
4) [manual] If the changes are major/risky, add special flag to URL (?dbDrafts=true) so you can test against the draft tables. (if you discover issues, make needed changes and go back to step 1)
5) [script] Rename the old table to "vX_MYTABLE" (where X = previous version), and rename the draft table to "MYTABLE", thus completing the migration.

While you're still writing/testing the migration, you should be running the "migrateTest:latest" command, which only does step 1 and 2 (with you then doing steps 3 and 4 yourself). [this script should also automatically remove the entry for the latest migration from the `knex_migrations_lock` table, if it exists, so that you can keep rerunning it without blockage]  
Once you're satisfied that the migration is ready, you should run the regular "migrate:latest" command, which does steps 1, 2, and 5 (thus "committing" the migration).