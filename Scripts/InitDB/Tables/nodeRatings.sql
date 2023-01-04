CREATE TABLE app_public."nodeRatings" (
    id text NOT NULL,
    "accessPolicy" text NOT NULL,
    node text NOT NULL,
    type text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    value real NOT NULL,
	"c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app_public."nodeRatings"
    ADD CONSTRAINT "v1_draft_nodeRatings_pkey" PRIMARY KEY (id);