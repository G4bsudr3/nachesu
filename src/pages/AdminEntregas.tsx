import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { AdminFeedbackInbox } from "@/features/admin/AdminFeedbackInbox";

/**
 * fila única de entregas dos estudantes.
 * substitui /admin/correcoes e /admin/respostas: mesma fonte de dados,
 * agora com um lugar só, filtrado por status.
 */
const AdminEntregas = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-perestroika-preto font-body space-y-3">
    <nav
      aria-label="breadcrumb"
      className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-perestroika-preto/55"
    >
      <Link to="/admin" className="hover:text-perestroika-preto">
        admin
      </Link>
      <ChevronRight className="w-3 h-3" />
      <span className="text-perestroika-preto font-semibold">entregas</span>
    </nav>

    <AdminFeedbackInbox title="entregas dos estudantes" defaultStatus="pendentes" />
  </div>
);

export default AdminEntregas;
