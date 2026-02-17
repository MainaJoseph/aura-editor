/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface Attachment {
  storageId: Id<"_storage">;
  mediaType: string;
  filename?: string;
}

function AttachmentImage({ attachment }: { attachment: Attachment }) {
  const [expanded, setExpanded] = useState(false);
  const url = useQuery(api.system.getAttachmentUrl, {
    storageId: attachment.storageId,
  });

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
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((attachment, index) => (
        <AttachmentImage key={`${attachment.storageId}-${index}`} attachment={attachment} />
      ))}
    </div>
  );
}
