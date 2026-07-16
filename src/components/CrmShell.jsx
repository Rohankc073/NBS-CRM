import Sidebar from "./Sidebar";

export default function CrmShell({ user, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFAF7]">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
