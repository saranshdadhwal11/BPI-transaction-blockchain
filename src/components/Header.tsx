"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsLoggedIn(!!localStorage.getItem("accessToken"));
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  const navLoggedIn = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Settings", href: "/settings" },
  ];

  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="flex items-center gap-2 -m-1.5 p-1.5">
            <span className="sr-only">BPI</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-semibold text-slate-100 text-lg hidden sm:block">BPI</span>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-lg p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-1">
          {isLoggedIn ? (
            <>
              {navLoggedIn.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 hover:bg-primary-400 transition-all"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
      <Dialog
        as="div"
        className="lg:hidden"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
        <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full max-w-xs overflow-y-auto bg-slate-900 border-l border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800">
            <span className="font-semibold text-slate-100">Menu</span>
            <button
              type="button"
              className="-m-2.5 rounded-lg p-2.5 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="px-4 py-6 space-y-1">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="block rounded-lg px-4 py-3 text-base font-medium text-slate-200 hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="block rounded-lg px-4 py-3 text-base font-medium text-slate-200 hover:bg-slate-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left rounded-lg px-4 py-3 text-base font-medium text-red-400 hover:bg-slate-800"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="block rounded-lg bg-primary-500 px-4 py-3 text-center text-base font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
}
