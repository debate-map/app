## List of SQL Queries Executed in this PR

```sql
CREATE TABLE app.subscriptions (
    "id" text NOT NULL,
    "user" text NOT NULL,
    "node" text NOT NULL,
    "eventType" text NOT NULL
);

ALTER TABLE ONLY app.subscriptions
    ADD CONSTRAINT v1_draft_subscriptions_pkey PRIMARY KEY (id);
    
   CREATE TABLE app.notifications (
    "id" text NOT NULL,
    "user" text NOT NULL,
    "commandRun" text NOT NULL,
    "readTime" bigint
);

ALTER TABLE ONLY app.notifications
    ADD CONSTRAINT v1_draft_notifications_pkey PRIMARY KEY (id);

ALTER TABLE app."userHiddens"
	ADD COLUMN "notificationPolicy" character varying(1) DEFAULT 'S' NOT NULL;
```