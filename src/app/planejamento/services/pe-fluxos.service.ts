import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SERVICE_API_URL } from '../../../api/consts';
import {
  PeFluxoDefinicao, PeFluxoDesenhoForm, PeFluxoDoOrgao, PeFluxoForm, PeFluxoGeometria, PeFluxoGeometriaForm, PeFluxoModelo,
  PeFluxoResumo, PePdtic, PeRegistro, PeRegistrosDaSecao
} from '../../../api/planejamento/interface';
import {
  DicionarioFluxo, SECAO_DICIONARIO_NOMES, dicionarioDoRegistro, dicionarioPadrao, normalizarDefinicao
} from '../shared/pe-fluxo-rotulos';

/** Um fluxo na lista para escolher (cópia do órgão ou modelo do guia). */
export interface PeFluxoItem {
  Chave: string;
  Nome: string;
  FiguraGuia: string | null;
  /** Só na cópia do órgão: o órgão adaptou o fluxo. Null no modelo. */
  Personalizado: boolean | null;
  ModeloMudou: boolean;
  AlteradoEm: string | null;
  AlteradoPor: string | null;
}

/** Um fluxo aberto no editor. */
export interface PeFluxoAberto {
  Chave: string;
  Nome: string;
  FiguraGuia: string | null;
  Definicao: PeFluxoDefinicao;
  Personalizado: boolean | null;
  ModeloMudou: boolean;
  PodeEditar: boolean;
}

/**
 * O que o editor de fluxos usa para ler, gravar e desenhar, sem saber quem é o
 * dono: a cópia do órgão (PDTIC) ou o modelo do guia (administrador do módulo).
 * Cada tela monta a sua com `PeFluxosService.fonteDoPdtic` ou `fonteDoModelo`.
 */
export interface PeFonteFluxos {
  /** Mudou a chave (outro PDTIC, outra situação, outra permissão), o editor carrega de novo. */
  readonly chave: string;
  readonly modo: 'orgao' | 'modelo';
  readonly pdticId: number | null;
  listar(): Observable<PeFluxoItem[]>;
  abrir(chave: string): Observable<PeFluxoAberto>;
  salvar(chave: string, form: PeFluxoForm): Observable<PeFluxoAberto>;
  /** Volta ao modelo do guia (só a cópia do órgão; null no modelo). */
  restaurar(chave: string): Observable<PeFluxoAberto> | null;
  /** O desenho (SVG) de uma definição ainda não salva; valida antes (400 com os `Erros`). */
  desenhar(definicao: PeFluxoDefinicao): Observable<string>;
  /**
   * A geometria do desenho automático de uma definição ainda não salva (E9, o
   * editor visual), com o nome do fluxo (a faixa do fluxo à esquerda, como no
   * PDF): não recusa definição incompleta, os problemas vêm em `Erros`.
   */
  geometria(definicao: PeFluxoDefinicao, nome: string | null): Observable<PeFluxoGeometria>;
  /** A geometria do que está salvo. */
  geometriaSalva(chave: string): Observable<PeFluxoGeometria>;
  /** O desenho do que está salvo. */
  desenhoSalvo(chave: string): Observable<string>;
  /** O desenho do modelo do guia, para comparar. */
  desenhoDoModelo(chave: string): Observable<string>;
  /** O modelo do guia, para comparar (null se não achar). */
  modeloDoGuia(chave: string): Observable<PeFluxoModelo | null>;
  /** Os nomes do dicionário: no PDTIC, os do órgão; no modelo, os padrão do guia. */
  dicionario(): Observable<DicionarioFluxo>;
}

function doOrgaoParaAberto(f: PeFluxoDoOrgao): PeFluxoAberto {
  return {
    Chave: f.Chave,
    Nome: f.Nome ?? '',
    FiguraGuia: f.FiguraGuia ?? null,
    Definicao: normalizarDefinicao(f.Definicao),
    Personalizado: !!f.Personalizado,
    ModeloMudou: !!f.ModeloMudou,
    PodeEditar: !!f.PodeEditar
  };
}

function modeloParaAberto(m: PeFluxoModelo, podeEditar: boolean): PeFluxoAberto {
  return {
    Chave: m.Chave,
    Nome: m.Nome ?? '',
    FiguraGuia: m.FiguraGuia ?? null,
    Definicao: normalizarDefinicao(m.Definicao),
    Personalizado: null,
    ModeloMudou: false,
    PodeEditar: podeEditar
  };
}

function modelosEmOrdem(lista: PeFluxoModelo[] | null): PeFluxoModelo[] {
  return [...(lista ?? [])].sort((a, b) => (a.Ordem ?? 0) - (b.Ordem ?? 0));
}

