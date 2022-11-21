CREATE TABLE app_public."commandRuns" (
    id text NOT NULL,
    actor text NOT NULL,
    "runTime" bigint NOT NULL,
    public_base boolean NOT NULL,
    "commandName" text NOT NULL,
    "commandPayload" jsonb NOT NULL,
    "returnData" jsonb NOT NULL,
    "rlsTargets" jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY app_public."commandRuns"
    ADD CONSTRAINT "v1_draft_commandRuns_pkey" PRIMARY KEY (id);