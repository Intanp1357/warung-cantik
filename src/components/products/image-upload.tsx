"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

/** Best-effort cleanup of a replaced / removed image. */
export async function removeProductImage(url: string): Promise<void> {
  const marker = `/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;

  try {
    const supabase = createClient();
    await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([url.slice(index + marker.length)]);
  } catch {
    // Ignore: orphaned files are harmless.
  }
}

interface ImageUploadProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar dulu.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Gambar harus berukuran kurang dari 2 MB.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });

      if (error) throw new Error(getErrorMessage(error, "Gagal mengunggah gambar"));

      const { data } = supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(path);

      if (value) void removeProductImage(value);
      onChange(data.publicUrl);
    } catch (error) {
      toast.error(getErrorMessage(error, "Gagal mengunggah gambar"));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {value ? (
            <Image
              src={value}
              alt="Pratinjau produk"
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground/60">
              <ImageIcon className="size-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            {value ? "Ganti" : "Unggah"}
          </Button>

          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                void removeProductImage(value);
                onChange(null);
              }}
            >
              <Trash2Icon />
              Hapus
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG atau JPG, maksimal 2 MB. Opsional — tampilan kartu tetap bagus tanpa gambar.
      </p>
    </div>
  );
}
