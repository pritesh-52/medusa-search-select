import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MedusaSearchSelect } from "../MedusaSearchSelect";
import type { SearchSelectOption } from "../types";

const OPTIONS: SearchSelectOption[] = [
  { value: "1", label: "Apple" },
  { value: "2", label: "Banana" },
  { value: "3", label: "Cherry" },
];

describe("MedusaSearchSelect (static options)", () => {
  it("shows the placeholder and opens the option list on focus", async () => {
    render(<MedusaSearchSelect options={OPTIONS} placeholder="Pick a fruit" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Pick a fruit");

    await userEvent.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filters options as the user types", async () => {
    render(<MedusaSearchSelect options={OPTIONS} debounceMs={0} />);
    await userEvent.type(screen.getByRole("combobox"), "an");

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Banana");
  });

  it("selects an option on click, calling onChange and closing the dropdown", async () => {
    const onChange = vi.fn();
    render(<MedusaSearchSelect options={OPTIONS} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("Banana"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: "2", label: "Banana" })
    );
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("does not select a disabled option", async () => {
    const onChange = vi.fn();
    const options = [...OPTIONS, { value: "4", label: "Durian", disabled: true }];
    render(<MedusaSearchSelect options={options} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByText("Durian"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears the selected value via the clear button", async () => {
    const onChange = vi.fn();
    render(
      <MedusaSearchSelect options={OPTIONS} value={OPTIONS[0]} onChange={onChange} />
    );

    await userEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  describe("keyboard navigation", () => {
    it("moves the active option with ArrowDown/ArrowUp and selects with Enter", async () => {
      const onChange = vi.fn();
      render(<MedusaSearchSelect options={OPTIONS} onChange={onChange} />);
      const input = screen.getByRole("combobox");

      await userEvent.click(input);
      await screen.findByRole("listbox");
      await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ value: "3", label: "Cherry" })
      );
    });

    it("closes the dropdown on Escape", async () => {
      render(<MedusaSearchSelect options={OPTIONS} />);
      const input = screen.getByRole("combobox");

      await userEvent.click(input);
      expect(await screen.findByRole("listbox")).toBeInTheDocument();

      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    });
  });

  describe("multi-select", () => {
    it("adds a tag on click and removes the last one on Backspace when the query is empty", async () => {
      const onChangeMulti = vi.fn();
      const { rerender } = render(
        <MedusaSearchSelect
          options={OPTIONS}
          multiple
          values={[]}
          onChangeMulti={onChangeMulti}
        />
      );

      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(await screen.findByText("Apple"));
      expect(onChangeMulti).toHaveBeenCalledWith([OPTIONS[0]]);

      rerender(
        <MedusaSearchSelect
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

describe("MedusaSearchSelect (async fetchOptions)", () => {
  it("shows the loading message, then renders fetched results", async () => {
    const fetchOptions = vi
      .fn()
      .mockResolvedValue([{ value: "9", label: "Remote result" }]);
    render(<MedusaSearchSelect fetchOptions={fetchOptions} debounceMs={0} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "re");

    await waitFor(() => expect(fetchOptions).toHaveBeenCalled());
    const option = await screen.findByRole("option");
    expect(option).toHaveTextContent("Remote result");
  });

  it("shows an error message when the fetcher rejects", async () => {
    const fetchOptions = vi.fn().mockRejectedValue(new Error("network down"));
    render(<MedusaSearchSelect fetchOptions={fetchOptions} debounceMs={0} />);

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "x");

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });
});
