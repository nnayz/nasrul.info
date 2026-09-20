import {
  getHazeThumbnailDataUrl,
  hazePlaceholderColor,
  stableHazeSeed,
} from '@/lib/hazeThumbnail';
import { useEffect, useState } from 'react';

export default function WorkThumbnail({
  meta,
  plain = false,
  title,
}: {
  meta: string;
  plain?: boolean;
  title: string;
}) {
  const seed = stableHazeSeed(`work:${title}`);
  const color = hazePlaceholderColor(seed);
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let active = true;
    void getHazeThumbnailDataUrl(seed)
      .then((thumbnail) => {
        if (active) setSrc(thumbnail);
      })
      .catch(() => {
        if (active) setSrc(undefined);
      });
    return () => {
      active = false;
    };
  }, [seed]);

  return (
    <div
      aria-hidden
      className="[container-type:inline-size] relative h-full w-full overflow-hidden"
      style={{ backgroundColor: color }}
    >
      {src && (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          src={src}
        />
      )}
      {!plain && (
        <div
          className="absolute right-0 bottom-[12%] left-[12%] flex min-h-[42%] flex-col justify-center px-[8%] py-[6%] text-[#08090a]"
          style={{
            backgroundColor: `color-mix(in oklab, ${color} 24%, white)`,
          }}
        >
          <span className="text-[clamp(1.125rem,7.5cqi,2rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
            {title}
          </span>
          <span className="mt-[4%] truncate text-[clamp(0.625rem,3.5cqi,0.8125rem)] leading-[1.2] font-medium opacity-65">
            {meta}
          </span>
        </div>
      )}
    </div>
  );
}
