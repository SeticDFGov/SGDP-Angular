import { DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Cada área do PGIA mostra um formulário por vez, e a seção vem do parâmetro
 * da rota (`.../sgdi/:secao`).
 *
 * Uma rota só, com parâmetro, é o desenho canônico aqui: com N rotas irmãs
 * apontando para o mesmo componente, trocar de seção destruiria e recriaria o
 * componente, e o `ngOnInit` refaria todas as chamadas da área a cada clique.
 * Com o parâmetro, o Angular reaproveita a instância e só o campo `secao` muda.
 *
 * Chamar no construtor do componente (contexto de injeção). A lista de seções
 * válidas vem de `data.secoes`, definida nas rotas; seção desconhecida
 * redireciona para a primeira, sem sujar o histórico.
 */
export function acompanharSecao(aplicar: (secao: string) => void): void {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);

  const inscricao = route.paramMap.subscribe(parametros => {
    const dados = route.snapshot.data;
    const secoes = (dados['secoes'] as string[] | undefined) ?? [];
    const base = (dados['base'] as string | undefined) ?? '';
    const pedida = parametros.get('secao') ?? '';

    if (secoes.includes(pedida)) {
      aplicar(pedida);
      return;
    }

    if (secoes.length > 0 && base) {
      router.navigate([base, secoes[0]], { replaceUrl: true });
    }
  });

  destroyRef.onDestroy(() => inscricao.unsubscribe());
}
