CREATE TABLE app_public."nodePhrasings" (
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
	phrasing_tsvector tsvector GENERATED ALWAYS AS (app_public.phrasings_to_tsv(text_base, text_question)) STORED NOT NULL
);
ALTER TABLE ONLY app_public."nodePhrasings"
	ADD CONSTRAINT "v1_draft_nodePhrasings_pkey" PRIMARY KEY (id);

CREATE INDEX node_phrasings_text_en_idx ON app_public."nodePhrasings" USING gin (phrasing_tsvector);
-- old (probably not needed anymore)
CREATE INDEX node_phrasings_node_idx ON app_public."nodePhrasings" USING btree (node);