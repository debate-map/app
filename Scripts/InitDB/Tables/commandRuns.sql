CREATE TABLE app."commandRuns" (
    id text NOT NULL,
    actor text NOT NULL,
    "runTime" bigint NOT NULL,
    public_base boolean NOT NULL,
    "commandName" text NOT NULL,
    "commandInput" jsonb NOT NULL,
    "commandResult" jsonb NOT NULL,
    "c_involvedNodes" text[] NOT NULL,
    "c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app."commandRuns" ADD CONSTRAINT "v1_draft_commandRuns_pkey" PRIMARY KEY (id);
ALTER TABLE app."commandRuns" DROP CONSTRAINT IF EXISTS "c_accessPolicyTargets_check", ADD CONSTRAINT "c_accessPolicyTargets_check" CHECK (cardinality("c_accessPolicyTargets") > 0);