CREATE TABLE app.medias (
    id text NOT NULL,
    "accessPolicy" text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    url text NOT NULL,
    description text NOT NULL
);
ALTER TABLE ONLY app.medias
    ADD CONSTRAINT v1_draft_medias_pkey PRIMARY KEY (id);