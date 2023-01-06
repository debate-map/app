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