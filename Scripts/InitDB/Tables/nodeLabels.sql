-- M:N relationship table between node and label(text)
CREATE TABLE app."nodeLabels" (
    "id" text NOT NULL,
    "nodeId" text NOT NULL,
    "label" text NOT NULL,
    "createdAt" bigint NOT NULL,
    "creator" text NOT NULL,

    CONSTRAINT "node_labels_pk" PRIMARY KEY ("id"),
    CONSTRAINT "node_labels_unique" UNIQUE ("nodeId", "label", "creator"),
    CONSTRAINT "node_labels_node_fkey" FOREIGN KEY ("nodeId") REFERENCES app.nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_node_labels__label" ON app."nodeLabels" ("label");
