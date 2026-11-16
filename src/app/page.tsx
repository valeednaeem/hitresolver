import { AppShell } from "@/components/shell/app-shell";
import { WorkspaceProvider } from "@/state/workspace";

export default function HomePage() {
  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}
