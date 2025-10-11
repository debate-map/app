-- M:N relationship table between node and label(text)
CREATE TABLE app."node_label" (
	"nodeId" text NOT NULL,
	"label" text NOT NULL,
	"createdAt" bigint NOT NULL,
	"creator" text NOT NULL,

    CONSTRAINT node_label_pk PRIMARY KEY (nodeId, label),
    CONSTRAINT node_label_node_fkey
        FOREIGN KEY (nodeId) REFERENCES app.nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_label ON app."node_label" ("label");
