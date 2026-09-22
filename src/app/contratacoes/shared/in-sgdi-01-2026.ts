/**
 * Texto integral da Instrução Normativa SGDI nº 01, de 05 de agosto de 2026
 * (DODF nº 144, de 6 de agosto de 2026), que regulamenta o Decreto nº 48.899/2026
 * (supervisão contínua das contratações e iniciativas de TI), transcrito do PDF
 * oficial para os chips de citação das telas da Supervisão Contínua.
 * Ato normativo público, sem restrição de reprodução (Lei 9.610/98, art. 8º, IV).
 *
 * Os travessões do original viraram hífens (regra do front). Incisos que pertencem
 * a um parágrafo ficam dentro dele (art. 11, § 1º e § 3º; art. 25, § 1º; art. 30,
 * § 1º; art. 33, § 1º), e alíneas ficam no texto do inciso.
 */
import { DispositivoNorma } from '../../core/citacao/cita-norma.directive';

export const IN_SGDI_01_2026: Record<number, DispositivoNorma> = {
  1: {
    rotulo: 'Art. 1º',
    caput: 'Esta Instrução Normativa regulamenta o Decreto n° 48.899, de 3 de julho de 2026, dispondo sobre o regime de supervisão contínua das contratações e das iniciativas de tecnologia da informação, governança digital, inteligência artificial, dados e software e sobre a adoção de medidas cautelares no âmbito dos órgãos e das entidades da administração direta, autárquica e fundacional do Distrito Federal, disciplinando:',
    incisos: [
      { rotulo: 'I', texto: 'os procedimentos de comunicação à Secretaria de Estado de Governança Digital e Integração - SGDI;' },
      { rotulo: 'II', texto: 'os critérios para o exercício da supervisão contínua;' },
      { rotulo: 'III', texto: 'os procedimentos de análise técnica;' },
      { rotulo: 'IV', texto: 'a emissão de recomendações técnicas;' },
      { rotulo: 'V', texto: 'o monitoramento das informações encaminhadas pelos órgãos e entidades;' },
      { rotulo: 'VI', texto: 'os mecanismos de monitoramento e registro da conformidade das comunicações; e' },
      { rotulo: 'VII', texto: 'os procedimentos para proposição, formalização e submissão das medidas cautelares aos comitês de governança competentes.' },
    ],
  },

  2: {
    rotulo: 'Art. 2º',
    caput: 'O regime de supervisão contínua tem por finalidade:',
    incisos: [
      { rotulo: 'I', texto: 'fortalecer a governança digital no âmbito da Administração Pública do Distrito Federal;' },
      { rotulo: 'II', texto: 'promover o alinhamento das contratações e das iniciativas digitais às políticas, estratégias, padrões e diretrizes estabelecidos pelo Governo do Distrito Federal;' },
      { rotulo: 'III', texto: 'identificar riscos, oportunidades de melhoria e eventuais desconformidades relacionadas à governança, arquitetura corporativa, interoperabilidade, segurança da informação, proteção de dados, inteligência artificial e gestão de tecnologia da informação;' },
      { rotulo: 'IV', texto: 'subsidiar a tomada de decisão estratégica da SGDI e dos comitês de governança competentes;' },
      { rotulo: 'V', texto: 'fomentar a padronização e a integração das soluções tecnológicas adotadas pela Administração Pública distrital; e' },
      { rotulo: 'VI', texto: 'ampliar a transparência e a capacidade de monitoramento das iniciativas de transformação digital.' },
    ],
  },

  3: {
    rotulo: 'Art. 3º',
    caput: 'Esta Instrução Normativa aplica-se aos órgãos e às entidades da administração direta, autárquica e fundacional do Distrito Federal.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'A aplicação desta Instrução Normativa observará as competências específicas dos órgãos e entidades, não afastando sua autonomia administrativa nem a responsabilidade pela condução de seus processos de contratação e de seus projetos de transformação digital.',
      },
    ],
  },

  4: {
    rotulo: 'Art. 4º',
    caput: 'O regime de supervisão contínua será orientado pelos seguintes princípios:',
    incisos: [
      { rotulo: 'I', texto: 'governança pública;' },
      { rotulo: 'II', texto: 'transformação digital centrada no cidadão;' },
      { rotulo: 'III', texto: 'integração institucional;' },
      { rotulo: 'IV', texto: 'atuação preventiva e orientativa;' },
      { rotulo: 'V', texto: 'gestão baseada em dados e riscos;' },
      { rotulo: 'VI', texto: 'transparência;' },
      { rotulo: 'VII', texto: 'interoperabilidade;' },
      { rotulo: 'VIII', texto: 'padronização;' },
      { rotulo: 'IX', texto: 'eficiência administrativa;' },
      { rotulo: 'X', texto: 'inovação responsável;' },
      { rotulo: 'XI', texto: 'segurança da informação;' },
      { rotulo: 'XII', texto: 'proteção de dados pessoais;' },
      { rotulo: 'XIII', texto: 'uso ético e responsável da inteligência artificial; e' },
      { rotulo: 'XIV', texto: 'melhoria contínua da administração pública.' },
    ],
  },

  5: {
    rotulo: 'Art. 5º',
    caput: 'Para os fins desta Instrução Normativa, considera-se:',
    incisos: [
      { rotulo: 'I', texto: 'supervisão contínua: atividade permanente de monitoramento e análise técnica exercida pela SGDI sobre contratações e iniciativas de tecnologia da informação, governança digital, dados, software e inteligência artificial;' },
      { rotulo: 'II', texto: 'comunicação obrigatória: envio formal de informações pelos órgãos e entidades à SGDI nas hipóteses previstas nesta Instrução Normativa;' },
      { rotulo: 'III', texto: 'recomendação técnica: manifestação formal da SGDI contendo orientações, recomendações ou medidas destinadas ao aperfeiçoamento das contratações ou iniciativas supervisionadas;' },
      { rotulo: 'IV', texto: 'iniciativa de transformação digital: ação, projeto, programa ou conjunto de atividades destinadas à modernização de processos, serviços públicos ou capacidades institucionais mediante o uso de tecnologias digitais;' },
      { rotulo: 'V', texto: 'contratação de TIC: processo destinado à aquisição, contratação, desenvolvimento, evolução, sustentação ou manutenção de bens e serviços de tecnologia da informação e comunicação;' },
      { rotulo: 'VI', texto: 'projeto estratégico de TIC: iniciativa cuja relevância, criticidade, impacto institucional ou transversalidade justifique monitoramento prioritário pela SGDI;' },
      { rotulo: 'VII', texto: 'nota de motivação: documento técnico elaborado pela SGDI contendo a fundamentação para eventual comunicação ao órgão de controle interno competente;' },
      { rotulo: 'VIII', texto: 'painel analítico: ambiente eletrônico destinado ao monitoramento das comunicações, do status das iniciativas supervisionadas e dos indicadores relacionados ao regime de supervisão contínua.' },
      { rotulo: 'IX', texto: 'análise técnica: procedimento realizado pela SGDI, no exercício da supervisão contínua, destinado à avaliação estratégica das contratações de TIC, com base nos critérios estabelecidos nesta Instrução Normativa, observado o disposto no § 2º do art. 25.' },
    ],
  },

  6: {
    rotulo: 'Art. 6º',
    caput: 'O regime de supervisão contínua constitui atividade permanente de monitoramento e análise técnica das contratações e das iniciativas de tecnologia da informação, governança digital, inteligência artificial, dados e software, com a finalidade de promover a conformidade às diretrizes estratégicas do Governo do Distrito Federal e subsidiar a melhoria contínua da governança digital.',
  },

  7: {
    rotulo: 'Art. 7º',
    caput: 'O regime de supervisão contínua será exercido em caráter colaborativo, observando os princípios da cooperação institucional, da atuação preventiva, da orientação técnica e da busca pela melhoria contínua da governança digital da Administração Pública do Distrito Federal.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'A atuação da SGDI deverá privilegiar, sempre que possível, a orientação técnica, a articulação institucional e a disseminação de boas práticas, sem prejuízo das medidas previstas nesta Instrução Normativa, respeitadas as competências legais e regimentais dos órgãos e entidades.',
      },
    ],
  },

  8: {
    rotulo: 'Art. 8º',
    caput: 'A supervisão contínua observará, além dos princípios previstos nesta Instrução Normativa, as seguintes diretrizes:',
    incisos: [
      { rotulo: 'I', texto: 'atuação preventiva e orientativa;' },
      { rotulo: 'II', texto: 'cooperação institucional entre a SGDI e os órgãos e entidades supervisionados;' },
      { rotulo: 'III', texto: 'proporcionalidade e atuação baseada em risco;' },
      { rotulo: 'IV', texto: 'priorização de iniciativas estratégicas ou de maior impacto para a Administração Pública;' },
      { rotulo: 'V', texto: 'racionalização dos esforços de supervisão;' },
      { rotulo: 'VI', texto: 'utilização de informações oficiais e evidências documentais;' },
      { rotulo: 'VII', texto: 'transparência dos procedimentos de supervisão; e' },
      { rotulo: 'VIII', texto: 'promoção da interoperabilidade, da arquitetura corporativa e da transformação digital integrada.' },
    ],
  },

  9: {
    rotulo: 'Art. 9º',
    caput: 'O exercício da supervisão contínua não implica aprovação prévia, autorização, homologação ou substituição das competências legais atribuídas aos órgãos e entidades responsáveis pela contratação ou execução das iniciativas supervisionadas, bem como dos órgãos de controle interno e externo.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'As recomendações expedidas pela SGDI possuem natureza técnica e orientativa, não vinculante, sem prejuízo das competências dos órgãos de controle e das autoridades competentes para a prática dos atos administrativos.',
      },
    ],
  },

  10: {
    rotulo: 'Art. 10',
    caput: 'O regime de supervisão contínua será exercido mediante os seguintes instrumentos:',
    incisos: [
      { rotulo: 'I', texto: 'análise das comunicações encaminhadas pelos órgãos e entidades;' },
      { rotulo: 'II', texto: 'acompanhamento da carteira de contratações e iniciativas digitais;' },
      { rotulo: 'III', texto: 'emissão de recomendações técnicas;' },
      { rotulo: 'IV', texto: 'solicitação de informações, documentos ou esclarecimentos complementares;' },
      { rotulo: 'V', texto: 'monitoramento do atendimento às recomendações expedidas;' },
      { rotulo: 'VI', texto: 'elaboração de notas técnicas ou manifestações especializadas, quando necessário; e' },
      { rotulo: 'VII', texto: 'gestão e transparência das informações constantes das comunicações enviadas pelos órgãos e entidades.' },
    ],
  },

  11: {
    rotulo: 'Art. 11',
    caput: 'A SGDI poderá classificar as contratações supervisionadas conforme critérios de criticidade, complexidade, relevância estratégica, impacto institucional e nível de risco, para fins de priorização da supervisão.',
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'A classificação das contratações compreenderá três categorias:',
        incisos: [
          { rotulo: 'I', texto: 'Alta Criticidade: nível máximo de prioridade e importância atribuído. Contratações classificadas assim possuem alto impacto negativo em caso de insucesso, exigindo atualizações, no mínimo, mensais.' },
          { rotulo: 'II', texto: 'Média Criticidade: nível intermediário de prioridade e importância atribuído. Contratações classificadas assim possuem impacto negativo moderado em caso de insucesso, com atualizações trimestrais.' },
          { rotulo: 'III', texto: 'Baixa Criticidade: menor nível de prioridade e importância atribuído. Contratações classificadas nesta categoria apresentam impacto mínimo em caso de insucesso, e a atualização será feita sob demanda.' },
        ],
      },
      {
        rotulo: '§ 2º',
        texto: 'A priorização da supervisão não afasta a obrigatoriedade de comunicação prevista nesta Instrução Normativa.',
      },
      {
        rotulo: '§ 3º',
        texto: 'Para fins de priorização do monitoramento, poderão ser considerados, isolada ou cumulativamente, dentre outros, os seguintes critérios:',
        incisos: [
          { rotulo: 'I', texto: 'alinhamento às diretrizes da Estratégia de Governo Digital do Distrito Federal - EGD/DF;' },
          { rotulo: 'II', texto: 'impacto sobre a prestação de serviços públicos digitais;' },
          { rotulo: 'III', texto: 'potencial de compartilhamento ou utilização corporativa da solução;' },
          { rotulo: 'IV', texto: 'impacto sobre a arquitetura corporativa, a interoperabilidade ou a governança de dados;' },
          { rotulo: 'V', texto: 'utilização de tecnologias emergentes, computação em nuvem ou soluções baseadas em inteligência artificial;' },
          { rotulo: 'VI', texto: 'riscos relacionados à segurança da informação, à proteção de dados pessoais ou à continuidade dos serviços públicos;' },
          { rotulo: 'VII', texto: 'valor estimado da contratação, considerado como critério objetivo para priorização do monitoramento quando observado, conforme a natureza do objeto: a) nas contratações de desenvolvimento, evolução, sustentação de sistemas e fábrica de software, valor estimado igual ou superior a R$ 5.000.000,00 (cinco milhões de reais); b) nas contratações de natureza estruturante, valor estimado igual ou superior a R$ 10.000.000,00 (dez milhões de reais); c) nas contratações de TIC não enquadradas nas alíneas "a" e "b" deste inciso, valor estimado igual ou superior a R$ 1.000.000,00 (um milhão de reais).' },
        ],
      },
      {
        rotulo: '§ 4º',
        texto: 'O enquadramento da contratação nos valores previstos no inciso VII do § 3º constitui critério objetivo para priorização do monitoramento pela SGDI, sem prejuízo da aplicação dos demais critérios previstos neste artigo, podendo ainda a SGDI estabelecer outros critérios técnicos relacionados às suas competências institucionais.',
      },
    ],
  },

  12: {
    rotulo: 'Art. 12',
    caput: 'A supervisão contínua compreenderá, conforme a natureza da demanda, as seguintes etapas:',
    incisos: [
      { rotulo: 'I', texto: 'recebimento da comunicação;' },
      { rotulo: 'II', texto: 'análise preliminar;' },
      { rotulo: 'III', texto: 'classificação quanto à criticidade;' },
      { rotulo: 'IV', texto: 'análise técnica nos termos do inciso IX do art.5º e art. 25;' },
      { rotulo: 'V', texto: 'solicitação de informações complementares, quando necessária;' },
      { rotulo: 'VI', texto: 'emissão de recomendação técnica ou manifestação conclusiva;' },
      { rotulo: 'VII', texto: 'acompanhamento das providências adotadas pelo órgão ou entidade; e' },
      { rotulo: 'VIII', texto: 'encerramento da supervisão ou manutenção do monitoramento, quando cabível.' },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'As etapas poderão ser simplificadas ou dispensadas quando a natureza da comunicação não justificar análise técnica aprofundada.',
      },
    ],
  },

  13: {
    rotulo: 'Art. 13',
    caput: 'A supervisão contínua será coordenada pela Secretaria de Estado de Governança Digital e Integração, observadas as competências regimentais de suas unidades administrativas.',
    paragrafos: [
      { rotulo: '§ 1º', texto: 'As unidades técnicas da SGDI atuarão de forma integrada sempre que a matéria envolver competências complementares.' },
      { rotulo: '§ 2º', texto: 'Sempre que necessário, a SGDI poderá promover análises conjuntas, instituir grupos técnicos ou solicitar apoio especializado para subsidiar suas manifestações.' },
      { rotulo: '§ 3º', texto: 'As manifestações técnicas expedidas pelas unidades da SGDI poderão subsidiar recomendações emitidas pelo Secretário de Estado ou pela autoridade competente.' },
    ],
  },

  14: {
    rotulo: 'Art. 14',
    caput: 'Os órgãos e as entidades da administração direta, autárquica e fundacional do Distrito Federal deverão comunicar à Secretaria de Estado de Governança Digital e Integração - SGDI as informações previstas neste Capítulo, observados os prazos, os procedimentos e os modelos estabelecidos nesta Instrução Normativa e em seus anexos.',
  },

  15: {
    rotulo: 'Art. 15',
    caput: 'As comunicações de que trata esta Instrução Normativa destinam-se a:',
    incisos: [
      { rotulo: 'I', texto: 'subsidiar o exercício da supervisão contínua das contratações de tecnologia da informação e comunicação;' },
      { rotulo: 'II', texto: 'manter atualizado o Portfólio Estratégico de Contratações de TIC do Governo do Distrito Federal;' },
      { rotulo: 'III', texto: 'manter atualizado o Portfólio de Iniciativas de Transformação Digital do Distrito Federal, como instrumento de planejamento estratégico e acompanhamento da transformação digital da Administração Pública distrital;' },
      { rotulo: 'IV', texto: 'apoiar o planejamento, a governança e a tomada de decisão estratégica da SGDI; e' },
      { rotulo: 'V', texto: 'subsidiar a elaboração de indicadores, painéis gerenciais e relatórios executivos.' },
    ],
  },

  16: {
    rotulo: 'Art. 16',
    caput: 'As comunicações deverão ser realizadas por meio do Sistema Eletrônico de Informações - SEI.',
  },

  17: {
    rotulo: 'Art. 17',
    caput: 'Deverão ser comunicadas à SGDI as contratações de tecnologia da informação e comunicação enquadradas nas hipóteses previstas nos incisos I e II do art. 7º do Decreto nº 48.899, de 2026.',
    paragrafos: [
      { rotulo: '§ 1º', texto: 'A comunicação deverá ocorrer, sempre que possível, na fase de planejamento da contratação, tão logo seja aprovado formalmente o Documento de Formalização da Demanda - DFD, por meio do Sistema Eletrônico de Informações (SEI), acompanhado do formulário constante do Anexo I, para novas contratações, ou do formulário constante do Anexo II, para contratações vigentes.' },
      { rotulo: '§ 2º', texto: 'Ainda, sobre as novas contratações, quando estas, ao longo da instrução processual, sofrerem alterações significativas de valor, objeto, cancelamento, ou outras modificações que descaracterizem a demanda original, devem ser comunicadas novamente à SGDI, e novo formulário constante do Anexo I desta IN deverá ser preenchido e enviado via SEI.' },
      { rotulo: '§ 3º', texto: 'Nas contratações vigentes, deverão ser comunicadas à SGDI as alterações contratuais, prorrogações, renovações, revisões, reequilíbrios ou outras modificações que possam impactar a governança, a arquitetura corporativa, a interoperabilidade ou o planejamento estratégico de tecnologia da informação, por meio do preenchimento e envio do formulário constante do Anexo II desta IN via SEI.' },
      { rotulo: '§ 4º', texto: 'A representação gráfica do processo de comunicação de que trata o caput encontra-se nos Anexos V e VI desta IN.' },
    ],
  },

  18: {
    rotulo: 'Art. 18',
    caput: 'A comunicação das contratações de TIC tem por finalidade possibilitar o monitoramento pela SGDI durante o ciclo de vida da contratação, observado o regime de supervisão contínua disciplinado nesta Instrução Normativa.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'A comunicação não condiciona nem suspende o prosseguimento da contratação, permanecendo integralmente sob responsabilidade do órgão ou da entidade demandante a instrução, a decisão e a execução do respectivo processo administrativo.',
      },
    ],
  },

  19: {
    rotulo: 'Art. 19',
    caput: 'Os órgãos e as entidades deverão comunicar à Secretaria de Estado de Governança Digital e Integração - SGDI as iniciativas de transformação digital de que trata o inciso III do art. 7º do Decreto nº 48.899, de 2026, após sua aprovação pelo Subcomitê de Transformação Digital ou por instância de governança equivalente instituída no respectivo órgão ou entidade.',
    paragrafos: [
      { rotulo: '§ 1º', texto: 'A comunicação prevista no caput destina-se ao registro institucional da iniciativa, à composição do Portfólio de Iniciativas de Transformação Digital do Distrito Federal e ao monitoramento da implementação da Estratégia de Governo Digital do Distrito Federal - EGD/DF.' },
      { rotulo: '§ 2º', texto: 'A aprovação da iniciativa compete exclusivamente à estrutura de governança do órgão ou da entidade responsável por sua execução.' },
      { rotulo: '§ 3º', texto: 'A comunicação à SGDI não caracteriza aprovação, validação, homologação ou anuência da iniciativa.' },
      { rotulo: '§ 4º', texto: 'A comunicação das iniciativas de Transformação Digital dar-se-á por meio do preenchimento e envio de formulário constante do Anexo IV via SEI.' },
      { rotulo: '§ 5º', texto: 'A representação gráfica do processo de comunicação de que trata o caput encontra-se no Anexo VII desta IN.' },
    ],
  },

  20: {
    rotulo: 'Art. 20',
    caput: 'As informações relativas às iniciativas de transformação digital serão utilizadas pela SGDI para:',
    incisos: [
      { rotulo: 'I', texto: 'monitorar a implementação da Estratégia de Governo Digital do Distrito Federal;' },
      { rotulo: 'II', texto: 'consolidar o Portfólio de Iniciativas de Transformação Digital do Distrito Federal;' },
      { rotulo: 'III', texto: 'monitorar a evolução das ações estratégicas de transformação digital no âmbito da Administração Pública distrital;' },
      { rotulo: 'IV', texto: 'subsidiar a elaboração de indicadores, painéis gerenciais e relatórios executivos;' },
      { rotulo: 'V', texto: 'identificar oportunidades de integração, compartilhamento de soluções e racionalização de esforços entre os órgãos e entidades;' },
      { rotulo: 'VI', texto: 'apoiar o planejamento e a coordenação das ações de transformação digital conduzidas pela SGDI.' },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'Para fins de monitoramento da Estratégia de Governo Digital, a SGDI poderá solicitar aos órgãos e entidades a atualização das informações relativas às iniciativas comunicadas, observado o princípio da cooperação institucional.',
      },
    ],
  },

  21: {
    rotulo: 'Art. 21',
    caput: 'Os órgãos e entidades deverão manter atualizadas as informações das iniciativas de transformação digital comunicadas à SGDI, sempre que ocorrerem alterações relevantes em seu escopo, cronograma, situação de execução ou resultados esperados.',
  },

  22: {
    rotulo: 'Art. 22',
    caput: 'Também deverão ser comunicados à SGDI:',
    incisos: [
      { rotulo: 'I', texto: 'as iniciativas de migração, integração, expansão, substituição ou descontinuidade de sistemas e plataformas;' },
      { rotulo: 'II', texto: 'os Planos Diretores de Tecnologia da Informação e Comunicação - PDTIC aprovados pelos respectivos Comitês Internos de Governança de TIC;' },
      { rotulo: 'III', texto: 'a aquisição ou adoção de soluções baseadas em inteligência artificial (IA), acompanhadas da classificação de risco prevista na Política de Governança de Inteligência Artificial do Distrito Federal - PGIA/DF e, quando aplicável, da Avaliação de Impacto Algorítmico.' },
    ],
    paragrafos: [
      { rotulo: '§ 1º', texto: 'A comunicação das iniciativas referentes ao inciso I, dar-se-á por meio do preenchimento e envio de formulário constante do Anexo IV via SEI.' },
      { rotulo: '§ 2º', texto: 'A comunicação de aquisições de soluções baseadas em IA, a que se refere o inciso III, dar-se-á por meio do preenchimento e envio de formulário constante do Anexo III via SEI.' },
      { rotulo: '§ 3º', texto: 'A comunicação dos planos diretores de TIC (PDTIC) devem ser comunicados por meio de Ofício via SEI, incluindo o respectivo plano em PDF ou link para download.' },
      { rotulo: '§ 4º', texto: 'A representação gráfica do processo de comunicação de que trata o inciso I encontra-se no Anexo IX desta IN.' },
      { rotulo: '§ 5º', texto: 'A representação gráfica do processo de comunicação de que trata o inciso III encontra-se no Anexo VIII desta IN.' },
    ],
  },

  23: {
    rotulo: 'Art. 23',
    caput: 'A supervisão contínua será exercida a partir das comunicações realizadas pelos órgãos e entidades, bem como das demais informações disponíveis à SGDI, observadas as competências estabelecidas no Decreto nº 48.899, de 2026.',
  },

  24: {
    rotulo: 'Art. 24',
    caput: 'A supervisão contínua compreenderá, conforme a natureza, a complexidade e o risco da matéria:',
    incisos: [
      { rotulo: 'I', texto: 'o registro e monitoramento das comunicações;' },
      { rotulo: 'II', texto: 'a análise técnica das informações encaminhadas nos termos inciso IX do art.5º e art.25;' },
      { rotulo: 'III', texto: 'a solicitação de esclarecimentos ou informações complementares;' },
      { rotulo: 'IV', texto: 'a emissão de manifestações técnicas;' },
      { rotulo: 'V', texto: 'o acompanhamento das providências adotadas pelos órgãos e entidades; e' },
      { rotulo: 'VI', texto: 'a adoção das medidas previstas nesta Instrução Normativa.' },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'A extensão da supervisão observará critérios de materialidade, criticidade, relevância estratégica e risco, podendo ser simplificada quando a natureza da matéria assim o permitir.',
      },
    ],
  },

  25: {
    rotulo: 'Art. 25',
    caput: 'A análise técnica tem por finalidade avaliar a aderência das contratações de TIC às diretrizes de governança digital, arquitetura corporativa, gestão de dados, segurança da informação, transformação digital, inteligência artificial e demais políticas correlatas.',
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'A análise técnica considerará, dentre outros aspectos:',
        incisos: [
          { rotulo: 'I', texto: 'alinhamento às políticas e estratégias de governo digital;' },
          { rotulo: 'II', texto: 'racionalização de investimentos;' },
          { rotulo: 'III', texto: 'compartilhamento de soluções;' },
          { rotulo: 'IV', texto: 'interoperabilidade;' },
          { rotulo: 'V', texto: 'riscos tecnológicos;' },
          { rotulo: 'VI', texto: 'sustentabilidade da solução;' },
          { rotulo: 'VII', texto: 'conformidade com normas e padrões corporativos.' },
        ],
      },
      {
        rotulo: '§ 2º',
        texto: 'A análise técnica de que trata o caput possui caráter estratégico e orientativo, não compreendendo a análise da regularidade da instrução processual, da conformidade dos artefatos de planejamento da contratação ou da legalidade dos atos praticados no processo de contratação, cuja responsabilidade permanece com o órgão ou entidade demandante e com os órgãos de assessoramento jurídico, controle interno e controle externo, conforme suas competências.',
      },
    ],
  },

  26: {
    rotulo: 'Art. 26',
    caput: 'Concluída a análise técnica, a SGDI poderá expedir manifestação técnica, conforme a natureza da matéria.',
  },

  27: {
    rotulo: 'Art. 27',
    caput: 'A manifestação técnica poderá resultar em:',
    incisos: [
      { rotulo: 'I', texto: 'registro da comunicação para fins de monitoramento;' },
      { rotulo: 'II', texto: 'solicitação de esclarecimentos ou complementação de informações;' },
      { rotulo: 'III', texto: 'recomendação técnica;' },
      { rotulo: 'IV', texto: 'nota técnica; ou' },
      { rotulo: 'V', texto: 'nota de motivação, quando cabível.' },
    ],
  },

  28: {
    rotulo: 'Art. 28',
    caput: 'O registro da comunicação constitui manifestação técnica simplificada mediante a qual a SGDI reconhece o recebimento das informações para fins de acompanhamento institucional, sem necessidade de adoção de medidas adicionais.',
  },

  29: {
    rotulo: 'Art. 29',
    caput: 'Sempre que necessário ao adequado exercício da supervisão contínua, a SGDI poderá solicitar informações, documentos ou esclarecimentos complementares.',
    paragrafos: [
      { rotulo: '§ 1º', texto: 'A solicitação indicará as informações requeridas e deverá ser atendida no prazo de 10 (dez) dias, podendo esse prazo ser reduzido ou ampliado, mediante decisão do Secretário de Estado de Governança Digital e Integração, consideradas a urgência e a complexidade da demanda.' },
      { rotulo: '§ 2º', texto: 'O órgão ou entidade poderá apresentar justificativa fundamentada quando não for possível atender integralmente à solicitação no prazo estabelecido.' },
    ],
  },

  30: {
    rotulo: 'Art. 30',
    caput: 'A recomendação técnica consiste em manifestação orientativa destinada ao aperfeiçoamento das contratações de TIC ou à mitigação de riscos identificados durante a supervisão contínua.',
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'A recomendação técnica conterá:',
        incisos: [
          { rotulo: 'I', texto: 'identificação da matéria;' },
          { rotulo: 'II', texto: 'fundamentação técnica;' },
          { rotulo: 'III', texto: 'recomendações propostas;' },
          { rotulo: 'IV', texto: 'prazo para manifestação do órgão ou entidade, quando aplicável.' },
        ],
      },
      {
        rotulo: '§ 2º',
        texto: 'A recomendação técnica possui caráter orientativo e não substitui a competência decisória do órgão ou entidade responsável.',
      },
    ],
  },

  31: {
    rotulo: 'Art. 31',
    caput: 'A nota técnica será utilizada quando a matéria demandar análise especializada ou manifestação conclusiva da SGDI acerca de tema relacionado às suas competências institucionais.',
  },

  32: {
    rotulo: 'Art. 32',
    caput: 'A nota de motivação será elaborada quando, no exercício da supervisão contínua, forem identificadas irregularidades que justifiquem a comunicação ao órgão de controle interno competente, observado o disposto no inciso IV e no parágrafo único do art. 6º do Decreto nº 48.899, de 2026.',
  },

  33: {
    rotulo: 'Art. 33',
    caput: 'Identificada situação excepcional caracterizada por risco relevante à legalidade, à eficiência administrativa ou à consecução do interesse público, a unidade técnica competente poderá propor ao Secretário de Estado de Governança Digital e Integração a adoção cautelar de medida de revisão, alteração ou suspensão temporária da execução de contrato, projeto, solução ou iniciativa abrangida por esta Instrução Normativa.',
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'A proposta de que trata o caput será acompanhada de nota de motivação ou manifestação técnica que contenha, no mínimo:',
        incisos: [
          { rotulo: 'I', texto: 'a identificação do contrato, projeto, solução ou iniciativa;' },
          { rotulo: 'II', texto: 'a descrição objetiva dos fatos e dos riscos identificados;' },
          { rotulo: 'III', texto: 'a fundamentação técnica e jurídica disponível;' },
          { rotulo: 'IV', texto: 'a indicação da medida cautelar proposta e de sua abrangência;' },
          { rotulo: 'V', texto: 'os possíveis impactos decorrentes da adoção ou da não adoção da medida; e' },
          { rotulo: 'VI', texto: 'a indicação do comitê de governança competente para apreciação.' },
        ],
      },
      {
        rotulo: '§ 2º',
        texto: 'A medida cautelar será formalizada por ato motivado e decisão fundamentada do Secretário de Estado de Governança Digital e Integração, produzirá efeitos imediatos e será encaminhada ao comitê de governança competente para apreciação e deliberação no prazo de 72 horas, nos termos do art. 1°, § 3º, do Decreto nº 48.899/2026.',
      },
    ],
  },

  34: {
    rotulo: 'Art. 34',
    caput: 'Sem prejuízo das competências dos órgãos e entidades supervisionados, a SGDI poderá, no exercício da supervisão contínua:',
    incisos: [
      { rotulo: 'I', texto: 'expedir recomendações técnicas;' },
      { rotulo: 'II', texto: 'solicitar esclarecimentos ou informações complementares;' },
      { rotulo: 'III', texto: 'recomendar a submissão da matéria aos comitês competentes, quando identificados riscos ou desvios relevantes;' },
      { rotulo: 'IV', texto: 'acompanhar o atendimento das recomendações expedidas; e' },
      { rotulo: 'V', texto: 'propor ao Secretário de Estado de Governança Digital e Integração, nas hipóteses previstas no Decreto nº 48.899, de 2026, a adoção cautelar de medida de revisão, alteração ou suspensão temporária da execução de contrato, projeto, solução ou iniciativa, mediante manifestação técnica fundamentada; e' },
      { rotulo: 'VI', texto: 'comunicar ao órgão de controle interno competente irregularidades identificadas durante a supervisão contínua.' },
    ],
  },

  35: {
    rotulo: 'Art. 35',
    caput: 'A SGDI manterá mecanismo permanente de monitoramento das comunicações previstas nesta Instrução Normativa, com a finalidade de:',
    incisos: [
      { rotulo: 'I', texto: 'monitorar o cumprimento das obrigações de comunicação pelos órgãos e entidades;' },
      { rotulo: 'II', texto: 'acompanhar a evolução das contratações de TIC cujo monitoramento tenha sido priorizado pela SGDI, observados os critérios estabelecidos no § 3º do art. 11 da presente Instrução Normativa;' },
      { rotulo: 'III', texto: 'manter atualizado o Portfólio Estratégico de Contratações de TIC, observada a qualidade e a integridade das informações encaminhadas pelos órgãos e entidades;' },
      { rotulo: 'IV', texto: 'manter atualizado o Portfólio de Iniciativas de Transformação Digital do Distrito Federal;' },
      { rotulo: 'V', texto: 'acompanhar a implementação da Estratégia de Governo Digital do Distrito Federal - EGD/DF; e' },
      { rotulo: 'VI', texto: 'subsidiar a produção de informações estratégicas para apoio à tomada de decisão.' },
    ],
  },

  36: {
    rotulo: 'Art. 36',
    caput: 'As informações encaminhadas pelos órgãos e entidades na forma desta Instrução Normativa constituirão base de informações institucional da SGDI destinada ao exercício da supervisão contínua, ao monitoramento da Estratégia de Governo Digital do Distrito Federal e ao planejamento das ações de governança digital.',
  },

  37: {
    rotulo: 'Art. 37',
    caput: 'As informações poderão ser utilizadas para:',
    incisos: [
      { rotulo: 'I', texto: 'elaboração de estudos técnicos;' },
      { rotulo: 'II', texto: 'produção de indicadores;' },
      { rotulo: 'III', texto: 'elaboração de diagnósticos;' },
      { rotulo: 'IV', texto: 'avaliação da maturidade digital dos órgãos;' },
      { rotulo: 'V', texto: 'identificação de oportunidades de compartilhamento de soluções;' },
      { rotulo: 'VI', texto: 'planejamento de ações corporativas;' },
      { rotulo: 'VII', texto: 'formulação de políticas públicas.' },
    ],
  },

  38: {
    rotulo: 'Art. 38',
    caput: 'A SGDI disponibilizará painéis destinados ao acompanhamento das informações recebidas, observadas as normas relativas à transparência, à segurança da informação, à proteção de dados pessoais e ao acesso à informação.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'Os painéis conterão, dentre outras informações, indicadores consolidados, estatísticas, informações gerenciais e demais elementos necessários ao acompanhamento da governança digital do Distrito Federal.',
      },
    ],
  },

  39: {
    rotulo: 'Art. 39',
    caput: 'Os órgãos e entidades deverão manter atualizadas as informações anteriormente comunicadas à SGDI sempre que ocorrerem alterações relevantes que impactem:',
    incisos: [
      { rotulo: 'I', texto: 'o objeto da contratação;' },
      { rotulo: 'II', texto: 'o cronograma;' },
      { rotulo: 'III', texto: 'a situação da contratação;' },
      { rotulo: 'IV', texto: 'a situação da iniciativa de transformação digital;' },
      { rotulo: 'V', texto: 'os resultados esperados; ou' },
      { rotulo: 'VI', texto: 'outras informações consideradas relevantes para o monitoramento institucional.' },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'As orientações e a periodicidade de atualização serão expedidas via SEI por meio de Ofício Circular pela SGDI.',
      },
    ],
  },

  40: {
    rotulo: 'Art. 40',
    caput: 'Será considerada inadimplente a unidade que deixar de realizar as comunicações obrigatórias previstas nesta Instrução Normativa ou deixar de atender, sem justificativa, às solicitações formuladas pela SGDI no exercício da supervisão contínua.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'Antes do registro da inadimplência, a SGDI notificará o titular do órgão ou da entidade para que regularize a pendência ou apresente justificativa no prazo de 5 (cinco) dias úteis, contados do recebimento da notificação.',
      },
    ],
  },

  41: {
    rotulo: 'Art. 41',
    caput: 'Constatada a inadimplência, a SGDI poderá:',
    incisos: [
      { rotulo: 'I', texto: 'registrar a situação de inadimplência em seus sistemas de monitoramento;' },
      { rotulo: 'II', texto: 'refletir essa condição nos painéis gerenciais e instrumentos de monitoramento da governança digital; e' },
      { rotulo: 'III', texto: 'comunicar a situação ao órgão de controle interno competente, na forma do §3º do art. 7º do Decreto nº 48.899, de 2026.' },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'O status de inadimplência será removido do painel no prazo de 2 (dois) dias úteis após a regularização da comunicação pendente pelo órgão ou pela entidade, com o registro da data de saneamento.',
      },
    ],
  },

  42: {
    rotulo: 'Art. 42',
    caput: 'A SGDI poderá expedir orientações técnicas, manuais, guias, modelos, formulários e demais instrumentos complementares necessários à execução desta Instrução Normativa.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'Os instrumentos de que trata o caput poderão ser atualizados independentemente da alteração desta Instrução Normativa, desde que não impliquem inovação das obrigações nela estabelecidas.',
      },
    ],
  },

  43: {
    rotulo: 'Art. 43',
    caput: 'Os órgãos e entidades deverão observar os modelos de comunicação e os fluxos constantes dos anexos desta IN.',
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'Os anexos desta IN compreendem o rol abaixo listado: Anexo I - Formulário de Comunicação de Nova Contratação de TIC; Anexo II - Formulário de Comunicação de Alteração de Contratações de TIC Vigentes; Anexo III - Formulário de Comunicação de Iniciativas de referentes a Aquisição ou Adoção de Soluções baseadas em Inteligência Artificial; Anexo IV - Formulário de Comunicação e Supervisão Contínua de Iniciativas de Transformação Digital, e de Iniciativas Referentes à Migração, Integração, Expansão, Substituição ou Descontinuidade de Sistemas e Plataformas; Anexo V - Fluxo da Comunicação e Supervisão Contínua de Novas Contratações de TIC; Anexo VI - Fluxo da Comunicação e Supervisão Contínua de Alterações Contratuais, Prorrogações, Renovações, Revisões, Reequilíbrios ou outras modificações de Contratações Vigentes; Anexo VII - Fluxo da Comunicação e Supervisão Contínua de Iniciativas de Transformação Digital, e de Iniciativas Referentes à Migração, Integração, Expansão, Substituição ou Descontinuidade de Sistemas e Plataformas; Anexo VIII - Fluxo da Comunicação e Supervisão Contínua de Iniciativas referentes a aquisição ou adoção de soluções baseadas em inteligência artificial. Anexo IX - Fluxo da Comunicação e Supervisão Contínua de Iniciativas referentes a Sistemas e Plataformas.',
      },
      {
        rotulo: '§ 2º',
        texto: 'Os formulários de tratam os anexos I a IV estarão disponíveis para uso no Sistema Eletrônico de Informações (SEI), e a totalidade dos anexos, correspondente aos incisos I a IX - formulários e fluxos - também estará disponível no portal da SGDI para download e consulta.',
      },
      {
        rotulo: '§ 3º',
        texto: 'Eventuais alterações nos formulários e fluxos serão comunicadas aos órgãos e às entidades por meio de Ofício Circular.',
      },
    ],
  },

  44: {
    rotulo: 'Art. 44',
    caput: 'Os casos omissos serão dirimidos pela Secretaria de Estado de Governança Digital e Integração - SGDI.',
  },

  45: {
    rotulo: 'Art. 45',
    caput: 'Esta Instrução Normativa entra em vigor na data de sua publicação.',
  },
};
