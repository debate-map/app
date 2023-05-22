CREATE TABLE app."nodeRevisions" (
    id text NOT NULL,
    node text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    phrasing jsonb NOT NULL,
    "displayDetails" jsonb,
    attachments jsonb DEFAULT '[]'::json NOT NULL,
    "replacedBy" text,

    phrasing_tsvector tsvector GENERATED ALWAYS AS (app.rev_phrasing_to_tsv(phrasing)) STORED NOT NULL,
    attachments_tsvector tsvector GENERATED ALWAYS AS (app.attachments_to_tsv(attachments)) STORED NOT NULL,
    "c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app."nodeRevisions" ADD CONSTRAINT "v1_draft_nodeRevisions_pkey" PRIMARY KEY (id);
ALTER TABLE app."nodeRevisions" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);

-- extra index for local_search func
DROP INDEX IF EXISTS node_revisions_node_idx;
CREATE INDEX node_revisions_node_idx ON app."nodeRevisions" USING btree (node);

-- indexes for tsvectors
-- We could just use computed index (in comments) and not materialize the ts_vectors in the table,
-- but the size cost is small and the speed difference notable (factor of 2-3), at least at current DB scale.
DROP INDEX IF EXISTS node_revisions_phrasing_en_idx;
CREATE INDEX node_revisions_phrasing_en_idx ON app."nodeRevisions" USING gin (phrasing_tsvector) WHERE ("replacedBy" IS NULL);
-- CREATE INDEX node_revisions_phrasing_en_idx ON app."nodeRevisions" USING gin (app.rev_phrasing_to_tsv(phrasing)) WHERE ("replacedBy" IS NULL);
DROP INDEX IF EXISTS node_revisions_quotes_en_idx;
CREATE INDEX node_revisions_quotes_en_idx ON app."nodeRevisions" USING gin (attachments_tsvector) WHERE ("replacedBy" IS NULL);
-- CREATE INDEX node_revisions_quotes_en_idx ON app."nodeRevisions" USING gin (app.attachments_to_tsv(attachments)) WHERE ("replacedBy" IS NULL);

-- index to speed up the queries for the graphql `searchForExternalIds` endpoint
CREATE INDEX attachments_gin ON "nodeRevisions" USING gin ("attachments");

CREATE OR REPLACE FUNCTION app.after_insert_node_revision() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE rev_id text;
BEGIN
    SELECT id INTO rev_id FROM app."nodeRevisions" nr WHERE node = NEW.node AND "createdAt" < NEW."createdAt" ORDER BY "createdAt" DESC LIMIT 1;
    IF rev_id IS NOT NULL THEN
        UPDATE app."nodeRevisions" SET "replacedBy" = NEW.id WHERE id = rev_id;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS after_insert_node_revision on app."nodeRevisions";
CREATE TRIGGER after_insert_node_revision AFTER INSERT ON app."nodeRevisions" FOR EACH ROW EXECUTE FUNCTION app.after_insert_node_revision();