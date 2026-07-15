import Sidebar from "./Sidebar";

export default function CrmShell({ user, children }) {
  return (
    <div className="flex min-h-screen bg-[#FBFAF7]">
      <Sidebar user={user} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}