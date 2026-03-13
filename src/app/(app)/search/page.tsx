import { requireUser } from "@/lib/auth/session";
import { getSearchCards, getSearchContext } from "@/lib/data/dashboard";
import { SearchView } from "@/components/search/search-view";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const filters = {
    q: getSingleValue(params.q),
    boardId: getSingleValue(params.boardId),
    assigneeId: getSingleValue(params.assigneeId),
    labelId: getSingleValue(params.labelId),
    priority: getSingleValue(params.priority),
    status: getSingleValue(params.status),
    overdue: getSingleValue(params.overdue),
  };

  const [results, context] = await Promise.all([
    getSearchCards(user.id, {
      query: filters.q || undefined,
      boardId: filters.boardId || undefined,
      assigneeId: filters.assigneeId || undefined,
      labelId: filters.labelId || undefined,
      priority: filters.priority || undefined,
      status: filters.status || undefined,
      onlyOverdue: filters.overdue === "true",
    }),
    getSearchContext(user.id),
  ]);

  return <SearchView results={results} context={context} initialFilters={filters} />;
}
