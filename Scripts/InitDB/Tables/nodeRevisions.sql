CREATE TABLE app_public."nodeRevisions" (
    id text NOT NULL,
    node text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    phrasing jsonb NOT NULL,
    --phrasing_tsvector tsvector GENERATED ALWAYS AS (phrasings_to_tsv(text_base, text_question)) STORED NOT NULL,
    phrasing_tsvector tsvector GENERATED ALWAYS AS (jsonb_to_tsvector('public.english_nostop'::regconfig, phrasing, '["string"]'::jsonb)) STORED NOT NULL,
    note text,
    "displayDetails" jsonb,
    attachments jsonb DEFAULT '[]'::json NOT NULL,
    "replacedBy" text,
    phrasing1_tsvector tsvector GENERATED ALWAYS AS (app_public.rev_phrasing_to_tsv(phrasing)) STORED NOT NULL,
    attachments_tsvector tsvector GENERATED ALWAYS AS (app_public.attachments_to_tsv(attachments)) STORED NOT NULL,
    "c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app_public."nodeRevisions" ADD CONSTRAINT "v1_draft_nodeRevisions_pkey" PRIMARY KEY (id);
ALTER TABLE app_public."nodeRevisions" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);

CREATE INDEX node_revisions_phrasing_en_idx ON app_public."nodeRevisions" USING gin (phrasing1_tsvector) WHERE ("replacedBy" IS NULL);
CREATE INDEX node_revisions_quotes_en_idx ON app_public."nodeRevisions" USING gin (attachments_tsvector) WHERE ("replacedBy" IS NULL);
CREATE INDEX "nodeRevisions_phrasing_tsvector_idx" ON app_public."nodeRevisions" USING gin (phrasing_tsvector);
-- old (probably not needed anymore)
CREATE INDEX node_revisions_node_idx ON app_public."nodeRevisions" USING btree (node);

CREATE OR REPLACE FUNCTION app_public.after_insert_node_revision() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE rev_id text;
BEGIN
    SELECT id INTO rev_id FROM app_public."nodeRevisions" nr WHERE node = NEW.node AND "createdAt" < NEW."createdAt" ORDER BY "createdAt" DESC LIMIT 1;
    IF rev_id IS NOT NULL THEN
        UPDATE app_public."nodeRevisions" SET "replacedBy" = NEW.id WHERE id = rev_id;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS after_insert_node_revision on app_public."nodeRevisions";
CREATE TRIGGER after_insert_node_revision AFTER INSERT ON app_public."nodeRevisions" FOR EACH ROW EXECUTE FUNCTION app_public.after_insert_node_revision();