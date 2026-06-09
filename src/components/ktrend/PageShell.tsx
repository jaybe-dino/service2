import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function PageShell({
  children,
  contained = true,
}: {
  children: ReactNode;
  contained?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className={`flex-1 ${contained ? "mx-auto w-full max-w-[1480px] px-4 py-6" : ""}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
