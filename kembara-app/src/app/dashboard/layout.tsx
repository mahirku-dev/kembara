import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import NavLink, { type NavIconName } from "./NavLink";

const NAV_ITEMS: Array<{ href: string; label: string; iconName: NavIconName }> = [
  { href: "/dashboard", label: "Home", iconName: "House" },
  { href: "/dashboard/itinerary", label: "Itinerary", iconName: "ListBullets" },
  { href: "/dashboard/map", label: "Map", iconName: "MapTrifold" },
  { href: "/dashboard/budget", label: "Budget", iconName: "Wallet" },
  { href: "/dashboard/vault", label: "Vault", iconName: "SuitcaseRolling" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <div className="mx-auto flex max-w-6xl lg:gap-6 lg:p-6 relative z-10 h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col rounded-[2rem] bg-white/60 backdrop-blur-xl border border-white/60 p-6 shadow-panel">
        <div className="flex items-center gap-2.5 mb-8">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-glass">
            <Compass weight="fill" size={20} />
          </span>
          <span className="text-lg font-semibold text-stone-900">Kembara</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ href, label, iconName }) => (
            <NavLink key={href} href={href} label={label} iconName={iconName} variant="sidebar" />
          ))}
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 lg:rounded-[2rem] bg-white/40 lg:border lg:border-white/60 shadow-glass relative flex flex-col overflow-hidden">
        {children}

        {/* Bottom Navigation (Mobile Only) */}
        <nav className="lg:hidden absolute bottom-0 left-0 w-full z-[9999] bg-white/90 backdrop-blur-xl border-t border-stone-200/80 shadow-lg pb-safe">
          <div className="mx-auto max-w-md grid grid-cols-5 px-2 py-2">
            {NAV_ITEMS.map(({ href, label, iconName }) => (
              <NavLink key={href} href={href} label={label} iconName={iconName} variant="bottom" />
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
