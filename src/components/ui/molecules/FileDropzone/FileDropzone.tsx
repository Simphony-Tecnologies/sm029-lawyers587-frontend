'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MdCloudUpload,
  MdClose,
  MdPictureAsPdf,
  MdImage,
} from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface FileDropzoneProps {
  id: string;
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const FileDropzone = ({
  id,
  value,
  onChange,
  accept,
  hint,
  error,
  disabled,
}: FileDropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (value && value.type.startsWith('image/')) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [value]);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const clear = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (value) {
    const isPdf = value.type === 'application/pdf';
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-white p-3',
          error ? 'border-rose-400' : 'border-slate-300'
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt='License preview'
            className='h-12 w-12 flex-shrink-0 rounded-md object-cover'
          />
        ) : (
          <span
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md',
              isPdf ? 'bg-red-50 text-customRed' : 'bg-slate-100 text-slate-500'
            )}
          >
            {isPdf ? (
              <MdPictureAsPdf className='text-2xl' />
            ) : (
              <MdImage className='text-2xl' />
            )}
          </span>
        )}
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-sm font-semibold text-slate-800'>
            {value.name}
          </span>
          <span className='text-xs text-slate-400'>
            {formatBytes(value.size)}
          </span>
        </div>
        <button
          type='button'
          onClick={clear}
          disabled={disabled}
          aria-label='Remove file'
          className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50'
        >
          <MdClose className='text-lg' />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type='file'
        accept={accept}
        disabled={disabled}
        className='sr-only'
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type='button'
        onClick={openPicker}
        disabled={disabled}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          onChange(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition',
          dragging
            ? 'border-primary bg-primary/5'
            : error
              ? 'border-rose-400 bg-rose-50/40'
              : 'border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/5',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <MdCloudUpload className='text-3xl text-slate-400' />
        <span className='text-sm font-semibold text-slate-700'>
          Click to upload or drag &amp; drop
        </span>
        {hint && <span className='text-xs text-slate-400'>{hint}</span>}
      </button>
    </>
  );
};

FileDropzone.displayName = 'FileDropzone';
