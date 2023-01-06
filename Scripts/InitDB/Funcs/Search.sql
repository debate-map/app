-- Due to greater scale/perf-requirements, global_search currently has fewer features than local_search. (eg. lacking search-result rankings)
-- It may be possible to expand its feature-set in the future, but I don't have the experience to do so currently (while still maintaining the performance).
CREATE OR REPLACE FUNCTION global_search(
	query text,
	slimit INTEGER DEFAULT 20, soffset INTEGER DEFAULT 0
) RETURNS TABLE (node_id TEXT, type TEXT, found_text TEXT) AS $$
	WITH matches_1 AS (
		SELECT DISTINCT ON(node_id)
			rev.node AS node_id,
			'standard' AS type,
			ts_headline('public.english_nostop'::regconfig, pick_rev_phrasing(rev.phrasing), websearch_to_tsquery('public.english_nostop'::regconfig, query)) as found_text
		FROM app_public."nodeRevisions" rev
		WHERE "replacedBy" IS NULL
			AND websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ rev.phrasing_tsvector
		LIMIT (soffset + slimit)
	),
	matches_2 AS (
		SELECT DISTINCT ON(node_id)
			rev.node AS node_id,
			'quote' AS type,
			ts_headline('public.english_nostop'::regconfig, attachment_quotes(rev.attachments), websearch_to_tsquery('public.english_nostop'::regconfig, query)) as found_text
		FROM app_public."nodeRevisions" rev
		WHERE "replacedBy" IS NULL
			AND websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ rev.attachments_tsvector
			AND NOT (rev.node IN (SELECT node_id from matches_1))
		LIMIT (soffset + slimit) - (SELECT COUNT(*) FROM matches_1)
	),
	matches_3 AS (
		SELECT DISTINCT ON(node_id)
			phrasing.node AS node_id,
			phrasing.type AS type,
			ts_headline('public.english_nostop'::regconfig, pick_phrasing(text_base, text_question), websearch_to_tsquery('public.english_nostop'::regconfig, query)) AS found_text
		FROM app_public."nodePhrasings" AS phrasing
		WHERE websearch_to_tsquery('public.english_nostop'::regconfig, query) @@ phrasing.phrasing_tsvector
			AND NOT (phrasing.node IN (SELECT node_id from matches_1))
			AND NOT (phrasing.node IN (SELECT node_id from matches_2))
		LIMIT (soffset + slimit) - (SELECT COUNT(*) FROM matches_1) - (SELECT COUNT(*) FROM matches_2)
	)
	SELECT * from matches_1
	UNION ALL (SELECT * from matches_2)
	UNION ALL (SELECT * from matches_3)
	LIMIT slimit OFFSET soffset;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION local_search(
	root text, query text, slimit INTEGER DEFAULT 20, soffset INTEGER DEFAULT 0,
	depth INTEGER DEFAULT 10, quote_rank_factor FLOAT DEFAULT 0.9, alt_phrasing_rank_factor FLOAT default 0.95)
RETURNS TABLE (node_id TEXT, rank FLOAT, type TEXT, found_text TEXT, node_text TEXT) AS $$
  WITH d AS (SELECT id FROM descendants2(root, depth)),
		 q AS (SELECT websearch_to_tsquery('public.english_nostop'::regconfig, query) AS q),
		 p AS (
				SELECT rev.node AS node_id,
					NULL AS phrasing_id,
					ts_rank(rev.phrasing_tsvector, q.q) AS rank,
					'standard' AS type
					FROM app_public."nodeRevisions" rev
					JOIN d ON rev.node = d.id
					JOIN q ON (true)
					WHERE rev."replacedBy" IS NULL AND q.q @@ rev.phrasing_tsvector
 			UNION (
				SELECT rev.node AS node_id,
					NULL AS phrasing_id,
					ts_rank(rev.attachments_tsvector, q.q) * quote_rank_factor AS rank,
					'quote' AS type
					FROM app_public."nodeRevisions" rev
					JOIN d ON rev.node = d.id
					JOIN q ON (true)
					WHERE rev."replacedBy" IS NULL AND q.q @@ rev.attachments_tsvector
			) UNION (
				SELECT phrasing.node AS node_id,
				  phrasing.id AS phrasing_id,
					ts_rank(phrasing.phrasing_tsvector, q.q) * alt_phrasing_rank_factor AS rank,
					phrasing.type AS type
					FROM app_public."nodePhrasings" AS phrasing
					JOIN d ON phrasing.node = d.id
					JOIN q ON (true)
					WHERE q.q @@ phrasing.phrasing_tsvector
			)
		 ),
		 op AS (SELECT DISTINCT ON (node_id) node_id, phrasing_id, rank, type FROM p ORDER BY node_id, rank DESC),
		 op2 AS (SELECT * FROM op ORDER BY rank DESC LIMIT slimit OFFSET soffset)
	SELECT op2.node_id, op2.rank, op2.type,
			(CASE
				WHEN op2.type = 'quote' THEN ts_headline('public.english_nostop'::regconfig, attachment_quotes(rev.attachments), q.q)
				WHEN op2.type = 'standard' AND phrasing_id IS NULL THEN ts_headline('public.english_nostop'::regconfig, pick_rev_phrasing(rev.phrasing), q.q)
				ELSE ts_headline('public.english_nostop'::regconfig, pick_phrasing(phrasing.text_base, phrasing.text_question), q.q)
				END
			) AS found_text,
			pick_rev_phrasing(rev.phrasing) AS node_text
		  FROM op2
			JOIN app_public."nodeRevisions" AS rev ON (op2.node_id = rev.node)
			JOIN q ON (true)
			LEFT JOIN app_public."nodePhrasings" AS phrasing ON phrasing.id = op2.phrasing_id
			WHERE rev."replacedBy" IS NULL;
$$ LANGUAGE SQL STABLE;