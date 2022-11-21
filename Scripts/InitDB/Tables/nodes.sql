CREATE TABLE app_public.nodes (
    id text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    type text NOT NULL,
    "rootNodeForMap" text,
    "c_currentRevision" text NOT NULL,
    "accessPolicy" text NOT NULL,
    "multiPremiseArgument" boolean,
    "argumentType" text,
    extras jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY app_public.nodes
    ADD CONSTRAINT v1_draft_nodes_pkey PRIMARY KEY (id);