import { play } from '@/lib/audio';
import { cn } from '@/lib/className';
import { EASE_EXPO, EASE_INOUT, MENU_MORPH } from '@/lib/motion';
import { Select as BaseSelect } from '@base-ui/react/select';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useId, useState } from 'react';

export interface SelectOption<Value extends string | number> {
  label: string;
  value: Value;
}

interface SelectProps<Value extends string | number> {
  ariaLabel: string;
  onValueChange: (value: Value) => void;
  options: readonly SelectOption<Value>[];
  size?: 'default' | 'tiny';
  value: Value;
}

export function Select<Value extends string | number>({
  ariaLabel,
  onValueChange,
  options,
  size = 'default',
  value,
}: SelectProps<Value>) {
  const tiny = size === 'tiny';
  const reduce = useReducedMotion();
  const surfaceId = `select-surface-${useId()}`;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const positionerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setMounted(true);
  }, []);

  return (
    <BaseSelect.Root
      items={options}
      onOpenChange={setOpen}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
      open={open}
      value={value}
    >
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'group pointer-events-auto relative isolate inline-flex cursor-pointer items-center overflow-hidden rounded-full font-bold lowercase',
          '[font-family:var(--font-body)] transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
          open
            ? 'text-transparent opacity-0'
            : 'text-neutral-50 hover:text-neutral-950 dark:text-neutral-950 dark:hover:text-neutral-50',
          tiny ? 'gap-1.5 px-2 py-1 text-[10px]' : 'gap-2 px-3 py-2 text-xs',
        )}
        onClick={() => play('click')}
      >
        <span className="relative z-10 size-1.5 shrink-0 rounded-full bg-current transition-transform duration-300 group-hover:scale-150" />
        <span
          className={cn(
            'relative z-10 block overflow-hidden',
            tiny ? 'h-3' : 'h-4',
          )}
        >
          <span
            className={cn(
              'block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
              tiny
                ? 'group-hover:-translate-y-3'
                : 'group-hover:-translate-y-4',
            )}
          >
            <span className={cn('flex items-center', tiny ? 'h-3' : 'h-4')}>
              <BaseSelect.Value />
            </span>
            <span className={cn('flex items-center', tiny ? 'h-3' : 'h-4')}>
              <BaseSelect.Value />
            </span>
          </span>
        </span>
        {!open && (
          <motion.span
            aria-hidden
            className="absolute inset-0 -z-10 overflow-hidden bg-neutral-950 dark:bg-neutral-50"
            layoutId={!reduce ? surfaceId : undefined}
            style={{ borderRadius: tiny ? 12 : 16 }}
            transition={MENU_MORPH}
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-neutral-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 dark:bg-neutral-950" />
          </motion.span>
        )}
      </BaseSelect.Trigger>

      <AnimatePresence>
        {(open || mounted) && (
          <BaseSelect.Portal>
            <BaseSelect.Positioner
              align="end"
              alignItemWithTrigger={false}
              className="z-[100] outline-none"
              ref={positionerRef}
              side="bottom"
              sideOffset={6}
            >
              <BaseSelect.Popup
                className={cn(
                  'relative isolate w-max overflow-hidden bg-neutral-50 text-neutral-950 shadow-2xl ring-1 ring-black/5 outline-none',
                  tiny
                    ? 'min-w-[max(var(--anchor-width),6rem)] p-2'
                    : 'min-w-[max(var(--anchor-width),10rem)] p-3',
                )}
                render={
                  <motion.div
                    animate={{ opacity: open ? 1 : 0 }}
                    initial={false}
                    layoutId={open && !reduce ? surfaceId : undefined}
                    style={{ borderRadius: tiny ? 16 : 24 }}
                    transition={
                      open ? MENU_MORPH : { duration: 0.4, ease: EASE_INOUT }
                    }
                  />
                }
              >
                <motion.span
                  animate={{ opacity: open ? 0 : 1 }}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 bg-neutral-950 dark:hidden"
                  initial={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: EASE_INOUT }}
                />

                <BaseSelect.List className="relative z-20 max-h-[var(--available-height)] overflow-y-auto">
                  {options.map((option, index) => (
                    <BaseSelect.Item
                      className="group/item cursor-default overflow-hidden whitespace-nowrap outline-none select-none"
                      key={option.value}
                      onClick={() => play('click')}
                      value={option.value}
                    >
                      <motion.div
                        animate={{
                          y: open && !reduce ? 0 : reduce ? 0 : '110%',
                        }}
                        className={cn(
                          'flex items-center justify-between gap-4 rounded-full px-2 font-bold tracking-[-0.04em] text-neutral-950/35 lowercase transition-colors',
                          'group-data-[highlighted]/item:text-neutral-950 group-data-[selected]/item:text-neutral-950',
                          tiny ? 'py-1 text-xs' : 'py-1.5 text-base',
                        )}
                        initial={{ y: reduce ? 0 : '110%' }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : open
                              ? {
                                  delay: 0.22 + index * 0.055,
                                  duration: 0.65,
                                  ease: EASE_EXPO,
                                }
                              : { duration: 0.25, ease: EASE_INOUT }
                        }
                      >
                        <BaseSelect.ItemText className="[font-family:var(--font-display)]">
                          {option.label}
                        </BaseSelect.ItemText>
                        <BaseSelect.ItemIndicator className="size-1.5 shrink-0 rounded-full bg-neutral-950" />
                      </motion.div>
                    </BaseSelect.Item>
                  ))}
                </BaseSelect.List>
              </BaseSelect.Popup>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        )}
      </AnimatePresence>
    </BaseSelect.Root>
  );
}
