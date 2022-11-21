CREATE TABLE app_public."mapNodeEdits" (
	id text NOT NULL,
	map text NOT NULL,
	node text NOT NULL,
	"time" bigint NOT NULL,
	type text NOT NULL
);
ALTER TABLE ONLY app_public."mapNodeEdits"
    ADD CONSTRAINT "v1_draft_mapNodeEdits_pkey" PRIMARY KEY (id);