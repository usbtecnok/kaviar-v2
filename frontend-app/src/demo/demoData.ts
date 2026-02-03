// Demo Data - Dados realistas para demonstração
// Não inflar números - manter plausível para pré-lançamento

export const demoData = {
  // KPIs Dashboard
  kpis: {
    bairrosMapeados: 162, // Real
    motoristasAtivos: 28,
    motoristasPendentes: 9,
    corridasDemo: 247, // Últimos 30 dias
    eventosCompliance: 6,
    corridasMes: 247,
    receitaMes: 6669.00, // 247 × R$15 × 18%
  },

  // Corridas por dia (últimos 30 dias)
  corridasPorDia: [
    { data: '2026-01-05', corridas: 4 },
    { data: '2026-01-06', corridas: 5 },
    { data: '2026-01-07', corridas: 3 },
    { data: '2026-01-08', corridas: 6 },
    { data: '2026-01-09', corridas: 7 },
    { data: '2026-01-10', corridas: 5 },
    { data: '2026-01-11', corridas: 4 },
    { data: '2026-01-12', corridas: 8 },
    { data: '2026-01-13', corridas: 9 },
    { data: '2026-01-14', corridas: 7 },
    { data: '2026-01-15', corridas: 6 },
    { data: '2026-01-16', corridas: 8 },
    { data: '2026-01-17', corridas: 10 },
    { data: '2026-01-18', corridas: 9 },
    { data: '2026-01-19', corridas: 7 },
    { data: '2026-01-20', corridas: 11 },
    { data: '2026-01-21', corridas: 8 },
    { data: '2026-01-22', corridas: 9 },
    { data: '2026-01-23', corridas: 10 },
    { data: '2026-01-24', corridas: 8 },
    { data: '2026-01-25', corridas: 7 },
    { data: '2026-01-26', corridas: 9 },
    { data: '2026-01-27', corridas: 12 },
    { data: '2026-01-28', corridas: 10 },
    { data: '2026-01-29', corridas: 11 },
    { data: '2026-01-30', corridas: 9 },
    { data: '2026-01-31', corridas: 8 },
    { data: '2026-02-01', corridas: 10 },
    { data: '2026-02-02', corridas: 11 },
    { data: '2026-02-03', corridas: 9 },
  ],

  // Motoristas (lista simplificada)
  motoristas: [
    { id: 1, nome: 'João Silva', status: 'ativo', avaliacao: 4.8, corridas: 42, comunidade: 'Rocinha' },
    { id: 2, nome: 'Maria Santos', status: 'ativo', avaliacao: 4.9, corridas: 38, comunidade: 'Rocinha' },
    { id: 3, nome: 'Pedro Costa', status: 'ativo', avaliacao: 4.7, corridas: 35, comunidade: 'Vidigal' },
    { id: 4, nome: 'Ana Oliveira', status: 'ativo', avaliacao: 4.8, corridas: 31, comunidade: 'Rocinha' },
    { id: 5, nome: 'Carlos Souza', status: 'ativo', avaliacao: 4.6, corridas: 28, comunidade: 'Complexo do Alemão' },
    { id: 6, nome: 'Juliana Lima', status: 'ativo', avaliacao: 4.9, corridas: 26, comunidade: 'Maré' },
    { id: 7, nome: 'Roberto Alves', status: 'ativo', avaliacao: 4.7, corridas: 24, comunidade: 'Rocinha' },
    { id: 8, nome: 'Fernanda Rocha', status: 'ativo', avaliacao: 4.8, corridas: 22, comunidade: 'Vidigal' },
    // ... mais 20 motoristas
  ],

  // Motoristas pendentes
  motoristasPendentes: [
    { id: 101, nome: 'Lucas Ferreira', documentos: 'CNH aprovada, Certidão pendente', comunidade: 'Rocinha' },
    { id: 102, nome: 'Beatriz Martins', documentos: 'CNH pendente', comunidade: 'Maré' },
    { id: 103, nome: 'Rafael Gomes', documentos: 'CNH aprovada, Certidão pendente', comunidade: 'Vidigal' },
    { id: 104, nome: 'Camila Dias', documentos: 'Todos aprovados, aguardando treinamento', comunidade: 'Rocinha' },
    { id: 105, nome: 'Thiago Ribeiro', documentos: 'CNH pendente', comunidade: 'Complexo do Alemão' },
    { id: 106, nome: 'Patricia Cardoso', documentos: 'CNH aprovada, Certidão pendente', comunidade: 'Maré' },
    { id: 107, nome: 'Marcelo Pereira', documentos: 'Todos aprovados, aguardando treinamento', comunidade: 'Rocinha' },
    { id: 108, nome: 'Aline Barbosa', documentos: 'CNH pendente', comunidade: 'Vidigal' },
    { id: 109, nome: 'Diego Nascimento', documentos: 'CNH aprovada, Certidão pendente', comunidade: 'Rocinha' },
  ],

  // Passenger (dados fictícios)
  passenger: {
    nome: 'Demo Passageiro',
    email: 'demo.passageiro@kaviar.com',
    telefone: '(21) 9****-****', // Oculto
    cpf: '***.***.***-**', // Oculto
    favoritos: [
      { id: 1, label: 'Casa', endereco: 'Rua 1, Rocinha', lat: -22.9868, lng: -43.2482 },
      { id: 2, label: 'Trabalho', endereco: 'Av. Atlântica, Copacabana', lat: -22.9711, lng: -43.1822 },
      { id: 3, label: 'Mercado', endereco: 'Rua 2, Rocinha', lat: -22.9878, lng: -43.2492 },
      { id: 4, label: 'Academia', endereco: 'Rua 3, São Conrado', lat: -22.9950, lng: -43.2650 },
      { id: 5, label: 'Escola', endereco: 'Rua 4, Rocinha', lat: -22.9858, lng: -43.2472 },
      { id: 6, label: 'Posto de Saúde', endereco: 'Rua 5, Rocinha', lat: -22.9888, lng: -43.2502 },
      { id: 7, label: 'Igreja', endereco: 'Rua 6, Rocinha', lat: -22.9898, lng: -43.2512 },
      { id: 8, label: 'Padaria', endereco: 'Rua 7, Rocinha', lat: -22.9908, lng: -43.2522 },
    ],
    historicoCorreidas: [
      { 
        id: 1, 
        origem: 'Rocinha', 
        destino: 'Copacabana', 
        status: 'completed', 
        valor: 18.50,
        data: '2026-02-01T14:30:00Z',
        motorista: 'João Silva',
        avaliacao: 5,
        duracao: '18 min',
        distancia: '5.2 km'
      },
      { 
        id: 2, 
        origem: 'Rocinha', 
        destino: 'Ipanema', 
        status: 'completed', 
        valor: 22.00,
        data: '2026-01-28T10:15:00Z',
        motorista: 'Maria Santos',
        avaliacao: 5,
        duracao: '22 min',
        distancia: '6.8 km'
      },
      { 
        id: 3, 
        origem: 'Rocinha', 
        destino: 'Leblon', 
        status: 'completed', 
        valor: 25.50,
        data: '2026-01-25T16:45:00Z',
        motorista: 'Pedro Costa',
        avaliacao: 4,
        duracao: '25 min',
        distancia: '7.5 km'
      },
      { 
        id: 4, 
        origem: 'Rocinha', 
        destino: 'Barra da Tijuca', 
        status: 'cancelled', 
        valor: 0,
        data: '2026-01-20T09:00:00Z',
        motorista: null,
        avaliacao: null,
        motivoCancelamento: 'Motorista não encontrado'
      },
    ],
    saldo: 0,
    corridasRealizadas: 3,
    avaliacaoMedia: 4.7,
  },

  // Driver (dados fictícios)
  driver: {
    nome: 'Demo Motorista',
    email: 'demo.motorista@kaviar.com',
    comunidade: 'Rocinha',
    ganhosMes: 1847.30,
    corridasConcluidas: 42,
    avaliacao: 4.8,
    documentos: {
      cnh: { status: 'aprovado', validade: '2028-12-31' },
      certidao: { status: 'pendente', validade: null },
      antecedentes: { status: 'aprovado', validade: '2026-12-31' },
      veiculo: { status: 'aprovado', validade: '2027-06-30' },
    },
    ultimasCorridas: [
      { id: 1, origem: 'Rocinha', destino: 'Copacabana', valor: 18.50, ganho: 15.17, data: '2026-02-03' },
      { id: 2, origem: 'Rocinha', destino: 'Ipanema', valor: 22.00, ganho: 18.04, data: '2026-02-03' },
      { id: 3, origem: 'Rocinha', destino: 'Leblon', valor: 25.50, ganho: 20.91, data: '2026-02-02' },
    ]
  },

  // System Status
  systemStatus: {
    health: 'healthy',
    version: '1.0.0',
    commit: 'cdcc7f2',
    database: 'connected',
    uptime: '72h 15m',
    lastDeploy: '2026-02-01T10:30:00Z',
    featureFlags: [
      { key: 'passenger_favorites_matching', enabled: true, rollout: 1 },
      { key: 'beta_monitor', enabled: true, rollout: 100 },
      { key: 'compliance_notifications', enabled: true, rollout: 100 },
    ]
  },

  // Bairros (simplificado - 162 no total)
  bairros: {
    total: 162,
    porCidade: {
      'Rio de Janeiro': 162
    },
    exemplos: [
      'Rocinha', 'Vidigal', 'Complexo do Alemão', 'Maré', 'Cidade de Deus',
      'Jacarezinho', 'Manguinhos', 'Pavão-Pavãozinho', 'Cantagalo', 'Borel'
    ]
  }
};

export default demoData;
