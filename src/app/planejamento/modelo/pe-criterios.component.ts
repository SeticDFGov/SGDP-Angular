import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, from, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import {
  PeCampoModelo, PeConfigCampo, PeModelo, PeNivel, PeOpcaoModelo, PePassoModelo, PeSecaoModelo
} from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeHistoricoComponent } from '../shared/pe-historico.component';
import { PeOpcoesEditorComponent } from '../shared/pe-opcoes-editor.component';
import { modeloOrdenado, situacaoNoNivel } from '../shared/pe-modelo-arvore';
import { juntar, rotuloSituacao } from '../shared/pe-modelo-rotulos';
import { mensagemErroPe } from '../shared/pe-erros';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

type CalculoPrioridade = 'produto' | 'soma_ponderada';

/** Campo calculado que ordena as necessidades, com a seção e o passo onde ele está. */
interface AlvoPrioridade {
  campo: PeCampoModelo;
  secao: PeSecaoModelo;
  passo: PePassoModelo | null;
}

/** Um critério na tela: um campo da mesma seção (número ou lista com valores numéricos). */
interface LinhaCriterio {
  campo: PeCampoModelo;
  entra: boolean;
  peso: number | null;
  rotulo: string;
  ajuda: string;
  min: number | null;
  max: number | null;
}

/** Tamanhos que a tela aceita (o servidor confere de novo). */
const MAX_ROTULO = 200;
const MAX_AJUDA = 2000;

/**
 * Critérios de priorização (passo 1.3 do administrador do módulo; atividades 3.1
 * e 3.2 do Guia de PDTIC): edita o campo calculado que ordena as necessidades de
 * TIC (quais campos entram, os pesos e o cálculo, produto ou soma ponderada) e os
 * campos de critério (nome, o que mede e a escala). O padrão é a matriz GUT
 * (gravidade, urgência e tendência, de 1 a 5, multiplicadas).
 *
 * Mudanças ficam na tela até "Salvar os critérios"; o critério novo é criado na
 * hora (nasce desligado em todos os níveis: o editor do modelo liga). A situação
 * de cada critério nos níveis aparece aqui e muda no editor do modelo.
 */
@Component({
  selector: 'app-pe-criterios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, PeHistoricoComponent, PeOpcoesEditorComponent],
  templateUrl: './pe-criterios.component.html'
})
export class PeCriteriosComponent implements OnInit {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly notificacoes = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly maxRotulo = MAX_ROTULO;
  readonly maxAjuda = MAX_AJUDA;

  pode: boolean | null = null;
  erroPapel = false;
  private iniciado = false;

  modelo: PeModelo | null = null;
  niveis: PeNivel[] = [];
  carregando = false;
  erroCarga = false;

  alvos: AlvoPrioridade[] = [];
  alvoId: number | null = null;
  calculo: CalculoPrioridade = 'produto';
  ajudaPrioridade = '';
  criterios: LinhaCriterio[] = [];
  private retrato = '';
  tentou = false;
  salvando = false;
  historicoAberto = false;

  // Critério novo
  novoAberto = false;
  novoRotulo = '';
  novaAjuda = '';
  novoMin: number | null = 1;
  novoMax: number | null = 5;
  tentouNovo = false;
  criando = false;

  ngOnInit(): void {
    this.estadoService.estado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(estado => {
        if (!estado || estado.carga !== 'pronta') return;
        this.pode = this.estadoService.podeConfigurar;
        this.erroPapel = estado.consultaPapel === 'erro';
        if (this.pode && !this.iniciado) {
          this.iniciado = true;
          this.carregar();
        }
      });
  }

  tentarDeNovo(): void {
    this.estadoService.iniciar();
  }

  carregar(depois?: () => void): void {
    this.carregando = true;
    this.erroCarga = false;
    this.modeloService.modelo().subscribe({
      next: bruto => {
        this.modelo = modeloOrdenado(bruto);
        this.niveis = this.modelo.Niveis;
        this.alvos = this.acharAlvos(this.modelo);
        if (!this.alvos.some(a => a.campo.Id === this.alvoId)) this.alvoId = this.alvoPreferido()?.campo.Id ?? null;
        this.montarFormulario();
        this.carregando = false;
        depois?.();
      },
      error: () => {
        this.carregando = false;
        this.erroCarga = true;
      }
    });
  }

