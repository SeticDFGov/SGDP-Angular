# CLAUDE.md — SGDP-Angular (front Angular 20)

Front do SGDP, sistema em **produção** da SUBGD/GDF. Angular 20 **standalone** (sem NgModules) + SSR (`@angular/ssr` + Express) + Tailwind CSS 4 + Material Icons. Sem biblioteca de componentes. O módulo PGIA (Decreto nº 48.901/2026) entra como área `/pgia` aditiva. Especificações na pasta pai: `analise_integracao_pgia_sgdp.md` (manda em caso de dúvida), `formulario_decreto_48901.md` e `mock_formulario_pgia.html` (**o mock é a especificação de UI/UX: telas, textos em linguagem simples e lógica condicional devem ser reproduzidos**).

## Regras invioláveis (sistema em produção)

1. **Guards: só as mudanças autorizadas pelo usuário.**
   - `src/app/auth/guards/auth-guard.ts`: (a) o redirecionamento forçado de `centralit`/`parceiro` **não dispara** quando `state.url` começa com `/pgia`; (b) **confinamento autorizado na fase 1**: perfil `basico` **com** `PapelPgia` é redirecionado para `/pgia` fora dessa área (mesmo padrão de centralit/parceiro; pedido explícito do usuário — a sidebar esconde Dashboard/Demandas para ele via `soPgia`). Nada além disso.
   - `src/app/auth/guards/user-configured.guard.ts`: usuário configurado = tem unidade **e** (perfil ≠ `basico` **ou** `PapelPgia` preenchido). Nada além disso.
   - Os demais guards existentes (`admin`, `centralit`, `parceiro`) não mudam.
2. Papéis PGIA **não** são perfis nem roles do Keycloak: chegam no campo `PapelPgia` do `GET /api/Auth/me` (`pgia_orgao`, `pgia_sgdi`, `pgia_cgtic`, `pgia_auditoria` ou `null`). O perfil `admin` do SGDP tem acesso total ao PGIA. A checagem de permissão no front é **usabilidade**; a autorização real é do backend.
3. Rota pública (`/transparencia-ia`) somente na fase 5, fora do MainLayout e sem guard.
4. **Sem dependências novas** salvo estritamente necessário e justificado.

## Convenções

- Componentes standalone, `imports` explícitos (`CommonModule`, `FormsModule`, `RouterModule`).
- Serviços por feature no padrão do `src/app/projeto/etapa/etapa.service.ts`: `SERVICE_API_URL` (de `src/api/consts.ts`), header `Authorization` via `AuthService.getToken()`, métodos retornando `Observable`.
- Tipos da API em `src/api/<contexto>/interface.ts`, **PascalCase espelhando os DTOs** (a API serializa PascalCase). Tipos PGIA em `src/api/pgia/interface.ts`.
- Estado de auth: `AuthService` (`src/app/auth/services/auth.ts`) guarda `token`/`refreshToken`/`user` no `localStorage`; **todo acesso a `localStorage` protegido por `isPlatformBrowser`** (SSR quebra sem isso). `authInterceptor` injeta Bearer e faz refresh em 401.
- Feedback ao usuário: `NotificationService` (`src/app/core/services/notification.service.ts`) — `success`/`error`/`warning`/`info`.
- Visual: Tailwind puro seguindo o restante — cards brancos `bg-white rounded-lg shadow p-6`, sidebar escura (`src/app/projeto/components/sidebar/`), botões azuis `bg-blue-600`, Material Icons via `<span class="material-icons">`.
- Rotas com dado dinâmico: `data: { prerender: false }` (padrão de `demandas/:id/entregaveis`). `angular.json` tem `prerender: false` e `app.routes.server.ts` usa `RenderMode.Prerender` em `**`.
- Textos das telas PGIA: **idênticos aos do `mock_formulario_pgia.html`** (linguagem simples: frases curtas, voz ativa, siglas explicadas na primeira ocorrência). Adaptações só onde a arquitetura difere do mock (ex.: pessoas vêm do login Keycloak, não de cadastro livre) — registrar a adaptação no resumo da fase.

