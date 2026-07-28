import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Padrão visual único para tabelas do admin.
 * Base: mesma cara de /admin/auditoria.
 *
 * Uso:
 *   <AdminTableWrapper>
 *     <AdminTable>
 *       <AdminTHead>
 *         <tr>
 *           <AdminTH>coluna</AdminTH>
 *         </tr>
 *       </AdminTHead>
 *       <AdminTBody>
 *         <AdminTR onClick={...}>
 *           <AdminTD>valor</AdminTD>
 *         </AdminTR>
 *       </AdminTBody>
 *     </AdminTable>
 *   </AdminTableWrapper>
 */

export const AdminTableWrapper = ({
  className,
  scroll = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { scroll?: boolean }) => (
  <section
    className={cn(
      "rounded-xl border border-perestroika-preto/10 bg-perestroika-bege/60 overflow-hidden",
      className,
    )}
    {...props}
  >
    {scroll ? <div className="overflow-x-auto">{children}</div> : children}
  </section>
);

export const AdminTable = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn("w-full text-sm", className)} {...props} />
  ),
);
AdminTable.displayName = "AdminTable";

export const AdminTHead = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn(
      "bg-perestroika-preto/5 text-[10px] uppercase tracking-wide text-perestroika-preto/60",
      className,
    )}
    {...props}
  />
);

export const AdminTBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-perestroika-preto/5", className)} {...props} />
);

export const AdminTR = ({
  className,
  interactive = true,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) => (
  <tr
    className={cn(interactive && "hover:bg-perestroika-preto/5 transition-colors", className)}
    {...props}
  />
);

export const AdminTH = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("text-left px-3 py-2 font-semibold", className)} {...props} />
);

export const AdminTD = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-3 py-2 align-middle", className)} {...props} />
);
