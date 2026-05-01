// composição dos hooks granulares de builder_cards.
// cada concern vive em src/features/admin/builderCards/*.
import { useBuilderCardsData } from "./builderCards/useBuilderCardsData";
import { useBuilderCardGenerate } from "./builderCards/useBuilderCardGenerate";
import { useBuilderCardEdit } from "./builderCards/useBuilderCardEdit";
import { useBuilderCardPublish } from "./builderCards/useBuilderCardPublish";

export { ARCHETYPE_LABEL, ARCHETYPE_EMOJI } from "./builderCards/types";
export type { BuilderCard, CardRow } from "./builderCards/types";

export const useBuilderCards = () => {
  const { rows, loading, reload } = useBuilderCardsData();
  const { generate, expandFields, regenerateFull, generatingFor } =
    useBuilderCardGenerate({ rows, reload });
  const { updateEssence, updateCardFields } = useBuilderCardEdit({ reload });
  const { togglePublish } = useBuilderCardPublish({ reload });

  return {
    rows,
    loading,
    reload,
    generate,
    expandFields,
    generatingFor,
    regenerateFull,
    updateEssence,
    updateCardFields,
    togglePublish,
  };
};
