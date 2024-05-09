CREATE TABLE app.notifications (
    "id" text NOT NULL,
    "user" text NOT NULL,
    "commandRun" text NOT NULL,
    "readTime" bigint,
);

ALTER TABLE ONLY app.notifications
    ADD CONSTRAINT v1_draft_notifications_pkey PRIMARY KEY (id);