import { afterEach, describe, expect, it, vi } from "vitest";
import { keyboardInset } from "./use-keyboard-inset";

function fakeWindow(innerHeight: number, viewport: { height: number; offsetTop: number } | null) {
  vi.stubGlobal("window", { innerHeight, visualViewport: viewport });
}

afterEach(() => vi.unstubAllGlobals());

describe("keyboardInset", () => {
  it("is 0 without visualViewport", () => {
    fakeWindow(874, null);
    expect(keyboardInset()).toBe(0);
  });

  it("is 0 when the visual viewport fills the layout viewport (keyboard closed, or Android resize)", () => {
    fakeWindow(874, { height: 874, offsetTop: 0 });
    expect(keyboardInset()).toBe(0);
  });

  it("measures the part of the layout viewport under the iOS keyboard", () => {
    fakeWindow(874, { height: 538, offsetTop: 0 });
    expect(keyboardInset()).toBe(336);
  });

  it("accounts for the visual viewport being scrolled down", () => {
    fakeWindow(874, { height: 538, offsetTop: 120 });
    expect(keyboardInset()).toBe(216);
  });

  it("ignores small toolbar changes and sub-pixel noise", () => {
    fakeWindow(874, { height: 849.5, offsetTop: 0 });
    expect(keyboardInset()).toBe(0);
  });
});
