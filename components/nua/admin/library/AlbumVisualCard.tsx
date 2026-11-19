import Image from 'next/image';
import { Check, Folder, type LucideIcon } from 'lucide-react';

interface AlbumVisualCardProps {
  title: string;
  countLabel: string;
  coverUrl?: string | null;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
  create?: boolean;
}

export function AlbumVisualCard({
  title,
  countLabel,
  coverUrl,
  icon: Icon = Folder,
  selected,
  onClick,
  create = false,
}: AlbumVisualCardProps) {
  const frame = 'relative aspect-[16/9] w-full overflow-hidden bg-[#101116] shrink-0';
  const cardStyle =
    'w-full flex flex-col group min-w-0 overflow-hidden rounded-xl border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-adm-accent)] cursor-pointer ' +
    (create
      ? 'border-dashed border-[var(--color-adm-accent)]/40 bg-[#14151c] hover:bg-[#191b24]'
      : selected
      ? 'border-[var(--color-adm-accent)] bg-[#1b1c26] ring-1 ring-[var(--color-adm-accent)]/50 shadow-sm'
      : 'border-white/[0.08] bg-[#14151c] hover:border-white/20 hover:bg-[#181a24]');

  return (
    <button
      type="button"
      aria-pressed={create ? undefined : selected}
      aria-label={`${title}, ${countLabel}`}
      title={title}
      onClick={onClick}
      className={cardStyle}
    >
      <div className={frame}>
        {coverUrl && !create ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1200px) 22vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[#181a24] text-[var(--color-adm-accent)]">
            <Icon className={create ? 'h-7 w-7' : 'h-6 w-6'} aria-hidden="true" />
          </div>
        )}
        {!create && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        )}
        {selected && !create && (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-adm-accent)] text-white shadow-md">
            <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
          </span>
        )}
      </div>

      {!create && (
        <div className="flex w-full min-w-0 flex-col px-2.5 py-2">
          <span className="truncate text-xs font-semibold text-white leading-tight" title={title}>
            {title}
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5 font-mono leading-none">
            {countLabel}
          </span>
        </div>
      )}

      {create && (
        <div className="w-full px-2.5 py-2 text-center text-xs font-semibold text-[var(--color-adm-accent)]">
          Criar álbum
        </div>
      )}
    </button>
  );
}
