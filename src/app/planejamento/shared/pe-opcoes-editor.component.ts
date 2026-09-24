import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeCampoModelo, PeOpcaoModelo } from '../../../api/planejamento/interface';
import { NotificationService } from '../../core/services/notification.service';
import { PeModeloService } from '../services/pe-modelo.service';
import { CORES_OPCAO, OpcaoRotulo, classeCorOpcao } from './pe-modelo-rotulos';
import { mensagemErroPe } from './pe-erros';

interface LinhaOpcao {
  opcao: PeOpcaoModelo;
  rotulo: string;
  cor: string;
  ativa: boolean;
  salvando: boolean;
}

/** Tamanho do rótulo de uma opção (o servidor confere de novo). */
const MAX_ROTULO = 200;

/**
 * Opções de um campo de lista (pe_opcao): renomear, mudar a cor, desativar e
 * reativar, apagar as criadas pelo administrador e incluir novas. Cada ação
 * grava na hora, com o próprio botão. O valor gravado nos registros não muda;
 * opção do sistema ou já usada por algum órgão não se apaga, só se desativa.
 */
@Component({
  selector: 'app-pe-opcoes-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pe-opcoes-editor.component.html'
})
export class PeOpcoesEditorComponent implements OnChanges {
  private readonly modeloService = inject(PeModeloService);
  private readonly notificacoes = inject(NotificationService);

  @Input({ required: true }) campo!: PeCampoModelo;
  @Input() somenteLeitura = false;
  /** Prefixo dos ids dos campos (a tela pode ter mais de um editor). */
  @Input() prefixoId = 'pe-opcao';
  /** As opções depois de cada mudança, para a tela atualizar o campo. */
  @Output() readonly mudou = new EventEmitter<PeOpcaoModelo[]>();

  readonly maxRotulo = MAX_ROTULO;
  readonly cores: OpcaoRotulo[] = CORES_OPCAO;

  linhas: LinhaOpcao[] = [];
  novaRotulo = '';
  novaCor = '';
  tentouNova = false;
  criando = false;

  ngOnChanges(): void {
    this.linhas = [...(this.campo?.Opcoes ?? [])]
      .sort((a, b) => a.Ordem - b.Ordem || a.Id - b.Id)
      .map(o => this.linha(o));
  }

  classeCor(cor: string | null): string {
    return classeCorOpcao(cor);
  }

  /** A cor gravada não é uma das conhecidas: entra na lista para não se perder. */
  corDesconhecida(cor: string): boolean {
    return !!cor && !this.cores.some(c => c.valor === cor);
  }

  mudouLinha(l: LinhaOpcao): boolean {
    return l.rotulo.trim() !== l.opcao.Rotulo || (l.cor || null) !== (l.opcao.Cor || null) || l.ativa !== l.opcao.Ativa;
  }

  desfazer(l: LinhaOpcao): void {
    Object.assign(l, this.linha(l.opcao));
  }

  salvar(l: LinhaOpcao): void {
    const rotulo = l.rotulo.trim();
    if (!rotulo) {
      this.notificacoes.warning('Escreva o rótulo da opção.');
      return;
    }
    l.salvando = true;
    this.modeloService.atualizarOpcao(l.opcao.Id, { Rotulo: rotulo, Cor: l.cor || null, Ativa: l.ativa }).subscribe({
      next: atualizada => {
        l.salvando = false;
        Object.assign(l, this.linha({ ...l.opcao, ...atualizada }));
        this.avisar();
      },
      error: erro => {
        l.salvando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível salvar a opção. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  apagar(l: LinhaOpcao): void {
    if (l.opcao.Sistema) return;
    if (!confirm(`Apagar a opção "${l.opcao.Rotulo}"? Se algum órgão já escolheu essa opção, ela só é desativada: o que foi gravado continua guardado.`)) return;
    l.salvando = true;
    this.modeloService.apagarOpcao(l.opcao.Id).subscribe({
      next: resposta => {
        l.salvando = false;
        // Opção em uso volta desativada (com o item); a apagada não volta nada
        const devolvida = resposta && typeof resposta === 'object' && 'Id' in resposta ? resposta as PeOpcaoModelo : null;
        if (devolvida) Object.assign(l, this.linha({ ...l.opcao, ...devolvida }));
        else this.linhas = this.linhas.filter(x => x !== l);
        this.notificacoes.success(devolvida ? 'A opção já foi usada e ficou desativada.' : 'Opção apagada.');
        this.avisar();
      },
      error: erro => {
        l.salvando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível apagar a opção. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  get erroNova(): string | null {
    if (!this.tentouNova) return null;
    const rotulo = this.novaRotulo.trim();
    if (!rotulo) return 'Escreva o rótulo da opção.';
    if (this.linhas.some(l => l.opcao.Rotulo.trim().toLowerCase() === rotulo.toLowerCase())) return 'Já existe uma opção com esse rótulo.';
    return null;
  }

  incluir(): void {
    if (this.criando) return;
    this.tentouNova = true;
    if (this.erroNova) return;
    this.criando = true;
    this.modeloService.criarOpcao(this.campo.Id, { Rotulo: this.novaRotulo.trim(), Cor: this.novaCor || null }).subscribe({
      next: criada => {
        this.criando = false;
        this.linhas = [...this.linhas, this.linha(criada)];
        this.novaRotulo = '';
        this.novaCor = '';
        this.tentouNova = false;
        this.avisar();
      },
      error: erro => {
        this.criando = false;
        const mensagem = mensagemErroPe(erro, 'Não foi possível incluir a opção. Tente de novo.');
        if (mensagem) this.notificacoes.error(mensagem);
      }
    });
  }

  porId(_: number, l: LinhaOpcao): number {
    return l.opcao.Id;
  }

  private linha(opcao: PeOpcaoModelo): LinhaOpcao {
    return { opcao, rotulo: opcao.Rotulo, cor: opcao.Cor ?? '', ativa: opcao.Ativa, salvando: false };
  }

  private avisar(): void {
    this.mudou.emit(this.linhas.map(l => l.opcao));
  }
}
