-- these views are defined in a separate file from the tables themselves, so they get executed by @InitDB.sql after RLSHelpers.sql (its funcs are needed)

CREATE OR REPLACE VIEW app.my_nodes WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(id) AS pol
		FROM app."accessPolicies"
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app.nodes.* FROM app.nodes JOIN q1 ON "accessPolicy" = ANY(q1.pol);

CREATE OR REPLACE VIEW app.my_node_revisions WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(concat(id, ':nodes')) AS pol
		FROM app."accessPolicies"
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app."nodeRevisions".* FROM app."nodeRevisions" JOIN q1 ON (
			("c_accessPolicyTargets" && q1.pol));

CREATE OR REPLACE VIEW app.my_node_phrasings WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(concat(id, ':nodes')) AS pol
		FROM app."accessPolicies"
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app."nodePhrasings".* FROM app."nodePhrasings" JOIN q1 ON ("c_accessPolicyTargets" && q1.pol);

CREATE OR REPLACE VIEW app.my_node_links WITH (security_barrier=off)
	AS WITH q1 AS (
		SELECT array_agg(concat(id, ':nodes')) AS pol
		FROM app."accessPolicies"
		WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
			("permissions" -> 'nodes' -> 'access')::boolean))
		SELECT app."nodeLinks".* FROM app."nodeLinks" JOIN q1 ON (
			("c_accessPolicyTargets" && q1.pol));