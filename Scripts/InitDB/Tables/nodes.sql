CREATE TABLE app.nodes (
    "id" text NOT NULL,
    "creator" text NOT NULL,
    "createdAt" bigint NOT NULL,
    "type" text NOT NULL,
    "rootNodeForMap" text,
    "c_currentRevision" text NOT NULL,
    "accessPolicy" text NOT NULL,
    "multiPremiseArgument" boolean,
    "argumentType" text,
    "extras" jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE ONLY app.nodes
    ADD CONSTRAINT v1_draft_nodes_pkey PRIMARY KEY (id);

-- extra index for RLS-friendly view
DROP INDEX IF EXISTS node_access_idx;
CREATE INDEX node_access_idx ON app.nodes ("accessPolicy");