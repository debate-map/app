CREATE OR REPLACE FUNCTION app.descendants(root text, max_depth INTEGER DEFAULT 5)
RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
	SELECT root as id, null as link_id, 0 as depth
	UNION ALL (
		WITH RECURSIVE children(id, depth, is_cycle, nodes_path, order_key, link_id) AS (
			-- anchor/initial member
			SELECT p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
			FROM app."nodeLinks" AS p
			WHERE p.parent=root AND 1 <= max_depth
			-- recursive member
			UNION
				SELECT c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
				FROM app."nodeLinks" AS c, children
				WHERE c.parent = children.id AND NOT is_cycle AND children.depth+1 <= max_depth
		)
		SELECT min(id) as id, link_id, min(depth) as depth
		FROM children
		GROUP BY (link_id)
		ORDER BY min(depth), min(order_key), link_id
	)
$$;
-- todo: update this
CREATE OR REPLACE FUNCTION app.ancestors(root text, max_depth INTEGER DEFAULT 5)
RETURNS TABLE(id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
	SELECT root as id, 0 as depth
	UNION ALL (
		WITH RECURSIVE parents(id, depth, is_cycle, nodes_path) AS (
			-- anchor/initial member
			SELECT p.parent, 1, false, ARRAY[p.child]
			FROM app."nodeLinks" AS p
			WHERE p.child=root AND 1 <= max_depth
			-- recursive member
			UNION
				SELECT c.parent, parents.depth+1, c.parent = ANY(parents.nodes_path), nodes_path || c.child
				FROM app."nodeLinks" AS c, parents
				WHERE c.child = parents.id AND NOT is_cycle AND parents.depth+1 <= max_depth
		)
		SELECT id, min(depth) as depth
		FROM parents
		GROUP BY id
		ORDER BY depth, id
	)
$$;
CREATE OR REPLACE FUNCTION app.shortest_path(source text, dest text)
RETURNS TABLE(node_id text, link_id text) LANGUAGE plpgsql STABLE AS $$
DECLARE
	node_ids text[];
	link_ids text[];
	seq integer[];
BEGIN
	WITH RECURSIVE parents(link, parent, child, depth, is_cycle, nodes_path, links_path) AS (
		-- anchor/initial member
		SELECT p.id, p.parent, p.child, 0, false, ARRAY[p.child], ARRAY[p.id]
		FROM app."nodeLinks" AS p
		WHERE p.child=dest
		-- recursive member
		UNION
			SELECT c.id, c.parent, c.child, parents.depth+1, c.parent = ANY(nodes_path), nodes_path || c.child, links_path || c.id
			FROM app."nodeLinks" AS c, parents
			WHERE c.child = parents.parent AND NOT is_cycle
	)
	SELECT parents.nodes_path, parents.links_path INTO STRICT node_ids, link_ids
	FROM parents
	WHERE parents.parent = source
	ORDER BY depth DESC LIMIT 1;

	SELECT array_agg(gs.val order by gs.val) INTO STRICT seq from generate_series(0, array_length(node_ids, 1)) gs(val);

	RETURN QUERY SELECT t.node_id, t.link_id FROM unnest(node_ids || source, ARRAY[null]::text[] || link_ids, seq) AS t(node_id, link_id, depth) ORDER by t.depth DESC;
END $$;

-- specialized functions (ie. ones that would be "ideal to consolidate" into the above functions, if not for the language limitations of SQL [expressiveness, interpretability constraints of the optimizer, etc.])
-- ==========

-- variant of descendants that tries to order the results in a way that mimics the render-order in debate-map (ie. traverse down at each step doing: stable-sort by link-id, then stable-sort by order-key)
CREATE OR REPLACE FUNCTION app.descendants2(root text, max_depth INTEGER DEFAULT 5)
RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
	WITH sub AS (
		SELECT null as parent_id, root as child_id, 0 as depth, null as order_key, null as link_id
		UNION ALL (
			WITH RECURSIVE children(parent_id, child_id, depth, is_cycle, nodes_path, order_key, link_id) AS (
				-- anchor/initial member
				SELECT p.parent, p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
				FROM app."nodeLinks" AS p
				WHERE p.parent=root AND 1 <= max_depth
				-- recursive member
				UNION
					SELECT c.parent, c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
					FROM app."nodeLinks" AS c, children
					WHERE c.parent = children.child_id AND NOT is_cycle AND children.depth+1 <= max_depth
			)
			SELECT DISTINCT ON (link_id) parent_id, child_id, depth, order_key, link_id
			FROM children
			ORDER BY link_id, depth
		)
	)
	SELECT child_id as id, link_id, depth FROM sub ORDER BY sub.depth, sub.parent_id, sub.order_key, sub.link_id
$$;

-- variant of descendants that tracks a "single_parent_ancestry" boolean for each path through the node tree
-- if any path traverses through a node with multiple parents (ie. a child of multiple node-links), then that node/row (and all rows found through/under it) will have single_parent_ancestry set to false
CREATE OR REPLACE FUNCTION app.descendants_with_ancestry_attributes(root text, max_depth INTEGER DEFAULT 5, traverse_past_multi_parent_nodes BOOL DEFAULT TRUE)
RETURNS TABLE(id text, link_id text, distance INTEGER, single_parent_ancestry BOOL) LANGUAGE SQL STABLE AS $$
	WITH RECURSIVE children(id, depth, is_cycle, nodes_path, order_key, link_id, single_parent_ancestry) AS (
		-- anchor/initial member
		SELECT root, 0, false, ARRAY[root], null COLLATE "C", null COLLATE "C", (SELECT count(*) FROM app."nodeLinks" WHERE child=root) <= 1
		-- recursive member
		UNION
			SELECT l.child, children.depth+1, l.child = ANY(children.nodes_path), nodes_path || l.parent, l."orderKey", l.id, children.single_parent_ancestry AND (SELECT count(*) FROM app."nodeLinks" WHERE child=l.child) <= 1
			FROM app."nodeLinks" AS l, children
			WHERE l.parent = children.id AND NOT children.is_cycle AND children.depth+1 <= max_depth AND (traverse_past_multi_parent_nodes OR children.single_parent_ancestry)
	)
	-- [Is this grouping+ordering+selecting at the end even needed? Why not just return the raw results of the recursive query above?]
	SELECT min(id) as id, link_id, min(depth) as depth, bool_and(single_parent_ancestry) as single_parent_ancestry
	FROM children
	GROUP BY (link_id)
	ORDER BY min(depth), min(order_key), link_id
$$;