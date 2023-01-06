-- functions for uuid encode/decode
--CREATE OR REPLACE FUNCTION encode_uuid(id UUID) RETURNS varchar(22) LANGUAGE SQL IMMUTABLE AS $$1
CREATE OR REPLACE FUNCTION app_public.encode_uuid(id UUID) RETURNS varchar(22) LANGUAGE SQL IMMUTABLE AS $$
	SELECT replace(replace(
	trim(trailing '=' FROM encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'))
	, '+', '-'), '/', '_');
$$;
CREATE OR REPLACE FUNCTION app_public.decode_uuid(id text) RETURNS UUID LANGUAGE SQL IMMUTABLE AS $$
	SELECT encode(decode(
		replace(replace(id, '_', '/'), '-', '+') || substr('==', 1, (33-length(id)) % 3), 'base64'), 'hex')::uuid;
$$;

-- search-related functions
CREATE OR REPLACE FUNCTION app_public.rev_row_quote_to_tsv(r app_public."nodeRevisions") RETURNS tsvector AS $$
	SELECT attachments_to_tsv(r.attachments);
$$ LANGUAGE SQL STABLE;
CREATE OR REPLACE FUNCTION app_public.phrasing_row_to_tsv(p app_public."nodePhrasings") RETURNS tsvector AS $$
	SELECT phrasings_to_tsv(p.text_base, p.text_question)
$$ LANGUAGE SQL STABLE;
CREATE OR REPLACE FUNCTION app_public.rev_row_phrasing_to_tsv(p app_public."nodeRevisions") RETURNS tsvector AS $$
	SELECT rev_phrasing_to_tsv(p.phrasing)
$$ LANGUAGE SQL STABLE;

-- array-related functions
create or replace function app_public.distinct_array(a text[]) returns text[] as $$
	select array (
		select distinct v from unnest(a) as b(v)
	)
$$ language sql;
