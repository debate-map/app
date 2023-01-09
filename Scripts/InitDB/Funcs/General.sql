-- functions for uuid encode/decode
--CREATE OR REPLACE FUNCTION encode_uuid(id UUID) RETURNS varchar(22) LANGUAGE SQL IMMUTABLE AS $$1
CREATE OR REPLACE FUNCTION app.encode_uuid(id UUID) RETURNS varchar(22) LANGUAGE SQL IMMUTABLE AS $$
	SELECT replace(replace(
	trim(trailing '=' FROM encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'))
	, '+', '-'), '/', '_');
$$;
CREATE OR REPLACE FUNCTION app.decode_uuid(id text) RETURNS UUID LANGUAGE SQL IMMUTABLE AS $$
	SELECT encode(decode(
		replace(replace(id, '_', '/'), '-', '+') || substr('==', 1, (33-length(id)) % 3), 'base64'), 'hex')::uuid;
$$;

-- search-related functions
CREATE OR REPLACE FUNCTION app.rev_row_quote_to_tsv(r app."nodeRevisions") RETURNS tsvector AS $$
	SELECT attachments_to_tsv(r.attachments);
$$ LANGUAGE SQL STABLE;
CREATE OR REPLACE FUNCTION app.phrasing_row_to_tsv(p app."nodePhrasings") RETURNS tsvector AS $$
	SELECT phrasings_to_tsv(p.text_base, p.text_question)
$$ LANGUAGE SQL STABLE;
CREATE OR REPLACE FUNCTION app.rev_row_phrasing_to_tsv(p app."nodeRevisions") RETURNS tsvector AS $$
	SELECT rev_phrasing_to_tsv(p.phrasing)
$$ LANGUAGE SQL STABLE;

-- array-related functions
CREATE OR REPLACE FUNCTION app.distinct_array(a text[]) RETURNS text[] AS $$
	SELECT ARRAY (
		SELECT DISTINCT v FROM unnest(a) AS b(v)
	)
$$ LANGUAGE SQL;
