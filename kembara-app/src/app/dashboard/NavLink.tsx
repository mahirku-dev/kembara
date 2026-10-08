"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { House, ListBullets, MapTrifold, Wallet, SuitcaseRolling } from "@phosphor-icons/react";
import { clsx } from "clsx";
import { Suspense } from "react";

export type NavIconName = "House" | "ListBullets" | "MapTrifold" | "Wallet" | "SuitcaseRolling";

const ICONS: Record<NavIconName, typeof House> = {
  House,
  ListBullets,
  MapTrifold,
  Wallet,
  SuitcaseRolling,
};

interface NavLinkProps {
  href: string;
  label: string;
  iconName: NavIconName;
  variant: "sidebar" | "bottom";
}

function NavLinkInner({ href, label, iconName, variant }: NavLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tripId = searchParams?.get("tripId");
  const targetHref = tripId ? `${href}?tripId=${tripId}` : href;

  const IconComp = ICONS[iconName] || House;

  // Exact match for /dashboard, prefix match for all sub-routes
  const isActive =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  if (variant === "sidebar") {
    return (
      <Link
        href={targetHref}
        className={clsx(
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium transition",
          isActive
            ? "bg-brand-50/70 text-brand-700 font-semibold"
            : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        )}
      >
        <IconComp
          size={20}
          weight={isActive ? "fill" : "regular"}
          aria-hidden
        />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={targetHref}
      className={clsx(
        "flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition",
        isActive
          ? "text-brand-600"
          : "text-stone-400 hover:text-brand-600 hover:bg-brand-50/50"
      )}
    >
      <IconComp size={22} weight={isActive ? "fill" : "regular"} aria-hidden />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

export default function NavLink(props: NavLinkProps) {
  return (
    <Suspense
      fallback={
        <Link
          href={props.href}
          className={
            props.variant === "sidebar"
              ? "flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium text-stone-500"
              : "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-stone-400"
          }
        >
          <span className="text-xs">{props.label}</span>
        </Link>
      }
    >
      <NavLinkInner {...props} />
    </Suspense>
  );
}
