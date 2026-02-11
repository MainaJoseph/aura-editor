"use client";

import { createContext, useContext } from "react";

export const IconStyleContext = createContext(false);
export const IconStyleProvider = IconStyleContext.Provider;

export function useIconStyle() {
  return useContext(IconStyleContext);
}
