-- M:N relationship table between node and label(text)
CREATE TABLE app."nodeToLabel" (
	"nodeId" text NOT NULL,
	"label" text NOT NULL,
	"createdAt" bigint NOT NULL,
	"creator" text NOT NULL,

    CONSTRAINT node_to_label_pk PRIMARY KEY (nodeId, label),
    CONSTRAINT node_to_label_node_fkey
        FOREIGN KEY (nodeId) REFERENCES app.nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_node_to_label__label ON app."nodeToLabel" ("label");
