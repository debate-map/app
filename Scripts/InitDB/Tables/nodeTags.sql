CREATE TABLE app_public."nodeTags" (
    id text NOT NULL,
    creator text NOT NULL,
    "createdAt" bigint NOT NULL,
    nodes text[] NOT NULL,
    "mirrorChildrenFromXToY" jsonb,
    "xIsExtendedByY" jsonb,
    "mutuallyExclusiveGroup" jsonb,
    "restrictMirroringOfX" jsonb,
    labels jsonb,
    "cloneHistory" jsonb
);
ALTER TABLE ONLY app_public."nodeTags"
    ADD CONSTRAINT "v1_draft_nodeTags_pkey" PRIMARY KEY (id);