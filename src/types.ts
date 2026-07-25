import type { ReactNode } from "react";

/** A single option shown in the dropdown. `value` must be unique. */
export interface SearchSelectOption<T = unknown> {
  value: string;
  label: string;
  /** Optional original record (e.g. a Medusa Product/Customer object) */
  data?: T;
  disabled?: boolean;
}

/**
 * Function that returns options for a given query string.
 * Can hit a local array, an in-memory filter, or a remote API
 * (e.g. Medusa's Store/Admin API, or your own backend route).
 */
export type FetchOptionsFn<T = unknown> = (
  query: string,
  signal: AbortSignal
) => Promise<SearchSelectOption<T>[]>;

export interface SearchSelectProps<T = unknown> {
  /** Either a static list of options, or an async fetcher keyed by query */
  options?: SearchSelectOption<T>[];
  fetchOptions?: FetchOptionsFn<T>;

  /** Controlled value(s). Use `value` for single-select, `values` for multi-select */
  value?: SearchSelectOption<T> | null;
  values?: SearchSelectOption<T>[];
  onChange?: (value: SearchSelectOption<T> | null) => void;
  onChangeMulti?: (values: SearchSelectOption<T>[]) => void;

  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  noOptionsMessage?: string;
  loadingMessage?: string;
  minSearchLength?: number;
  debounceMs?: number;
  disabled?: boolean;
  clearable?: boolean;
  autoFocus?: boolean;

  /** Custom rendering hooks */
  renderOption?: (
    option: SearchSelectOption<T>,
    isActive: boolean,
    query: string
  ) => ReactNode;
  renderValue?: (option: SearchSelectOption<T>) => ReactNode;

  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
}
