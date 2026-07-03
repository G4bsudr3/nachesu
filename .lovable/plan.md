## diagnóstico

O erro do print agora é específico:

`permission denied for function assert_module_in_scope`

Isso significa que o clique de publicar chega no backend, mas o usuário autenticado não tem permissão para executar a função que valida se o módulo está dentro do escopo da eletiva antes de publicar. A função em si já existe e está correta, o problema é a permissão de execução.

## plano de correção

1. **Ajustar permissão no backend**
   - Liberar execução da função `assert_module_in_scope(uuid)` para usuários autenticados.
   - Não liberar para visitantes anônimos, porque publicação é ação administrativa.
   - Manter as regras existentes de admin e RLS, sem abrir acesso indevido aos dados.

2. **Preservar as validações de qualidade e escopo**
   - Não remover o bloqueio de segurança pedagógica.
   - A publicação ainda deve falhar se algum módulo tiver conteúdo fora do escopo ou problema de qualidade.
   - A diferença é que agora o admin conseguirá acionar a validação corretamente.

3. **Testar publicação dos módulos 4 a 10 da trilha de IA**
   - Depois da migration aprovada, tentar publicar novamente pelo painel.
   - Se aparecer outro erro, ele será o próximo gargalo real, mas este erro específico será resolvido.

## detalhe técnico

Aplicar uma migration curta com:

```sql
GRANT EXECUTE ON FUNCTION public.assert_module_in_scope(uuid) TO authenticated;
```

Não precisa mexer na interface agora, porque o toast já revelou a causa exata.