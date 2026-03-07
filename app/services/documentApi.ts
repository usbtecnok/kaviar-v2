import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'https://api.kaviar.com.br';

export interface DocumentUpload {
  type: 'cpf' | 'rg' | 'cnh' | 'proofOfAddress' | 'vehiclePhoto' | 'backgroundCheck';
  uri: string;
  fileName: string;
  mimeType: string;
}

export interface DocumentStatus {
  type: string;
  status: 'pending' | 'SUBMITTED' | 'VERIFIED' | 'rejected';
  submitted_at?: string;
  verified_at?: string;
  reject_reason?: string;
}

export async function uploadDocuments(documents: DocumentUpload[]): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await AsyncStorage.getItem('driver_token');
    if (!token) throw new Error('Não autenticado');

    const formData = new FormData();
    
    documents.forEach(doc => {
      formData.append(doc.type, {
        uri: doc.uri,
        name: doc.fileName,
        type: doc.mimeType,
      } as any);
    });

    const response = await fetch(`${API_URL}/api/drivers/me/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Erro ao enviar documentos');
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMyDocuments(): Promise<{ success: boolean; data?: DocumentStatus[]; error?: string }> {
  try {
    const token = await AsyncStorage.getItem('driver_token');
    if (!token) throw new Error('Não autenticado');

    const response = await fetch(`${API_URL}/api/drivers/me/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Erro ao buscar documentos');
    }

    return { success: true, data: result.data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
