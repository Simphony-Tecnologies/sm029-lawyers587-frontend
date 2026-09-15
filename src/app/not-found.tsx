import Link from 'next/link';

// App-level 404. Sin esto, Next renderiza su página default (fondo negro,
// sin branding ni salida). Vive en el root layout → mantener autosuficiente.
export default function NotFound() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center'>
      <p className='text-[64px] font-extrabold leading-none tracking-[-0.03em] text-primary'>
        404
      </p>
      <div className='flex flex-col gap-1'>
        <h1 className='text-[18px] font-extrabold tracking-[-0.02em] text-slate-900'>
          Page not found
        </h1>
        <p className='max-w-sm text-[13px] font-medium text-slate-500'>
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved.
        </p>
      </div>
      <Link
        href='/dashboard'
        className='rounded-[9px] bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40'
      >
        Back to dashboard
      </Link>
    </main>
  );
}
