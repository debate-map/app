/*CREATE TABLE app_public."visibilityDirectives" (
    id text NOT NULL,
    actor text NOT NULL,
    priority real NOT NULL,
    context text[] NOT NULL,
    target_map text,
    target_node text,
    "target_nodeLink" text,
    visibility_self text,
    visibility_nodes text
);
ALTER TABLE ONLY app_public."visibilityDirectives"
    ADD CONSTRAINT "v1_draft_visibilityDirectives_pkey" PRIMARY KEY (id);*/