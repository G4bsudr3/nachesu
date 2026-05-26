# por que está errado

`useActiveEletiva` guarda a slug ativa em `localStorage` + `useState` **por instância**. Como o hook é chamado em vários lugares (`AppDashboard`, `EletivaSwitcher`, `EletivaCard`, `Trilhas`, `Modulo`, `HubMateriais`, `useEletivaExtras` etc.), cada um tem seu próprio `useState`. Quando o `EletivaSwitcher` chama `setSlug(...)`:

- localStorage atualiza ✅
- estado do próprio switcher atualiza ✅
- estado das **outras** instâncias (incluindo `AppDashboard` que escolhe `activeEnrollment` e renderiza o `EletivaCard`) **não atualiza** ❌

O listener de `storage` só dispara entre abas diferentes, não na mesma aba. Resultado: o pill visual muda, mas `activeCourseId` no dashboard fica preso na slug carregada na montagem inicial. O card mostra o módulo da eletiva "antiga", criando a impressão de conteúdo trocado/errado.

# correção

Transformar `useActiveEletiva` em um **store global leve** com pub/sub no escopo do módulo, sem trocar a API pública.

```text
useActiveEletiva.ts
 ├─ slug em variável de módulo (single source)
 ├─ Set<listener> que cada hook assina no mount
 ├─ setSlug() → escreve localStorage + atualiza var + notifica todos
 └─ useState + useEffect(subscribe) por consumidor
```

Opcionalmente usar `useSyncExternalStore` (React 18) que faz exatamente isso de forma idiomática e suporta SSR.

# passos

1. Reescrever `src/hooks/useActiveEletiva.ts`:
   - Variável `currentSlug` no escopo do módulo, inicializada por `localStorage.getItem(KEY)`.
   - `subscribe(cb)` adicionando a um `Set`; `getSnapshot()` retornando `currentSlug`.
   - `setActiveSlug(next)` grava localStorage, atualiza `currentSlug`, notifica listeners.
   - Hook usa `useSyncExternalStore(subscribe, getSnapshot, () => null)`.
   - Mantém listener de `storage` para sincronizar abas externas (atualiza `currentSlug` e notifica).
   - API exportada continua `{ slug, setSlug }` para não tocar nos consumidores.

2. Validar manualmente:
   - Logar em conta com 2 matrículas, alternar pills no switcher e confirmar que `EletivaCard`, `WeekCadenceStrip`, `useEletivaExtras` e título mudam instantaneamente.
   - Navegar `/app/trilhas` e `/app/eletiva/:slug` para garantir que continuam coerentes.
   - Recarregar a página: slug ativa persiste.

# fora de escopo

- Não mexer em consumidores nem na lógica de fallback do `AppDashboard`.
- Sem mudanças de schema, rotas ou UI.
- Mantém localStorage como persistência (sem Zustand/Context novo).
