CREATE TABLE app."userHiddens" (
    id text NOT NULL,
    email text NOT NULL,
    "providerData" jsonb NOT NULL,
    "backgroundID" text,
    "backgroundCustom_enabled" boolean,
    "backgroundCustom_color" text,
    "backgroundCustom_url" text,
    "backgroundCustom_position" text,
    "addToStream" boolean NOT NULL,
    "lastAccessPolicy" character varying(255),
    extras jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY app."userHiddens"
    ADD CONSTRAINT "v1_draft_userHiddens_pkey" PRIMARY KEY (id);