"use client";

import { useEffect } from "react";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/nextjs";

// Promotes the pending OAuth method to localStorage only after Clerk confirms
// the session is fully established — prevents a false "Last used" badge if the
// user cancelled at the provider or an error occurred before completing auth.
function SSOSuccessHandler() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn) return;
    const pending = sessionStorage.getItem("aura:pending-auth");
    if (pending === "github" || pending === "google") {
      localStorage.setItem("aura:last-auth", pending);
      sessionStorage.removeItem("aura:pending-auth");
    }
  }, [isSignedIn]);

  return null;
}

export default function SSOCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback />
      <SSOSuccessHandler />
    </>
  );
}
