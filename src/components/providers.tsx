"use client";

import {
  Authenticated,
  Unauthenticated,
  ConvexReactClient,
  AuthLoading,
} from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { UnauthenticatedView } from "@/features/auth/components/unauthenticated-view";
import { AuthLoadingView } from "@/features/auth/components/auth-loading-view";

import { ThemeProvider } from "./theme-provider";

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
          <Authenticated>{children}</Authenticated>
          <Unauthenticated>
            <UnauthenticatedView />
          </Unauthenticated>
          <AuthLoading>
            <AuthLoadingView />
          </AuthLoading>
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};
