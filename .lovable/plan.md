Ajustar a tipografia dos títulos (`<Heading>`) nos 6 templates de email da NachesU para espelhar exatamente a configuração `font-display` usada no app (`src/pages/Auth.tsx`):

- Fonte: League Gothic
- Peso: 400 (regular, único peso carregado no Google Fonts)
- Fallbacks: Impact, sans-serif
- Tamanho: 48px no mobile (`text-5xl`), 60px a partir de 640px (`sm:text-6xl`)
- Estilo: uppercase, line-height 1 (`leading-none`)

### O que será alterado

1. **`supabase/functions/_shared/email-templates/_chora-styles.ts`**
   - Atualizar `DISPLAY_STACK` para `"'League Gothic', Impact, sans-serif"`.
   - Atualizar o objeto `h1`:
     - `fontSize: '48px'`
     - `lineHeight: '1'`
     - `textTransform: 'uppercase'`
     - `letterSpacing: 'normal'`
     - manter `fontWeight: 400`
   - Adicionar classe CSS `.nachesu-email-h1` + media query `@media (min-width: 640px)` para elevar o tamanho para 60px no desktop.

2. **6 templates de email**
   - `signup.tsx`
   - `magic-link.tsx`
   - `recovery.tsx`
   - `invite.tsx`
   - `email-change.tsx`
   - `reauthentication.tsx`
   - Em cada um: adicionar a classe no `<Heading style={h1}>` e injetar o bloco de estilos responsivos dentro do `<Head>`, junto com o `@import` de fontes.

3. **Deploy**
   - Reimplantar a edge function `auth-email-hook` para que os templates atualizados entrem em vigor.

### Validação
- Verificar visualmente o render de pelo menos um template (magic-link ou recovery) para confirmar que o título usa League Gothic, está uppercase e respeita a escala 48px/60px.
- Confirmar que nenhum outro elemento dos templates é afetado além do título.