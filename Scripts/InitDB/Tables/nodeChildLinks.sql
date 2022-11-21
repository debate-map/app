CREATE TABLE app_public."nodeChildLinks" (
    id text NOT NULL COLLATE pg_catalog."C",
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    parent text NOT NULL,
    child text NOT NULL,
    form text,
    "seriesAnchor" boolean,
    "seriesEnd" boolean,
    polarity text,
    "c_parentType" text NOT NULL,
    "c_childType" text NOT NULL,
    "group" text DEFAULT 'generic'::text NOT NULL,
    "orderKey" text DEFAULT '0|Vzzzzz:'::text NOT NULL COLLATE pg_catalog."C"
);
ALTER TABLE ONLY app_public."nodeChildLinks"
    ADD CONSTRAINT "v1_draft_nodeChildLinks_pkey" PRIMARY KEY (id);

CREATE INDEX nodechildlinks_parent_child ON app_public."nodeChildLinks" USING btree (parent, child);

-- field collation fixes (ideal would be to, database-wide, have collation default to case-sensitive, but for now we just do it for a few key fields for which "ORDER BY" clauses exist)
ALTER TABLE app_public."nodeChildLinks" ALTER COLUMN "orderKey" SET DATA TYPE TEXT COLLATE "C";
ALTER TABLE app_public."nodeChildLinks" ALTER COLUMN "id" SET DATA TYPE TEXT COLLATE "C";