/**
 * Texto integral do Decreto nº 48.901, de 03 de julho de 2026 (PGIA/DF),
 * transcrito do PDF oficial para os tooltips de citação das telas.
 * Ato normativo público, sem restrição de reprodução (Lei 9.610/98, art. 8º, IV).
 */
export interface DispositivoDecreto {
  rotulo: string;                                    // "Art. 23"
  caput: string;                                     // texto do caput, verbatim
  incisos?: { rotulo: string; texto: string }[];     // rotulo "I", "II", ...
  paragrafos?: { rotulo: string; texto: string }[];  // rotulo "§ 1º" ou "Parágrafo único"
}

export const DECRETO_48901: Record<number, DispositivoDecreto> = {
  1: {
    rotulo: 'Art. 1º',
    caput: 'Fica instituída a Política de Governança de Inteligência Artificial do Distrito Federal - PGIA/DF, com a finalidade de estabelecer princípios, diretrizes, responsabilidades e instrumentos para o desenvolvimento, a aquisição, a implantação, o uso e o monitoramento de sistemas de inteligência artificial no âmbito dos órgãos e das entidades da administração pública distrital direta, autárquica e fundacional.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'As empresas públicas e as sociedades de economia mista distritais observarão as disposições desta política no que couber, especialmente quando suas atividades envolverem a prestação de serviços públicos ao cidadão.',
      },
    ],
  },

  2: {
    rotulo: 'Art. 2º',
    caput: 'Para os fins deste Decreto, considera-se:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'sistema de inteligência artificial (IA): sistema baseado em máquina que, com graus diferentes de autonomia e para objetivos explícitos ou implícitos, infere, a partir de dados ou informações que recebe, como gerar resultados, em especial previsões, conteúdos, recomendações ou decisões, que possam influenciar ambientes virtuais, físicos ou reais;',
      },
      {
        rotulo: 'II',
        texto: 'IA generativa: sistema de IA capaz de gerar ou modificar significativamente, com diferentes graus de autonomia, texto, imagens, áudio, vídeo ou código de software;',
      },
      {
        rotulo: 'III',
        texto: 'plataformas públicas de IA generativa: ferramentas de IA generativa disponíveis ao público em geral, a título oneroso ou gratuito, não contratadas diretamente pelo GDF;',
      },
      {
        rotulo: 'IV',
        texto: 'sistema de IA de risco excessivo: sistema cujo desenvolvimento, implementação ou uso é vedado nos termos deste Decreto;',
      },
      {
        rotulo: 'V',
        texto: 'sistema de IA de alto risco: sistema cujas decisões ou recomendações podem afetar diretamente direitos, benefícios, obrigações ou liberdades de pessoas, conforme classificação prevista neste Decreto;',
      },
      {
        rotulo: 'VI',
        texto: 'conteúdo sintético: informação, como texto, imagem, vídeo ou áudio, gerada ou significativamente modificada por sistema de IA;',
      },
      {
        rotulo: 'VII',
        texto: 'avaliação de impacto algorítmico (AIA): análise prévia e contínua dos impactos sobre direitos fundamentais, com identificação de medidas preventivas, mitigadoras e de reversão dos efeitos negativos de um sistema de IA;',
      },
      {
        rotulo: 'VIII',
        texto: 'ciclo de vida do sistema de IA: conjunto de fases que abrange a concepção, o planejamento, o desenvolvimento, o treinamento, a testagem, a validação, a implantação, o monitoramento e a eventual descontinuação do sistema;',
      },
      {
        rotulo: 'IX',
        texto: 'Responsável de IA: agente público designado por órgão ou entidade para responder pelo uso responsável de sistemas de IA no âmbito de sua unidade, podendo acumular essa função com a de responsável de TIC prevista na PGTIC/DF;',
      },
      {
        rotulo: 'X',
        texto: 'Encarregado de Dados (DPO): responsável pela proteção de dados pessoais tratados pelos sistemas de IA, nos termos da LGPD;',
      },
      {
        rotulo: 'XI',
        texto: 'inventário de sistemas de IA: registro centralizado de todos os sistemas de IA em uso, em desenvolvimento ou em processo de aquisição no âmbito do GDF; e',
      },
      {
        rotulo: 'XII',
        texto: 'Subcomitê Gestor de TIC (SGTIC): estrutura de governança de TIC instituída em cada órgão ou entidade nos termos da PGTIC/DF.',
      },
    ],
  },

  3: {
    rotulo: 'Art. 3º',
    caput: 'A PGIA/DF aplica-se a todos os órgãos e entidades da administração pública direta, autárquica e fundacional do Distrito Federal, bem como a agentes públicos, estagiários e prestadores de serviço que desenvolvam, gerenciem, utilizem ou interajam com sistemas de IA em atividades relacionadas ao serviço público distrital.',
  },

  4: {
    rotulo: 'Art. 4º',
    caput: 'São fundamentos da PGIA/DF:',
    incisos: [
      { rotulo: 'I', texto: 'centralidade da pessoa humana e proteção aos seus direitos fundamentais;' },
      { rotulo: 'II', texto: 'respeito ao regime democrático e às instituições públicas;' },
      { rotulo: 'III', texto: 'igualdade, não discriminação, diversidade e inclusão;' },
      { rotulo: 'IV', texto: 'proteção de dados pessoais e privacidade;' },
      { rotulo: 'V', texto: 'desenvolvimento socioeconômico, científico e tecnológico;' },
      { rotulo: 'VI', texto: 'soberania digital e autonomia tecnológica do Distrito Federal; e' },
      { rotulo: 'VII', texto: 'sustentabilidade socioambiental e bem-estar.' },
    ],
  },

  5: {
    rotulo: 'Art. 5º',
    caput: 'A PGIA/DF observará os seguintes princípios:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'benefício público: os sistemas de IA devem ser implantados em benefício da sociedade e do interesse público;',
      },
      {
        rotulo: 'II',
        texto: 'supervisão e responsabilidade humana: a tomada de decisão final em matéria administrativa permanece sob responsabilidade do agente público competente, sendo a IA instrumento de apoio;',
      },
      {
        rotulo: 'III',
        texto: 'transparência e explicabilidade: os cidadãos têm direito de saber quando uma decisão foi apoiada ou assistida por IA e de receber explicação compreensível sobre seus fundamentos;',
      },
      {
        rotulo: 'IV',
        texto: 'equidade e não discriminação: os sistemas de IA não devem produzir resultados discriminatórios ou violar o princípio da isonomia;',
      },
      {
        rotulo: 'V',
        texto: 'proteção de dados e privacidade: o uso de IA observará a LGPD e as normas de proteção de dados pessoais vigentes;',
      },
      {
        rotulo: 'VI',
        texto: 'segurança, confiabilidade e robustez: os sistemas devem ser resilientes e seguros, e estar sujeitos a testes e auditorias regulares;',
      },
      {
        rotulo: 'VII',
        texto: 'proporcionalidade: o nível de controle deve ser proporcional ao grau de risco do sistema;',
      },
      {
        rotulo: 'VIII',
        texto: 'auditabilidade: os sistemas de IA devem permitir verificação e avaliação ao longo de todo o seu ciclo de vida;',
      },
      {
        rotulo: 'IX',
        texto: 'inovação responsável: as normas e os instrumentos desta política devem favorecer a inovação sem comprometer direitos fundamentais; e',
      },
      {
        rotulo: 'X',
        texto: 'alinhamento estratégico: as iniciativas de IA devem estar subordinadas às prioridades do GDF estabelecidas na Estratégia de Governança Digital do Distrito Federal - EGD/DF e no Plano Estratégico de TIC do Distrito Federal - PETIC/DF.',
      },
    ],
  },

  6: {
    rotulo: 'Art. 6º',
    caput: 'A governança da PGIA/DF é exercida pelos seguintes órgãos e instâncias:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'Comitê Gestor de Tecnologia da Informação e Comunicação do Distrito Federal - CGTIC, como instância deliberativa superior;',
      },
      {
        rotulo: 'II',
        texto: 'Secretaria de Estado de Governança Digital e Integração do Distrito Federal - SGDI, como órgão central de formulação, normatização e supervisão da política;',
      },
      {
        rotulo: 'III',
        texto: 'Subcomitês Gestores de TIC - SGTIC, instâncias de governança setorial nos órgãos e entidades;',
      },
      { rotulo: 'IV', texto: 'Responsáveis de IA, designados em cada órgão e entidade;' },
      {
        rotulo: 'V',
        texto: 'Encarregados de Dados (DPO), designados em cada órgão e entidade, nos termos da LGPD;',
      },
      {
        rotulo: 'VI',
        texto: 'Fundação de Apoio à Pesquisa do Distrito Federal - FAPDF, como parceira institucional de suporte técnico-científico;',
      },
      {
        rotulo: 'VII',
        texto: 'agentes públicos, estagiários e prestadores de serviço que desenvolvam, gerenciem, utilizem ou interajam com sistemas de IA no âmbito do GDF.',
      },
    ],
  },

  7: {
    rotulo: 'Art. 7º',
    caput: 'Compete ao CGTIC, no âmbito da PGIA/DF, em complemento às atribuições previstas na PGTIC/DF:',
    incisos: [
      { rotulo: 'I', texto: 'conduzir o processo de elaboração, revisão e disseminação da PGIA/DF;' },
      {
        rotulo: 'II',
        texto: 'aprovar as diretrizes estratégicas e os planos de ação relativos ao uso de IA no GDF;',
      },
      {
        rotulo: 'III',
        texto: 'classificar sistemas de IA como de alto risco, mediante proposta fundamentada da SGDI;',
      },
      {
        rotulo: 'IV',
        texto: 'deliberar sobre a aquisição e a adoção de sistemas de IA de Alto Risco pelos órgãos e entidades do GDF, vedada a contratação sem prévia aprovação do Comitê;',
      },
      {
        rotulo: 'V',
        texto: 'estabelecer os critérios e os requisitos mínimos para aquisição de sistemas de IA;',
      },
      { rotulo: 'VI', texto: 'constituir grupos de trabalho temáticos sobre inteligência artificial;' },
      {
        rotulo: 'VII',
        texto: 'apreciar o Relatório Anual de Governança de IA do Distrito Federal; e',
      },
      {
        rotulo: 'VIII',
        texto: 'expedir resoluções normativas sobre o uso ético, responsável, seguro e transparente de sistemas de IA, observadas as normas de proteção de dados, segurança da informação e governança digital.',
      },
    ],
  },

  8: {
    rotulo: 'Art. 8º',
    caput: 'Cabe à SGDI, como órgão central da PGIA/DF, no âmbito das competências que lhe são atribuídas:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'formular, normatizar e supervisionar a implementação da PGIA/DF em todos os órgãos e entidades do GDF;',
      },
      {
        rotulo: 'II',
        texto: 'manter e publicar o Inventário Centralizado de Sistemas de IA do GDF, integrado ao Ecossistema Central de Dados do Distrito Federal;',
      },
      {
        rotulo: 'III',
        texto: 'elaborar e atualizar normas técnicas, guias e instruções normativas complementares a este Decreto;',
      },
      {
        rotulo: 'IV',
        texto: 'homologar, por ato próprio, as plataformas e ferramentas de IA destinadas ao uso pelos agentes públicos do GDF, publicando e mantendo atualizada a relação das homologadas, com indicação das aptas ao tratamento de informações sigilosas ou dados pessoais, observadas as diretrizes estabelecidas pelo CGTIC;',
      },
      {
        rotulo: 'V',
        texto: 'propor ao CGTIC a classificação de sistemas de IA e os critérios para aquisição;',
      },
      {
        rotulo: 'VI',
        texto: 'formular e supervisionar programas de capacitação em IA para agentes públicos do GDF, em articulação com os órgãos competentes;',
      },
      {
        rotulo: 'VII',
        texto: 'publicar anualmente o Relatório de Governança de IA do Distrito Federal;',
      },
      {
        rotulo: 'VIII',
        texto: 'emitir recomendações técnicas aos órgãos e entidades em matéria de inteligência artificial;',
      },
      {
        rotulo: 'IX',
        texto: 'receber, apurar e encaminhar ao órgão competente as comunicações de incidentes graves envolvendo sistemas de IA no âmbito do GDF; e',
      },
      {
        rotulo: 'X',
        texto: 'comunicar ao órgão de controle interno competente as irregularidades identificadas no exercício da supervisão da PGIA/DF.',
      },
    ],
  },

  9: {
    rotulo: 'Art. 9º',
    caput: 'Os Subcomitês Gestores de TIC, instituídos nos órgãos e entidades nos termos da PGTIC/DF, exercerão, no âmbito da PGIA/DF, as seguintes atribuições setoriais:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'analisar os processos de adoção de sistemas de IA na respectiva unidade, observadas as diretrizes da SGDI e as deliberações do CGTIC, encaminhando ao Comitê os casos de Alto Risco para deliberação;',
      },
      {
        rotulo: 'II',
        texto: 'acompanhar o cumprimento das obrigações decorrentes desta política no âmbito do órgão ou entidade, reportando à SGDI as situações de não conformidade identificadas;',
      },
      {
        rotulo: 'III',
        texto: 'encaminhar à SGDI, por meio do Sistema Eletrônico de Informações - SEI, as informações necessárias à alimentação do Inventário Centralizado de Sistemas de IA, nos prazos e formatos definidos em norma complementar; e',
      },
      {
        rotulo: 'IV',
        texto: 'apoiar a realização de Avaliações de Impacto Algorítmico nos sistemas sob sua responsabilidade.',
      },
    ],
  },

  10: {
    rotulo: 'Art. 10',
    caput: 'Cada órgão e entidade do GDF designará, por portaria ou ato equivalente, ao menos um Responsável de IA, a quem incumbe:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'liderar o uso responsável de sistemas de IA no âmbito de sua unidade, zelando pela conformidade com as diretrizes desta política;',
      },
      {
        rotulo: 'II',
        texto: 'manter o registro setorial dos sistemas de IA em uso e remetê-lo à SGDI para inclusão no Inventário Centralizado, conforme procedimentos definidos em regulamento;',
      },
      {
        rotulo: 'III',
        texto: 'assegurar que os agentes públicos da unidade recebam a capacitação adequada para o uso responsável de IA;',
      },
      {
        rotulo: 'IV',
        texto: 'comunicar à SGDI, por meio do Sistema Eletrônico de Informações - SEI, incidentes, falhas ou riscos identificados nos sistemas de IA de sua unidade;',
      },
      {
        rotulo: 'V',
        texto: 'promover a realização de Avaliações de Impacto Algorítmico nos sistemas sob sua responsabilidade;',
      },
      {
        rotulo: 'VI',
        texto: 'atuar como interlocutor institucional do órgão junto à SGDI em matéria de inteligência artificial; e',
      },
      {
        rotulo: 'VII',
        texto: 'promover a cultura de uso ético e responsável de IA no âmbito do órgão, disseminando boas práticas entre os agentes públicos.',
      },
    ],
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'A designação do Responsável de IA deverá ser comunicada à SGDI, por meio do SEI, em até trinta dias após a publicação deste Decreto, e sempre que houver alteração.',
      },
      {
        rotulo: '§ 2º',
        texto: 'A função de Responsável de IA poderá ser exercida pelo responsável de TIC do órgão ou entidade, desde que haja capacitação adequada, vedada a acumulação que comprometa o exercício de ambas as funções.',
      },
    ],
  },

  11: {
    rotulo: 'Art. 11',
    caput: 'O Encarregado de Dados designado por cada órgão e entidade nos termos da LGPD, no contexto da PGIA/DF, atuará em articulação com o Responsável de IA para:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'verificar a conformidade dos sistemas de IA com a LGPD e com as normas de proteção de dados aplicáveis;',
      },
      {
        rotulo: 'II',
        texto: 'analisar os relatórios de impacto à proteção de dados pessoais relativos a sistemas de IA, que poderão ser elaborados em conjunto com a Avaliação de Impacto Algorítmico;',
      },
      {
        rotulo: 'III',
        texto: 'orientar os órgãos sobre o tratamento de dados pessoais em sistemas de IA; e',
      },
      {
        rotulo: 'IV',
        texto: 'receber e encaminhar reclamações de titulares de dados relacionadas ao uso de IA pelo GDF.',
      },
    ],
  },

  12: {
    rotulo: 'Art. 12',
    caput: 'A Fundação de Apoio à Pesquisa do Distrito Federal - FAP/DF, na qualidade de gestora do Centro de Inteligência Artificial do Distrito Federal e órgão consultivo vinculado à SGDI, atuará no âmbito da PGIA/DF para:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'fornecer suporte técnico-científico para a realização de Avaliações de Impacto Algorítmico e auditorias técnicas de sistemas de IA de Alto Risco;',
      },
      {
        rotulo: 'II',
        texto: 'apoiar o desenvolvimento e a oferta das trilhas formativas do ProCapIA/DF, em articulação com a SGDI;',
      },
      {
        rotulo: 'III',
        texto: 'realizar provas de conceito e pesquisas aplicadas em inteligência artificial de interesse da administração pública distrital;',
      },
      {
        rotulo: 'IV',
        texto: 'disponibilizar infraestrutura tecnológica e conhecimento especializado para o apoio às iniciativas de governança de IA desenvolvidas no âmbito deste Decreto.',
      },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'A atuação da FAPDF no âmbito da PGIA/DF observará as diretrizes estabelecidas pela SGDI, sem prejuízo das competências que lhe são atribuídas em sua legislação instituidora.',
      },
    ],
  },

  13: {
    rotulo: 'Art. 13',
    caput: 'Os agentes públicos, estagiários e prestadores de serviço que desenvolvam, gerenciem, utilizem ou interajam com sistemas de IA no âmbito do GDF devem:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'zelar pela segurança das informações sob sua responsabilidade, adotando práticas de proteção, prevenção e comunicação de incidentes às unidades competentes;',
      },
      {
        rotulo: 'II',
        texto: 'notificar o Responsável de IA sobre incidentes envolvendo sistemas de IA que causem ou possam causar danos a direitos ou à prestação de serviços públicos;',
      },
      {
        rotulo: 'III',
        texto: 'responsabilizar-se pelas informações inseridas ou compartilhadas com sistemas de IA;',
      },
      {
        rotulo: 'IV',
        texto: 'registrar explicitamente o uso de sistema de IA nos produtos, documentos ou atividades deles decorrentes, assegurando a rastreabilidade e a supervisão administrativa; e',
      },
      {
        rotulo: 'V',
        texto: 'utilizar sistemas de IA de forma ética, responsável e alinhada às finalidades públicas, exercendo supervisão humana e revisão crítica dos resultados gerados antes de qualquer divulgação, tomada de decisão ou uso administrativo.',
      },
    ],
  },

  14: {
    rotulo: 'Art. 14',
    caput: 'Os sistemas de IA utilizados no âmbito do GDF são classificados nas seguintes categorias, conforme o grau de risco que representam para os direitos e interesses das pessoas:',
    incisos: [
      { rotulo: 'I', texto: 'Risco Excessivo: sistemas proibidos, nos termos do art. 15;' },
      {
        rotulo: 'II',
        texto: 'Alto Risco: sistemas sujeitos à avaliação de impacto algorítmico e à aprovação prévia do CGTIC, nos termos do art. 16;',
      },
      {
        rotulo: 'III',
        texto: 'Risco Moderado: sistemas sujeitos a requisitos de transparência e registro, nos termos do art. 17; e',
      },
      {
        rotulo: 'IV',
        texto: 'Baixo Risco: sistemas de uso livre pelos agentes públicos, sujeitos apenas ao registro no inventário do órgão, nos termos do art. 18.',
      },
    ],
  },

  15: {
    rotulo: 'Art. 15',
    caput: 'São classificados como de Risco Excessivo e ficam vedados no âmbito do GDF os sistemas de IA que:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'tenham o propósito de instigar ou induzir o comportamento de pessoa ou grupo de forma a causar danos à saúde, à segurança ou a outros direitos fundamentais;',
      },
      {
        rotulo: 'II',
        texto: 'explorem vulnerabilidades de pessoas ou grupos com o objetivo de induzir seu comportamento de maneira a causar danos a direitos fundamentais;',
      },
      {
        rotulo: 'III',
        texto: 'promovam pontuação ou ranqueamento de pessoas com base em seu comportamento social ou atributos de personalidade para o acesso a bens, serviços ou políticas públicas, de forma ilegítima ou desproporcional;',
      },
      {
        rotulo: 'IV',
        texto: 'realizem identificação biométrica à distância, em tempo real e em espaços públicos, ressalvadas as hipóteses expressamente autorizadas em lei e mediante decisão judicial fundamentada;',
      },
      {
        rotulo: 'V',
        texto: 'possibilitem ou facilitem a criação de material que caracterize abuso ou exploração sexual de crianças e adolescentes; e',
      },
      {
        rotulo: 'VI',
        texto: 'realizem avaliação ou predição de risco de cometimento de infrações com base em características pessoais ou comportamentais de indivíduos.',
      },
    ],
  },

  16: {
    rotulo: 'Art. 16',
    caput: 'São classificados como de Alto Risco os sistemas de IA utilizados em:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'concessão, revisão, suspensão ou cancelamento de benefícios sociais ou serviços públicos essenciais ao cidadão;',
      },
      {
        rotulo: 'II',
        texto: 'avaliações determinantes em processos seletivos de acesso a instituições de ensino ou de formação profissional;',
      },
      {
        rotulo: 'III',
        texto: 'recrutamento, triagem, avaliação de desempenho, promoção ou cessação de vínculo de agentes públicos;',
      },
      {
        rotulo: 'IV',
        texto: 'apoio a diagnósticos ou procedimentos de saúde com risco relevante à integridade física ou mental das pessoas;',
      },
      {
        rotulo: 'V',
        texto: 'gestão e funcionamento de infraestruturas críticas, tais como controle de trânsito, redes de abastecimento de água e eletricidade;',
      },
      {
        rotulo: 'VI',
        texto: 'fiscalização e autuação automatizada de pessoas físicas ou jurídicas;',
      },
      {
        rotulo: 'VII',
        texto: 'apoio a decisões administrativas com efeitos jurídicos relevantes sobre direitos individuais;',
      },
      {
        rotulo: 'VIII',
        texto: 'identificação e autenticação biométrica para controle de acesso a serviços públicos essenciais; e',
      },
      {
        rotulo: 'IX',
        texto: 'análise preditiva de comportamentos individuais para fins de segurança pública ou assistência social.',
      },
    ],
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'Os sistemas de Alto Risco somente poderão ser implantados após a realização de Avaliação de Impacto Algorítmico, deliberação favorável do CGTIC e publicação dos resultados da AIA no Portal da Transparência do Distrito Federal.',
      },
      {
        rotulo: '§ 2º',
        texto: 'O CGTIC poderá ampliar a relação de sistemas de Alto Risco mediante resolução fundamentada, observada a evolução tecnológica e normativa.',
      },
    ],
  },

  17: {
    rotulo: 'Art. 17',
    caput: 'São classificados como de Risco Moderado os sistemas de IA que:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'interagem com cidadãos por meio de assistentes virtuais ou canais automatizados de atendimento;',
      },
      {
        rotulo: 'II',
        texto: 'produzem ou distribuem conteúdo informativo ou educativo direcionado ao público;',
      },
      {
        rotulo: 'III',
        texto: 'fornecem recomendações a agentes públicos, sem poder decisório autônomo; e',
      },
      {
        rotulo: 'IV',
        texto: 'geram conteúdo sintético para comunicação institucional do GDF.',
      },
    ],
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'Os sistemas de Risco Moderado devem informar ao usuário, de forma clara e acessível, que está interagindo com um sistema de IA ou que o conteúdo foi gerado ou significativamente modificado por IA.',
      },
      {
        rotulo: '§ 2º',
        texto: 'Os conteúdos sintéticos produzidos por sistemas de IA no âmbito do GDF devem conter, quando tecnicamente viável, identificador de autenticidade, na forma de norma complementar da SGDI.',
      },
    ],
  },

  18: {
    rotulo: 'Art. 18',
    caput: 'São classificados como de Baixo Risco os demais sistemas de IA que não se enquadrem nas categorias anteriores, incluindo ferramentas de apoio à produtividade interna, assistentes de redação para uso exclusivo de agentes públicos e sistemas de análise de dados internos sem impacto direto sobre direitos de pessoas.',
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'O uso de plataformas públicas de IA generativa pelos agentes públicos do GDF limita-se ao tratamento de informações de caráter público, sendo vedado o compartilhamento de dados sigilosos, dados pessoais de cidadãos e dados pessoais sensíveis.',
      },
      {
        rotulo: '§ 2º',
        texto: 'O uso de plataformas públicas de IA generativa para tratamento de dados não públicos poderá ser excepcionalmente autorizado pela SGDI, mediante avaliação prévia de riscos e verificação de garantias técnicas e contratuais de segurança e confidencialidade.',
      },
    ],
  },

  19: {
    rotulo: 'Art. 19',
    caput: 'O uso de sistemas de IA no âmbito do GDF deve observar integralmente a LGPD e as normas de proteção de dados pessoais, em especial quanto a:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'base legal: toda operação de tratamento de dados pessoais em sistemas de IA deve ter base legal expressa, nos termos do art. 23 da LGPD;',
      },
      {
        rotulo: 'II',
        texto: 'minimização: utilização apenas dos dados estritamente necessários à finalidade do sistema;',
      },
      {
        rotulo: 'III',
        texto: 'finalidade: vedação ao uso de dados coletados para uma finalidade em sistemas de IA com finalidade diversa; e',
      },
      {
        rotulo: 'IV',
        texto: 'segurança: adoção de medidas técnicas e administrativas adequadas para a proteção dos dados, em conformidade com os padrões definidos pela SGDI.',
      },
    ],
  },

  20: {
    rotulo: 'Art. 20',
    caput: 'É vedado aos órgãos e entidades do GDF e aos agentes públicos inserir dados pessoais de cidadãos, dados sigilosos ou dados pessoais sensíveis em plataformas públicas de IA generativa não homologadas pela SGDI para esse fim.',
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'A violação do disposto no caput sujeitará o agente público às responsabilizações previstas na legislação aplicável, sem prejuízo das medidas administrativas cabíveis.',
      },
    ],
  },

  21: {
    rotulo: 'Art. 21',
    caput: 'Os contratos de aquisição de sistemas de IA deverão conter cláusula que vede expressamente o uso dos dados do GDF para o treinamento de modelos de IA pelo fornecedor, salvo autorização formal do órgão contratante, aprovada pelo CGTIC.',
  },

  22: {
    rotulo: 'Art. 22',
    caput: 'A Avaliação de Impacto Algorítmico dos sistemas de Alto Risco poderá ser elaborada em conjunto com o Relatório de Impacto à Proteção de Dados Pessoais previsto na LGPD, devendo, nesse caso, contemplar os requisitos de ambos os instrumentos.',
  },

  23: {
    rotulo: 'Art. 23',
    caput: 'Todo cidadão afetado por sistema de IA utilizado pelo GDF tem direito de:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'ser informado quando uma decisão administrativa que o afete tenha sido produzida ou influenciada por sistema de IA;',
      },
      {
        rotulo: 'II',
        texto: 'solicitar a revisão, por agente público competente, de decisão produzida ou influenciada por sistema de IA de Alto Risco;',
      },
      {
        rotulo: 'III',
        texto: 'obter explicação compreensível, em linguagem simples e acessível, sobre os critérios utilizados pelo sistema de IA na decisão que o afete; e',
      },
      {
        rotulo: 'IV',
        texto: 'apresentar impugnação quando identificar discriminação ou erro decorrente do uso de sistema de IA.',
      },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'Os sistemas de IA destinados a grupos em situação de vulnerabilidade, em especial crianças, adolescentes, idosos e pessoas com deficiência, deverão adotar linguagem simples e clara, garantida a acessibilidade digital nos termos da legislação aplicável.',
      },
    ],
  },

  24: {
    rotulo: 'Art. 24',
    caput: 'A SGDI manterá, no Portal da Transparência do Distrito Federal, o Registro Público de Sistemas de IA, com as seguintes informações sobre cada sistema:',
    incisos: [
      { rotulo: 'I', texto: 'denominação, finalidade e órgão responsável;' },
      { rotulo: 'II', texto: 'classificação de risco;' },
      { rotulo: 'III', texto: 'natureza das decisões suportadas e efeitos sobre o cidadão;' },
      {
        rotulo: 'IV',
        texto: 'resultado da Avaliação de Impacto Algorítmico, para os sistemas de Alto Risco, observados os segredos comerciais e industriais; e',
      },
      { rotulo: 'V', texto: 'indicadores de desempenho e monitoramento.' },
    ],
  },

  25: {
    rotulo: 'Art. 25',
    caput: 'As aquisições de sistemas de IA pelos órgãos e entidades do GDF observarão, além das normas de licitação vigentes, os critérios e requisitos estabelecidos pelo CGTIC, graduados conforme a classificação de risco, nos seguintes termos:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'para sistemas de Alto Risco: a) previsão no Plano Diretor de Tecnologia da Informação e Comunicação - PDTIC do órgão ou entidade; b) realização de Avaliação de Impacto Algorítmico prévia à abertura do processo licitatório; c) deliberação favorável do CGTIC, vedada a contratação sem prévia aprovação do Comitê; d) publicação do resultado da AIA no Portal da Transparência do Distrito Federal;',
      },
      {
        rotulo: 'II',
        texto: 'para sistemas de Risco Moderado: a) previsão no PDTIC do órgão ou entidade; b) homologação técnica prévia pela SGDI; c) atendimento aos requisitos técnicos estabelecidos pela SGDI em norma complementar;',
      },
      {
        rotulo: 'III',
        texto: 'para sistemas de Baixo Risco: a) registro no inventário setorial de sistemas de IA do órgão ou entidade, com comunicação à SGDI; b) atendimento às diretrizes de uso estabelecidas pela SGDI.',
      },
    ],
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'Independentemente da classificação de risco, todas as aquisições de sistemas de IA deverão observar os seguintes requisitos: a) explicabilidade: o fornecedor deve documentar, de forma auditável, como o sistema produz seus resultados; b) auditabilidade: o GDF, ou terceiros por ele designados, deve ter acesso aos registros de operação e decisão do sistema; c) portabilidade e interoperabilidade: os dados gerados devem poder ser exportados em formato aberto, em conformidade com os padrões definidos pela SGDI; d) vedação ao aprisionamento tecnológico: os contratos não podem impedir a migração para outro fornecedor, devendo assegurar plena portabilidade de dados e configurações; e) vedação expressa ao uso dos dados do GDF para treinamento de modelos de IA pelo fornecedor, salvo autorização formal do órgão contratante aprovada pelo CGTIC; f) compatibilidade com os padrões de acessibilidade digital definidos pela SGDI.',
      },
      {
        rotulo: '§ 2º',
        texto: 'Os contratos de Alto Risco incluirão, adicionalmente, cláusula de auditoria independente, admitindo revisão periódica por entidade externa ao fornecedor, e Acordo de Nível de Serviço com indicadores de desempenho, acurácia, equidade e disponibilidade, com previsão de penalidades.',
      },
    ],
  },

  26: {
    rotulo: 'Art. 26',
    caput: 'A SGDI elaborará o Guia de Contratações de Inteligência Artificial do Distrito Federal, submetendo-o à aprovação do CGTIC antes de sua publicação.',
    paragrafos: [
      {
        rotulo: '§ 1º',
        texto: 'O Guia é de observância obrigatória pelos órgãos e entidades do GDF e conterá os requisitos técnicos, as cláusulas contratuais e os procedimentos aplicáveis à aquisição de sistemas de IA, graduados conforme a classificação de risco.',
      },
      {
        rotulo: '§ 2º',
        texto: 'O Guia será revisado periodicamente pela SGDI e as atualizações que impliquem alteração de requisitos obrigatórios serão submetidas à aprovação do CGTIC antes de sua publicação.',
      },
      {
        rotulo: '§ 3º',
        texto: 'O prazo para elaboração do Guia de que trata o caput será de 180 dias a partir da publicação deste Decreto.',
      },
    ],
  },

  27: {
    rotulo: 'Art. 27',
    caput: 'É vedada a contratação de sistemas de IA redundantes ou não interoperáveis com os padrões e as soluções corporativas definidos pela SGDI, nos termos do regime de supervisão contínua estabelecido em normativo que dispõe sobre as competências da Secretaria.',
  },

  28: {
    rotulo: 'Art. 28',
    caput: 'A SGDI promoverá, em articulação com os órgãos competentes, o Programa de Capacitação em Inteligência Artificial para o Serviço Público do Distrito Federal - ProCapIA/DF.',
  },

  29: {
    rotulo: 'Art. 29',
    caput: 'O ProCapIA/DF contemplará, no mínimo, os seguintes níveis de formação:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'letramento em IA: formação de nivelamento destinada aos agentes públicos que utilizem sistemas de IA em suas atividades, a ser promovida pelos órgãos e entidades no âmbito de seus planos de capacitação;',
      },
      {
        rotulo: 'II',
        texto: 'uso responsável de IA: formação direcionada aos agentes públicos responsáveis pela supervisão, pelo gerenciamento ou pela contratação de sistemas de IA, voltada à identificação de oportunidades, à avaliação de riscos e ao acompanhamento de projetos;',
      },
      {
        rotulo: 'III',
        texto: 'governança de IA: formação avançada destinada aos Responsáveis de IA, aos Encarregados de Dados e aos membros dos Subcomitês Gestores de TIC, com foco em gestão de riscos, conformidade normativa e avaliação de impacto algorítmico; e',
      },
      {
        rotulo: 'IV',
        texto: 'desenvolvimento e auditoria de sistemas de IA: capacitação técnica destinada aos agentes públicos das áreas de TIC que atuem no desenvolvimento, na implantação ou na auditoria de sistemas de IA.',
      },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'Os planos de capacitação dos órgãos e entidades, elaborados no âmbito de seus Planos Diretores de TIC, deverão contemplar as trilhas formativas do ProCapIA/DF.',
      },
    ],
  },

  30: {
    rotulo: 'Art. 30',
    caput: 'Os órgãos e entidades do GDF comunicarão à SGDI, por meio do SEI, em prazo a ser estabelecido em norma complementar, a ocorrência de incidente grave envolvendo sistema de IA, incluindo:',
    incisos: [
      { rotulo: 'I', texto: 'riscos à vida, à integridade física ou à saúde de pessoas;' },
      { rotulo: 'II', texto: 'violações relevantes a direitos fundamentais de cidadãos;' },
      {
        rotulo: 'III',
        texto: 'falhas que causem ou possam causar interrupção de serviços públicos essenciais;',
      },
      {
        rotulo: 'IV',
        texto: 'vazamento ou acesso indevido a dados pessoais tratados pelo sistema; e',
      },
      { rotulo: 'V', texto: 'resultados discriminatórios de caráter sistêmico.' },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'A SGDI apurará a gravidade do incidente e poderá recomendar ao órgão, ou propor ao CGTIC, a adoção de medidas corretivas, inclusive a suspensão do sistema.',
      },
    ],
  },

  31: {
    rotulo: 'Art. 31',
    caput: 'Compete à SGDI realizar o monitoramento permanente da PGIA/DF, com base em indicadores de desempenho, adoção, conformidade e impacto dos sistemas de IA no GDF, em consonância com o modelo de supervisão contínua estabelecido em normativo que dispõe sobre as competências da Secretaria.',
  },

  32: {
    rotulo: 'Art. 32',
    caput: 'Os órgãos e entidades do GDF encaminharão à SGDI, por meio do SEI, relatório semestral sobre o uso de sistemas de IA, contendo:',
    incisos: [
      {
        rotulo: 'I',
        texto: 'relação dos sistemas em operação, com respectiva classificação de risco;',
      },
      { rotulo: 'II', texto: 'incidentes registrados e medidas adotadas;' },
      { rotulo: 'III', texto: 'indicadores de desempenho dos sistemas de Alto Risco;' },
      { rotulo: 'IV', texto: 'situação da capacitação dos agentes públicos; e' },
      { rotulo: 'V', texto: 'atualizações no inventário de sistemas de IA.' },
    ],
    paragrafos: [
      {
        rotulo: 'Parágrafo único',
        texto: 'Os órgãos e entidades que não encaminharem o relatório no prazo terão seu status de inadimplência registrado no painel analítico da SGDI e comunicado ao órgão de controle interno competente.',
      },
    ],
  },

  33: {
    rotulo: 'Art. 33',
    caput: 'A SGDI publicará, até 31 de março de cada ano, o Relatório Anual de Governança de IA do Distrito Federal, contendo:',
    incisos: [
      { rotulo: 'I', texto: 'panorama do uso de IA no GDF, por órgão e nível de risco;' },
      { rotulo: 'II', texto: 'resultados das auditorias realizadas;' },
      { rotulo: 'III', texto: 'indicadores de conformidade com esta política;' },
      { rotulo: 'IV', texto: 'incidentes graves registrados e medidas adotadas;' },
      { rotulo: 'V', texto: 'recomendações de aprimoramento; e' },
      {
        rotulo: 'VI',
        texto: 'agenda de inovação responsável em IA para o exercício seguinte.',
      },
    ],
  },

  34: {
    rotulo: 'Art. 34',
    caput: 'Os sistemas de IA de Alto Risco poderão ser submetidos a auditorias técnicas periódicas, na forma e periodicidade definidas pelo CGTIC, com resultado publicado no Portal da Transparência do Distrito Federal.',
  },

  35: {
    rotulo: 'Art. 35',
    caput: 'Os órgãos e entidades do GDF observarão os seguintes prazos para adequação a este Decreto, contados da data de sua publicação:',
    incisos: [
      {
        rotulo: 'I',
        texto: '30 dias: designação e comunicação à SGDI dos Responsáveis de IA e Encarregados de Dados;',
      },
      {
        rotulo: 'II',
        texto: '90 dias: elaboração e remessa do inventário inicial de sistemas de IA em uso;',
      },
      {
        rotulo: 'III',
        texto: '180 dias: inclusão das trilhas formativas do ProCapIA/DF nos planos de capacitação dos órgãos e entidades;',
      },
      {
        rotulo: 'IV',
        texto: '365 dias: conclusão das Avaliações de Impacto Algorítmico dos sistemas de Alto Risco já em operação na data de publicação deste Decreto e publicação de seus resultados no Portal da Transparência do Distrito Federal.',
      },
    ],
  },

  36: {
    rotulo: 'Art. 36',
    caput: 'A SGDI e o CGTIC, no âmbito de suas competências, poderão expedir normas complementares necessárias à execução deste Decreto.',
  },

  37: {
    rotulo: 'Art. 37',
    caput: 'Os atos normativos e contratos celebrados anteriormente à publicação deste Decreto deverão ser revisados e, se necessário, adequados às suas disposições no prazo de 180 dias, em especial quanto às cláusulas relativas ao tratamento de dados para treinamento de modelos de IA.',
  },

  38: {
    rotulo: 'Art. 38',
    caput: 'As despesas decorrentes da execução deste Decreto correrão à conta das dotações orçamentárias consignadas anualmente aos órgãos e entidades envolvidos, observadas a disponibilidade orçamentária e a programação financeira.',
  },

  39: {
    rotulo: 'Art. 39',
    caput: 'Este Decreto entra em vigor na data de sua publicação.',
  },
};
