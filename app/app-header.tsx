"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "./brand-mark";
import LogoutButton from "./logout-button";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

function getBackHref(pathname: string) {
  if (pathname === "/collections/new") {
    return "/";
  }

  const itemPath = pathname.match(
    /^\/collections\/([^/]+)\/items\/(?:new|[^/]+)$/
  );

  if (itemPath) {
    return `/collections/${itemPath[1]}`;
  }

  if (/^\/collections\/[^/]+$/.test(pathname)) {
    return "/";
  }

  return null;
}

export default function AppHeader() {
  const pathname = usePathname();

  if (PUBLIC_PATHS.has(pathname)) {
    return null;
  }

  const backHref = getBackHref(pathname);

  return (
    <header className="museum-app-header">
      <div className="museum-header-inner">
        <div className="museum-header-side">
          {backHref && (
            <Link href={backHref} className="museum-back-link">
              ← 뒤로
            </Link>
          )}
        </div>

        <BrandMark href="/" />

        <div className="museum-header-side">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