/**
 * Fluxos de trabalho (E6), api/planejamento: os modelos do guia (todos os papéis
 * leem; o administrador do módulo e o admin do SGDP editam), a cópia do órgão
 * (quem vê o órgão lê; a equipe do órgão edita, em elaboração ou devolvido), os
 * desenhos em SVG e a sugestão do cronograma do plano de trabalho pelos fluxos.
 * O token vai pelo interceptor; o 403 tira a pessoa do módulo.
 */
@Injectable({ providedIn: 'root' })
export class PeFluxosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${SERVICE_API_URL}/api/planejamento`;

  private baseModelo(chave?: string): string {
    return chave ? `${this.apiUrl}/modelo/fluxos/${encodeURIComponent(chave)}` : `${this.apiUrl}/modelo/fluxos`;
  }

  private basePdtic(pdticId: number, chave?: string): string {
    const base = `${this.apiUrl}/pdtic/${pdticId}/fluxos`;
    return chave ? `${base}/${encodeURIComponent(chave)}` : base;
  }

  // ── Modelos do guia ────────────────────────────────────────────────────────

  modelos(): Observable<PeFluxoModelo[]> {
    return this.http.get<PeFluxoModelo[]>(this.baseModelo()).pipe(map(modelosEmOrdem));
  }

  salvarModelo(chave: string, form: PeFluxoForm): Observable<PeFluxoModelo> {
    return this.http.put<PeFluxoModelo>(this.baseModelo(chave), form);
  }

  svgModelo(chave: string): Observable<string> {
    return this.http.get(`${this.baseModelo(chave)}/svg`, { responseType: 'text' });
  }

  // ── Cópia do órgão ─────────────────────────────────────────────────────────

  doPdtic(pdticId: number): Observable<PeFluxoResumo[]> {
    return this.http.get<PeFluxoResumo[]>(this.basePdtic(pdticId));
  }

  fluxo(pdticId: number, chave: string): Observable<PeFluxoDoOrgao> {
    return this.http.get<PeFluxoDoOrgao>(this.basePdtic(pdticId, chave));
  }

  salvar(pdticId: number, chave: string, form: PeFluxoForm): Observable<PeFluxoDoOrgao> {
    return this.http.put<PeFluxoDoOrgao>(this.basePdtic(pdticId, chave), form);
  }

  /** Volta ao modelo do guia. Sem corpo na resposta, o fluxo vem de novo pelo GET. */
  restaurar(pdticId: number, chave: string): Observable<PeFluxoDoOrgao> {
    return this.http.post<PeFluxoDoOrgao | null>(`${this.basePdtic(pdticId, chave)}/restaurar`, {}).pipe(
      switchMap(resposta => resposta && resposta.Definicao ? of(resposta) : this.fluxo(pdticId, chave))
    );
  }

  svg(pdticId: number, chave: string): Observable<string> {
    return this.http.get(`${this.basePdtic(pdticId, chave)}/svg`, { responseType: 'text' });
  }

  /** O SVG de uma definição ainda não salva (prévia ao vivo); valida antes e responde 400 com os `Erros`. */
  desenhar(definicao: PeFluxoDefinicao, pdticId: number | null): Observable<string> {
    const corpo: PeFluxoDesenhoForm = { Definicao: definicao, PdticId: pdticId };
    return this.http.post(`${this.apiUrl}/fluxos/desenho`, corpo, { responseType: 'text' });
  }

  /**
   * A geometria do desenho automático de uma definição ainda não salva (E9, o
   * editor visual, a cada mudança): com `PdticId`, os nomes das raias saem do
   * dicionário do órgão; com o `Nome` e duas raias ou mais, vem a faixa do fluxo.
   * Não recusa definição incompleta (os problemas vêm em `Erros`); o 400 é só
   * para definição ilegível.
   */
  geometria(definicao: PeFluxoDefinicao, pdticId: number | null, nome: string | null = null): Observable<PeFluxoGeometria> {
    const corpo: PeFluxoGeometriaForm = { Definicao: definicao, PdticId: pdticId, Nome: nome };
    return this.http.post<PeFluxoGeometria>(`${this.apiUrl}/fluxos/geometria`, corpo);
  }

  /** A geometria do fluxo salvo do órgão (com os nomes do dicionário dele). */
  geometriaDoPdtic(pdticId: number, chave: string): Observable<PeFluxoGeometria> {
    return this.http.get<PeFluxoGeometria>(`${this.basePdtic(pdticId, chave)}/geometria`);
  }

  /** A geometria do fluxo-modelo salvo (com os nomes padrão). */
  geometriaDoModelo(chave: string): Observable<PeFluxoGeometria> {
    return this.http.get<PeFluxoGeometria>(`${this.baseModelo(chave)}/geometria`);
  }

  /**
   * O dicionário de nomes do órgão (a seção `nomes` do PDTIC), para mostrar os
   * nomes das raias como o desenho mostra. Sem ele, os nomes padrão do guia.
   */
  dicionarioDoPdtic(pdticId: number): Observable<DicionarioFluxo> {
    return this.http.get<PeRegistrosDaSecao>(`${this.apiUrl}/pdtic/${pdticId}/secoes/${SECAO_DICIONARIO_NOMES}/registros`).pipe(
      map(dados => dicionarioDoRegistro(dados)),
      catchError(() => of(dicionarioPadrao()))
    );
  }

  /**
   * Cria, na seção do cronograma do plano de trabalho, uma linha por tarefa dos
   * fluxos de preparação, diagnóstico e planejamento (só com a seção vazia; senão
   * 409). Devolve os registros criados.
   */
  sugerirCronograma(pdticId: number): Observable<PeRegistro[] | null> {
    return this.http.post<PeRegistro[] | null>(`${this.apiUrl}/pdtic/${pdticId}/cronograma/sugerir`, {});
  }

  // ── Fontes do editor ───────────────────────────────────────────────────────

  /** A cópia do órgão num PDTIC (a situação e o `PodeEditar` entram na chave). */
  fonteDoPdtic(pdtic: Pick<PePdtic, 'Id' | 'Situacao' | 'PodeEditar'>): PeFonteFluxos {
    const id = pdtic.Id;
    return {
      chave: `pdtic:${id}:${pdtic.Situacao}:${pdtic.PodeEditar}`,
      modo: 'orgao',
      pdticId: id,
      listar: () => this.doPdtic(id).pipe(map(lista => (lista ?? []).map(f => ({
        Chave: f.Chave,
        Nome: f.Nome ?? '',
        FiguraGuia: f.FiguraGuia ?? null,
        Personalizado: !!f.Personalizado,
        ModeloMudou: !!f.ModeloMudou,
        AlteradoEm: f.AlteradoEm ?? null,
        AlteradoPor: f.AlteradoPor ?? null
      })))),
      abrir: chave => this.fluxo(id, chave).pipe(map(doOrgaoParaAberto)),
      salvar: (chave, form) => this.salvar(id, chave, form).pipe(map(doOrgaoParaAberto)),
      restaurar: chave => this.restaurar(id, chave).pipe(map(doOrgaoParaAberto)),
      desenhar: definicao => this.desenhar(definicao, id),
      geometria: (definicao, nome) => this.geometria(definicao, id, nome),
      geometriaSalva: chave => this.geometriaDoPdtic(id, chave),
      desenhoSalvo: chave => this.svg(id, chave),
      desenhoDoModelo: chave => this.svgModelo(chave),
      modeloDoGuia: chave => this.modelos().pipe(map(lista => lista.find(m => m.Chave === chave) ?? null)),
      dicionario: () => this.dicionarioDoPdtic(id)
    };
  }

  /** Os modelos do guia (tela do administrador do módulo). */
  fonteDoModelo(podeEditar: boolean): PeFonteFluxos {
    const abrir = (chave: string) => this.modelos().pipe(map(lista => {
      const modelo = lista.find(m => m.Chave === chave);
      if (!modelo) throw new Error('Fluxo não encontrado.');
      return modeloParaAberto(modelo, podeEditar);
    }));
    return {
      chave: `modelo:${podeEditar}`,
      modo: 'modelo',
      pdticId: null,
      listar: () => this.modelos().pipe(map(lista => lista.map(m => ({
        Chave: m.Chave,
        Nome: m.Nome ?? '',
        FiguraGuia: m.FiguraGuia ?? null,
        Personalizado: null,
        ModeloMudou: false,
        AlteradoEm: null,
        AlteradoPor: null
      })))),
      abrir,
      salvar: (chave, form) => this.salvarModelo(chave, form).pipe(
        switchMap(salvo => salvo && salvo.Definicao ? of(modeloParaAberto(salvo, podeEditar)) : abrir(chave))
      ),
      restaurar: () => null,
      desenhar: definicao => this.desenhar(definicao, null),
      geometria: (definicao, nome) => this.geometria(definicao, null, nome),
      geometriaSalva: chave => this.geometriaDoModelo(chave),
      desenhoSalvo: chave => this.svgModelo(chave),
      desenhoDoModelo: chave => this.svgModelo(chave),
      modeloDoGuia: chave => this.modelos().pipe(map(lista => lista.find(m => m.Chave === chave) ?? null)),
      dicionario: () => of(dicionarioPadrao())
    };
  }
}
