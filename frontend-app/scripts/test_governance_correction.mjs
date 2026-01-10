#!/usr/bin/env node

/**
 * Testar se a correção funciona - simular fetchCommunities com governance
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'https://kaviar-v2.onrender.com';

async function testGovernanceCorrection() {
  console.log('🧪 TESTE DA CORREÇÃO - Governance como fonte');
  console.log('===============================================');
  
  try {
    // Simular o que a UI corrigida faz
    const response = await fetch(`${API_BASE_URL}/api/governance/communities`);
    const data = await response.json();
    
    if (data.success) {
      // Filtrar Botafogo, Tijuca, Glória
      const targetCommunities = data.data.filter(c => 
        c.name.match(/^(Botafogo|Tijuca|Glória)$/)
      );
      
      console.log('📊 COMUNIDADES ENCONTRADAS NO GOVERNANCE:');
      targetCommunities.forEach(c => {
        console.log(`${c.name} -> ${c.id}`);
      });
      
      console.log('\n🔍 TESTANDO GEOFENCE PARA CADA ID:');
      
      for (const community of targetCommunities) {
        const geofenceResponse = await fetch(`${API_BASE_URL}/api/governance/communities/${community.id}/geofence`);
        const status = geofenceResponse.status;
        
        if (status === 200) {
          const geofenceData = await geofenceResponse.json();
          const geometryType = geofenceData.data?.geometry?.type || 'NO_GEOMETRY';
          console.log(`✅ ${community.name}: ${status} -> ${geometryType}`);
        } else {
          console.log(`❌ ${community.name}: ${status} -> SEM_DADOS`);
        }
      }
      
      console.log('\n🎯 CONCLUSÃO:');
      if (targetCommunities.length === 3) {
        console.log('✅ Governance retorna os 3 casos com IDs canônicos');
        console.log('✅ Correção deve funcionar quando deployada');
      } else {
        console.log('⚠️ Governance não retorna todos os casos esperados');
      }
      
    } else {
      console.error('❌ Erro na resposta do governance:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testGovernanceCorrection();
