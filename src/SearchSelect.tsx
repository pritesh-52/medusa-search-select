import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import type { SearchSelectOption, SearchSelectProps } from "./types";

/** Wraps matched substrings of `text` in <mark> for highlighting. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <mark className="mss-highlight">{match}</mark>
      {after}
    </>
  );
}

function defaultFilter<T>(
  options: SearchSelectOption<T>[],
  query: string
): SearchSelectOption<T>[] {
  if (!query.trim()) return options;
  const q = query.toLowerCase();
  return options.filter((o) => o.label.toLowerCase().includes(q));
}

export function SearchSelect<T = unknown>({
  options,
  fetchOptions,
  value = null,
  values = [],
  onChange,
  onChangeMulti,
  multiple = false,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  noOptionsMessage = "No results found",
  loadingMessage = "Searching...",
  minSearchLength = 0,
  debounceMs = 300,
  disabled = false,
  clearable = true,
  autoFocus = false,
  renderOption,
  renderValue,
  className,
  id,
  name,
  ...aria
}: SearchSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [asyncOptions, setAsyncOptions] = useState<SearchSelectOption<T>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const isAsync = typeof fetchOptions === "function";

  // Resolve the list of options to render: async results, or filtered static list
  const visibleOptions = useMemo(() => {
    if (isAsync) {
      return debouncedQuery.length < minSearchLength ? [] : asyncOptions;
    }
    return defaultFilter(options ?? [], debouncedQuery);
  }, [isAsync, asyncOptions, options, debouncedQuery, minSearchLength]);

  // Fetch async options whenever the debounced query changes
  useEffect(() => {
    if (!isAsync || !isOpen) return;
    if (debouncedQuery.length < minSearchLength) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetchOptions!(debouncedQuery, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setAsyncOptions(results);
          setActiveIndex(0);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err?.message ?? "Something went wrong while searching");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, isAsync, isOpen, minSearchLength]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSelected = useCallback(
    (option: SearchSelectOption<T>) => {
      if (multiple) return values.some((v) => v.value === option.value);
      return value?.value === option.value;
    },
    [multiple, value, values]
  );

  const selectOption = useCallback(
    (option: SearchSelectOption<T>) => {
      if (option.disabled) return;

      if (multiple) {
        const alreadySelected = values.some((v) => v.value === option.value);
        const next = alreadySelected
          ? values.filter((v) => v.value !== option.value)
          : [...values, option];
        onChangeMulti?.(next);
        setQuery("");
        inputRef.current?.focus();
      } else {
        onChange?.(option);
        setIsOpen(false);
        setQuery("");
      }
    },
    [multiple, values, onChange, onChangeMulti]
  );

  const removeValue = useCallback(
    (option: SearchSelectOption<T>) => {
      onChangeMulti?.(values.filter((v) => v.value !== option.value));
    },
    [values, onChangeMulti]
  );

  const clearAll = useCallback(() => {
    if (multiple) onChangeMulti?.([]);
    else onChange?.(null);
    setQuery("");
  }, [multiple, onChange, onChangeMulti]);

  // Keyboard navigation: ArrowDown/Up moves active option, Enter selects,
  // Escape closes, Backspace on empty input removes last multi-select chip.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        setActiveIndex((i) => Math.min(i + 1, visibleOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (isOpen && visibleOptions[activeIndex]) {
          selectOption(visibleOptions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "Backspace":
        if (multiple && query === "" && values.length > 0) {
          removeValue(values[values.length - 1]);
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLLIElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const showClear = clearable && (multiple ? values.length > 0 : !!value);

  return (
    <div
      ref={containerRef}
      className={`mss-container${className ? ` ${className}` : ""}`}
      id={id}
    >
      <div
        className={`mss-control${disabled ? " mss-disabled" : ""}${isOpen ? " mss-open" : ""}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {multiple && values.length > 0 && (
          <div className="mss-tags">
            {values.map((v) => (
              <span key={v.value} className="mss-tag">
                {renderValue ? renderValue(v) : v.label}
                <button
                  type="button"
                  className="mss-tag-remove"
                  aria-label={`Remove ${v.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(v);
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {!multiple && value && !isOpen && (
          <span className="mss-single-value">
            {renderValue ? renderValue(value) : value.label}
          </span>
        )}

        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id ?? "mss"}-listbox`}
          aria-autocomplete="list"
          aria-label={aria["aria-label"] ?? placeholder}
          name={name}
          className="mss-input"
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={
            !multiple && value && !isOpen ? "" : isOpen ? searchPlaceholder : placeholder
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {showClear && (
          <button
            type="button"
            className="mss-clear"
            aria-label="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
          >
            ×
          </button>
        )}
        <span className="mss-arrow" aria-hidden="true">
          ▾
        </span>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id={`${id ?? "mss"}-listbox`}
          role="listbox"
          className="mss-listbox"
        >
          {isLoading && <li className="mss-status">{loadingMessage}</li>}

          {!isLoading && error && <li className="mss-status mss-error">{error}</li>}

          {!isLoading && !error && visibleOptions.length === 0 && (
            <li className="mss-status">{noOptionsMessage}</li>
          )}

          {!isLoading &&
            !error &&
            visibleOptions.map((option, index) => (
              <li
                key={option.value}
                data-index={index}
                role="option"
                aria-selected={isSelected(option)}
                className={`mss-option${index === activeIndex ? " mss-active" : ""}${
                  isSelected(option) ? " mss-selected" : ""
                }${option.disabled ? " mss-option-disabled" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {renderOption ? (
                  renderOption(option, index === activeIndex, debouncedQuery)
                ) : (
                  <HighlightedText text={option.label} query={debouncedQuery} />
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
