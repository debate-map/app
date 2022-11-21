CREATE TABLE app_public.feedback_proposals (
    id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    text text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    "editedAt" bigint,
    "completedAt" bigint
);
ALTER TABLE ONLY app_public.feedback_proposals
    ADD CONSTRAINT v1_draft_feedback_proposals_pkey PRIMARY KEY (id);