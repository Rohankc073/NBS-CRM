// "use client";

// import {
//     Building2,
//     CalendarClock,
//     PhoneCall,
//     Target,
//     TrendingUp,
//     Trophy,
//     UserPlus,
//     Users2,
// } from "lucide-react";
// import Link from "next/link";
// import {
//     Area,
//     AreaChart,
//     CartesianGrid,
//     Cell,
//     Pie,
//     PieChart,
//     ResponsiveContainer,
//     Tooltip,
//     XAxis,
//     YAxis,
// } from "recharts";

// const PIE_COLORS = [
//   "#1F7A6B",
//   "#2563EB",
//   "#C58A12",
//   "#7C3AED",
//   "#15803D",
//   "#A03A2B",
//   "#0891B2",
//   "#BE185D",
// ];

// function initials(name) {
//   const p = (name || "").trim().split(/\s+/);
//   return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
// }
// const AVATAR = [
//   "#1F7A6B",
//   "#2563EB",
//   "#7C3AED",
//   "#C58A12",
//   "#A03A2B",
//   "#0891B2",
//   "#BE185D",
//   "#4338CA",
// ];
// function ac(n) {
//   let h = 0;
//   for (let i = 0; i < (n || "").length; i++)
//     h = (h * 31 + n.charCodeAt(i)) % AVATAR.length;
//   return AVATAR[h];
// }

// export default function DashboardClient({
//   me,
//   isManager,
//   leadStats,
//   conversion,
//   pipeline,
//   sources,
//   trend,
//   agents,
//   propStats,
//   coldStats,
// }) {
//   const hour = new Date().getHours();
//   const greeting =
//     hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
//   const firstName = (me.name || "").split(/\s+/)[0];

//   const cards = [
//     {
//       label: isManager ? "Total leads" : "My leads",
//       value: leadStats.total,
//       sub: `+${leadStats.week} this week`,
//       icon: Users2,
//       tint: "#2563EB",
//     },
//     {
//       label: "New",
//       value: leadStats.new_leads,
//       sub: `${leadStats.today} added today`,
//       icon: UserPlus,
//       tint: "#1F7A6B",
//     },
//     {
//       label: "Follow-ups due",
//       value: leadStats.due_today,
//       sub: "today",
//       icon: CalendarClock,
//       tint: "#C58A12",
//       alert: leadStats.due_today > 0,
//     },
//     {
//       label: "Won",
//       value: leadStats.won,
//       sub: `${conversion}% conversion`,
//       icon: Trophy,
//       tint: "#15803D",
//     },
//   ];
//   if (isManager && propStats) {
//     cards.push({
//       label: "Properties",
//       value: propStats.total,
//       sub: `${propStats.pending} pending`,
//       icon: Building2,
//       tint: "#7C3AED",
//       alert: propStats.pending > 0,
//     });
//     cards.push({
//       label: "Cold contacts",
//       value: coldStats?.total || 0,
//       sub: `${coldStats?.converted || 0} converted`,
//       icon: PhoneCall,
//       tint: "#0891B2",
//     });
//   }

//   const maxAgent = Math.max(1, ...agents.map((a) => a.total));
//   const funnel = pipeline.filter((p) => p.count > 0);
//   const maxFunnel = Math.max(1, ...funnel.map((p) => p.count));
//   const pieData = sources.map((s) => ({ name: s.name, value: s.count }));

//   return (
//     <div className="p-8">
//       {/* Greeting */}
//       <div className="flex flex-wrap items-end justify-between gap-3">
//         <div>
//           <h1 className="text-2xl font-semibold tracking-tight text-[#14201F]">
//             {greeting}, {firstName}
//           </h1>
//           <p className="mt-1 text-sm text-[#6C7A78]">
//             {me.roleLabel} -{" "}
//             {isManager ? "brokerage overview" : "your pipeline"}
//           </p>
//         </div>
//         <div className="flex items-center gap-2 rounded-lg border border-[#E4E1DA] bg-white px-4 py-2">
//           <Target size={16} className="text-[#1F7A6B]" />
//           <span className="text-sm text-[#6C7A78]">Conversion</span>
//           <span className="text-lg font-bold text-[#14201F]">
//             {conversion}%
//           </span>
//         </div>
//       </div>

