"use client";

import { useEffect } from "react";
import {
  Authenticated,
  Unauthenticated,
  ConvexReactClient,
  AuthLoading,
} from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { usePathname } from "next/navigation";

import { UnauthenticatedView } from "@/features/auth/components/unauthenticated-view";
import { AuthLoadingView } from "@/features/auth/components/auth-loading-view";

import { ThemeProvider } from "./theme-provider";

// Runs on every page mount. After OAuth, the user lands on "/" with a
// "aura:pending-auth" value in sessionStorage written before the redirect.
// Promoting it here is reliable regardless of sso-callback redirect timing.
function AuthPendingCommit() {
  useEffect(() => {
    const pending = sessionStorage.getItem("aura:pending-auth");
    if (pending === "github" || pending === "google") {
      localStorage.setItem("aura:last-auth", pending);
      sessionStorage.removeItem("aura:pending-auth");
    }
  }, []);
  return null;
}

function UnauthenticatedContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/sso-callback");
  if (isAuthRoute) return <>{children}</>;
  return <UnauthenticatedView />;
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#7c5aed",
          colorBackground: "#1e1b2e",
          colorInputBackground: "#262338",
          colorInputText: "#f5f5f5",
          colorText: "#f5f5f5",
          colorTextSecondary: "#a1a1aa",
          colorDanger: "#e3073c",
          borderRadius: "0.475rem",
        },
        elements: {
          card: "shadow-xl border border-white/10",
          userButtonPopoverCard: "bg-[#1e1b2e] border border-white/10",
          userButtonPopoverFooter: "hidden",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthPendingCommit />
          <Authenticated>{children}</Authenticated>
          <Unauthenticated>
            <UnauthenticatedContent>{children}</UnauthenticatedContent>
          </Unauthenticated>
          <AuthLoading>
            <AuthLoadingView />
          </AuthLoading>
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};
