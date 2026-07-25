# medusa-search-select

A searchable, accessible **select / combobox** component for React —
built with Medusa.js storefronts and admin panels in mind, but usable in
any React app.

Features:

- 🔎 Type-ahead search over a local list **or** an async source (e.g. Medusa's Store/Admin API)
- ⏱️ Built-in debounce, so you don't fire a request on every keystroke
- ⌨️ Full keyboard support (`↑` `↓` `Enter` `Esc` `Backspace`)
- ✅ Single-select and multi-select (tag chips) modes
- 🖍️ Matched-text highlighting
- ♿ ARIA combobox/listbox roles for screen readers
- 🎨 Themeable via CSS variables — no CSS-in-JS lock-in
- 📦 Ships ESM + CJS + type declarations, zero runtime dependencies (React is a peer dep)

---

## Install

```bash
npm install medusa-search-select
# or
yarn add medusa-search-select
# or
pnpm add medusa-search-select
```

React 17+ and React DOM 17+ are required as peer dependencies.

Import the stylesheet once, anywhere in your app (e.g. your root layout):

```ts
import "medusa-search-select/styles.css";
```

---

## Basic usage — static list

```tsx
import { useState } from "react";
import { SearchSelect, SearchSelectOption } from "medusa-search-select";
import "medusa-search-select/styles.css";

const countries: SearchSelectOption[] = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
  { value: "in", label: "India" },
];

export function CountryPicker() {
  const [value, setValue] = useState<SearchSelectOption | null>(null);

  return (
    <SearchSelect
      options={countries}
      value={value}
      onChange={setValue}
      placeholder="Select a country"
    />
  );
}
```

## Async search (any backend)

Pass a `fetchOptions` function instead of `options`. It receives the current
query string and an `AbortSignal` (already wired up to cancel stale
requests as the user keeps typing):

```tsx
import { SearchSelect, SearchSelectOption } from "medusa-search-select";

async function fetchOptions(query: string, signal: AbortSignal) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  const data = await res.json();
  return data.items.map((item: any) => ({ value: item.id, label: item.name }));
}

<SearchSelect
  fetchOptions={fetchOptions}
  minSearchLength={1}
  debounceMs={300}
  onChange={(opt) => console.log("selected", opt)}
/>;
```

## Using it with Medusa.js

The package ships small helpers that build a `fetchOptions` function for
you, pointed at Medusa's Store or Admin REST API:

```tsx
import { SearchSelect, createMedusaProductFetcher } from "medusa-search-select";

const fetchProducts = createMedusaProductFetcher({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
  path: "/store/products", // or "/admin/products"
  limit: 10,
  headers: {
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!,
  },
});

<SearchSelect
  fetchOptions={fetchProducts}
  minSearchLength={2}
  placeholder="Search products..."
  onChange={(product) => console.log(product?.data)} // full Medusa product on `data`
/>;
```

There's an equivalent `createMedusaCustomerFetcher` for the Admin API's
customer search.

If you're using the Medusa JS SDK (`@medusajs/js-sdk`) instead of raw
`fetch`, just write your own `fetchOptions` that calls `sdk.store.product.list(...)`
and maps the response — the helpers above are a convenience, not a
requirement.

## Multi-select

```tsx
const [values, setValues] = useState<SearchSelectOption[]>([]);

<SearchSelect options={countries} multiple values={values} onChangeMulti={setValues} />;
```

---

## Props

| Prop                                  | Type                                               | Default | Description                                               |
| ------------------------------------- | -------------------------------------------------- | ------- | --------------------------------------------------------- |
| `options`                             | `SearchSelectOption[]`                             | —       | Static list of options (ignored if `fetchOptions` is set) |
| `fetchOptions`                        | `(query, signal) => Promise<SearchSelectOption[]>` | —       | Async source of options                                   |
| `value` / `onChange`                  | single-select controlled state                     | —       | For single-select mode                                    |
| `values` / `onChangeMulti`            | multi-select controlled state                      | —       | For `multiple` mode                                       |
| `multiple`                            | `boolean`                                          | `false` | Enable multi-select                                       |
| `minSearchLength`                     | `number`                                           | `0`     | Don't fetch until query reaches this length               |
| `debounceMs`                          | `number`                                           | `300`   | Debounce delay before searching                           |
| `placeholder` / `searchPlaceholder`   | `string`                                           | —       | Text shown closed / while typing                          |
| `noOptionsMessage` / `loadingMessage` | `string`                                           | —       | Empty and loading states                                  |
| `clearable`                           | `boolean`                                          | `true`  | Show a clear (×) button                                   |
| `disabled`                            | `boolean`                                          | `false` | Disable the control                                       |
| `renderOption`                        | `(option, isActive, query) => ReactNode`           | —       | Custom option rendering                                   |
| `renderValue`                         | `(option) => ReactNode`                            | —       | Custom selected-value rendering                           |

## Theming

Every visual is driven by CSS variables scoped to `.mss-container`. Override
them in your own stylesheet:

```css
.mss-container {
  --mss-accent: #d9502b;
  --mss-border-radius: 10px;
  --mss-font-size: 15px;
}
```

---

## Local development

```bash
npm install
npm run dev     # tsup --watch
npm run build    # one-off build to dist/
npm run lint     # tsc --noEmit type check
```

---

## Publishing this package to npm

1. **Create an npm account** (if you don't have one) at https://www.npmjs.com/signup.

2. **Log in from the CLI:**

   ```bash
   npm login
   ```

3. **Update `package.json`:**
   - Set a unique `name` (check availability: `npm view medusa-search-select`).
   - Bump `version` following semver (`npm version patch|minor|major`).
   - Fill in `author`, `repository`, `homepage`, `bugs` with your real GitHub URL.

4. **Build before publishing** (also runs automatically via `prepublishOnly`):

   ```bash
   npm run build
   ```

5. **Do a dry run** to see exactly what will be published:

   ```bash
   npm pack --dry-run
   ```

   Confirm only `dist/`, `package.json`, `README.md`, and `LICENSE` are included
   (the `files` field in `package.json` already restricts this).

6. **Publish:**

   ```bash
   npm publish
   ```

   Since the name has no `@scope/`, it publishes as a public package by
   default. If you scope it (`@yourname/medusa-search-select`), keep
   `"publishConfig": { "access": "public" }` in `package.json` (already set)
   so scoped packages don't default to private.

7. **Verify:**

   ```bash
   npm view medusa-search-select
   ```

   or check `https://www.npmjs.com/package/medusa-search-select`.

8. **Releasing updates:**
   ```bash
   npm version patch   # or minor / major
   npm publish
   git push --follow-tags
   ```

### Tips

- Add a `.npmignore` or rely on the `files` field (already configured) to
  keep the published tarball small — only `dist/` is shipped, not `src/`.
- Enable 2FA on your npm account for publish protection.
- Add a GitHub Actions workflow to publish automatically on tagged releases
  once you're comfortable with the manual flow.

---

## License

MIT
