CREATE TABLE app.shares (
    "id" text NOT NULL,
    "creator" text NOT NULL,
    "createdAt" bigint NOT NULL,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "mapID" text,
    "mapView" jsonb
);
ALTER TABLE ONLY app.shares
    ADD CONSTRAINT v1_draft_shares_pkey PRIMARY KEY (id);