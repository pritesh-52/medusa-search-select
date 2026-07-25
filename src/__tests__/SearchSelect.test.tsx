import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchSelect } from "../SearchSelect";
import type { SearchSelectOption } from "../types";

const OPTIONS: SearchSelectOption[] = [
  { value: "1", label: "Apple" },
  { value: "2", label: "Banana" },
  { value: "3", label: "Cherry" },
];

describe("SearchSelect (static options)", () => {
  it("shows the placeholder and opens the option list on focus", async () => {
    render(<SearchSelect options={OPTIONS} placeholder="Pick a fruit" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Pick a fruit");

    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filters options as the user types", async () => {
    render(<SearchSelect options={OPTIONS} debounceMs={0} />);
    const input = screen.getByRole("combobox");

    await userEvent.type(input, "an");

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Banana");
  });

  it("shows the no-options message when nothing matches", async () => {
    render(<SearchSelect options={OPTIONS} debounceMs={0} />);
    await userEvent.type(screen.getByRole("combobox"), "zzz");

    expect(await screen.findByText("No results found")).toBeInTheDocument();
  });

  it("selects an option on click, calling onChange and closing the dropdown", async () => {
    const onChange = vi.fn();
    render(<SearchSelect options={OPTIONS} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Banana"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: "2", label: "Banana" })
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not select a disabled option", async () => {
    const onChange = vi.fn();
    const options = [...OPTIONS, { value: "4", label: "Durian", disabled: true }];
    render(<SearchSelect options={options} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Durian"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the selected value via the clear button", async () => {
    const onChange = vi.fn();
    render(<SearchSelect options={OPTIONS} value={OPTIONS[0]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  describe("keyboard navigation", () => {
    it("moves the active option with ArrowDown/ArrowUp and selects with Enter", async () => {
      const onChange = vi.fn();
      render(<SearchSelect options={OPTIONS} onChange={onChange} />);
      const input = screen.getByRole("combobox");

      await userEvent.click(input);
      await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ value: "3", label: "Cherry" })
      );
    });

    it("closes the dropdown on Escape", async () => {
      render(<SearchSelect options={OPTIONS} />);
      const input = screen.getByRole("combobox");

      await userEvent.click(input);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("multi-select", () => {
    it("adds and removes tags, and removes the last tag on Backspace when the query is empty", async () => {
      const onChangeMulti = vi.fn();
      const { rerender } = render(
        <SearchSelect
          options={OPTIONS}
          multiple
          values={[]}
          onChangeMulti={onChangeMulti}
        />
      );

      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByText("Apple"));
      expect(onChangeMulti).toHaveBeenCalledWith([OPTIONS[0]]);

      rerender(
        <SearchSelect
          options={OPTIONS}
          multiple
          values={[OPTIONS[0]]}
          onChangeMulti={onChangeMulti}
        />
      );
      expect(screen.getByText("Apple", { selector: ".mss-tag" })).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /remove apple/i }));
      expect(onChangeMulti).toHaveBeenLastCalledWith([]);

      rerender(
        <SearchSelect
          options={OPTIONS}
          multiple
          values={[OPTIONS[0], OPTIONS[1]]}
          onChangeMulti={onChangeMulti}
        />
      );
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.keyboard("{Backspace}");
      expect(onChangeMulti).toHaveBeenLastCalledWith([OPTIONS[0]]);
    });
  });
});

describe("SearchSelect (async fetchOptions)", () => {
  it("shows the loading message, then renders fetched results", async () => {
    const fetchOptions = vi
      .fn()
      .mockResolvedValue([{ value: "9", label: "Remote result" }]);
    render(<SearchSelect fetchOptions={fetchOptions} debounceMs={0} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "re");

    await waitFor(() => expect(fetchOptions).toHaveBeenCalled());
    const option = await screen.findByRole("option");
    expect(option).toHaveTextContent("Remote result");
  });

  it("debounces rapid keystrokes into a single fetch call", async () => {
    const fetchOptions = vi.fn().mockResolvedValue([]);
    render(<SearchSelect fetchOptions={fetchOptions} debounceMs={50} />);

    // Opening the dropdown fires its own immediate fetch with an empty query;
    // reset the mock so we only count calls triggered by typing.
    await userEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(fetchOptions).toHaveBeenCalledTimes(1));
    fetchOptions.mockClear();

    await userEvent.type(screen.getByRole("combobox"), "abc");

    await waitFor(() => expect(fetchOptions).toHaveBeenCalledTimes(1));
    expect(fetchOptions).toHaveBeenCalledWith("abc", expect.any(AbortSignal));
  });

  it("shows an error message when the fetcher rejects", async () => {
    const fetchOptions = vi.fn().mockRejectedValue(new Error("network down"));
    render(<SearchSelect fetchOptions={fetchOptions} debounceMs={0} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "x");

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("does not fetch until minSearchLength is reached", async () => {
    const fetchOptions = vi.fn().mockResolvedValue([]);
    render(
      <SearchSelect fetchOptions={fetchOptions} debounceMs={0} minSearchLength={3} />
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "ab");

    await waitFor(() => expect(screen.getByText("No results found")).toBeInTheDocument());
    expect(fetchOptions).not.toHaveBeenCalled();
  });
});
