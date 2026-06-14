// Base motorcycle documents (required for any moto service)
export const MOTO_REQUIRED_DOCUMENTS = [
  { type: 'CNH_A', label: 'CNH Categoria A' },
  { type: 'CRLV_MOTO', label: 'CRLV da Motocicleta' },
  { type: 'MOTORCYCLE_PHOTO', label: 'Foto da Motocicleta' },
  { type: 'MOTO_EXPRESS_RESPONSIBILITY_TERM', label: 'Termo de Responsabilidade Moto Express' },
] as const;

// Extra documents for Moto Passenger (on top of base moto docs)
export const MOTO_PASSENGER_EXTRA_DOCUMENTS = [
  { type: 'MOTO_PASSENGER_RESPONSIBILITY_TERM', label: 'Termo de Responsabilidade Moto Passageiro' },
  { type: 'HELMET_PASSENGER_DECLARATION', label: 'Declaração de Capacete para Passageiro' },
] as const;

export type MotoDocumentType = typeof MOTO_REQUIRED_DOCUMENTS[number]['type'];
export type MotoPassengerDocumentType = typeof MOTO_PASSENGER_EXTRA_DOCUMENTS[number]['type'];

export function getMissingMotoDocuments(uploadedTypes: string[]): typeof MOTO_REQUIRED_DOCUMENTS[number][] {
  return MOTO_REQUIRED_DOCUMENTS.filter(doc => !uploadedTypes.includes(doc.type));
}

export function getMissingMotoPassengerDocuments(uploadedTypes: string[]): (typeof MOTO_REQUIRED_DOCUMENTS[number] | typeof MOTO_PASSENGER_EXTRA_DOCUMENTS[number])[] {
  const allRequired = [...MOTO_REQUIRED_DOCUMENTS, ...MOTO_PASSENGER_EXTRA_DOCUMENTS];
  return allRequired.filter(doc => !uploadedTypes.includes(doc.type));
}
