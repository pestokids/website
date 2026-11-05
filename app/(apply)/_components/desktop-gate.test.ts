// @vitest-environment happy-dom
import { act, createElement, type ComponentType, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Checked where events leave the app: the analytics calls.
const analytics = vi.hoisted(() => ({
  capture: vi.fn(),
  registerSuperProperties: vi.fn(),
}));
vi.mock("@/lib/analytics", () => analytics);
vi.mock("@/lib/config", () => ({
  config: {
    admissionsCloseDate: { iso: "2026-12-01", short: "Dec 1", long: "1 December 2026" },
    analytics: { enabled: false },
  },
}));

/** How many times the desktop screen's module was loaded since the last page load. */
const loaded = { desktopScreen: 0 };

type Device = { touchPoints: number; finePointer: boolean; width: number };
const laptop: Device = { touchPoints: 0, finePointer: true, width: 1440 };
const phone: Device = { touchPoints: 5, finePointer: false, width: 390 };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLElement;

function pretendToBe(device: Device) {
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: device.touchPoints });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: device.width });
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === "(pointer: fine)" ? device.finePointer : false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
}

type Gate = ComponentType<{ children: ReactNode }>;

/** A fresh page load: the gate decides once per load, so its module is re-imported. */
async function loadGate(device: Device): Promise<Gate> {
  vi.resetModules();
  loaded.desktopScreen = 0;
  vi.doMock("./desktop-screen", async (importOriginal) => {
    loaded.desktopScreen++;
    return importOriginal();
  });
  pretendToBe(device);
  return (await import("./desktop-gate")).DesktopGate;
}

const withChildren = (Gate: Gate, children: ReactNode) => createElement(Gate, null, children);

async function render(node: ReactNode) {
  root ??= createRoot(container);
  await act(async () => root!.render(node));
}

const flow = createElement("p", { id: "flow" }, "The flow");
const gateViews = () => analytics.capture.mock.calls.filter(([event]) => event === "ff_desktop_gate_viewed");

beforeEach(() => {
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL("https://pestokids.com/apply?utm_source=meta&utm_medium=paid_social");
  container = document.createElement("div");
  document.body.append(container);
  analytics.capture.mockClear();
  analytics.registerSuperProperties.mockClear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DesktopGate", () => {
  it("shows the desktop screen on a computer and fires ff_desktop_gate_viewed once", async () => {
    const gate = await loadGate(laptop);
    await render(withChildren(gate, flow));
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Let’s continue on your phone."));

    expect(container.querySelector("#flow")).toBeNull();
    expect(loaded.desktopScreen).toBe(1);
    expect(gateViews()).toHaveLength(1);
    // With the visit's attribution as super properties.
    expect(analytics.registerSuperProperties).toHaveBeenCalledTimes(1);
    expect(analytics.registerSuperProperties.mock.calls[0][0]).toMatchObject({ utm_source: "meta" });

    // Later renders (and a resize) don't fire it again or swap screens.
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 600 });
    await render(withChildren(gate, flow));
    await render(withChildren(gate, createElement("p", { id: "flow" }, "Still the flow")));
    expect(container.querySelector("h1")?.textContent).toBe("Let’s continue on your phone.");
    expect(gateViews()).toHaveLength(1);
  });

  it("shows the flow on a phone without loading the desktop screen or firing the event", async () => {
    const gate = await loadGate(phone);
    await render(withChildren(gate, flow));

    expect(container.querySelector("#flow")?.textContent).toBe("The flow");
    // Give a stray lazy load time to start.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(loaded.desktopScreen).toBe(0);
    expect(gateViews()).toHaveLength(0);
  });

  it("renders nothing while the desktop screen loads, so nothing flashes", async () => {
    const gate = await loadGate(laptop);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    vi.doMock("./desktop-screen", async (importOriginal) => {
      await held;
      return importOriginal();
    });

    await render(withChildren(gate, flow));
    expect(container.innerHTML).toBe("");
    expect(gateViews()).toHaveLength(0);

    release();
    await vi.waitFor(() => expect(container.querySelector("main")).not.toBeNull());
    expect(container.querySelector("#flow")).toBeNull();
    expect(gateViews()).toHaveLength(1);
  });

  it("retries a failed load after about a second, then shows the screen", async () => {
    const gate = await loadGate(laptop);
    let attempts = 0;
    vi.doMock("./desktop-screen", async (importOriginal) => {
      attempts++;
      if (attempts === 1) throw new Error("Failed to load chunk");
      return importOriginal();
    });
    const warn = vi.spyOn(console, "warn");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    await render(withChildren(gate, flow));
    await vi.waitFor(() => expect(attempts).toBe(1), { interval: 1 });
    // Still blank, and no second try before the first delay is up.
    await act(() => vi.advanceTimersByTimeAsync(990));
    expect(attempts).toBe(1);
    expect(container.innerHTML).toBe("");

    await act(() => vi.advanceTimersByTimeAsync(20));
    await vi.waitFor(() => expect(container.querySelector("main")).not.toBeNull());
    expect(attempts).toBe(2);
    expect(container.querySelector("#flow")).toBeNull();
    expect(gateViews()).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });
});
