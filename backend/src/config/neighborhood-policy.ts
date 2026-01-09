/**
 * KAVIAR - Política de Vizinhança para Fallback Seguro
 * Fonte única da verdade para regras de bairros sensíveis e allowlist
 */

// Bairros sensíveis (política mais rígida - nunca Camada C automática)
export const SENSITIVE_NEIGHBORHOODS = new Set([
  // Zona Sul / áreas nobres e turísticas
  'Copacabana', 'Leme', 'Ipanema', 'Leblon', 'Lagoa', 'Jardim Botânico', 
  'Gávea', 'Humaitá', 'Urca', 'Botafogo', 'Flamengo', 'Catete', 'Glória', 
  'Laranjeiras', 'Cosme Velho', 'São Conrado', 'Joá',
  
  // Barra / áreas de alto padrão
  'Barra da Tijuca', 'Recreio dos Bandeirantes', 'Itanhangá'
]);

// Allowlist de vizinhança (MUITO restrito - só vizinhos pré-aprovados)
export const NEIGHBORHOOD_ALLOWLIST: Record<string, string[]> = {
  // Zona Sul (núcleo)
  'Copacabana': ['Leme', 'Ipanema', 'Botafogo', 'Lagoa'],
  'Leme': ['Copacabana', 'Urca'],
  'Ipanema': ['Copacabana', 'Leblon', 'Lagoa'],
  'Leblon': ['Ipanema', 'Gávea', 'Lagoa', 'São Conrado'],
  'Lagoa': ['Copacabana', 'Ipanema', 'Leblon', 'Jardim Botânico', 'Humaitá', 'Gávea'],
  'Jardim Botânico': ['Lagoa', 'Gávea', 'Humaitá'],
  'Gávea': ['Jardim Botânico', 'Humaitá', 'Leblon', 'São Conrado'],
  'Humaitá': ['Botafogo', 'Lagoa', 'Jardim Botânico', 'Gávea'],
  'Urca': ['Botafogo', 'Leme'],
  'Botafogo': ['Urca', 'Humaitá', 'Copacabana', 'Flamengo', 'Laranjeiras'],
  'Flamengo': ['Botafogo', 'Catete', 'Laranjeiras', 'Glória'],
  'Catete': ['Flamengo', 'Glória', 'Laranjeiras'],
  'Glória': ['Catete', 'Flamengo', 'Centro'],
  'Laranjeiras': ['Botafogo', 'Flamengo', 'Catete', 'Cosme Velho'],
  'Cosme Velho': ['Laranjeiras', 'Jardim Botânico'],

  // Centro / adjacências (bem limitado)
  'Centro': ['Glória', 'Catumbi', 'Gamboa', 'Santo Cristo', 'Saúde'],
  'Catumbi': ['Centro', 'Cidade Nova', 'Estácio'],
  'Cidade Nova': ['Catumbi', 'Estácio', 'Praça da Bandeira'],
  'Estácio': ['Cidade Nova', 'Catumbi', 'Praça da Bandeira'],
  'Praça da Bandeira': ['Estácio', 'Tijuca', 'Maracanã'],
  'Tijuca': ['Praça da Bandeira', 'Maracanã', 'Vila Isabel', 'Andaraí'],
  'Maracanã': ['Tijuca', 'Vila Isabel'],
  'Vila Isabel': ['Maracanã', 'Tijuca', 'Andaraí'],
  'Andaraí': ['Tijuca', 'Vila Isabel'],

  // Barra / Jacarepaguá (também restrito)
  'Barra da Tijuca': ['Itanhangá', 'Jacarepaguá', 'Recreio dos Bandeirantes'],
  'Itanhangá': ['Barra da Tijuca', 'Jacarepaguá'],
  'Jacarepaguá': ['Barra da Tijuca', 'Itanhangá', 'Anil', 'Cidade de Deus'],
  'Anil': ['Jacarepaguá'],
  'Cidade de Deus': ['Jacarepaguá'],
  'Recreio dos Bandeirantes': ['Barra da Tijuca']
};

// Raio padrão para Camada B (SEM_DADOS) - conservador
export const FALLBACK_RADIUS_METERS = 800;

// Mensagens de opt-in (sem termos técnicos)
export const OPT_IN_MESSAGES = {
  NEIGHBOR: 'Não achei motorista na sua área agora. Você aceita motorista de bairro vizinho?',
  OUT_OF_FENCE: 'Ainda não achei por perto. Você aceita motorista de fora da sua área? (Pode demorar menos, mas é alguém fora da sua região)'
};

/**
 * Verifica se um bairro é sensível (política rígida)
 */
export function isSensitiveNeighborhood(neighborhoodName: string): boolean {
  return SENSITIVE_NEIGHBORHOODS.has(neighborhoodName);
}

/**
 * Obtém vizinhos permitidos para um bairro
 */
export function getAllowedNeighbors(neighborhoodName: string): string[] {
  return NEIGHBORHOOD_ALLOWLIST[neighborhoodName] || [];
}

/**
 * Verifica se um bairro é vizinho permitido de outro
 */
export function isNeighborhoodAllowed(fromNeighborhood: string, toNeighborhood: string): boolean {
  const allowedNeighbors = getAllowedNeighbors(fromNeighborhood);
  return allowedNeighbors.includes(toNeighborhood);
}