## Estrutura PGIA

```
src/api/pgia/interface.ts        tipos PascalCase
src/app/pgia/
  pgia.routes.ts                 lazy, montada como filha do MainLayout em app.routes.ts
  guards/pgia.guard.ts           entra quem tem PapelPgia ou é admin; senão redireciona '/'
  services/*.service.ts          padrão EtapaService
  orgao/                         telas do órgão (etapas do formulário, conforme o mock)
  ...                            sgdi/, cgtic/, auditoria/, publico/ nas fases seguintes
```

- Sidebar: item "Governança de IA" visível só para quem tem `PapelPgia` ou é `admin`.
- Tela de admin (`src/app/admin/`): seção PGIA para atribuir papel (`PUT api/pgia/admin/papel`) e cadastrar órgãos (`api/pgia/admin/orgao`), vinculando o órgão a uma `Unidade`.
- `UserProfile` (`src/api/auth/interface.ts`) tem `PapelPgia?: string | null` (opcional, aditivo); `AuthService` ganhou métodos novos (`getPapelPgia()`, `canAccessPgia()`) sem alterar os existentes.

## Build e verificação

- `npm install` (Node 24 disponível); build de produção com SSR: `npx ng build` (baseline: exit 0; warnings pré-existentes de imports não usados e budget inicial 643 kB — o erro de budget só em 1 MB; não piorar o bundle inicial: PGIA é lazy).
- Regressão manual mínima a cada fase: login e navegação dos cinco perfis atuais (`admin`, `gestor`, `centralit`, `parceiro`, `basico`) — dashboards, demandas, redirecionamentos forçados e `pending-approval` idênticos ao comportamento atual fora de `/pgia`.

## Estado por fase (atualizar ao encerrar cada fase)

