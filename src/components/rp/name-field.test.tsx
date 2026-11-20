import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditableName, NameField } from "./name-field";

afterEach(cleanup);

const field = () => screen.getByRole("textbox", { name: "Rig name" });
const type = (text: string) => fireEvent.change(field(), { target: { value: text } });
const key = (name: string) => fireEvent.keyDown(field(), { key: name });

describe("NameField", () => {
  it("focuses with the text selected, stores the trimmed name on Enter", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<NameField label="Rig name" value="Clean" onSubmit={submit} onCancel={vi.fn()}/>);
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue("Clean");
    type("  Lead  ");
    await act(async () => key("Enter"));
    expect(submit).toHaveBeenCalledWith("Lead");
  });

  it("cancels on Escape and on leaving the field, and closes without storing when unchanged", () => {
    const submit = vi.fn(); const cancel = vi.fn();
    render(<NameField label="Rig name" value="Clean" onSubmit={submit} onCancel={cancel}/>);
    key("Escape");
    fireEvent.blur(field());
    key("Enter");
    expect(cancel).toHaveBeenCalledTimes(3);
    expect(submit).not.toHaveBeenCalled();
  });

  it("refuses empty, forbidden and taken names and keeps the field open", () => {
    const submit = vi.fn(); const cancel = vi.fn();
    render(<NameField label="Rig name" value="Clean" taken={["Clean", "Lead"]} onSubmit={submit} onCancel={cancel}/>);
    type("   "); key("Enter");
    expect(screen.getByRole("alert")).toHaveTextContent("Name required");
    type("AC/DC"); key("Enter");
    expect(screen.getByRole("alert")).toHaveTextContent("Not allowed");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    type("lead"); key("Enter");
    expect(screen.getByRole("alert")).toHaveTextContent("Name already used");
    fireEvent.blur(field());
    expect(cancel).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("shows a device error and stays open", async () => {
    render(<NameField label="Rig name" value="Clean" onSubmit={() => Promise.reject(new Error("Pedal said no"))} onCancel={vi.fn()}/>);
    type("Lead");
    await act(async () => key("Enter"));
    expect(screen.getByRole("alert")).toHaveTextContent("Pedal said no");
    expect(field()).toHaveValue("Lead");
  });
});

describe("NameField suggestions", () => {
  it("opens with the suggestion for a new name and the wand steps through the next ones", async () => {
    const suggest = vi.fn((variant: number) => ["Duo Crunch - Delay", "Duo Crunch", "Crunch - Duo"][variant % 3]);
    const submit = vi.fn().mockResolvedValue(undefined); const cancel = vi.fn();
    render(<NameField label="Rig name" value="" initialText={suggest(0)} suggest={suggest} onSubmit={submit} onCancel={cancel}/>);
    expect(field()).toHaveValue("Duo Crunch - Delay");
    const wand = screen.getByRole("button", { name: "Suggest name" });
    fireEvent.mouseDown(wand); fireEvent.click(wand);
    expect(field()).toHaveValue("Duo Crunch");
    fireEvent.click(wand);
    expect(field()).toHaveValue("Crunch - Duo");
    type("Crunch - Duo live");
    await act(async () => key("Enter"));
    expect(submit).toHaveBeenCalledWith("Crunch - Duo live");
    expect(cancel).not.toHaveBeenCalled();
  });

  it("renaming keeps the current name until the wand is used", () => {
    render(<NameField label="Rig name" value="Marty Clean" suggest={() => "Duo Clean"} onSubmit={vi.fn()} onCancel={vi.fn()}/>);
    expect(field()).toHaveValue("Marty Clean");
    fireEvent.click(screen.getByRole("button", { name: "Suggest name" }));
    expect(field()).toHaveValue("Duo Clean");
  });
});

describe("EditableName", () => {
  it("opens on double-click and closes after renaming", async () => {
    const rename = vi.fn().mockResolvedValue(undefined);
    render(<EditableName label="Rig name" value="Clean" onRename={rename}/>);
    fireEvent.doubleClick(screen.getByText("Clean"));
    type("Lead");
    await act(async () => key("Enter"));
    expect(rename).toHaveBeenCalledWith("Lead");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not open when disabled", () => {
    render(<EditableName label="Rig name" value="Clean" disabled onRename={vi.fn()}/>);
    fireEvent.doubleClick(screen.getByText("Clean"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
