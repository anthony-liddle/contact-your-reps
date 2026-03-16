'use client';

interface ReloadButtonProps {
  className?: string;
  children: React.ReactNode;
}

export default function ReloadButton({ className, children }: ReloadButtonProps) {
  return (
    <button type="button" className={className} onClick={() => window.location.reload()}>
      {children}
    </button>
  );
}
