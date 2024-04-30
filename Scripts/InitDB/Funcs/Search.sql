-- Note: This is using materialized tsvectors, but the calculated version is left in comments.

CREATE OR REPLACE FUNCTION app.global_search(
	query text,
	slimit INTEGER DEFAULT 20, soffset INTEGER DEFAULT 0,
	quote_rank_factor FLOAT DEFAULT 0.9, alt_phrasing_rank_factor FLOAT default 0.95
) RETURNS TABLE (node_id TEXT, rank FLOAT, type TEXT, found_text TEXT, node_text TEXT) AS $$
	WITH d AS (SELECT id FROM app.nodes),
		 q AS (SELECT websearch_to_tsquery('app.english_nostop'::regconfig, query) AS q),
		 p AS (
				SELECT rev.node AS node_id,
					NULL AS phrasing_id,
					ts_rank(rev.phrasing_tsvector, q.q) AS rank,
					-- app.rev_phrasing_to_tsv(rev.phrasing)
					'standard' AS type
					FROM app.my_node_revisions rev
					JOIN d ON rev.node = d.id
					JOIN q ON (true)
					WHERE rev."replacedBy" IS NULL AND q.q @@ rev.phrasing_tsvector
 			UNION (
				SELECT rev.node AS node_id,
					NULL AS phrasing_id,
					ts_rank(rev.attachments_tsvector, q.q) * quote_rank_factor AS rank,
					-- app.attachments_to_tsv(rev.attachments)
					'quote' AS type
					FROM app.my_node_revisions rev
					JOIN d ON rev.node = d.id
					JOIN q ON (true)
					WHERE rev."replacedBy" IS NULL AND q.q @@ rev.attachments_tsvector
			) UNION (
				SELECT phrasing.node AS node_id,
				  phrasing.id AS phrasing_id,
					ts_rank(phrasing.phrasing_tsvector, q.q) * alt_phrasing_rank_factor AS rank,
					-- app.phrasings_to_tsv(phrasing.text_base, phrasing.text_question)
					phrasing.type AS type
					FROM app.my_node_phrasings AS phrasing
					JOIN d ON phrasing.node = d.id
					JOIN q ON (true)
					WHERE q.q @@ phrasing.phrasing_tsvector
			)
		 ),
		 op AS (SELECT DISTINCT ON (node_id) node_id, phrasing_id, rank, type FROM p ORDER BY node_id, rank DESC),
		 op2 AS (SELECT * FROM op ORDER BY rank DESC LIMIT slimit OFFSET soffset)
	SELECT op2.node_id, op2.rank, op2.type,
			(CASE
				WHEN op2.type = 'quote' THEN ts_headline('app.english_nostop'::regconfig, app.attachment_quotes(rev.attachments), q.q)
				WHEN op2.type = 'standard' AND phrasing_id IS NULL THEN ts_headline('app.english_nostop'::regconfig, app.pick_rev_phrasing(rev.phrasing), q.q)
				ELSE ts_headline('app.english_nostop'::regconfig, app.pick_phrasing(phrasing.text_base, phrasing.text_question), q.q)
				END
			) AS found_text,
			app.pick_rev_phrasing(rev.phrasing) AS node_text
		  FROM op2
			JOIN app.my_node_revisions AS rev ON (op2.node_id = rev.node)
			JOIN q ON (true)
			LEFT JOIN app.my_node_phrasings AS phrasing ON phrasing.id = op2.phrasing_id
			WHERE rev."replacedBy" IS NULL;
$$ LANGUAGE SQL STABLE;


CREATE OR REPLACE FUNCTION app.local_search(
	root text, query text, slimit INTEGER DEFAULT 20, soffset INTEGER DEFAULT 0,
	depth INTEGER DEFAULT 10, quote_rank_factor FLOAT DEFAULT 0.9, alt_phrasing_rank_factor FLOAT default 0.95)
