import { useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { useUser } from "@clerk/nextjs";

import { Id } from "../../../../convex/_generated/dataModel";
import { ConvexYjsProvider } from "../collaboration/convex-yjs-provider";
import { getUserColor } from "../collaboration/user-colors";

export function useCollaborativeEditor(
  fileId: Id<"files"> | null | undefined,
  initialContent: string | undefined,
  projectId?: Id<"projects">,
) {
  const convex = useConvex();
  const { user } = useUser();
  const [provider, setProvider] = useState<ConvexYjsProvider | null>(null);
  const [isCollabReady, setIsCollabReady] = useState(false);
  const providerRef = useRef<ConvexYjsProvider | null>(null);

  useEffect(() => {
    if (!fileId) {
      setProvider(null);
      setIsCollabReady(false);
      return;
    }

    const p = new ConvexYjsProvider(convex, fileId, initialContent ?? "");
    providerRef.current = p;
    setProvider(p);

    const unsub = p.onSynced((synced) => {
      setIsCollabReady(synced);
    });

    if (p.synced) {
      setIsCollabReady(true);
    }

    return () => {
      unsub();
      providerRef.current = null;
      setProvider(null);
      setIsCollabReady(false);
      p.destroy();
    };
    // Only re-create when fileId changes — initialContent is only used on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, convex]);

  // Set up presence when user info or projectId changes
  useEffect(() => {
    if (!provider || !user || !projectId) return;

    const userName =
      user.fullName ?? user.firstName ?? user.username ?? "Anonymous";
    const userColor = getUserColor(user.id);

    provider.setPresence({
      projectId,
      userName,
      userColor,
    });
  }, [provider, user, projectId]);

  return { yjsProvider: provider, isCollabReady };
}
