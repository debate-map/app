CREATE TABLE app.notifications (
    "id" text NOT NULL,
    "user" text NOT NULL,
    "commandRun" text NOT NULL,
    "readTime" bigint,
    CONSTRAINT notifications_pk PRIMARY KEY (id)
);