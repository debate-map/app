CREATE TABLE app."accessPolicies" (
    id text NOT NULL,
    name text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    permissions jsonb NOT NULL,
    "permissions_userExtends" jsonb NOT NULL
);
ALTER TABLE ONLY app."accessPolicies"
    ADD CONSTRAINT "v1_draft_accessPolicies_pkey" PRIMARY KEY (id);