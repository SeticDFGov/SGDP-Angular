import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtividadeResponseDTO } from '../../../../api/atividade/interface';

interface WBSNode {
  id: string;
  level: number;
  code: string;
  name: string;
  type: 'project' | 'entregavel' | 'atividade';
  status?: string;
  progress?: number;
  // Datas planejadas
  startPlanejado?: Date;
  endPlanejado?: Date;
  // Datas reais (substituem as planejadas quando informadas)
  startReal?: Date;
  endReal?: Date;
  children?: WBSNode[];
}

@Component({
  selector: 'app-wbs-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wbs-chart.component.html',
  styleUrls: ['./wbs-chart.component.css']
})
export class WbsChartComponent implements OnInit, OnChanges {
  @Input() projetoNome: string = '';
  @Input() projetoId: number = 0;
  @Input() atividades: AtividadeResponseDTO[] = [];
  @Input() etapas: any[] = [];

  wbsTree: WBSNode | null = null;
  expandedNodes: Set<string> = new Set();
  allExpanded: boolean = false;

  ngOnInit(): void {
    this.processarWBS();
  }

  ngOnChanges(): void {
    this.processarWBS();
  }

  expandAll(): void {
    this.allExpanded = !this.allExpanded;

    if (this.allExpanded) {
      // Expandir todos os nós
      this.collectAllNodeIds(this.wbsTree).forEach(id => this.expandedNodes.add(id));
    } else {
      // Recolher todos exceto o raiz
      this.expandedNodes.clear();
      if (this.wbsTree) {
        this.expandedNodes.add(this.wbsTree.id);
      }
    }
  }

  private collectAllNodeIds(node: WBSNode | null): string[] {
    if (!node) return [];

    const ids = [node.id];
    if (node.children) {
      node.children.forEach(child => {
        ids.push(...this.collectAllNodeIds(child));
      });
    }
    return ids;
  }

