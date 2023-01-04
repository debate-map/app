\set ON_ERROR_STOP 1

-- create the "debate-map" database if it doesn't exist yet (this command cannot be run in the transaction block)
SELECT 'CREATE DATABASE "debate-map"'
	WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'debate-map')\gexec
-- now connect to the (possibly just created) debate-map database
\connect 'debate-map'

begin;
	\ir General_Start.sql

	\ir Funcs/@PreTables.sql

	\ir Tables/accessPolicies.sql
	\ir Tables/commandRuns.sql
	\ir Tables/feedback_proposals.sql
	\ir Tables/feedback_userInfos.sql
	\ir Tables/globalData.sql
	\ir Tables/mapNodeEdits.sql
	\ir Tables/maps.sql
	\ir Tables/medias.sql
	\ir Tables/nodeLinks.sql
	\ir Tables/nodePhrasings.sql
	\ir Tables/nodeRatings.sql
	\ir Tables/nodeRevisions.sql
	\ir Tables/nodes.sql
	\ir Tables/nodeTags.sql
	\ir Tables/shares.sql
	\ir Tables/terms.sql
	\ir Tables/userHiddens.sql
	\ir Tables/users.sql
	--\ir Tables/visibilityDirectives.sql

	\ir Funcs/General.sql
	\ir Funcs/GraphTraversal.sql
	\ir Funcs/RLSHelpers.sql

	\ir FKConstraints.sql
	\ir RLSPolicies.sql
	\ir AccessPolicyTriggers.sql
	\ir General_End.sql
commit;