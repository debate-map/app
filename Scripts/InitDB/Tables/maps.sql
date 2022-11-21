CREATE TABLE app_public.maps (
    id text NOT NULL,
    "accessPolicy" text NOT NULL,
    name text NOT NULL,
    note text,
    "noteInline" boolean,
    "rootNode" text NOT NULL,
    "defaultExpandDepth" integer NOT NULL,
    "nodeAccessPolicy" text,
    featured boolean,
    editors text[] NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    edits integer NOT NULL,
    "editedAt" bigint,
    extras jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY app_public.maps
    ADD CONSTRAINT v1_draft_maps_pkey PRIMARY KEY (id);