CREATE TABLE app."mapNodeEdits" (
    id text NOT NULL,
    map text NOT NULL,
    node text NOT NULL,
    "time" bigint NOT NULL,
    type text NOT NULL,
    "c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app."mapNodeEdits" ADD CONSTRAINT "v1_draft_mapNodeEdits_pkey" PRIMARY KEY (id);ALTER TABLE app."mapNodeEdits" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);
ALTER TABLE app."mapNodeEdits" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);