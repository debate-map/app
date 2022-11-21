CREATE TABLE app_public."globalData" (
    id text DEFAULT 'main'::text NOT NULL,
    extras jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY app_public."globalData"
    ADD CONSTRAINT globaldata_pk PRIMARY KEY (id);