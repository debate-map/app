CREATE TABLE app."nodePhrasings" (
	id text NOT NULL,
	creator text NOT NULL,
	"createdAt" bigint NOT NULL,
	node text NOT NULL,
	type text NOT NULL,
	text_base text NOT NULL,
	text_negation text,
	text_question text,
	text_narrative text,
	note text,
	terms jsonb[] NOT NULL,
	"references" text[] NOT NULL,

	-- we could add text_negation and/or text_narrative to this, but it might be better to just wait until the search-system revamp (that of integrating semantic search)
	phrasing_tsvector tsvector GENERATED ALWAYS AS (app.phrasings_to_tsv(text_base, text_question)) STORED NOT NULL,
	"c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app."nodePhrasings" ADD CONSTRAINT "v1_draft_nodePhrasings_pkey" PRIMARY KEY (id);
ALTER TABLE app."nodePhrasings" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);

-- extra index for RLS-friendly view
DROP INDEX IF EXISTS node_revisions_access_idx;
CREATE INDEX node_phrasings_access_idx ON app."nodePhrasings" USING gin ("c_accessPolicyTargets");

-- extra index for local_search func
DROP INDEX IF EXISTS node_phrasings_node_idx;
CREATE INDEX node_phrasings_node_idx ON app."nodePhrasings" USING btree (node);

-- indexes for tsvectors
-- We could just use computed index (in comments) and not materialize the ts_vectors in the table,
-- but the size cost is small and the speed difference notable (factor of 2-3), at least at current DB scale.
DROP INDEX IF EXISTS node_phrasings_text_en_idx;
CREATE INDEX node_phrasings_text_en_idx ON app."nodePhrasings" USING gin (phrasing_tsvector);
-- CREATE INDEX node_phrasings_text_en_idx ON app."nodePhrasings" USING gin (app.phrasings_to_tsv(text_base, text_question));


CREATE OR REPLACE VIEW app.my_node_phrasings WITH (security_barrier=off)
 AS WITH q1 AS (
        SELECT array_agg(concat(id, ':nodes')) AS pol
        FROM app."accessPolicies"
        WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
            ("permissions" -> 'nodes' -> 'access')::boolean))
        SELECT app."nodePhrasings".* FROM app."nodePhrasings" JOIN q1 ON ("c_accessPolicyTargets" && q1.pol);

GRANT SELECT ON app.my_node_phrasings TO PUBLIC;
