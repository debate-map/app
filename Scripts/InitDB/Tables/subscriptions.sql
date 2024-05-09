CREATE TABLE app.subscriptions (
    "id" text NOT NULL,
    "user" text NOT NULL,
    "node" text NOT NULL,
    "eventType" text NOT NULL, 
);

ALTER TABLE ONLY app.subscriptions
    ADD CONSTRAINT v1_draft_subscriptions_pkey PRIMARY KEY (id);