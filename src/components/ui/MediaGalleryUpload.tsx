"use client";

import { useState, useRef } from "react";
import { Upload, X, Images, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface GalleryImage {
  id?: string;
  url: string;
  caption?: string;
}

interface Props {
  eventId?: string;
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  maxImages?: number;
}

export default function MediaGalleryUpload({ eventId, images, onChange, maxImages = 20 }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const remaining = maxImages - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    const uploaded: GalleryImage[] = [];

    for (const file of toUpload) {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (eventId) {
          const mediaRes = await fetch(`/api/events/${eventId}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: data.data.url }),
          });
          const mediaData = await mediaRes.json();
          if (mediaRes.ok) {
            uploaded.push({ id: mediaData.data.id, url: data.data.url });
          }
        } else {
          uploaded.push({ url: data.data.url });
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploaded.length > 0) {
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length !== 1 ? "s" : ""} added`);
    }
    setUploading(false);
  };

  const handleRemove = async (index: number) => {
    const img = images[index];
    if (eventId && img.id) {
      await fetch(`/api/events/${eventId}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: img.id }),
      });
    }
    onChange(images.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          {images.length < maxImages && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 flex items-center justify-center transition-all"
            >
              {uploading
                ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                : <Plus size={20} className="text-slate-500" />
              }
            </button>
          )}
        </div>
      )}

      {images.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Images size={22} className="text-slate-600" />
              <p className="text-sm text-slate-500">Drag & drop or <span className="text-indigo-400">click to upload</span></p>
              <p className="text-xs text-slate-600">Up to {maxImages} images · JPEG, PNG, WebP</p>
            </>
          )}
        </div>
      )}

      {images.length > 0 && images.length < maxImages && !uploading && (
        <p className="text-xs text-slate-500">{images.length}/{maxImages} images · click + to add more</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
