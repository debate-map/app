ALTER TABLE ONLY app.maps
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app.medias
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeRatings"
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app.nodes
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app.terms
    ADD CONSTRAINT "fk @from(accessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("accessPolicy") REFERENCES app."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app."commandRuns"
    ADD CONSTRAINT "fk @from(actor) @to(users.id)" FOREIGN KEY (actor) REFERENCES app.users(id) DEFERRABLE;
/*ALTER TABLE ONLY app."visibilityDirectives"
    ADD CONSTRAINT "fk @from(actor) @to(users.id)" FOREIGN KEY (actor) REFERENCES app.users(id) DEFERRABLE;*/
ALTER TABLE ONLY app.nodes
    ADD CONSTRAINT "fk @from(c_currentRevision) @to(nodeRevisions.id)" FOREIGN KEY ("c_currentRevision") REFERENCES app."nodeRevisions"(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeLinks"
    ADD CONSTRAINT "fk @from(child) @to(nodes.id)" FOREIGN KEY (child) REFERENCES app.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app."accessPolicies"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app.maps
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app.medias
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeLinks"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app."nodePhrasings"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeRatings"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app.nodes
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeRevisions"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeTags"
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app.shares
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app.terms
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app.feedback_proposals
    ADD CONSTRAINT "fk @from(creator) @to(users.id)" FOREIGN KEY (creator) REFERENCES app.users(id) DEFERRABLE;
ALTER TABLE ONLY app."userHiddens"
    ADD CONSTRAINT "fk @from(lastAccessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("lastAccessPolicy") REFERENCES app."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app."mapNodeEdits"
    ADD CONSTRAINT "fk @from(map) @to(maps.id)" FOREIGN KEY (map) REFERENCES app.maps(id) DEFERRABLE;
ALTER TABLE ONLY app."mapNodeEdits"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app."nodePhrasings"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeRatings"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeRevisions"
    ADD CONSTRAINT "fk @from(node) @to(nodes.id)" FOREIGN KEY (node) REFERENCES app.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app.maps
    ADD CONSTRAINT "fk @from(nodeAccessPolicy) @to(accessPolicies.id)" FOREIGN KEY ("nodeAccessPolicy") REFERENCES app."accessPolicies"(id) DEFERRABLE;
ALTER TABLE ONLY app."nodeLinks"
    ADD CONSTRAINT "fk @from(parent) @to(nodes.id)" FOREIGN KEY (parent) REFERENCES app.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app.maps
    ADD CONSTRAINT "fk @from(rootNode) @to(nodes.id)" FOREIGN KEY ("rootNode") REFERENCES app.nodes(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE ONLY app.nodes
    ADD CONSTRAINT "fk @from(rootNodeForMap) @to(maps.id)" FOREIGN KEY ("rootNodeForMap") REFERENCES app.maps(id) DEFERRABLE;
/*ALTER TABLE ONLY app."visibilityDirectives"
    ADD CONSTRAINT "fk @from(target_map) @to(maps.id)" FOREIGN KEY (target_map) REFERENCES app.maps(id) DEFERRABLE;
ALTER TABLE ONLY app."visibilityDirectives"
    ADD CONSTRAINT "fk @from(target_node) @to(nodes.id)" FOREIGN KEY (target_node) REFERENCES app.nodes(id) DEFERRABLE;
ALTER TABLE ONLY app."visibilityDirectives"
    ADD CONSTRAINT "fk @from(target_nodeLink) @to(nodeLinks.id)" FOREIGN KEY ("target_nodeLink") REFERENCES app."nodeLinks"(id) DEFERRABLE;*/
    
-- commented atm, due to issue hit at runtime (when deleting an entry or something)
-- alter table app."nodeRevisions" add constraint "fk @from(replacedBy) @to(nodeRevisions.id)" FOREIGN KEY ("replacedBy") REFERENCES "nodeRevisions" (id);