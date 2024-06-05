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
    CONSTRAINT pk_user_node UNIQUE ("user", "node")
);

ALTER TABLE ONLY app.subscriptions
    ADD CONSTRAINT v1_draft_subscriptions_pkey PRIMARY KEY (id);