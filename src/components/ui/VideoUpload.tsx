"use client";

import { useState, useRef } from "react";
import { Upload, X, Link, Video, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

function isDirectVideo(url: string) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const ext = u.pathname.split(".").pop()?.toLowerCase();
    return ["mp4", "webm", "mov", "avi"].includes(ext ?? "");
  } catch {
    return false;
  }
}

function isEmbedPlatform(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com");
}

export default function VideoUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const maxBytes = 200 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Video must be under 200 MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Use XHR for upload progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append("file", file);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            onChange(data.data.url);
            toast.success("Video uploaded!");
            resolve();
          } else {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error ?? "Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("POST", "/api/upload");
        xhr.send(form);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUrlSave = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!isEmbedPlatform(url) && !url.startsWith("http")) {
      toast.error("Enter a valid YouTube, Vimeo, or direct video URL");
      return;
    }
    onChange(url);
    setUrlMode(false);
    setUrlInput("");
  };

  if (value) {
    const direct = isDirectVideo(value);
    return (
      <div className="flex flex-col gap-2">
        <div className="relative rounded-xl overflow-hidden border border-border bg-surface group">
          {direct ? (
            <video
              src={value}
              controls
              preload="metadata"
              className="w-full max-h-56 object-contain"
            />
          ) : (
            <div className="flex items-center gap-3 p-4">
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/20">
                <PlayCircle size={20} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">YouTube / Vimeo link set</p>
                <p className="text-xs text-slate-500 truncate">{value}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            aria-label="Remove video"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg border border-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors self-start"
        >
          <X size={11} /> Remove video
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!urlMode ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 w-full px-6">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-indigo-400 animate-pulse" />
                <span className="text-sm text-slate-400">Uploading… {progress}%</span>
              </div>
              <progress
                value={progress}
                max={100}
                aria-label="Upload progress"
                className="w-full h-1.5 rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-700 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-500 [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-indigo-500"
              />
            </div>
          ) : (
            <>
              <Upload size={22} className="text-slate-600" />
              <p className="text-sm text-slate-500">
                Drag & drop or <span className="text-indigo-400">click to upload</span>
              </p>
              <p className="text-xs text-slate-600">MP4, WebM, MOV · up to 200 MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PlayCircle size={14} className="text-slate-500 shrink-0" />
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=... or vimeo.com/..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUrlSave()}
              autoFocus
              className="flex-1 bg-surface border border-border text-slate-200 placeholder:text-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUrlSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
            >
              Use URL
            </button>
            <button
              type="button"
              onClick={() => { setUrlMode(false); setUrlInput(""); }}
              className="px-4 py-2 text-slate-500 hover:text-white text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!urlMode && !uploading && (
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors self-start"
        >
          <Link size={11} /> Paste YouTube / Vimeo link instead
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
        aria-label="Upload video file"
        title="Upload video file"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
