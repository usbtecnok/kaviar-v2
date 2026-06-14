export const MOTO_REQUIRED_DOCUMENTS = [
  { type: 'CNH_A', label: 'CNH Categoria A' },
  { type: 'CRLV_MOTO', label: 'CRLV da Motocicleta' },
  { type: 'MOTORCYCLE_PHOTO', label: 'Foto da Motocicleta' },
  { type: 'MOTO_EXPRESS_RESPONSIBILITY_TERM', label: 'Termo de Responsabilidade Moto Express' },
] as const;

export type MotoDocumentType = typeof MOTO_REQUIRED_DOCUMENTS[number]['type'];

export function getMissingMotoDocuments(uploadedTypes: string[]): typeof MOTO_REQUIRED_DOCUMENTS[number][] {
  return MOTO_REQUIRED_DOCUMENTS.filter(doc => !uploadedTypes.includes(doc.type));
}
