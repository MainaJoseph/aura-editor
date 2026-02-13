"use client";

import { createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

type PresenceEntry = {
  _id: Id<"presence">;
  fileId?: Id<"files">;
  userName: string;
  userColor: string;
  userId: string;
};

const PresenceContext = createContext<PresenceEntry[]>([]);

export const useFilePresence = (fileId: Id<"files">) => {
  const presence = useContext(PresenceContext);
  return presence.filter((p) => p.fileId === fileId);
};

export const PresenceProvider = ({
  projectId,
  children,
}: {
  projectId: Id<"projects">;
  children: React.ReactNode;
}) => {
  const presence = useQuery(api.presence.getProjectPresence, { projectId });

  return (
    <PresenceContext value={presence ?? []}>
      {children}
    </PresenceContext>
  );
};
