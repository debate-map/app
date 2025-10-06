CREATE TABLE app."nodeLabels" (
    "id" text NOT NULL,
    "label" text NOT NULL,
    CONSTRAINT "node_labels_pk" PRIMARY KEY ("id")
);
CREATE INDEX "idx_nodeLabels_label" ON app."nodeLabels" ("label");

-- M:N relationship table between nodeLabel and node
CREATE TABLE app."label_node" (
	"nodeLabelId" text NOT NULL,
	"nodeId" text NOT NULL,
	"createdAt" bigint NOT NULL,
	"creator" text NOT NULL,

	CONSTRAINT "label_node_pk" PRIMARY KEY ("nodeLabelId", "nodeId"),
	CONSTRAINT "label_node_nodeLabelId_fkey" FOREIGN KEY ("nodeLabelId") REFERENCES app."nodeLabels"("id") ON DELETE CASCADE,
	CONSTRAINT "label_node_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES app."nodes"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_label_node_nodeId" ON app."label_node" ("nodeId");
CREATE INDEX "idx_label_node_nodeLabelId" ON app."label_node" ("nodeLabelId");
