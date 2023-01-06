CREATE TABLE app_public."nodeLinks" (
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
    "orderKey" text DEFAULT '0|Vzzzzz:'::text NOT NULL COLLATE pg_catalog."C",
	"c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app_public."nodeLinks" ADD CONSTRAINT "v1_draft_nodeLinks_pkey" PRIMARY KEY (id);
ALTER TABLE app_public."nodeLinks" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);

CREATE INDEX nodelinks_parent_child ON app_public."nodeLinks" USING btree (parent, child);

-- field collation fixes (ideal would be to, database-wide, have collation default to case-sensitive, but for now we just do it for a few key fields for which "ORDER BY" clauses exist)
ALTER TABLE app_public."nodeLinks" ALTER COLUMN "orderKey" SET DATA TYPE TEXT COLLATE "C";
ALTER TABLE app_public."nodeLinks" ALTER COLUMN "id" SET DATA TYPE TEXT COLLATE "C";