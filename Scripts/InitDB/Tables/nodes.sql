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

CREATE OR REPLACE VIEW app.my_nodes WITH (security_barrier=off)
 AS WITH q1 AS (
        SELECT array_agg(id) AS pol
        FROM app."accessPolicies"
        WHERE is_user_admin(current_setting('app.current_user_id')) OR coalesce(("permissions_userExtends" -> current_setting('app.current_user_id') -> 'nodes' -> 'access')::boolean,
            ("permissions" -> 'nodes' -> 'access')::boolean))
        SELECT app.nodes.* FROM app.nodes JOIN q1 ON "accessPolicy" = ANY(q1.pol);

GRANT SELECT ON app.my_nodes TO PUBLIC;