  /** Campos calculados por produto ou soma ponderada: os que ordenam registros por prioridade. */
  private acharAlvos(modelo: PeModelo): AlvoPrioridade[] {
    const alvos: AlvoPrioridade[] = [];
    const olhar = (secao: PeSecaoModelo, passo: PePassoModelo | null) => {
      if (secao.Excluido) return;
      for (const campo of secao.Campos) {
        const calculo = campo.Config?.calculo;
        if (!campo.Excluido && campo.Tipo === 'calculado' && (calculo === 'produto' || calculo === 'soma_ponderada')) {
          alvos.push({ campo, secao, passo });
        }
      }
    };
    for (const etapa of modelo.Etapas) {
      for (const passo of etapa.Passos) {
        if (!passo.Excluido) passo.Secoes.forEach(s => olhar(s, passo));
      }
    }
    modelo.SecoesForaDoPdtic.forEach(s => olhar(s, null));
    return alvos;
  }

  /** O da prioridade das necessidades, se houver mais de um. */
  private alvoPreferido(): AlvoPrioridade | null {
    return this.alvos.find(a => /priori/i.test(a.campo.Chave) || /priori/i.test(a.campo.Rotulo)) ?? this.alvos[0] ?? null;
  }

  get alvo(): AlvoPrioridade | null {
    return this.alvos.find(a => a.campo.Id === this.alvoId) ?? null;
  }

  /** Com mudança não salva a lista fica desligada (a tela diz para salvar ou desfazer antes). */
  trocarAlvo(id: number): void {
    this.alvoId = id;
    this.montarFormulario();
  }

  private montarFormulario(): void {
    const alvo = this.alvo;
    this.tentou = false;
    this.historicoAberto = false;
    if (!alvo) {
      this.criterios = [];
      this.retrato = '';
      return;
    }
    const config = alvo.campo.Config ?? {};
    this.calculo = config.calculo === 'soma_ponderada' ? 'soma_ponderada' : 'produto';
    this.ajudaPrioridade = alvo.campo.Ajuda ?? '';
    const escolhidos = config.campos ?? [];
    const candidatos = alvo.secao.Campos.filter(c => c.Id !== alvo.campo.Id && !c.Excluido && this.podeSerCriterio(c));
    // Os que entram no cálculo primeiro, na ordem do cálculo; depois os demais, na ordem da seção
    const ordenados = [
      ...escolhidos.map(chave => candidatos.find(c => c.Chave === chave)).filter((c): c is PeCampoModelo => !!c),
      ...candidatos.filter(c => !escolhidos.includes(c.Chave))
    ];
    this.criterios = ordenados.map(campo => ({
      campo,
      entra: escolhidos.includes(campo.Chave),
      peso: config.pesos?.[campo.Chave] ?? 1,
      rotulo: campo.Rotulo,
      ajuda: campo.Ajuda ?? '',
      min: typeof campo.Config?.min === 'number' ? campo.Config.min : null,
      max: typeof campo.Config?.max === 'number' ? campo.Config.max : null
    }));
    this.retrato = this.fotografar();
  }

  /** Número, ou lista com valores numéricos (escala com rótulos, como "1: sem gravidade"). */
  private podeSerCriterio(campo: PeCampoModelo): boolean {
    if (campo.Tipo === 'numero') return true;
    if (campo.Tipo !== 'lista') return false;
    const ativas = campo.Opcoes.filter(o => o.Ativa);
    return ativas.length > 0 && ativas.every(o => o.Valor.trim() !== '' && !Number.isNaN(Number(o.Valor)));
  }

  private fotografar(): string {
    return JSON.stringify({
      calculo: this.calculo,
      ajuda: this.ajudaPrioridade.trim(),
      criterios: this.criterios.map(c => [c.campo.Id, c.entra, c.peso, c.rotulo.trim(), c.ajuda.trim(), c.min, c.max])
    });
  }

  get alterado(): boolean {
    return !!this.alvo && this.fotografar() !== this.retrato;
  }

  desfazer(): void {
    this.montarFormulario();
  }

