import { Pagination } from 'react-bootstrap';

const DEFAULT_ITEMS_PER_PAGE = 10;

export function paginate(list, page, itemsPerPage = DEFAULT_ITEMS_PER_PAGE) {
  const start = (page - 1) * itemsPerPage;
  return list.slice(start, start + itemsPerPage);
}

export function useTablePagination(totalItems, itemsPerPage = DEFAULT_ITEMS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  return { itemsPerPage, totalPages };
}

export default function TablePagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const items = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  items.push(
    <Pagination.First key="first" onClick={() => onPageChange(1)} disabled={currentPage === 1} />,
    <Pagination.Prev key="prev" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} />
  );

  for (let i = start; i <= end; i++) {
    items.push(
      <Pagination.Item key={i} active={i === currentPage} onClick={() => onPageChange(i)}>
        {i}
      </Pagination.Item>
    );
  }

  items.push(
    <Pagination.Next key="next" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} />,
    <Pagination.Last key="last" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} />
  );

  return (
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
      <small className="text-luxe-muted">
        Page {currentPage} of {totalPages}
      </small>
      <Pagination className="mb-0">{items}</Pagination>
    </div>
  );
}
