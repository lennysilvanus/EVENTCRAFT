"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Link } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.data.url);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUrlSave = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlMode(false);
    setUrlInput("");
  };

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border group">
          <img src={value} alt="Cover" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <Upload size={12} /> Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded-lg border border-red-500/20 transition-colors flex items-center gap-1.5"
            >
              <X size={12} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !urlMode && inputRef.current?.click()}
          className="w-full h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ImageIcon size={24} className="text-slate-600" />
              <p className="text-sm text-slate-500">Drag & drop or <span className="text-indigo-400">click to upload</span></p>
              <p className="text-xs text-slate-600">JPEG, PNG, WebP up to 5MB</p>
            </>
          )}
        </div>
      )}

      {/* URL mode toggle */}
      {!value && (
        urlMode ? (
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUrlSave()}
              className="flex-1 bg-surface border border-border text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
            />
            <button type="button" onClick={handleUrlSave} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
              Use URL
            </button>
            <button type="button" onClick={() => setUrlMode(false)} className="px-3 py-2 text-slate-500 hover:text-white text-sm rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setUrlMode(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors"
          >
            <Link size={11} /> Use image URL instead
          </button>
        )
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