  /** Guarda de rota: mudança não salva pergunta antes de sair. */
  podeSair(): boolean {
    return !this.alterado || confirm('Há mudanças nos critérios que ainda não foram salvas. Sair assim mesmo? Elas vão se perder.');
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  get escolhidos(): LinhaCriterio[] {
    return this.criterios.filter(c => c.entra);
  }

  /** "Gravidade × Urgência × Tendência" ou "Gravidade × 2 + Urgência × 1". */
  get formula(): string {
    const nomes = this.escolhidos.map(c => c.rotulo.trim() || c.campo.Rotulo);
    if (!nomes.length) return 'nenhum critério escolhido';
    if (this.calculo === 'produto') return nomes.join(' × ');
    return this.escolhidos.map((c, i) => `${nomes[i]} × ${c.peso ?? 1}`).join(' + ');
  }

  /** Faixa do resultado, quando todos os critérios escolhidos são números com escala. */
  get faixa(): string | null {
    const c = this.escolhidos;
    if (!c.length || c.some(x => x.campo.Tipo !== 'numero' || x.min === null || x.max === null)) return null;
    const conta = (lado: 'min' | 'max') => this.calculo === 'produto'
      ? c.reduce((t, x) => t * (x[lado] as number), 1)
      : c.reduce((t, x) => t + (x[lado] as number) * (x.peso ?? 1), 0);
    const formatar = (n: number) => Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return `vai de ${formatar(conta('min'))} a ${formatar(conta('max'))}`;
  }

  /** "Básico: desligado · Intermediário: obrigatório" (a situação muda no editor do modelo). */
  situacoes(campo: PeCampoModelo): string {
    if (campo.SituacaoGeral) return rotuloSituacao(campo.SituacaoGeral);
    return this.niveis.map(n => `${n.Nome}: ${rotuloSituacao(situacaoNoNivel(campo, n.Id)).toLowerCase()}`).join(' · ');
  }

  opcoesAtivas(campo: PeCampoModelo): string {
    return juntar(campo.Opcoes.filter(o => o.Ativa).map(o => `${o.Valor} (${o.Rotulo})`));
  }

  opcoesMudaram(linha: LinhaCriterio, opcoes: PeOpcaoModelo[]): void {
    linha.campo.Opcoes = opcoes;
  }

  porId(_: number, c: LinhaCriterio): number {
    return c.campo.Id;
  }

  // ── Validação e gravação ──────────────────────────────────────────────────

  get erros(): string[] {
    if (!this.tentou) return [];
    const erros: string[] = [];
    if (this.escolhidos.length < 2) erros.push('Marque ao menos dois critérios para entrar no cálculo.');
    for (const c of this.criterios) {
      const nome = c.rotulo.trim() || c.campo.Rotulo;
      if (!c.rotulo.trim()) erros.push(`Escreva o nome do critério "${c.campo.Rotulo}".`);
      if (!c.entra || c.campo.Tipo !== 'numero') continue;
      if (c.min === null || c.max === null) erros.push(`Diga a escala de "${nome}": o menor e o maior valor.`);
      else if (c.min >= c.max) erros.push(`Na escala de "${nome}", o menor valor precisa ser menor que o maior.`);
      if (this.calculo === 'soma_ponderada' && (c.peso === null || c.peso <= 0)) erros.push(`Dê um peso maior que zero a "${nome}".`);
    }
    return erros;
  }

  salvar(): void {
    const alvo = this.alvo;
    if (!alvo || this.salvando) return;
    this.tentou = true;
    if (this.erros.length) return;

    const escolhidos = this.escolhidos;
    const configCalculo: PeConfigCampo = {
      ...(alvo.campo.Config ?? {}),
      calculo: this.calculo,
      campos: escolhidos.map(c => c.campo.Chave),
      pesos: this.calculo === 'soma_ponderada'
        ? Object.fromEntries(escolhidos.map(c => [c.campo.Chave, c.peso ?? 1]))
        : null
    };
    if (configCalculo.pesos === null) delete configCalculo.pesos;

    // Primeiro os critérios mudados (nome, ajuda e escala); por último o cálculo
    const pedidos: { nome: string; pedido: Observable<unknown> }[] = [];
    for (const c of this.criterios) {
      const rotulo = c.rotulo.trim();
      const ajuda = c.ajuda.trim() || null;
      const escalaMudou = c.campo.Tipo === 'numero' && (c.min !== (c.campo.Config?.min ?? null) || c.max !== (c.campo.Config?.max ?? null));
      if (rotulo === c.campo.Rotulo && ajuda === (c.campo.Ajuda ?? null) && !escalaMudou) continue;
      const config: PeConfigCampo = { ...(c.campo.Config ?? {}) };
      if (c.campo.Tipo === 'numero') {
        config.min = c.min;
        config.max = c.max;
      }
      pedidos.push({
        nome: rotulo,
        pedido: this.modeloService.atualizarCampo(c.campo.Id, {
          Rotulo: rotulo, Ajuda: ajuda, Tipo: c.campo.Tipo, Config: config,
          Largura: c.campo.Largura, NoDocumento: c.campo.NoDocumento, NaPlanilha: c.campo.NaPlanilha
        })
      });
    }
    pedidos.push({
      nome: alvo.campo.Rotulo,
      pedido: this.modeloService.atualizarCampo(alvo.campo.Id, {
        Rotulo: alvo.campo.Rotulo, Ajuda: this.ajudaPrioridade.trim() || null, Tipo: 'calculado', Config: configCalculo,
        Largura: alvo.campo.Largura, NoDocumento: alvo.campo.NoDocumento, NaPlanilha: alvo.campo.NaPlanilha
      })
    });

    this.salvando = true;
    const resultados: { nome: string; erro?: string | null }[] = [];
    // Um a um, na ordem; os resultados são juntados aqui (sem toArray, que traria mais código ao pacote inicial)
    from(pedidos).pipe(
      concatMap(p => p.pedido.pipe(
        map((): { nome: string; erro?: string | null } => ({ nome: p.nome })),
        catchError(erro => of({ nome: p.nome, erro: mensagemErroPe(erro, 'erro no servidor') }))
      ))
    ).subscribe({
      next: resultado => resultados.push(resultado),
      complete: () => {
        this.salvando = false;
        const falhas = resultados.filter(r => r.erro !== undefined);
        if (!falhas.length) {
          this.notificacoes.success('Critérios salvos. A prioridade das necessidades passa a ser calculada assim para todos os órgãos.');
        } else {
          const comMensagem = falhas.filter(f => f.erro);
          if (comMensagem.length) {
            this.notificacoes.error('Parte dos critérios não foi salva: ' + comMensagem.map(f => `${f.nome} (${f.erro})`).join('; ') + '. Confira e tente de novo.');
          }
        }
        // Recarrega o que o servidor gravou (inclusive o que deu certo antes da falha)
        this.carregar();
      }
    });
  }

  // ── Critério novo ─────────────────────────────────────────────────────────

  abrirNovo(): void {
    // Criar recarrega o modelo: o que foi mudado e não salvo se perderia
    if (this.alterado) {
      this.notificacoes.warning('Salve ou desfaça as mudanças nos critérios antes de criar um critério novo.');
      return;
    }
    this.novoAberto = true;
    this.novoRotulo = '';
    this.novaAjuda = '';
    this.novoMin = 1;
    this.novoMax = 5;
    this.tentouNovo = false;
  }

  get errosNovo(): string[] {
    if (!this.tentouNovo) return [];
    const erros: string[] = [];
    const rotulo = this.novoRotulo.trim();
    if (!rotulo) erros.push('Escreva o nome do critério.');
    else if (this.alvo?.secao.Campos.some(c => !c.Excluido && c.Rotulo.trim().toLowerCase() === rotulo.toLowerCase())) {
      erros.push('Já existe um campo com esse nome nesta seção.');
    }
    if (this.novoMin === null || this.novoMax === null) erros.push('Diga o menor e o maior valor da escala.');
    else if (this.novoMin >= this.novoMax) erros.push('O menor valor da escala precisa ser menor que o maior.');
    return erros;
  }

  criarCriterio(): void {
    const alvo = this.alvo;
    if (!alvo || this.criando) return;
    this.tentouNovo = true;
    if (this.errosNovo.length) return;
    this.criando = true;
    const rotulo = this.novoRotulo.trim();
    this.modeloService.criarCampo({
      SecaoId: alvo.secao.Id, Rotulo: rotulo, Ajuda: this.novaAjuda.trim() || null, Tipo: 'numero',
      Config: { min: this.novoMin, max: this.novoMax, casas: 0 }
    }).subscribe({
      next: criado => {
        this.criando = false;
        this.novoAberto = false;
        // O critério novo entra na lista, marcado; o cálculo só muda quando a pessoa salvar
        this.carregar(() => {
          const linha = this.criterios.find(c => c.campo.Id === criado?.Id);
          if (linha) linha.entra = true;
        });
        this.notificacoes.success(`Critério "${rotulo}" criado. Ele entra no cálculo quando você salvar os critérios. Ele nasce desligado em todos os níveis: ligue nos níveis no editor do modelo.`);
      },
      error: erro => {
        this.criando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível criar o critério. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }
}
