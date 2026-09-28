
import { useI18n } from "@/i18n/use-i18n";
import { Loader2Icon } from '@/components/icons/platform-icons'

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  const intl = useI18n();
  return (
    <Loader2Icon
      role="status"
      aria-label={intl.t("ui.loading")}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
