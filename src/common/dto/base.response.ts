import { PaginationMeta } from './pagination.type';

export interface BaseResult<T> {
  data: T;

  meta?: PaginationMeta;
}
