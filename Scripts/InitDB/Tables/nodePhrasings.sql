CREATE TABLE app."nodePhrasings" (
	id text NOT NULL,
	creator text NOT NULL,
	"createdAt" bigint NOT NULL,
	node text NOT NULL,
	type text NOT NULL,
	text_base text NOT NULL,
	text_negation text,
	text_question text,
	note text,
	terms jsonb[] NOT NULL,
	"references" text[] NOT NULL,
	
	phrasing_tsvector tsvector GENERATED ALWAYS AS (app.phrasings_to_tsv(text_base, text_question)) STORED NOT NULL,
	"c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app."nodePhrasings" ADD CONSTRAINT "v1_draft_nodePhrasings_pkey" PRIMARY KEY (id);
ALTER TABLE app."nodePhrasings" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);

-- extra index for local_search func
DROP INDEX IF EXISTS node_phrasings_node_idx;
CREATE INDEX node_phrasings_node_idx ON app."nodePhrasings" USING btree (node);

-- indexes for tsvectors
-- We could just use computed index (in comments) and not materialize the ts_vectors in the table,
-- but the size cost is small and the speed difference notable (factor of 2-3), at least at current DB scale.
DROP INDEX IF EXISTS node_phrasings_text_en_idx;
CREATE INDEX node_phrasings_text_en_idx ON app."nodePhrasings" USING gin (phrasing_tsvector);
-- CREATE INDEX node_phrasings_text_en_idx ON app."nodePhrasings" USING gin (app.phrasings_to_tsv(text_base, text_question));