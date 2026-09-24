import { Injectable, inject } from '@angular/core';
import { PeRegistrosService } from '../../services/pe-registros.service';

/**
 * Imagens do texto rico: o documento guarda o caminho do arquivo na API
 * (`api/planejamento/arquivos/{id}`), que só responde com o token. A tela baixa
 * o arquivo pelo HttpClient (o interceptor põe o token) e mostra um endereço
 * local (blob). Cada imagem é baixada uma vez por sessão; a falha não fica
 * guardada (a próxima tentativa baixa de novo).
 */
@Injectable({ providedIn: 'root' })
export class PeImagensService {
  private readonly registrosService = inject(PeRegistrosService);
  private readonly enderecos = new Map<number, Promise<string>>();

  endereco(id: number): Promise<string> {
    const guardado = this.enderecos.get(id);
    if (guardado) return guardado;
    const pedido = new Promise<string>((resolver, recusar) => {
      this.registrosService.baixarArquivo(id).subscribe({
        next: resposta => {
          const corpo = resposta.body;
          if (corpo && corpo.size > 0) resolver(URL.createObjectURL(corpo));
          else recusar(new Error('imagem vazia'));
        },
        error: erro => recusar(erro)
      });
    });
    this.enderecos.set(id, pedido);
    pedido.then(undefined, () => this.enderecos.delete(id));
    return pedido;
  }
}