RETURNS TABLE (node_id TEXT, rank FLOAT, type TEXT, found_text TEXT, node_text TEXT) AS $$
  WITH d AS (SELECT id FROM app.descendants2(root, depth)),
		 q AS (SELECT websearch_to_tsquery('app.english_nostop'::regconfig, query) AS q),
		 p AS (
				SELECT rev.node AS node_id,
					NULL AS phrasing_id,
					ts_rank(rev.phrasing_tsvector, q.q) AS rank,
					-- app.rev_phrasing_to_tsv(rev.phrasing)
					'standard' AS type
					FROM app.my_node_revisions rev
					JOIN d ON rev.node = d.id
					JOIN q ON (true)
					WHERE rev."replacedBy" IS NULL AND q.q @@ rev.phrasing_tsvector
 			UNION (
				SELECT rev.node AS node_id,
					NULL AS phrasing_id,
					ts_rank(rev.attachments_tsvector, q.q) * quote_rank_factor AS rank,
					-- app.attachments_to_tsv(rev.attachments)
					'quote' AS type
					FROM app.my_node_revisions rev
					JOIN d ON rev.node = d.id
					JOIN q ON (true)
					WHERE rev."replacedBy" IS NULL AND q.q @@ rev.attachments_tsvector
			) UNION (
				SELECT phrasing.node AS node_id,
				  phrasing.id AS phrasing_id,
					ts_rank(phrasing.phrasing_tsvector, q.q) * alt_phrasing_rank_factor AS rank,
					-- app.phrasings_to_tsv(phrasing.text_base, phrasing.text_question)
					phrasing.type AS type
					FROM app.my_node_phrasings AS phrasing
					JOIN d ON phrasing.node = d.id
					JOIN q ON (true)
					WHERE q.q @@ phrasing.phrasing_tsvector
			)
		 ),
		 op AS (SELECT DISTINCT ON (node_id) node_id, phrasing_id, rank, type FROM p ORDER BY node_id, rank DESC),
		 op2 AS (SELECT * FROM op ORDER BY rank DESC LIMIT slimit OFFSET soffset)
	SELECT op2.node_id, op2.rank, op2.type,
			(CASE
				WHEN op2.type = 'quote' THEN ts_headline('app.english_nostop'::regconfig, app.attachment_quotes(rev.attachments), q.q)
				WHEN op2.type = 'standard' AND phrasing_id IS NULL THEN ts_headline('app.english_nostop'::regconfig, app.pick_rev_phrasing(rev.phrasing), q.q)
				ELSE ts_headline('app.english_nostop'::regconfig, app.pick_phrasing(phrasing.text_base, phrasing.text_question), q.q)
				END
			) AS found_text,
			app.pick_rev_phrasing(rev.phrasing) AS node_text
		  FROM op2
			JOIN app.my_node_revisions AS rev ON (op2.node_id = rev.node)
			JOIN q ON (true)
			LEFT JOIN app.my_node_phrasings AS phrasing ON phrasing.id = op2.phrasing_id
			WHERE rev."replacedBy" IS NULL;
$$ LANGUAGE SQL STABLE;

-- old version (takes ~380ms as of 2023-05-22, according to "time" column of EXPLAIN ANALYZE)
/*CREATE OR REPLACE FUNCTION app.search_for_external_ids(id_field text, ids_to_find text[]) RETURNS TABLE (external_id TEXT) AS $$
	SELECT DISTINCT all_sources->>id_field AS external_id FROM (
		SELECT jsonb_array_elements(all_source_chains->'sources') AS all_sources FROM (
			SELECT jsonb_array_elements(COALESCE(
				all_attachments->'references'->'sourceChains',
				all_attachments->'quote'->'sourceChains'
			)) AS all_source_chains
			FROM (
				SELECT jsonb_array_elements(nr.attachments) AS all_attachments
				FROM my_node_revisions AS nr
			) AS _
		) AS _
	) AS _
	WHERE all_sources->>id_field = ANY(ids_to_find);
$$ LANGUAGE SQL STABLE;*/
-- new version (takes ~1ms as of 2023-05-22, according to "time" column of EXPLAIN ANALYZE)
CREATE OR REPLACE FUNCTION app.search_for_external_ids(id_field text, ids_to_find text[]) RETURNS TABLE (external_id TEXT) AS $$
	WITH candidates AS (SELECT unnest(ids_to_find) AS eid)
	SELECT DISTINCT eid FROM candidates JOIN my_node_revisions ON (
		attachments @> concat('[{"references":{"sourceChains":[{"sources":[{"',id_field,'":"',eid,'"}]}]}}]')::jsonb
	OR attachments @> concat('[{"quote":{"sourceChains":[{"sources":[{"',id_field,'":"',eid,'"}]}]}}]')::jsonb);
$$ LANGUAGE SQL STABLE;