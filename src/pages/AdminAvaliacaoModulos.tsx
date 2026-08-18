import { Navigate, useParams } from "react-router-dom";

/**
 * leitura antiga das avaliações de fim de módulo. virou atalho pro pulso já
 * filtrado pela eletiva, pra não existirem duas fontes de verdade sobre a
 * mesma tabela module_ratings.
 */
const AdminAvaliacaoModulos = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/admin/pulso?eletiva=${slug}` : "/admin/pulso"} replace />;
};

export default AdminAvaliacaoModulos;
