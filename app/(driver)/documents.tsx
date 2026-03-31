import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DocumentCard from '../components/DocumentCard';
import { uploadDocuments, getMyDocuments, DocumentStatus } from '../services/documentApi';
import type { DocumentUpload as DocumentUploadPayload } from '../services/documentApi';
import { COLORS } from '../../src/config/colors';

const DOCUMENT_TYPES = [
  { type: 'cpf', label: 'CPF', required: true },
  { type: 'rg', label: 'RG', required: true },
  { type: 'cnh', label: 'CNH', required: true },
  { type: 'proofOfAddress', label: 'Comprovante de Residência', required: true },
  { type: 'vehiclePhoto', label: 'Foto do Veículo', required: true },
  { type: 'backgroundCheck', label: 'Antecedentes Criminais', required: true },
] as const;

type DocType = typeof DOCUMENT_TYPES[number]['type'];

interface LocalDocument {
  uri: string;
  fileName: string;
  mimeType: string;
  status: 'selected' | 'uploaded' | 'verified' | 'rejected';
  rejectReason?: string;
}

export default function DocumentUpload() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Record<DocType, LocalDocument | null>>({
    cpf: null,
    rg: null,
    cnh: null,
    proofOfAddress: null,
    vehiclePhoto: null,
    backgroundCheck: null,
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    const result = await getMyDocuments();
    if (result.success && result.data) {
      const newDocs = { ...documents };
      result.data.forEach((doc: DocumentStatus) => {
        const type = mapBackendTypeToLocal(doc.type);
        if (type && newDocs[type] === null) {
          newDocs[type] = {
            uri: '',
            fileName: '',
            mimeType: '',
            status: doc.status === 'VERIFIED' ? 'verified' : doc.status === 'SUBMITTED' ? 'uploaded' : doc.status === 'rejected' ? 'rejected' : 'uploaded',
            rejectReason: doc.reject_reason,
          };
        }
      });
      setDocuments(newDocs);
    }
    setLoading(false);
  };

  const mapBackendTypeToLocal = (backendType: string): DocType | null => {
    const map: Record<string, DocType> = {
      'CPF': 'cpf',
      'RG': 'rg',
      'CNH': 'cnh',
      'PROOF_OF_ADDRESS': 'proofOfAddress',
      'VEHICLE_PHOTO': 'vehiclePhoto',
      'BACKGROUND_CHECK': 'backgroundCheck',
    };
    return map[backendType] || null;
  };

  const pickDocument = async (type: DocType) => {
    const existing = documents[type];
    if (existing?.status === 'verified') {
      Alert.alert('Documento aprovado', 'Este documento já foi aprovado.');
      return;
    }

    Alert.alert(
      'Selecionar documento',
      'Escolha uma opção:',
      [
        { text: 'Tirar Foto', onPress: () => pickImage(type) },
        { text: 'Escolher Arquivo', onPress: () => pickFile(type) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const pickImage = async (type: DocType) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão negada', 'Precisamos de acesso à câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setDocuments(prev => ({
        ...prev,
        [type]: {
          uri: asset.uri,
          fileName: `${type}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          status: 'selected',
        },
      }));
    }
  };

  const pickFile = async (type: DocType) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const size = asset.size || 0;
      
      if (size > 5 * 1024 * 1024) {
        Alert.alert('Arquivo muito grande', 'O arquivo deve ter no máximo 5MB.');
        return;
      }

      setDocuments(prev => ({
        ...prev,
        [type]: {
          uri: asset.uri,
          fileName: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
          status: 'selected',
        },
      }));
    }
  };

  const handleUpload = async () => {
    const toUpload: DocumentUploadPayload[] = [];
    
    Object.entries(documents).forEach(([type, doc]) => {
      if (doc && doc.status === 'selected') {
        toUpload.push({
          type: type as DocType,
          uri: doc.uri,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
        });
      }
    });

    if (toUpload.length === 0) {
      Alert.alert('Nenhum documento', 'Selecione pelo menos um documento para enviar.');
      return;
    }

    // Verificar se é primeiro envio ou reenvio
    const hasExistingDocs = Object.values(documents).some(
      doc => doc && (doc.status === 'uploaded' || doc.status === 'verified' || doc.status === 'rejected')
    );

    // Primeiro envio: exigir todos. Reenvio: aceitar parcial.
    if (!hasExistingDocs) {
      const allRequiredDocs = DOCUMENT_TYPES.filter(d => d.required).map(d => d.type);
      const uploadedOrSelected = Object.entries(documents)
        .filter(([_, doc]) => doc && (doc.status === 'uploaded' || doc.status === 'verified' || doc.status === 'selected'))
        .map(([type, _]) => type);
      
      const missingDocs = allRequiredDocs.filter(type => !uploadedOrSelected.includes(type));
      
      if (missingDocs.length > 0) {
        const missingLabels = DOCUMENT_TYPES
          .filter(d => missingDocs.includes(d.type))
          .map(d => d.label)
          .join(', ');
        
        Alert.alert(
          'Documentos Incompletos',
          `Você precisa enviar TODOS os documentos obrigatórios antes de prosseguir.\n\nFaltam: ${missingLabels}`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setUploading(true);
    const result = await uploadDocuments(toUpload);
    setUploading(false);

    if (result.success) {
      // Atualizar status local
      const newDocs = { ...documents };
      toUpload.forEach(doc => {
        if (newDocs[doc.type]) {
          newDocs[doc.type]!.status = 'uploaded';
        }
      });
      setDocuments(newDocs);
      
      // Verificar se TODOS os obrigatórios já foram enviados
      const allRequiredTypes = DOCUMENT_TYPES.filter(d => d.required).map(d => d.type);
      const allComplete = allRequiredTypes.every(type => {
        const doc = newDocs[type];
        return doc && (doc.status === 'uploaded' || doc.status === 'verified');
      });

      if (allComplete) {
        // Todos enviados — redirecionar para aguardando aprovação
        Alert.alert(
          'Documentos Enviados!',
          'Seus documentos foram enviados para análise. Você será notificado quando forem aprovados.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(driver)/pending-approval')
            }
          ]
        );
      } else {
        // Ainda faltam documentos — manter na tela
        const missing = allRequiredTypes.filter(type => {
          const doc = newDocs[type];
          return !doc || (doc.status !== 'uploaded' && doc.status !== 'verified');
        });
        const missingLabels = DOCUMENT_TYPES
          .filter(d => missing.includes(d.type))
          .map(d => d.label)
          .join(', ');
        Alert.alert(
          'Enviado com sucesso!',
          `Ainda faltam: ${missingLabels}\n\nSelecione e envie os documentos restantes.`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert('Erro', result.error || 'Erro ao enviar documentos');
    }
  };

  const getProgress = () => {
    const total = DOCUMENT_TYPES.length;
    const completed = Object.values(documents).filter(doc => doc && (doc.status === 'uploaded' || doc.status === 'verified')).length;
    return { completed, total };
  };

  const getCardStatus = (type: DocType): 'pending' | 'selected' | 'uploaded' | 'verified' | 'rejected' => {
    const doc = documents[type];
    if (!doc) return 'pending';
    return doc.status;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const progress = getProgress();
  const hasSelected = Object.values(documents).some(doc => doc?.status === 'selected');
  const isResubmit = Object.values(documents).some(
    doc => doc && (doc.status === 'uploaded' || doc.status === 'verified' || doc.status === 'rejected')
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{isResubmit ? 'Revisar Documentos' : 'Enviar Documentos'}</Text>
        <Text style={styles.subtitle}>
          {progress.completed}/{progress.total} documentos enviados
        </Text>
        <Text style={styles.formatHint}>Formatos aceitos: JPG, PNG ou PDF (máx. 5MB)</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {DOCUMENT_TYPES.map(({ type, label }) => (
          <DocumentCard
            key={type}
            type={type}
            label={label}
            status={getCardStatus(type)}
            uri={documents[type]?.uri}
            rejectReason={documents[type]?.rejectReason}
            onPress={() => pickDocument(type)}
          />
        ))}
      </ScrollView>

      {hasSelected && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>Enviar Documentos</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isResubmit && !hasSelected && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(driver)/pending-approval')}>
            <Text style={styles.backButtonText}>Voltar para aprovação</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  formatHint: {
    fontSize: 12,
    color: '#fff',
    marginTop: 8,
    opacity: 0.7,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    padding: 16,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
