import {
  useEffect,
  useMemo,
  useState,
} from "react";

export const RECORDS_PAGE_SIZE = 25;

type Options = {
  pageSize?: number;
  resetKey?: string;
};

export function useClientPagination<T>(
  items: T[],
  {
    pageSize = RECORDS_PAGE_SIZE,
    resetKey = "",
  }: Options = {},
) {
  const [page, setPage] =
    useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      items.length / pageSize,
    ),
  );

  useEffect(() => {
    setPage((current) =>
      Math.min(
        Math.max(1, current),
        totalPages,
      ),
    );
  }, [totalPages]);

  const paginatedItems =
    useMemo(() => {
      const start =
        (page - 1) * pageSize;

      return items.slice(
        start,
        start + pageSize,
      );
    }, [
      items,
      page,
      pageSize,
    ]);

  return {
    page,
    setPage,
    pageSize,
    totalPages,
    paginatedItems,
  };
}
