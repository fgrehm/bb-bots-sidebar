// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent } from "@testing-library/react";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { bot, personalProjectId, thread } from "./fixtures";

const app = await loadPluginApp(() => import("../app"));
const Sidebar = app.threadLists[0]!.component;
afterEach(cleanup);

async function mount(threads: ReturnType<typeof thread>[], projects: { id: string; name: string; isPersonal: boolean }[]) {
  function Host() {
    const [activeThreadId] = useState<string | null>(null);
    return <Sidebar activeThreadId={activeThreadId} activeProjectId="project" isCompactViewport={false} onNavigate={() => {}} searchQuery="" Original={() => null} />;
  }
  const slot = renderSlot({ component: Host }, {}, {
    sidebarThreads: { projects, threads },
    rpc: { bots_list: () => ({ personalProjectId, bots: [bot], sections: [], hosts: [], projects: [{ id: "project", name: "Test project" }], warnings: [], threadBindings: [] }) },
  });
  await slot.findByText("Chats");
  return slot;
}

it("labels a chat row with its project and branch, eliding only the project", async () => {
  const slot = await mount([thread("root", 10)], [{ id: "project", name: "bb-bots-sidebar", isPersonal: false }]);
  const label = slot.getByText("bb-bots-sidebar");
  expect(label.className).toContain("truncate");
  expect(label.className).not.toContain("shrink-0");
  const branch = slot.getByText("feature");
  expect(branch.className).toContain("shrink-0");
  expect(branch.closest("[title]")!.getAttribute("title")).toBe("bb-bots-sidebar · feature");
});

it("labels personal chats and children with their own project", async () => {
  const personal = await mount(
    [thread("root", 10, { projectId: "personal" }), thread("child", 9, { projectId: "personal", parentThreadId: "root" })],
    [{ id: "personal", name: "Personal", isPersonal: true }],
  );
  expect(personal.getAllByText("Personal")).toHaveLength(1);
  expect(personal.getByText("feature")).toBeTruthy();
  fireEvent.click(personal.getByRole("button", { name: "Expand children of Conversation root" }));
  expect(personal.getAllByText("Personal")).toHaveLength(2);
  expect(personal.getAllByText("feature")).toHaveLength(2);
});

it("keeps the row readable when the host reports no project name", async () => {
  const slot = await mount([thread("root", 10, { environment: null, host: null })], []);
  expect(slot.getByText("Personal conversation")).toBeTruthy();
});
