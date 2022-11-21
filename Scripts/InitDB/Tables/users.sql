CREATE TABLE app_public.users (
    id text NOT NULL,
    "displayName" text NOT NULL,
    "photoURL" text,
    "joinDate" bigint NOT NULL,
    "permissionGroups" jsonb NOT NULL,
    edits integer NOT NULL,
    "lastEditAt" bigint
);
ALTER TABLE ONLY app_public.users
    ADD CONSTRAINT v1_draft_users_pkey PRIMARY KEY (id);