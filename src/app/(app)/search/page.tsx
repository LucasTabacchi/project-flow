import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";
import { getSearchCards, getSearchContext } from "@/lib/data/dashboard";
import { SearchFilters } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function SearchResultsFallback() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[28px] border border-border bg-card/70 p-6"
        >
          <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-secondary/70" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-secondary/70" />
        </div>
      ))}
    </div>
  );
}

function SearchFiltersFallback() {
  return (
    <>
      <div className="rounded-[32px] border border-border bg-card/70 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-secondary/70" />
        <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_repeat(5,minmax(0,1fr))]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-2xl bg-secondary"
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <div className="h-11 w-32 animate-pulse rounded-2xl bg-secondary" />
      </div>
    </>
  );
}

async function SearchFiltersSection({
  contextPromise,
  filters,
}: {
  contextPromise: ReturnType<typeof getSearchContext>;
  filters: {
    q: string;
    boardId: string;
    assigneeId: string;
    labelId: string;
    priority: string;
    status: string;
    overdue: string;
  };
}) {
  const context = await contextPromise;
  const searchFiltersKey = Object.values(filters).join("|");

  return (
    <SearchFilters
      key={searchFiltersKey}
      context={context}
      initialFilters={filters}
    />
  );
}

async function SearchResultsSection({
  resultsPromise,
}: {
  resultsPromise: ReturnType<typeof getSearchCards>;
}) {
  const results = await resultsPromise;

  return <SearchResults results={results} />;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);

  const filters = {
    q: getSingleValue(params.q),
    boardId: getSingleValue(params.boardId),
    assigneeId: getSingleValue(params.assigneeId),
    labelId: getSingleValue(params.labelId),
    priority: getSingleValue(params.priority),
    status: getSingleValue(params.status),
    overdue: getSingleValue(params.overdue),
  };
  const searchContextPromise = getSearchContext(user.id);
  const searchResultsPromise = getSearchCards(user.id, {
    query: filters.q || undefined,
    boardId: filters.boardId || undefined,
    assigneeId: filters.assigneeId || undefined,
    labelId: filters.labelId || undefined,
    priority: filters.priority || undefined,
    status: filters.status || undefined,
    onlyOverdue: filters.overdue === "true",
  });

  return (
    <div className="space-y-6">
      <Suspense fallback={<SearchFiltersFallback />}>
        <SearchFiltersSection contextPromise={searchContextPromise} filters={filters} />
      </Suspense>
      <Suspense fallback={<SearchResultsFallback />}>
        <SearchResultsSection resultsPromise={searchResultsPromise} />
      </Suspense>
    </div>
  );
}
