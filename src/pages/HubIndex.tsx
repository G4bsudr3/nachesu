import { Navigate } from "react-router-dom";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { useMyEnrollments } from "@/hooks/useCourses";

/**
 * /app/hub virou redirect.
 * NachesU não tem "hub" separado: cada eletiva é o hub dela.
 * - se aluno tem eletiva ativa → manda pra /app/eletiva/:slug
 * - se não tem → volta pro dashboard
 *
 * /app/hub/materiais e /app/tutor continuam acessíveis direto.
 */
const HubIndex = () => {
  const { slug } = useActiveEletiva();
  const { data: enrollments, isLoading } = useMyEnrollments();
  if (isLoading) return null;
  const target =
    enrollments?.find((e) => e.course?.slug === slug)?.course?.slug ??
    enrollments?.[0]?.course?.slug ??
    null;
  if (target) return <Navigate to={`/app/eletiva/${target}`} replace />;
  return <Navigate to="/app" replace />;
};

export default HubIndex;
