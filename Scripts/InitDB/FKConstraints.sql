ALTER TABLE ONLY app_public.maps
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app_public."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app_public.medias
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app_public."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeRatings"
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app_public."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app_public.nodes
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app_public."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app_public.terms
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app_public."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app_public."commandRuns"
    ADD CONSTRAINT "fk @from(actor) @to(users.id)" FOREIGN KEY (actor) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public."visibilityDirectives"
    ADD CONSTRAINT "fk @from(actor) @to(users.id)" FOREIGN KEY (actor) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public.nodes
    ADD CONSTRAINT "fk @from(c_currentRevision) @to(nodeRevisions.id)" FOREIGN KEY ("c_currentRevision") REFERENCES app_public."nodeRevisions"(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeChildLinks"
    ADD CONSTRAINT "fk @from(child) @to(nodes.id)" FOREIGN KEY (child) REFERENCES app_public.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app_public."accessPolicies"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public.maps
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public.medias
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeChildLinks"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodePhrasings"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeRatings"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public.nodes
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeRevisions"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeTags"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public.shares
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public.terms
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public.feedback_proposals
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app_public.users(id) DEFERRABLE;
ALTER TABLE ONLY app_public."userHiddens"
    ADD CONSTRAINT "fk @from(lastAccessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("lastAccessPolicy") REFERENCES app_public."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app_public."mapNodeEdits"
    ADD CONSTRAINT "fk @from(map) @to(maps.id)" FOREIGN KEY (map) REFERENCES app_public.maps(id) DEFERRABLE;
ALTER TABLE ONLY app_public."mapNodeEdits"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app_public.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodePhrasings"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app_public.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeRatings"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app_public.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeRevisions"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app_public.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app_public.maps
    ADD CONSTRAINT "fk @from(nodeAccessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("nodeAccessPolicy") REFERENCES app_public."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app_public."nodeChildLinks"
    ADD CONSTRAINT "fk @from(parent) @to(nodes.id)" FOREIGN KEY (parent) REFERENCES app_public.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app_public.maps
    ADD CONSTRAINT "fk @from(rootNode) @to(nodes.id)" FOREIGN KEY ("rootNode") REFERENCES app_public.nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE ONLY app_public.nodes
    ADD CONSTRAINT "fk @from(rootNodeForMap) @to(maps.id)" FOREIGN KEY ("rootNodeForMap") REFERENCES app_public.maps(id) DEFERRABLE;
ALTER TABLE ONLY app_public."visibilityDirectives"
    ADD CONSTRAINT "fk @from(target_map) @to(maps.id)" FOREIGN KEY (target_map) REFERENCES app_public.maps(id) DEFERRABLE;
ALTER TABLE ONLY app_public."visibilityDirectives"
    ADD CONSTRAINT "fk @from(target_node) @to(nodes.id)" FOREIGN KEY (target_node) REFERENCES app_public.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app_public."visibilityDirectives"
    ADD CONSTRAINT "fk @from(target_nodeChildLink) @to(nodeChildLinks.id)" FOREIGN KEY ("target_nodeChildLink") REFERENCES app_public."nodeChildLinks"(id) DEFERRABLE;
    
-- commented atm, due to issue hit at runtime (when deleting an entry or something)
-- alter table app_public."nodeRevisions" add constraint "fk @from(replaced_by) @to(nodeRevisions.id)" FOREIGN KEY (replaced_by) REFERENCES "nodeRevisions" (id);