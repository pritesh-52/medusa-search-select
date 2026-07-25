import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Popover, Badge, IconButton, clx } from "@medusajs/ui";
import { useDebouncedValue } from "./useDebouncedValue";
import type { SearchSelectOption, SearchSelectProps } from "./types";

/**
 * Drop-in alternative to `SearchSelect` styled with `@medusajs/ui` design
 * tokens, for apps that already run Medusa's admin UI kit + Tailwind preset.
 *
 * Radix UI's `Select` (which `@medusajs/ui`'s `Select` wraps) has no search
 * slot and hijacks keyboard input for its own typeahead, so this is built on
 * `Popover` instead: the input sits in a `Popover.Anchor` for positioning,
 * `Popover.Content` renders the option list, and the option/control chrome
 * reuses the exact Tailwind classes Medusa's `Select` and `Badge` use.
 */
function defaultFilter<T>(
  options: SearchSelectOption<T>[],
  query: string
): SearchSelectOption<T>[] {
  if (!query.trim()) return options;
  const q = query.toLowerCase();
  return options.filter((o) => o.label.toLowerCase().includes(q));
}

export function MedusaSearchSelect<T = unknown>({
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

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const isAsync = typeof fetchOptions === "function";

  const visibleOptions = useMemo(() => {
    if (isAsync) {
      return debouncedQuery.length < minSearchLength ? [] : asyncOptions;
    }
    return defaultFilter(options ?? [], debouncedQuery);
  }, [isAsync, asyncOptions, options, debouncedQuery, minSearchLength]);

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

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLLIElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

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

  const showClear = clearable && (multiple ? values.length > 0 : !!value);
  const singleValueLabel = !multiple && value && !isOpen ? value.label : null;

  return (
    <div className={clx("relative w-full", className)} id={id}>
      <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <Popover.Anchor asChild>
          <div
            className={clx(
              "bg-ui-bg-field shadow-buttons-neutral transition-fg flex w-full flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5",
              "hover:bg-ui-bg-field-hover",
              isOpen && "shadow-borders-interactive-with-active",
              disabled && "!bg-ui-bg-disabled cursor-not-allowed"
            )}
            onClick={() => {
              if (disabled) return;
              inputRef.current?.focus();
              setIsOpen(true);
            }}
          >
            {multiple &&
              values.map((v) => (
                <Badge key={v.value} size="xsmall" className="gap-x-1">
                  {renderValue ? renderValue(v) : v.label}
                  <IconButton
                    type="button"
                    size="2xsmall"
                    variant="transparent"
                    aria-label={`Remove ${v.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(v);
                    }}
                  >
                    ×
                  </IconButton>
                </Badge>
              ))}

            <input
              ref={inputRef}
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={`${id ?? "mss"}-listbox`}
              aria-autocomplete="list"
              aria-label={aria["aria-label"] ?? placeholder}
              name={name}
              disabled={disabled}
              autoFocus={autoFocus}
              className="txt-compact-small text-ui-fg-base placeholder-ui-fg-muted min-w-[80px] flex-1 border-none bg-transparent p-0 outline-none disabled:cursor-not-allowed"
              placeholder={singleValueLabel ?? (isOpen ? searchPlaceholder : placeholder)}
              value={singleValueLabel ?? query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setActiveIndex(0);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />

            {showClear && (
              <IconButton
                type="button"
                size="2xsmall"
                variant="transparent"
                aria-label="Clear selection"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
              >
                ×
              </IconButton>
            )}
          </div>
        </Popover.Anchor>

        <Popover.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-[var(--radix-popover-trigger-width)] p-1"
        >
          <ul
            ref={listRef}
            id={`${id ?? "mss"}-listbox`}
            role="listbox"
            className="max-h-[200px] overflow-auto"
          >
            {isLoading && (
              <li className="txt-compact-small text-ui-fg-muted px-2 py-1.5">
                {loadingMessage}
              </li>
            )}

            {!isLoading && error && (
              <li className="txt-compact-small text-ui-fg-error px-2 py-1.5">{error}</li>
            )}

            {!isLoading && !error && visibleOptions.length === 0 && (
              <li className="txt-compact-small text-ui-fg-muted px-2 py-1.5">
                {noOptionsMessage}
              </li>
            )}

            {!isLoading &&
              !error &&
              visibleOptions.map((option, index) => (
                <li
                  key={option.value}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected(option)}
                  className={clx(
                    "txt-compact-small text-ui-fg-base flex cursor-pointer items-center rounded-[4px] px-2 py-1.5 outline-none transition-colors",
                    index === activeIndex && "bg-ui-bg-component-hover",
                    isSelected(option) && "txt-compact-small-plus",
                    option.disabled && "text-ui-fg-disabled cursor-not-allowed"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  {renderOption
                    ? renderOption(option, index === activeIndex, debouncedQuery)
                    : option.label}
                </li>
              ))}
          </ul>
        </Popover.Content>
      </Popover>
    </div>
  );
}