  processarWBS(): void {
    if (!this.projetoNome) return;

    // Agrupar atividades por entregável
    const atividadesPorEntregavel = new Map<string, AtividadeResponseDTO[]>();
    this.atividades.forEach(atividade => {
      const entregavel = atividade.EtapaNome || 'Sem Entregável';
      if (!atividadesPorEntregavel.has(entregavel)) {
        atividadesPorEntregavel.set(entregavel, []);
      }
      atividadesPorEntregavel.get(entregavel)!.push(atividade);
    });

    // Criar nós de entregáveis
    const entregaveisNodes: WBSNode[] = [];
    let entregavelIndex = 1;

    atividadesPorEntregavel.forEach((atividades, entregavelNome) => {
      const entregavelCode = `1.${entregavelIndex}`;

      // Calcular % total entregue baseado no peso das atividades
      // % Entregue = Soma(Peso da atividade * % Executado da atividade) / 100
      let percentualTotalEntregue = 0;
      atividades.forEach(atividade => {
        const peso = (atividade as any).PESO_ATIVIDADE || 0;
        const percentExecutado = (atividade as any).PERCENT_EXECUTADO || 0;
        percentualTotalEntregue += (peso * percentExecutado) / 100;
      });

      // Criar nós de atividades com datas
      const atividadesNodes: WBSNode[] = atividades.map((atividade, idx) => ({
        id: `atividade-${atividade.AtividadeId}`,
        level: 2,
        code: `${entregavelCode}.${idx + 1}`,
        name: atividade.Titulo,
        type: 'atividade',
        status: atividade.SITUACAO,
        progress: (atividade as any).PERCENT_EXECUTADO || 0, // % executado da atividade
        startPlanejado: new Date(atividade.DT_INICIO_PREVISTO || new Date()),
        endPlanejado: new Date(atividade.DT_TERMINO_PREVISTO || new Date()),
        startReal: atividade.DT_INICIO_REAL ? new Date(atividade.DT_INICIO_REAL) : undefined,
        endReal: atividade.DT_TERMINO_REAL ? new Date(atividade.DT_TERMINO_REAL) : undefined
      }));

      // Calcular datas do entregável baseado nas atividades
      const datasAtividades = atividades.map(a => ({
        inicioPlanejado: new Date(a.DT_INICIO_PREVISTO || new Date()),
        terminoPlanejado: new Date(a.DT_TERMINO_PREVISTO || new Date()),
        inicioReal: a.DT_INICIO_REAL ? new Date(a.DT_INICIO_REAL) : undefined,
        terminoReal: a.DT_TERMINO_REAL ? new Date(a.DT_TERMINO_REAL) : undefined
      }));

      // Data início planejado = mínima das atividades
      const entregavelInicioPlanejado = new Date(Math.min(...datasAtividades.map(d => d.inicioPlanejado.getTime())));
      // Data término planejado = máxima das atividades
      const entregavelTerminoPlanejado = new Date(Math.max(...datasAtividades.map(d => d.terminoPlanejado.getTime())));

      // Data início real = mínima das atividades que iniciaram (se alguma iniciou)
      const datasIniciaisReais = datasAtividades.filter(d => d.inicioReal).map(d => d.inicioReal!.getTime());
      const entregavelInicioReal = datasIniciaisReais.length > 0 ? new Date(Math.min(...datasIniciaisReais)) : undefined;

      // Data término real = máxima das atividades concluídas (se todas concluíram)
      const todasConcluidas = atividades.every(a => a.DT_TERMINO_REAL);
      const datasFinaisReais = datasAtividades.filter(d => d.terminoReal).map(d => d.terminoReal!.getTime());
      const entregavelTerminoReal = todasConcluidas && datasFinaisReais.length > 0
        ? new Date(Math.max(...datasFinaisReais))
        : undefined;

      entregaveisNodes.push({
        id: `entregavel-${entregavelIndex}`,
        level: 1,
        code: entregavelCode,
        name: entregavelNome,
        type: 'entregavel',
        progress: percentualTotalEntregue, // % total entregue do entregável
        startPlanejado: entregavelInicioPlanejado,
        endPlanejado: entregavelTerminoPlanejado,
        startReal: entregavelInicioReal,
        endReal: entregavelTerminoReal,
        children: atividadesNodes
      });

      entregavelIndex++;
    });

    // Calcular datas do projeto (nível mais alto)
    let projetoInicioPlanejado: Date | undefined;
    let projetoTerminoPlanejado: Date | undefined;
    let projetoInicioReal: Date | undefined;
    let projetoTerminoReal: Date | undefined;

    if (entregaveisNodes.length > 0) {
      const datasEntregaveis = entregaveisNodes.map(e => ({
        inicioPlanejado: e.startPlanejado!,
        terminoPlanejado: e.endPlanejado!,
        inicioReal: e.startReal,
        terminoReal: e.endReal
      }));

      projetoInicioPlanejado = new Date(Math.min(...datasEntregaveis.map(d => d.inicioPlanejado.getTime())));
      projetoTerminoPlanejado = new Date(Math.max(...datasEntregaveis.map(d => d.terminoPlanejado.getTime())));

      const datasIniciaisReaisProjeto = datasEntregaveis.filter(d => d.inicioReal).map(d => d.inicioReal!.getTime());
      projetoInicioReal = datasIniciaisReaisProjeto.length > 0 ? new Date(Math.min(...datasIniciaisReaisProjeto)) : undefined;

      const todasEntregaveisCompletas = entregaveisNodes.every(e => e.endReal);
      const datasFinaisReaisProjeto = datasEntregaveis.filter(d => d.terminoReal).map(d => d.terminoReal!.getTime());
      projetoTerminoReal = todasEntregaveisCompletas && datasFinaisReaisProjeto.length > 0
        ? new Date(Math.max(...datasFinaisReaisProjeto))
        : undefined;
    }

    // Criar nó raiz (projeto)
    this.wbsTree = {
      id: `projeto-${this.projetoId}`,
      level: 0,
      code: '1',
      name: this.projetoNome,
      type: 'project',
      startPlanejado: projetoInicioPlanejado,
      endPlanejado: projetoTerminoPlanejado,
      startReal: projetoInicioReal,
      endReal: projetoTerminoReal,
      children: entregaveisNodes
    };

    // Expandir nó raiz por padrão
    this.expandedNodes.add(this.wbsTree.id);
  }

  toggleNode(nodeId: string): void {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
  }

  isExpanded(nodeId: string): boolean {
    return this.expandedNodes.has(nodeId);
  }

  getNodeColor(node: WBSNode): string {
    if (node.type === 'project') return 'bg-blue-600 text-white';
    if (node.type === 'entregavel') return 'bg-green-600 text-white';

    // Atividade - cor baseada no status
    const colors: Record<string, string> = {
      'Concluído': 'bg-green-500 text-white',
      'Em Andamento': 'bg-blue-500 text-white',
      'Atrasado para Início': 'bg-red-500 text-white',
      'Atrasado para Conclusão': 'bg-orange-500 text-white',
      'Não Iniciada': 'bg-gray-400 text-white'
    };
    return colors[node.status || ''] || 'bg-gray-400 text-white';
  }

  getBorderColor(node: WBSNode): string {
    if (node.type === 'project') return 'border-blue-700';
    if (node.type === 'entregavel') return 'border-green-700';
    return 'border-gray-500';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getDateDisplay(node: WBSNode, tipo: 'inicio' | 'termino'): string {
    // Se há data real, mostra ela (substitui a planejada)
    // Senão, mostra a planejada
    if (tipo === 'inicio') {
      return this.formatDate(node.startReal || node.startPlanejado);
    } else {
      return this.formatDate(node.endReal || node.endPlanejado);
    }
  }

  getDateLabel(node: WBSNode, tipo: 'inicio' | 'termino'): string {
    // Indica se é planejada ou real
    if (tipo === 'inicio') {
      return node.startReal ? 'Início Real' : 'Início Planejado';
    } else {
      return node.endReal ? 'Término Real' : 'Término Planejado';
    }
  }
}
