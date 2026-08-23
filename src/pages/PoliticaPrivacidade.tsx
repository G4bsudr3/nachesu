import { LegalDoc } from "@/components/legal/LegalDoc";
import { content, version, updatedAt, title } from "@/content/legal/politicaPrivacidade";

const PoliticaPrivacidade = () => (
  <LegalDoc title={title} version={version} updatedAt={updatedAt} content={content} />
);

export default PoliticaPrivacidade;