//       {/* Stat cards */}
//       <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
//         {cards.map((c) => {
//           const Icon = c.icon;
//           return (
//             <div
//               key={c.label}
//               className="rounded-xl border border-[#E4E1DA] bg-white p-4"
//             >
//               <div className="flex items-center justify-between">
//                 <div
//                   className="flex h-9 w-9 items-center justify-center rounded-lg"
//                   style={{ background: c.tint + "15" }}
//                 >
//                   <Icon size={18} style={{ color: c.tint }} />
//                 </div>
//               </div>
//               <div
//                 className={
//                   "mt-3 text-2xl font-bold tracking-tight " +
//                   (c.alert ? "text-[#C58A12]" : "text-[#14201F]")
//                 }
//               >
//                 {c.value}
//               </div>
//               <div className="text-xs font-medium text-[#14201F]">
//                 {c.label}
//               </div>
//               <div className="mt-0.5 text-[11px] text-[#9AA6A4]">{c.sub}</div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Charts row */}
//       <div className="mt-6 grid gap-6 lg:grid-cols-3">
//         <div className="rounded-xl border border-[#E4E1DA] bg-white p-6 lg:col-span-2">
//           <div className="mb-4 flex items-center gap-2">
//             <TrendingUp size={16} className="text-[#1F7A6B]" />
//             <h2 className="text-sm font-semibold text-[#14201F]">
//               Leads over the last 14 days
//             </h2>
//           </div>
//           <div style={{ width: "100%", height: 240 }}>
//             <ResponsiveContainer>
//               <AreaChart
//                 data={trend}
//                 margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
//               >
//                 <defs>
//                   <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="0%" stopColor="#1F7A6B" stopOpacity={0.3} />
//                     <stop offset="100%" stopColor="#1F7A6B" stopOpacity={0} />
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid
//                   strokeDasharray="3 3"
//                   stroke="#F0EEE9"
//                   vertical={false}
//                 />
//                 <XAxis
//                   dataKey="label"
//                   tick={{ fontSize: 11, fill: "#9AA6A4" }}
//                   tickLine={false}
//                   axisLine={{ stroke: "#E4E1DA" }}
//                   interval={1}
//                 />
//                 <YAxis
//                   tick={{ fontSize: 11, fill: "#9AA6A4" }}
//                   tickLine={false}
//                   axisLine={false}
//                   allowDecimals={false}
//                 />
//                 <Tooltip
//                   contentStyle={{
//                     borderRadius: 8,
//                     border: "1px solid #E4E1DA",
//                     fontSize: 12,
//                   }}
//                 />
//                 <Area
//                   type="monotone"
//                   dataKey="count"
//                   stroke="#1F7A6B"
//                   strokeWidth={2}
//                   fill="url(#leadFill)"
//                   name="Leads"
//                 />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         <div className="rounded-xl border border-[#E4E1DA] bg-white p-6">
//           <h2 className="mb-4 text-sm font-semibold text-[#14201F]">
//             Lead sources
//           </h2>
//           {pieData.length === 0 ? (
//             <p className="text-xs text-[#6C7A78]">No source data yet.</p>
//           ) : (
//             <>
//               <div style={{ width: "100%", height: 180 }}>
//                 <ResponsiveContainer>
//                   <PieChart>
//                     <Pie
//                       data={pieData}
//                       dataKey="value"
//                       nameKey="name"
//                       cx="50%"
//                       cy="50%"
//                       innerRadius={45}
//                       outerRadius={70}
//                       paddingAngle={2}
//                     >
//                       {pieData.map((_, i) => (
//                         <Cell
//                           key={i}
//                           fill={PIE_COLORS[i % PIE_COLORS.length]}
//                         />
//                       ))}
//                     </Pie>
//                     <Tooltip
//                       contentStyle={{
//                         borderRadius: 8,
//                         border: "1px solid #E4E1DA",
//                         fontSize: 12,
//                       }}
//                     />
//                   </PieChart>
//                 </ResponsiveContainer>
//               </div>
//               <div className="mt-3 space-y-1.5">
//                 {pieData.slice(0, 5).map((s, i) => (
//                   <div
//                     key={s.name}
//                     className="flex items-center justify-between text-xs"
//                   >
//                     <div className="flex items-center gap-2">
//                       <span
//                         className="h-2.5 w-2.5 rounded-sm"
//                         style={{
//                           background: PIE_COLORS[i % PIE_COLORS.length],
//                         }}
//                       />
//                       <span className="text-[#6C7A78]">{s.name}</span>
//                     </div>
//                     <span className="font-medium text-[#14201F]">
//                       {s.value}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Funnel + leaderboard */}
//       <div className="mt-6 grid gap-6 lg:grid-cols-2">
//         <div className="rounded-xl border border-[#E4E1DA] bg-white p-6">
//           <h2 className="mb-5 text-sm font-semibold text-[#14201F]">
//             {isManager ? "Pipeline" : "My pipeline"}
//           </h2>
//           {funnel.length === 0 ? (
//             <p className="text-xs text-[#6C7A78]">
//               No leads in the pipeline yet.
//             </p>
//           ) : (
//             <div className="space-y-2.5">
//               {funnel.map((p) => (
//                 <div key={p.name} className="flex items-center gap-3">
//                   <div className="w-36 shrink-0 truncate text-xs text-[#6C7A78]">
//                     {p.name}
//                   </div>
//                   <div className="flex-1">
//                     <div className="h-7 overflow-hidden rounded-md bg-[#F4F2EE]">
//                       <div
//                         className="flex h-full items-center justify-end rounded-md px-2 transition-all"
//                         style={{
//                           width: `${Math.max(6, (p.count / maxFunnel) * 100)}%`,
//                           background: p.color || "#1F7A6B",
//                         }}
//                       >
//                         <span className="text-[11px] font-semibold text-white">
//                           {p.count}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {isManager ? (
//           <div className="rounded-xl border border-[#E4E1DA] bg-white p-6">
//             <h2 className="mb-5 text-sm font-semibold text-[#14201F]">
//               Agent leaderboard
//             </h2>
//             {agents.length === 0 ? (
//               <p className="text-xs text-[#6C7A78]">No agents yet.</p>
//             ) : (
//               <div className="space-y-2">
//                 {agents.map((a, i) => (
//                   <div key={a.name} className="flex items-center gap-3">
//                     <div className="w-5 text-center text-xs font-semibold text-[#9AA6A4]">
//                       {i + 1}
//                     </div>
//                     <div
//                       className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
//                       style={{ background: ac(a.name) }}
//                     >
//                       {initials(a.name)}
//                     </div>
//                     <div className="min-w-0 flex-1">
//                       <div className="truncate text-sm font-medium text-[#14201F]">
//                         {a.name}
//                       </div>
//                       <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F4F2EE]">
//                         <div
//                           className="h-full rounded-full bg-[#1F7A6B]"
//                           style={{ width: `${(a.total / maxAgent) * 100}%` }}
//                         />
//                       </div>
//                     </div>
//                     <div className="shrink-0 text-right">
//                       <div className="text-sm font-semibold text-[#14201F]">
//                         {a.total}
//                       </div>
//                       <div className="text-[10px] text-[#15803D]">
//                         {a.won} won
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         ) : (
//           <div className="rounded-xl border border-[#C58A12]/40 bg-[#C58A12]/5 p-6">
//             <div className="flex items-center gap-2">
//               <CalendarClock size={18} className="text-[#C58A12]" />
//               <h2 className="text-sm font-semibold text-[#14201F]">
//                 Today&apos;s follow-ups
//               </h2>
//             </div>
//             <div className="mt-3 text-4xl font-bold text-[#C58A12]">
//               {leadStats.due_today}
//             </div>
//             <p className="mt-1 text-sm text-[#8a6410]">
//               {leadStats.due_today === 0
//                 ? "You're all caught up."
//                 : `lead${leadStats.due_today === 1 ? "" : "s"} to follow up today.`}
//             </p>
//             <Link
//               href="/leads"
//               className="mt-4 inline-block rounded-md bg-[#C58A12] px-4 py-2 text-sm font-medium text-white hover:bg-[#a8760f]"
//             >
//               View my leads
//             </Link>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
