create extension if not exists pg_trgm;

create index concurrently if not exists card_search_document_idx
  on "Card"
  using gin (
    (
      setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(description, '')), 'B')
    )
  );

create index concurrently if not exists card_title_trgm_idx
  on "Card"
  using gin (title gin_trgm_ops);

create index concurrently if not exists card_description_trgm_idx
  on "Card"
  using gin (description gin_trgm_ops);

create index concurrently if not exists board_name_trgm_idx
  on "Board"
  using gin (name gin_trgm_ops);
