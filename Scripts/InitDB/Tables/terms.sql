CREATE TABLE app_public.terms (
    id text NOT NULL,
    "accessPolicy" text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    name text NOT NULL,
    forms text[] NOT NULL,
    disambiguation text,
    type text NOT NULL,
    definition text NOT NULL,
    note text,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL
);
ALTER TABLE ONLY app_public.terms
    ADD CONSTRAINT v1_draft_terms_pkey PRIMARY KEY (id);