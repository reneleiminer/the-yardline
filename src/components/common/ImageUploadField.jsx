import React, { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CLOUDINARY_CLOUD_NAME = 'dsd5ajgru';
const CLOUDINARY_UPLOAD_PRESET = 'theyardline_upload';

async function uploadToCloudinary(file) {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: data,
    }
  );

  const result = await response.json();
  console.log('CLOUDINARY IMAGE RESULT:', result);

  if (!response.ok || !result.secure_url) {
    throw new Error(result?.error?.message || 'Upload fehlgeschlagen');
  }

  return result.secure_url;
}

export default function ImageUploadField({
  value,
  onChange,
  label,
  required = false,
  multiple = false,
  className = ''
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);

    try {
      if (multiple) {
        const urls = [];

        for (const file of files) {
          const url = await uploadToCloudinary(file);
          urls.push(url);
        }

        onChange([...(value || []), ...urls]);
      } else {
        const url = await uploadToCloudinary(files[0]);
        onChange(url);
      }

      toast.success(multiple ? 'Bilder hochgeladen' : 'Bild hochgeladen');
    } catch (error) {
      console.error('CLOUDINARY UPLOAD ERROR:', error);
      toast.error(error.message || 'Bild konnte nicht hochgeladen werden');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx) => {
    if (multiple) {
      onChange((value || []).filter((_, i) => i !== idx));
    } else {
      onChange('');
    }
  };

  const images = multiple ? (value || []) : (value ? [value] : []);

  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-semibold text-foreground mb-2 block">
          {label}{required && ' *'}
        </label>
      )}

      {images.length > 0 && (
        <div className={`mb-3 ${multiple ? 'grid grid-cols-2 gap-2' : ''}`}>
          {images.map((img, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden">
              <img
                src={img}
                alt=""
                className="w-full h-44 object-cover bg-secondary"
              />

              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(multiple || images.length === 0) && (
        <label
          className={`flex items-center justify-center gap-2.5 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            uploading
              ? 'border-primary/40 bg-primary/5'
              : 'border-border/50 hover:border-primary/40 hover:bg-secondary/30'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                Hochladen…
              </span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {multiple ? 'Bilder hinzufügen' : 'Bild hochladen'}
              </span>
            </>
          )}

          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}