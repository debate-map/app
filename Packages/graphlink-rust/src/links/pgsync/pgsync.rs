use anyhow::{ensure, Context, Error};
use tokio_postgres::types::ToSql;
use tracing::warn;
//use tracing::info;
use crate::tracing::{error, info};

use crate::{cf, get_sql_funcs, start_write_transaction, to_anyhow, AppStateArc, ColumnDef, DataAnchorFor1, StringCollector, ToOwnedV, ToSqlWrapper};

/// This function connects to the postgres db and ensures all tables are created and up to date.
pub async fn run_pgsync(app_state: AppStateArc) -> Result<(), Error> {
	let table_defs = &cf().table_defs;
	let mut anchor = DataAnchorFor1::empty(); // holds pg-client
	let tx = start_write_transaction(&mut anchor, &app_state.db_pool).await?;

	let query = async |sql: &str, vars: &[&(dyn tokio_postgres::types::ToSql + Sync)]| -> Result<u64, Error> {
		// include the sql-query as error context; this is fine, because such errors are only shown in server's logs -- not to any clients
		tx.execute(sql, vars).await.map_err(to_anyhow).with_context(|| format!("SQL execution failed for query:{}", sql))
	};

	#[rustfmt::skip] {
        // alter search path
        query("ALTER DATABASE \"lucid-frontier\" SET search_path TO 'app';", &[]).await?; // for future pg-sessions
        query("SELECT pg_catalog.set_config('search_path', 'app', false);", &[]).await?; // for current pg-session

        // create schema
        query("CREATE SCHEMA IF NOT EXISTS app;", &[]).await?;

        // ensure that search dictionary exists
        query("DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_ts_dict WHERE dictname = 'english_stem_nostop') THEN
                CREATE TEXT SEARCH dictionary app.english_stem_nostop (Template = snowball, Language = english);
            END IF; END $$;", &[]).await?;
        // ensure that search configuration exists (and has the right properties)
        query("DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'english_nostop') THEN
                CREATE TEXT SEARCH CONFIGURATION app.english_nostop (COPY = pg_catalog.english);
            END IF; END $$;", &[]).await?;
        query("ALTER TEXT SEARCH CONFIGURATION app.english_nostop ALTER mapping for asciiword, asciihword, hword_asciipart, hword, hword_part, word WITH app.english_stem_nostop", &[]).await?;

        // create role "rls_obeyer", and grant it permissions
        query("DO $$ BEGIN CREATE ROLE rls_obeyer WITH NOINHERIT NOLOGIN; EXCEPTION WHEN others THEN RAISE NOTICE 'rls_obeyer role seems to exist already, so not re-creating'; end $$;", &[]).await?;
        query("GRANT CONNECT ON DATABASE \"lucid-frontier\" TO rls_obeyer;", &[]).await?;
        query("GRANT USAGE ON SCHEMA app TO rls_obeyer;", &[]).await?;
        //q("grant all on schema app to rls_obeyer", &[]).await?;
        // grant privileges for future-created tables
        query("ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rls_obeyer;", &[]).await?;
        // grant privileges for already-created tables
        query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO rls_obeyer;", &[]).await?;

        // helpers for generated array columns (jsonb has no direct cast to text[]/jsonb[]); STRICT so a missing field yields NULL rather than '{}'
        query("CREATE OR REPLACE FUNCTION jsonb_to_text_array(jsonb) RETURNS text[] AS $$ SELECT ARRAY(SELECT jsonb_array_elements_text($1)) $$ LANGUAGE sql IMMUTABLE STRICT;", &[]).await?;
        query("CREATE OR REPLACE FUNCTION jsonb_to_jsonb_array(jsonb) RETURNS jsonb[] AS $$ SELECT ARRAY(SELECT jsonb_array_elements($1)) $$ LANGUAGE sql IMMUTABLE STRICT;", &[]).await?;
    }

	// create tables
	for table_def in table_defs {
		let table_name = &table_def.name;
		let table_columns_descriptors = table_def.columns.iter().map(|a| a.to_string()).collect::<Vec<String>>();

		// Why do we check for existence, instead of using "CREATE TABLE IF NOT EXISTS"? Because we want to log a message with the table-creation sql, in cases where the table is being created. (for easier debugging)
		let table_exists = query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'app' AND table_name = $1", &[&table_name]).await? > 0;
		if !table_exists {
			//let mut sql = format!(r#"CREATE TABLE IF NOT EXISTS "{}" ("#, table_name);
			let mut sql = format!(r#"CREATE TABLE "{}" ("#, table_name);
			for (i, column_descriptor) in table_columns_descriptors.iter().enumerate() {
				if i > 0 {
					sql += ", ";
				}
				sql += column_descriptor;
			}
			sql += ")";
			info!("pgsync: Creating table {}. @sql:{}", table_name, sql);
			query(sql.as_str(), &[]).await?;
		}
	}

	// ensure all tables have the replica-identity type set to "full" (rather than "default")
	// Note: This was not required in prior project, because it had an "id" column that was not generated. (which matters because, at least for delete events, pgoutput omits data for generated columns: https://postgrespro.com/list/thread-id/2658394)
	for table_def in table_defs {
		let table_name = &table_def.name;
		let rows = tx.query("SELECT relreplident FROM pg_catalog.pg_class WHERE relname = $1", &[&table_name]).await?;
		let replica_is_set_to_full = rows.len() >= 1 && rows.iter().all(|row| row.get::<_, StringCollector>(0).0 == "f"); // "d" = default, "f" = full, "n" = nothing, "i" = index
		if !replica_is_set_to_full {
			info!("pgsync: Setting replica-identity for table {} to full.", table_name);
			query(format!(r#"ALTER TABLE "{}" REPLICA IDENTITY FULL;"#, table_name).as_str(), &[]).await?;
		}
	}

	// add/remove columns to/from table if needed (removal is okay, since columns other than the standard id+data are all "generated always as X", which means they can be removed without data-loss)
	for table_def in table_defs {
		let table_name = &table_def.name;
		let new_columns = &table_def.columns;

		// get current columns
		let mut old_columns = vec![];
		let rows = tx.query("SELECT column_name, data_type, is_nullable, generation_expression, column_default, udt_name FROM information_schema.columns WHERE table_schema = 'app' AND table_name = $1", &[&table_name]).await?;
		for row in rows {
			let name: String = row.get(0);
			let data_type: String = row.get(1);
			let data_type = if data_type == "ARRAY" { format!("{}[]", row.get::<_, String>(5).trim_start_matches('_')) } else { data_type }; // info-schema reports arrays as just ARRAY, the element type hides in udt_name (eg. _text)
			let is_nullable: bool = row.get::<_, String>(2) == "YES".o();
			let pull_from_data: bool = row.get::<_, Option<String>>(3).is_some();
			let default_value: Option<String> = row.get(4);
			let old_column = ColumnDef { name, data_type, is_nullable, pull_from_data, default_value };
			old_columns.push(old_column);
		}

		// add/update columns
		for new_column in new_columns {
			let new_column_descriptor = new_column.to_string();
			let old_column = old_columns.iter().find(|a| a.name == new_column.name);
			// if this column already exists...
			if let Some(old_column) = old_column {
				let old_column_descriptor = old_column.to_string();
				// ...but it's definition differs, then recreate it
				if old_column_descriptor.to_lowercase() != new_column_descriptor.to_lowercase() {
					info!("pgsync: Altering table {} to update column {}.\n\t@old_signature:{}\n\t@new_signature:{}", table_name, new_column.name, old_column_descriptor.to_lowercase(), new_column_descriptor.to_lowercase());
					query(format!(r#"ALTER TABLE "{}" DROP COLUMN "{}";"#, table_name, old_column.name).as_str(), &[]).await?;
					query(format!(r#"ALTER TABLE "{}" ADD COLUMN {};"#, table_name, new_column_descriptor).as_str(), &[]).await?;
				}
			}
			// else, do the initial column creation
			else {
				info!("pgsync: Altering table {} to add column {}.", table_name, new_column.name);
				query(format!(r#"ALTER TABLE "{}" ADD COLUMN {};"#, table_name, new_column_descriptor).as_str(), &[]).await?;
			}
		}

		// remove columns
		for old_column in &old_columns {
			if !new_columns.iter().any(|a| a.name == old_column.name) {
				info!("pgsync: Altering table {} to remove column {}.", table_name, old_column.name);
				query(format!(r#"ALTER TABLE "{}" DROP COLUMN "{}";"#, table_name, old_column.name).as_str(), &[]).await?;
			}
		}

		// if non-existent yet, create a constraint that sets the "id" column as the primary key
		let rows = tx.query("SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'app' AND table_name = $1 AND constraint_type = 'PRIMARY KEY'", &[&table_name]).await?;
		if rows.is_empty() {
			info!("pgsync: Altering table {} to add primary-key on id column.", table_name);
			query(format!(r#"ALTER TABLE "{}" ADD PRIMARY KEY (id);"#, table_name).as_str(), &[]).await?;
		}
	}

	// ensure that each defined sql-func exists and is up-to-date
	let sql_funcs = get_sql_funcs();
	for sql_func in sql_funcs {
		let new_definition = &sql_func.func_definition;
		let func_name = new_definition.split('(').nth(0).unwrap_or("").trim();
		let new_body = &sql_func.func_body;

		let leakproof_str = " STABLE LEAKPROOF"; // for now just always include this

		let rows = tx.query("SELECT proargtypes, proargnames, prosrc FROM pg_proc WHERE proname = $1", &[&func_name]).await?;
		// if func doesn't exist, create it
		if rows.is_empty() {
			info!("pgsync: Creating function {}. @signature:{}", func_name, new_definition);
			query(format!(r#"CREATE OR REPLACE FUNCTION {} AS $$ {} $$ LANGUAGE sql{};"#, new_definition, new_body, leakproof_str).as_str(), &[]).await?;
		}
		// if func definition differs, delete then recreate it
		if rows.len() == 1 {
			let row = rows.get(0).unwrap();
			//let old_arg_types: Vec<i64> = row.get(0); // todo: extend difference-checks to arg-types as well
			let old_arg_names: Vec<String> = row.get(1);
			let old_body: String = row.get(2);

			let mut def_differ_reasons_str = "".o();

			// check if arg-names differ
			let new_args_str = new_definition.split('(').nth(1).unwrap_or("").split(')').nth(0).unwrap_or("").trim();
			let new_arg_names = new_args_str.split(',').map(|a| a.split_whitespace().nth(0).unwrap_or("").to_string()).collect::<Vec<String>>();
			if old_arg_names.len() != new_arg_names.len() || old_arg_names.iter().zip(new_arg_names.iter()).any(|(a, b)| a != b) {
				def_differ_reasons_str += "arg-names ";
			}

			// check if func-bodies differ
			let old_body_simple_str = old_body.replace(" ", "").replace("\t", "").replace("\n", "").replace("\r", "");
			let new_body_simple_str = new_body.replace(" ", "").replace("\t", "").replace("\n", "").replace("\r", "");
			if old_body_simple_str != new_body_simple_str {
				def_differ_reasons_str += "body ";
			}

			if def_differ_reasons_str.len() > 0 {
				info!("pgsync: Replacing function {}, since {}differs. @old_args:{} @new_args:{}", func_name, def_differ_reasons_str, old_arg_names.join(","), new_arg_names.join(","));
				query(format!(r#"DROP FUNCTION IF EXISTS {};"#, func_name).as_str(), &[]).await?;
				query(format!(r#"CREATE OR REPLACE FUNCTION {} AS $$ {} $$ LANGUAGE sql{};"#, new_definition, new_body, leakproof_str).as_str(), &[]).await?;
			}
		}
	}

	// ensure the rls policy for each table exists and is up-to-date
	for table_def in table_defs {
		let table_name = &table_def.name;
		let rls_policy = &table_def.rls_policy;

		// find the oid of the table, then use that to check if the rls-policy exists
		/*let rows = tx.query("SELECT oid FROM pg_catalog.pg_class WHERE relname = $1", &[&table_name]).await?;
		let table_oid: i64 = rows.get(0).unwrap().get(0);
		let rows = tx.query("SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = $1 AND polname = $2", &[&table_oid, &format!("{}_rls", &table_name)]).await?;*/
		// check if rls-policy exists (we use consistent rls-policy naming of `${table}_rls`, so just check for the name)
		let rows = tx.query("SELECT 1 FROM pg_catalog.pg_policy WHERE polname = $1", &[&format!("{}_rls", &table_name)]).await?;

		let create_policy = async || -> Result<(), Error> {
			let mut rls_policy_sql_fragment = rls_policy.to_sql_fragment()?;
			let (rls_policy_sql_text, params) = rls_policy_sql_fragment.into_query_args()?;
			info!("pgsync: Creating RLS policy for table {}. @sql_text:{} @params:{:?}", table_name, rls_policy_sql_text, params);

			ensure!(params.len() == 0, "RLS policy sql should not have any params. @sql_text:{} @params:{:?}", rls_policy_sql_text, params);
			//let params_wrapped: Vec<ToSqlWrapper> = params.into_iter().map(|a| ToSqlWrapper { data: a }).collect();
			//let params_as_refs: Vec<&(dyn ToSql + Sync)> = params_wrapped.iter().map(|x| x as &(dyn ToSql + Sync)).collect();

			query(format!(r#"CREATE POLICY "{}_rls" ON "{}" FOR ALL USING ({});"#, table_name, table_name, rls_policy_sql_text).as_str(), &[]).await?;
			Ok(())
		};
		// if rls-policy doesn't exist, create it
		if rows.is_empty() {
			create_policy().await?;
		}
		// else, if rls-policy definition differs, delete then recreate it
		else {
			// todo: check if the rls-policy definition differs, and only drop/recreate if it does

			info!("pgsync: Dropping existing rls-policy, for recreation. (logic to check if already matches target is not yet implemented, so just doing this every launch atm)");
			query(format!(r#"DROP POLICY IF EXISTS "{}_rls" ON "{}";"#, table_name, table_name).as_str(), &[]).await?;

			create_policy().await?;
		}

		// check if rls is enabled on this table; if not, enable it
		let rows = tx.query("SELECT 1 FROM pg_catalog.pg_class WHERE relname = $1 AND relrowsecurity = true", &[&table_name]).await?;
		if rows.is_empty() {
			info!("pgsync: Enabling RLS for table {}.", table_name);
			query(format!(r#"ALTER TABLE "{}" ENABLE ROW LEVEL SECURITY;"#, table_name).as_str(), &[]).await?;
		}
	}

	tx.commit().await?;
	info!("pgsync completed successfully, for tables: {}", table_defs.iter().map(|a| a.name.clone()).collect::<Vec<String>>().join(", "));

	Ok(())
}
