CREATE TABLE app."nodeRatings" (
    id text NOT NULL,
    "accessPolicy" text NOT NULL,
    node text NOT NULL,
    type text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    value real NOT NULL,
	"c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app."nodeRatings" ADD CONSTRAINT "v1_draft_nodeRatings_pkey" PRIMARY KEY (id);
ALTER TABLE app."nodeRatings" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);