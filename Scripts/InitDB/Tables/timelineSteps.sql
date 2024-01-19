CREATE TABLE app."timelineSteps" (
    "id" text NOT NULL,
    "creator" text NOT NULL,
    "createdAt" bigint NOT NULL,
    "timelineID" text NOT NULL,
    "orderKey" text NOT NULL,
    "groupID" text NOT NULL,
    "timeFromStart" real,
    "timeFromLastStep" real,
    "timeUntilNextStep" real,
    "message" text NOT NULL,
    "nodeReveals" jsonb DEFAULT '[]'::json NOT NULL,
    "extras" jsonb DEFAULT '{}'::jsonb NOT NULL,

    "c_accessPolicyTargets" text[] NOT NULL
);
ALTER TABLE ONLY app."timelineSteps"
    ADD CONSTRAINT "v1_draft_timelineSteps_pkey" PRIMARY KEY (id);