- **Fase 0 (fundação e papéis): implementada, aguardando revisão do usuário.** Ajustes dos 2 guards; `isUserFullyConfigured()` do `AuthService` alinhado à mesma definição (o fluxo de login usa esse método — sem isso o Responsável de IA com perfil `basico` ficaria preso no `/pending-approval`); `pgia.guard.ts`; rota lazy `/pgia` (filha do MainLayout); item "Governança de IA" na sidebar (papel PGIA ou admin); telas da etapa 1 e painel de prazos; seção PGIA no admin (papéis + órgãos + vínculo de unidade). Detalhes que importam nas próximas fases: datas puras (`DateOnly` como string) usam `| date:'dd/MM/yyyy':'UTC'` para não deslocar um dia no fuso; papéis somente-leitura (cgtic) escondem os botões de salvar; papel `pgia_auditoria` vê banner "área na fase futura" e os componentes evitam os GETs que o backend nega (403 dispara redirect do interceptor); adaptação registrada do mock: pessoas não são criadas na tela — entram pelo primeiro acesso via Keycloak e a tela só completa matrícula/cargo/vínculo (`pgia_agente_info`).
- **Fase 1 (inventário e classificação de risco): implementada, aguardando revisão do usuário.** Confinamento do usuário `basico`+papel a `/pgia` (autorizado; ver regra 1); tela `/pgia/sistemas` (etapa 2 do mock: formulário completo com condicionais, checklist dos arts. 15–17 com prévia de risco, badges, "Carregar mais" na lista, scroll pós-salvamento); abas da etapa 1 viraram routerLinks (+ item "Prazos"); cadastro bloqueado com aviso quando o órgão não tem Responsável de IA vigente; conflito Excessivo×fase em uso barrado no front com mensagem específica. Rótulos de select seguem o mock ("Instrumento vigente em revisão (art. 37)") com `[value]` do domínio sem sufixo.
- **Ajustes de desenho da chefia (pós-fase 1, aplicados):** abas renomeadas — "Informações do Órgão Responsável", "Inventário dos sistemas de IA e classificação de riscos", "Report de incidentes" (futura), "Prazos" — via componente compartilhado `pgia-abas` (itens "Governança (SGDI)" e "CGTIC" visíveis por papel); questionário de classificação **desagrupado e sem feedback** ao preenchedor (lista única embaralhada de `sistemas/quesitos.ts`, sem badge/consequência/blocos por risco; supervisão/aviso/identificador sempre visíveis com labels neutras); origem "Outros" + descritivo; tecnologia com exemplos leigos (rótulo ≠ valor de domínio); toast de salvar neutro. A transparência dos grupos/pesos/pontuação (`PESOS_QUESITOS`) é das telas SGDI/CGTIC (`pgia-checklist-aberto`).
- **Fase 2 (governança central): implementada.** Páginas `/pgia/sgdi` (fila de homologação com questionário aberto + aprovar/vetar com parecer, plataformas, Registro Público, publicação/vínculo de AIA, normas, autorizações) e `/pgia/cgtic` (casos delegados + deliberações com rótulos do mock); órgão vê badge de `SituacaoHomologacao` + parecer e a seção de AIA por sistema de Alto Risco; papéis sem acesso às páginas centrais veem aviso sem disparar GETs (evita 403→redirect do interceptor).
- **Fase 3 (operação contínua): implementada.** Aba "Report de incidentes" ativa (aviso do agente → comunicação formal → apuração na SGDI, com textos do mock); páginas `/pgia/uso` e `/pgia/capacitacao`; seção de não conformidades no órgão e na SGDI. **Art. 13 sem papel**: o `pgia.guard.ts` (guard do módulo — os dois guards protegidos seguem intactos) libera `/pgia/uso` e `/pgia/incidentes` a qualquer autenticado; a sidebar mostra "Registrar uso de IA" para quem não tem papel; essas telas usam só `uso/fontes` (nunca os GETs que o backend nega a quem não tem papel) e a `pgia-abas` para sem-papel mostra só as duas entradas do art. 13. Instantes (`datetime-local`) exibem sem `:'UTC'`; truncar em 16 chars ao pré-preencher `datetime-local`.
- **Fase 4 (contratações, relatórios e auditorias): implementada.** Páginas `/pgia/contratacoes` (contratos com condicionais do art. 25 espelhadas + mini-registro de metadados de homologação p/ Risco Moderado; triagem de legados), `/pgia/relatorios` (indicadores, semestrais com conteúdo agregado e **download de PDF** via blob em handler de clique) e `/pgia/auditoria` (área real da auditoria externa, textos do mock; abas dela: só uso + auditorias); SGDI ganhou painel de semestrais, Relatório Anual e gestão de auditorias com designação de auditor. POSTs da fase seguem `orgao/{id}/recurso` (bug de rota corrigido — conferir contra o controller antes de criar métodos novos).
- **Fase 5 (transparência pública): implementada — módulo completo.** Rota top-level `/transparencia-ia` (lazy `loadComponent`, fora do MainLayout, sem guard; `PgiaPublicoService` sem `AuthService` — SSR-safe e anônimo de verdade): contexto do cidadão do mock, Registro Público paginado, pedido com protocolo real na caixa verde do mock e acompanhamento por protocolo; página `/pgia/solicitacoes` para o órgão responder (art. 23) com aba própria.
- **Revisão da fase 5 (correções aplicadas):** `DataAbertura`/`DataResposta` são instantes — exibição SEM `:'UTC'` (a convenção vale: só data pura usa `:'UTC'`); consulta de protocolo distingue 404 ("não encontramos") de falha de rede/servidor ("não foi possível consultar"); "Carregar mais" com erro mostra mensagem; rota `/auth/local` com `canMatch: !environment.production` (em produção a rota nem casa); placeholder do protocolo com o sufixo novo (`PGIA-2026-000000-ABCD`).
- **MODO LOCAL (sem Keycloak, só testes):** `/auth/local` (lazy) — personas prontas + formulário livre; `AuthService.loginLocal()` (aditivo) usa `api/authlocal/token` e segue o pipeline normal do `/me`; link na tela de login só quando `!environment.production`. Roteiro em `EXECUTAR-LOCAL.md` (raiz do repositório SGDP-Service).
