// conclusão de módulo e envio da entrega andam juntos.
//
// antes, o `completed_at` era gravado primeiro e o envio da entrega ia depois,
// sem checar erro nem quantas linhas casaram. resultado: módulo contava como
// concluído (e pro certificado) com a entrega presa em "rascunho", invisível
// pro educador. aqui o envio vem primeiro e propaga erro.

type MinimalClient = {
  from: (table: string) => any;
};

/**
 * marca a entrega do módulo como enviada.
 * - se não existe linha em module_deliverables, não há nada a enviar (ok)
 * - se a linha já foi revisada, limpa os marcadores de revisão junto,
 *   senão o update casaria 0 linhas em silêncio e a entrega sumiria das filas
 */
export async function submitModuleDeliverable(
  client: MinimalClient,
  userId: string,
  moduleId: string,
): Promise<{ submitted: boolean }> {
  const { data: existing, error: readError } = await client
    .from("module_deliverables")
    .select("id, reviewed_at")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) return { submitted: false };

  const { data: updated, error } = await client
    .from("module_deliverables")
    .update({
      status: "enviado",
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewer_id: null,
    })
    .eq("id", existing.id)
    .select("id");
  if (error) throw error;
  if (!updated || updated.length === 0) {
    throw new Error("não consegui registrar sua entrega. tenta de novo em instantes");
  }
  return { submitted: true };
}

/** envia a entrega e só então grava o progresso do módulo. */
export async function completeModuleWithDeliverable(
  client: MinimalClient,
  args: { userId: string; moduleId: string; startedAt?: string | null },
): Promise<void> {
  const { userId, moduleId, startedAt } = args;
  await submitModuleDeliverable(client, userId, moduleId);
  const now = new Date().toISOString();
  const { error } = await client.from("student_module_progress").upsert(
    {
      user_id: userId,
      module_id: moduleId,
      started_at: startedAt ?? now,
      completed_at: now,
    },
    { onConflict: "user_id,module_id" },
  );
  if (error) throw error;
}
