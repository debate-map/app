CREATE TABLE app.subscriptions (
    "id" text NOT NULL,
    "user" text NOT NULL,
    "node" text NOT NULL,
    "addChildNode" boolean NOT NULL DEFAULT FALSE,
    "deleteNode" boolean NOT NULL DEFAULT FALSE,
    "addNodeLink" boolean NOT NULL DEFAULT FALSE,
    "deleteNodeLink" boolean NOT NULL DEFAULT FALSE,
    "addNodeRevision" boolean NOT NULL DEFAULT FALSE,
    "setNodeRating" boolean NOT NULL DEFAULT FALSE,
    "createdAt" bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT * 1000,
    "updatedAt" bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT * 1000,
    CONSTRAINT subscriptions_pk PRIMARY KEY (id),
    CONSTRAINT subscriptions_uk_user_node UNIQUE ("user", "node")
);