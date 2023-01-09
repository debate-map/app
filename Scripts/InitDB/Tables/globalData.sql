CREATE TABLE app."globalData" (
    id text DEFAULT 'main'::text NOT NULL,
    extras jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY app."globalData"
    ADD CONSTRAINT globaldata_pk PRIMARY KEY (id);