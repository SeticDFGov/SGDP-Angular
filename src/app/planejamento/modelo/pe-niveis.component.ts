import { AfterViewChecked, Component, DestroyRef, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { PeModelo, PeNivel, PeOrgaoNivel } from '../../../api/planejamento/interface';
import { DialogoDirective } from '../../core/acessibilidade/dialogo.directive';
import { AcessibilidadeService } from '../../core/acessibilidade/acessibilidade.service';
import { NotificationService } from '../../core/services/notification.service';
import { CitaPlanejamentoDirective } from '../shared/cita-planejamento.directive';
import { PeHistoricoComponent } from '../shared/pe-historico.component';
import { ResumoNivel, codigoDoNome, modeloOrdenado, resumoDoNivel } from '../shared/pe-modelo-arvore';
import { mensagemErroPe } from '../shared/pe-erros';
import { PeConfirmacaoService } from '../shared/pe-confirmacao.service';
import { PeModeloService } from '../services/pe-modelo.service';
import { PeOrgaosService } from '../services/pe-orgaos.service';
import { PeTrilhaEstadoService } from '../trilha/pe-trilha-estado.service';

interface EdicaoNivel {
  /** null: nível novo. */
  nivel: PeNivel | null;
  nome: string;
  descricao: string;
  tentou: boolean;
}

/** Tamanhos que a tela aceita (o servidor confere de novo). */
const MAX_NOME = 100;
const MAX_DESCRICAO = 1000;

/**
 * Níveis de maturidade (passo 1.1 do administrador do módulo): lista na ordem,
 * com o que cada nível pede (passos e campos ligados, contados no modelo) e
 * quantos órgãos estão nele; criar, renomear e descrever (janela), reordenar
 * (subir e descer) e desativar ou reativar. Nível em uso por órgão não se apaga:
 * desativado, deixa de ser oferecido, e os órgãos que estão nele continuam até o
 * administrador trocar. Só o administrador do módulo e o admin do SGDP: os
 * demais veem um aviso e a tela não faz consulta nenhuma.
 */
@Component({
  selector: 'app-pe-niveis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CitaPlanejamentoDirective, DialogoDirective, PeHistoricoComponent],
  templateUrl: './pe-niveis.component.html',
  // Elemento de bloco: o espaço vertical da pilha em volta vale para ele (em linha, o padrão, não vale)
  host: { class: 'block' }
})
export class PeNiveisComponent implements OnInit, AfterViewChecked {
  private readonly estadoService = inject(PeTrilhaEstadoService);
  private readonly modeloService = inject(PeModeloService);
  private readonly orgaosService = inject(PeOrgaosService);
  private readonly notificacoes = inject(NotificationService);
  private readonly acessibilidade = inject(AcessibilidadeService);
  private readonly confirmacao = inject(PeConfirmacaoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  /** Id do elemento que recebe o foco depois da próxima renderização (F1, A05 e A13). */
  private focoPendente: string | null = null;

  ngAfterViewChecked(): void {
    if (!this.focoPendente || !this.noNavegador) return;
    const alvo = document.getElementById(this.focoPendente);
    if (!alvo) return;
    this.focoPendente = null;
    alvo.focus();
  }

  readonly maxNome = MAX_NOME;
  readonly maxDescricao = MAX_DESCRICAO;

  pode: boolean | null = null;
  erroPapel = false;
  private iniciado = false;

  modelo: PeModelo | null = null;
  niveis: PeNivel[] = [];
  resumos = new Map<number, ResumoNivel>();
  /** Órgãos por nível (null: a lista de órgãos não veio). */
  orgaosPorNivel: Map<number, { total: number; padrao: number }> | null = null;
  carregando = false;
  erroCarga = false;

  movendo = false;
  alterandoId: number | null = null;
  edicao: EdicaoNivel | null = null;
  salvando = false;
  /** Nível com o histórico aberto. */
  historicoAberto: number | null = null;

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

  carregar(): void {
    this.carregando = true;
    this.erroCarga = false;
    forkJoin({ modelo: this.modeloService.modelo(), orgaos: this.orgaosService.listar() }).subscribe({
      next: ({ modelo, orgaos }) => {
        this.aplicarModelo(modelo);
        this.contarOrgaos(orgaos);
        this.carregando = false;
      },
      error: () => {
        // Sem os órgãos a tela ainda serve: tenta só o modelo
        this.modeloService.modelo().subscribe({
          next: modelo => {
            this.aplicarModelo(modelo);
            this.orgaosPorNivel = null;
            this.carregando = false;
          },
          error: () => {
            this.carregando = false;
            this.erroCarga = true;
          }
        });
      }
    });
  }

  private aplicarModelo(modelo: PeModelo): void {
    this.modelo = modeloOrdenado(modelo);
    this.niveis = this.modelo.Niveis;
    this.recontar();
  }

  private recontar(): void {
    this.resumos = new Map();
    if (!this.modelo) return;
    for (const nivel of this.niveis) this.resumos.set(nivel.Id, resumoDoNivel(this.modelo, nivel.Id));
  }

  private contarOrgaos(orgaos: PeOrgaoNivel[]): void {
    const mapa = new Map<number, { total: number; padrao: number }>();
    for (const o of orgaos) {
      const atual = mapa.get(o.NivelId) ?? { total: 0, padrao: 0 };
      atual.total++;
      if (o.NivelPadrao) atual.padrao++;
      mapa.set(o.NivelId, atual);
    }
    this.orgaosPorNivel = mapa;
  }

  orgaosNoNivel(nivel: PeNivel): { total: number; padrao: number } {
    return this.orgaosPorNivel?.get(nivel.Id) ?? { total: 0, padrao: 0 };
  }

  /** O nível padrão (do órgão sem nível definido) é o primeiro ativo da lista. */
  get idPadrao(): number | null {
    return this.niveis.find(n => n.Ativo)?.Id ?? null;
  }

  resumo(nivel: PeNivel): ResumoNivel {
    return this.resumos.get(nivel.Id) ?? { passosObrigatorios: 0, passosOpcionais: 0, campos: 0 };
  }

  porId(_: number, n: PeNivel): number {
    return n.Id;
  }

  // ── Ordem ─────────────────────────────────────────────────────────────────

  mover(indice: number, delta: -1 | 1): void {
    const destino = indice + delta;
    if (this.movendo || destino < 0 || destino >= this.niveis.length) return;
    const anterior = [...this.niveis];
    const nova = [...this.niveis];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
    this.niveis = nova;
    this.movendo = true;
    this.modeloService.ordenarNiveis(nova.map(n => n.Id)).subscribe({
      next: () => {
        this.movendo = false;
        this.niveis = nova.map((n, i) => ({ ...n, Ordem: i + 1 }));
        if (this.modelo) this.modelo = { ...this.modelo, Niveis: this.niveis };
        const movido = nova[destino];
        this.acessibilidade.anunciar(`Nível ${movido.Nome} agora na posição ${destino + 1} de ${nova.length}.`);
        // O foco fica no botão usado, na linha movida; na ponta da lista ele desliga, e o foco vai para o outro (F1, A05)
        const naPonta = destino === 0 || destino === nova.length - 1;
        const botao = naPonta ? (delta < 0 ? 'descer' : 'subir') : (delta < 0 ? 'subir' : 'descer');
        this.focoPendente = nova.length > 1 ? `pe-nivel-${botao}-${movido.Id}` : null;
      },
      error: erro => {
        this.movendo = false;
        this.niveis = anterior;
        const mensagem = mensagemErroPe(erro, 'Não foi possível mudar a ordem dos níveis. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  // ── Criar e editar ────────────────────────────────────────────────────────

  novo(): void {
    this.edicao = { nivel: null, nome: '', descricao: '', tentou: false };
  }

  editar(nivel: PeNivel): void {
    this.edicao = { nivel, nome: nivel.Nome, descricao: nivel.Descricao ?? '', tentou: false };
  }

  fechar(): void {
    if (!this.salvando) this.edicao = null;
  }

  get erroNome(): string | null {
    const e = this.edicao;
    if (!e || !e.tentou) return null;
    const nome = e.nome.trim();
    if (!nome) return 'Dê um nome ao nível.';
    const repetido = this.niveis.some(n => n.Id !== e.nivel?.Id && n.Nome.trim().toLowerCase() === nome.toLowerCase());
    return repetido ? 'Já existe um nível com esse nome.' : null;
  }

  salvar(): void {
    const e = this.edicao;
    if (!e || this.salvando) return;
    e.tentou = true;
    if (this.erroNome) {
      // O foco vai para o campo, que tem o erro ligado (F1, A13)
      this.focoPendente = 'pe-nivel-nome';
      return;
    }

    const nome = e.nome.trim();
    const descricao = e.descricao.trim() || null;
    this.salvando = true;
    const pedido = e.nivel
      ? this.modeloService.atualizarNivel(e.nivel.Id, { Nome: nome, Descricao: descricao, Ativo: e.nivel.Ativo })
      : this.modeloService.criarNivel({ Codigo: this.codigoLivre(nome), Nome: nome, Descricao: descricao });
    pedido.subscribe({
      next: () => {
        this.salvando = false;
        this.edicao = null;
        this.notificacoes.success(e.nivel
          ? `Nível "${nome}" atualizado.`
          : `Nível "${nome}" criado. Ele começa sem passos ligados: diga o que ele pede no passo "Monte etapas, passos, seções e campos".`);
        this.carregar();
      },
      error: erro => {
        this.salvando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar o nível. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  /** Código novo que não repete um que já existe. */
  private codigoLivre(nome: string): string {
    const base = codigoDoNome(nome);
    const usados = new Set(this.niveis.map(n => n.Codigo));
    if (!usados.has(base)) return base;
    let i = 2;
    while (usados.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
  }

  // ── Ativar e desativar ────────────────────────────────────────────────────

  alternarAtivo(nivel: PeNivel): void {
    if (this.alterandoId !== null) return;
    if (!nivel.Ativo) {
      this.alternarAtivoSim(nivel);
      return;
    }
    const orgaos = this.orgaosNoNivel(nivel).total;
    const aviso = orgaos > 0
      ? ` ${orgaos === 1 ? 'O órgão que está nele continua' : `Os ${orgaos} órgãos que estão nele continuam`} nele até você trocar o nível.`
      : '';
    this.confirmacao.perguntar({
      titulo: `Desativar o nível "${nivel.Nome}"?`,
      texto: `Ele deixa de ser oferecido para os órgãos.${aviso}`,
      sim: 'Desativar o nível',
      perigo: true
    }).then(sim => {
      if (sim && this.alterandoId === null) this.alternarAtivoSim(nivel);
    });
  }

  private alternarAtivoSim(nivel: PeNivel): void {
    this.alterandoId = nivel.Id;
    this.modeloService.atualizarNivel(nivel.Id, { Nome: nivel.Nome, Descricao: nivel.Descricao, Ativo: !nivel.Ativo }).subscribe({
      next: atualizado => {
        this.alterandoId = null;
        this.niveis = this.niveis.map(n => (n.Id === nivel.Id ? { ...n, ...atualizado } : n));
        if (this.modelo) this.modelo = { ...this.modelo, Niveis: this.niveis };
        this.notificacoes.success(nivel.Ativo ? `Nível "${nivel.Nome}" desativado.` : `Nível "${nivel.Nome}" ativado de novo.`);
      },
      error: erro => {
        this.alterandoId = null;
        const mensagem = mensagemErroPe(erro, 'Não foi possível mudar o nível. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  alternarHistorico(nivel: PeNivel): void {
    this.historicoAberto = this.historicoAberto === nivel.Id ? null : nivel.Id;
  }
}
