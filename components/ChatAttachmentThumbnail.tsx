"use client";

import { useState, useEffect } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

interface ChatAttachmentThumbnailProps {
  attachmentId: string;
  mimeType?: string;
  className?: string;
}

export function ChatAttachmentThumbnail({
  attachmentId,
  mimeType,
  className = "",
}: ChatAttachmentThumbnailProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUrl = async () => {
      try {
        const res = await fetch(`/api/chat/attachment/${attachmentId}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (isMounted) setUrl(data.url);
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUrl();
    return () => {
      isMounted = false;
    };
  }, [attachmentId]);

  const isHeic =
    mimeType?.includes("heic") || mimeType?.includes("heif");

  if (loading) {
    return (
      <div
        className={`w-48 h-32 bg-gray-200 rounded flex items-center justify-center ${className}`}
      >
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !url || isHeic) {
    return (
      <div
        className={`w-48 h-32 bg-gray-200 rounded flex items-center justify-center ${className}`}
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Attached image"
      className={`max-w-[200px] max-h-[200px] rounded object-cover cursor-pointer ${className}`}
      onClick={() => window.open(url, "_blank")}
    />
  );
}
