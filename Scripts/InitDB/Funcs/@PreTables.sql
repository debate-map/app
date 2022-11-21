-- this file is for functions that are used within the table creation commands (eg. "field_x GENERATED ALWAYS AS func_y()"), and thus need to be created beforehand (or for simple)


-- search-related indexes/functions
CREATE OR REPLACE FUNCTION pick_phrasing(base TEXT, question TEXT) RETURNS TEXT AS $$
	SELECT (CASE
		WHEN base IS NOT NULL AND length(base) > 0 AND regexp_match(base, '\[Paragraph [0-9]\]') IS NULL THEN base
		WHEN question IS NOT NULL AND length(question) > 0 AND regexp_match(question, '\[Paragraph [0-9]\]') IS NULL THEN question 
		ELSE ''
		END)
$$ LANGUAGE SQL IMMUTABLE;


CREATE OR REPLACE FUNCTION phrasings_to_tsv(base TEXT, question TEXT) RETURNS tsvector AS $$
	SELECT to_tsvector('public.english_nostop'::regconfig, pick_phrasing(base, question));
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION pick_rev_phrasing(phrasing JSONB) RETURNS TEXT AS $$
	SELECT pick_phrasing((phrasing #> '{text_base}')::text, (phrasing #> '{text_question}')::text);
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION rev_phrasing_to_tsv(phrasing JSONB) RETURNS tsvector AS $$
	SELECT to_tsvector('public.english_nostop'::regconfig, pick_rev_phrasing(phrasing));
$$ LANGUAGE SQL IMMUTABLE;


CREATE OR REPLACE FUNCTION attachment_quotes_table(attachments JSONB) RETURNS TABLE (quote TEXT) AS $$
	SELECT jsonb_array_elements_text(jsonb_path_query_array(attachments,'$[*].quote.content')) AS quote;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION attachment_quotes(attachments JSONB) RETURNS TEXT AS $$
	SELECT string_agg(t, '\n\n') FROM attachment_quotes_table(attachments) AS t;
$$ LANGUAGE SQL IMMUTABLE;


CREATE OR REPLACE FUNCTION attachments_to_tsv(attachments JSONB) RETURNS tsvector AS $$
	SELECT jsonb_to_tsvector('public.english_nostop'::regconfig, jsonb_path_query_array(attachments,'$[*].quote.content'), '["string"]');
$$ LANGUAGE SQL IMMUTABLE;