/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface Attachment {
  storageId: Id<"_storage">;
  mediaType: string;
  filename?: string;
}

function AttachmentImage({
  attachment,
  projectId,
}: {
  attachment: Attachment;
  projectId: Id<"projects">;
}) {
  const [expanded, setExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const url = useQuery(api.system.getAttachmentUrl, {
    storageId: attachment.storageId,
    projectId,
  });

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expanded]);

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="overflow-hidden rounded-md border border-border hover:opacity-90 transition-opacity"
      >
        <img
          src={url}
          alt={attachment.filename || "Attached image"}
          className="max-w-48 max-h-32 object-cover"
        />
      </button>
      {expanded && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <img
            src={url}
            alt={attachment.filename || "Attached image"}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

interface MessageAttachmentsProps {
  attachments: Attachment[];
  projectId: Id<"projects">;
}

export function MessageAttachments({ attachments, projectId }: MessageAttachmentsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((attachment, index) => (
        <AttachmentImage
          key={`${attachment.storageId}-${index}`}
          attachment={attachment}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
