CREATE TABLE app.timelines (
    "id" text NOT NULL,
    "accessPolicy" text NOT NULL,
    "creator" text NOT NULL,
    "createdAt" bigint NOT NULL,
    "mapID" text NOT NULL,
    "name" text NOT NULL,
    "videoID" text,
    "videoStartTime" real,
    "videoHeightVSWidthPercent" real
);
ALTER TABLE ONLY app.timelines
    ADD CONSTRAINT v1_draft_timelines_pkey PRIMARY KEY (id);