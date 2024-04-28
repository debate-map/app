\set ON_ERROR_STOP 1

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
	\ir Tables/timelines.sql
	\ir Tables/timelineSteps.sql
	\ir Tables/userHiddens.sql
	\ir Tables/users.sql
	--\ir Tables/visibilityDirectives.sql

	\ir Funcs/General.sql
	\ir Funcs/GraphTraversal.sql
	\ir Funcs/Search.sql
	\ir Funcs/RLSHelpers.sql

	\ir FKConstraints.sql
	\ir RLSPolicies.sql
	\ir AccessPolicyTriggers.sql
	\ir General_End.sql
commit;