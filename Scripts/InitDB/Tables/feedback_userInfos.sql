CREATE TABLE app."feedback_userInfos" (
    id text NOT NULL,
    "proposalsOrder" text[] NOT NULL
);
ALTER TABLE ONLY app."feedback_userInfos"
    ADD CONSTRAINT "v1_draft_feedback_userInfos_pkey" PRIMARY KEY (id);