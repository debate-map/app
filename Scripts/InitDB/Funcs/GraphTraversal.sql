CREATE OR REPLACE FUNCTION descendants(root text, max_depth INTEGER DEFAULT 5)
RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
	SELECT root as id, null as link_id, 0 as depth
	UNION ALL (
	WITH RECURSIVE children(id, depth, is_cycle, nodes_path, order_key, link_id) AS (
		SELECT
			p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
		FROM
			app_public."nodeLinks" AS p
		WHERE
			p.parent=root
		UNION
			SELECT
				c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
			FROM
				app_public."nodeLinks" AS c, children
			WHERE c.parent = children.id AND NOT is_cycle AND children.depth < max_depth
	) SELECT
		min(id) as id, link_id, min(depth) as depth
	FROM
		children
		GROUP BY (link_id)
		ORDER BY min(depth), min(order_key), link_id)
$$;
-- todo: update this
CREATE OR REPLACE FUNCTION ancestors(root text, max_depth INTEGER DEFAULT 5)
RETURNS TABLE(id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
	SELECT root as id, 0 as depth
	UNION ALL (
		WITH RECURSIVE parents(id, depth, is_cycle, nodes_path) AS (
			SELECT
				p.parent, 1, false, ARRAY[p.child]
			FROM
				app_public."nodeLinks" AS p
			WHERE
				p.child=root
			UNION
				SELECT
					c.parent, parents.depth+1, c.parent = ANY(parents.nodes_path), nodes_path || c.child
				FROM
					app_public."nodeLinks" AS c, parents
				WHERE c.child = parents.id AND NOT is_cycle AND parents.depth < max_depth
		) SELECT
			id, min(depth) as depth
		FROM
			parents
		GROUP BY id
		ORDER BY depth, id
	)
$$;
CREATE OR REPLACE FUNCTION shortest_path(source text, dest text)
RETURNS TABLE(node_id text, link_id text) LANGUAGE plpgsql STABLE AS $$
DECLARE
	node_ids text[];
	link_ids text[];
		seq integer[];
BEGIN
	WITH RECURSIVE parents(link, parent, child, depth, is_cycle, nodes_path, links_path) AS (
		SELECT
			p.id, p.parent, p.child, 0, false, ARRAY[p.child], ARRAY[p.id]
		FROM
			app_public."nodeLinks" AS p
		WHERE
			p.child=dest
		UNION
			SELECT
				c.id, c.parent, c.child, parents.depth+1, c.parent = ANY(nodes_path), nodes_path || c.child, links_path || c.id
			FROM
				app_public."nodeLinks" AS c, parents
			WHERE c.child = parents.parent AND NOT is_cycle
	) SELECT
		parents.nodes_path, parents.links_path INTO STRICT node_ids, link_ids
	FROM
		parents
	WHERE parents.parent = source
	ORDER BY depth DESC LIMIT 1;
		SELECT array_agg(gs.val order by gs.val) INTO STRICT seq from generate_series(0, array_length(node_ids, 1)) gs(val);
	RETURN QUERY SELECT t.node_id, t.link_id FROM unnest(node_ids || source, ARRAY[null]::text[] || link_ids, seq) AS t(node_id, link_id, depth) ORDER by t.depth DESC;
END
$$;

-- variant of descendants that tries to order the results in a way that mimics the render-order in debate-map (ie. traverse down at each step doing: stable-sort by link-id, then stable-sort by order-key)
CREATE OR REPLACE FUNCTION descendants2(root text, max_depth INTEGER DEFAULT 5)
RETURNS TABLE(id text, link_id text, distance INTEGER) LANGUAGE SQL STABLE AS $$
	WITH sub AS (
	SELECT null as parent_id, root as child_id, 0 as depth, null as order_key, null as link_id
	UNION ALL (
	WITH RECURSIVE children(parent_id, child_id, depth, is_cycle, nodes_path, order_key, link_id) AS (
		SELECT
			p.parent, p.child, 1, false, ARRAY[p.parent], p."orderKey", p.id
		FROM
			app_public."nodeLinks" AS p
		WHERE
			p.parent=root
		UNION
			SELECT
				c.parent, c.child, children.depth+1, c.child = ANY(children.nodes_path), nodes_path || c.parent, c."orderKey", c.id
			FROM
				app_public."nodeLinks" AS c, children
			WHERE c.parent = children.child_id AND NOT is_cycle AND children.depth < max_depth
	) SELECT DISTINCT ON (link_id) parent_id, child_id, depth, order_key, link_id
	FROM
		children
	ORDER BY link_id, depth))
	SELECT child_id as id, link_id, depth FROM sub ORDER BY sub.depth, sub.parent_id, sub.order_key, sub.link_id
$$;

CREATE OR REPLACE FUNCTION local_search(
	root text, query text,
	slimit INTEGER DEFAULT 20, soffset INTEGER DEFAULT 0, depth INTEGER DEFAULT 10,
	quote_rank_factor FLOAT DEFAULT 0.9, alt_phrasing_rank_factor FLOAT default 0.95
) RETURNS TABLE (node_id TEXT, rank FLOAT, type TEXT, found_text TEXT, node_text TEXT) AS $$
	WITH d AS (SELECT id FROM descendants2(root, depth)),
			lrev AS (SELECT DISTINCT ON (node) node, id FROM app_public."nodeRevisions" ORDER BY node, "createdAt" DESC),
			p AS (
				SELECT rev.node AS node_id,
					ts_rank(rev_phrasing_to_tsv(rev.phrasing), websearch_to_tsquery('public.english_nostop'::regconfig, query)) AS rank,
					'standard' AS type,
					ts_headline('public.english_nostop'::regconfig, pick_rev_phrasing(rev.phrasing), websearch_to_tsquery('public.english_nostop'::regconfig, query)) as found_text
					FROM app_public."nodeRevisions" rev
					JOIN lrev USING (id)
					JOIN d ON rev.node = d.id
					WHERE websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ rev_phrasing_to_tsv(rev.phrasing)
				UNION (
				SELECT rev.node AS node_id,
					ts_rank(attachments_to_tsv(rev.attachments), websearch_to_tsquery('public.english_nostop'::regconfig, query)) * quote_rank_factor AS rank,
					'quote' AS type,
					ts_headline('public.english_nostop'::regconfig, attachment_quotes(rev.attachments), websearch_to_tsquery('public.english_nostop'::regconfig, query)) as found_text
					FROM app_public."nodeRevisions" rev
					JOIN lrev USING (id)
					JOIN d ON rev.node = d.id
					WHERE websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ attachments_to_tsv(rev.attachments)
			) UNION (
				SELECT phrasing.node AS node_id,
					ts_rank(phrasing_row_to_tsv(phrasing), websearch_to_tsquery('public.english_nostop'::regconfig, query)) * alt_phrasing_rank_factor AS rank,
					phrasing.type AS type,
					ts_headline('public.english_nostop'::regconfig, pick_phrasing(text_base, text_question), websearch_to_tsquery('public.english_nostop'::regconfig, query)) AS found_text
					FROM app_public."nodePhrasings" AS phrasing
					JOIN d ON phrasing.node = d.id
					WHERE websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ phrasing_row_to_tsv(phrasing)
			)
			),
			op AS (SELECT DISTINCT ON (node_id) node_id, rank, type, found_text FROM p ORDER BY node_id, rank DESC),
			op2 AS (
			SELECT op.*, pick_rev_phrasing(rev.phrasing) AS node_text
			FROM op
			JOIN lrev ON (op.node_id = lrev.node)
			JOIN app_public."nodeRevisions" AS rev USING (id))
	SELECT * FROM op2 ORDER BY rank DESC LIMIT slimit OFFSET soffset;
$$ LANGUAGE SQL STABLE;