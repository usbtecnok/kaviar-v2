import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Alert, Clipboard, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '../../src/api/driver.api';
import { COLORS } from '../../src/config/colors';

type Package = { id: string; label: string; amount_cents: number; family_return_percent: number; family_return_cents: number };
type FamilyReturn = { percent: number; message: string } | null;
type FamilyReturnData = { enabled: boolean; percent?: number; accrued_cents: number; available_for_request?: boolean; message?: string } | null;
type LedgerEntry = { id: string; entry_type: string; balance_delta_cents: number; balance_after_cents: number; reason: string; created_at: string };

export default function DriverCredits() {
  const router = useRouter();
  const [balance, setBalance] = useState<{ balance_cents: number; reserved_cents: number; available_cents: number; balance_display: string } | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [familyReturn, setFamilyReturn] = useState<FamilyReturn>(null);
  const [familyReturnData, setFamilyReturnData] = useState<FamilyReturnData>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);

  // Pix payment state
  const [pixData, setPixData] = useState<{ rechargeId: string; qrCode: string; copyPaste: string; amount: number; expiresAt: string } | null>(null);

  // Auto-poll wallet while Pix screen is open
  useEffect(() => {
    if (!pixData) return;
    const initialBalance = balance?.balance_cents ?? 0;
    let attempts = 0;
    const id = setInterval(async () => {
      if (++attempts > 120) { clearInterval(id); return; }
      try {
        const w = await driverApi.getWallet();
        if (w.balance_cents > initialBalance) {
          clearInterval(id);
          setBalance(w);
          setPixData(null);
          load();
          Alert.alert('✅ Pagamento confirmado!', 'Saldo adicionado à sua conta.');
        }
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [!!pixData]);

  const load = useCallback(async () => {
    try {
      const [wal, pkgs, led, fr] = await Promise.allSettled([
        driverApi.getWallet(),
        driverApi.getWalletPackages(),
        driverApi.getWalletLedger(10, 0),
        driverApi.getFamilyReturn(),
      ]);
      if (wal.status === 'fulfilled') setBalance(wal.value);
      if (pkgs.status === 'fulfilled') { setPackages(pkgs.value.packages); setFamilyReturn(pkgs.value.family_return); }
      if (led.status === 'fulfilled') setLedger(led.value.entries || []);
      if (fr.status === 'fulfilled') setFamilyReturnData(fr.value);
    } catch (e) {
      console.warn('[Wallet] load failed:', e);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (pkg: Package) => {
    setBuying(true);
    try {
      const result = await driverApi.createWalletRecharge(pkg.id);
      setPixData({
        rechargeId: result.rechargeId,
        qrCode: result.pix?.qrCode || '',
        copyPaste: result.pix?.copyPaste || '',
        amount: result.amount_cents / 100,
        expiresAt: result.pix?.expiresAt || '',
      });
    } catch (e: any) {
      if (e.response?.status === 403) {
        Alert.alert('Saldo KAVIAR em preparação', 'A recarga por Pix estará disponível em breve.');
      } else {
        Alert.alert('Erro', e.response?.data?.error || 'Não foi possível criar a cobrança.');
      }
    } finally { setBuying(false); }
  };

  const handleCopyPix = () => {
    if (pixData?.copyPaste) {
      Clipboard.setString(pixData.copyPaste);
      Alert.alert('Copiado!', 'Código Pix copiado. Cole no app do seu banco.');
    }
  };

  const handlePixDone = () => {
    setPixData(null);
    load();
  };

  if (loading) return (
    <SafeAreaView style={s.container}>
      <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
    </SafeAreaView>
  );

  // Pix payment screen
  if (pixData) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={handlePixDone}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Pagamento Pix</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.pixContainer}>
        <View style={s.pixCard}>
          <Ionicons name="checkmark-circle-outline" size={32} color={COLORS.primary} />
          <Text style={s.pixTitle}>Cobrança criada</Text>
          <Text style={s.pixSub}>Saldo R$ {pixData.amount.toFixed(2)}</Text>

          {pixData.qrCode ? (
            <Image source={{ uri: `data:image/png;base64,${pixData.qrCode}` }} style={s.qrImage} resizeMode="contain" />
          ) : null}

          {pixData.copyPaste ? (
            <>
              <Text style={s.pixLabel}>Código Pix copia e cola:</Text>
              <TouchableOpacity style={s.copyBox} onPress={handleCopyPix}>
                <Text style={s.copyText} numberOfLines={2}>{pixData.copyPaste}</Text>
                <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={s.pixInstructions}>Abra o app do seu banco, escolha Pix e cole o código ou escaneie o QR Code acima.</Text>

          <View style={s.pixInfoBox}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.pixInfoMain}>O saldo entra automaticamente após a confirmação do pagamento.</Text>
              <Text style={s.pixInfoSub}>{familyReturn ? 'Retorno Familiar acumulado após confirmação do Pix.' : 'Após o Pix ser confirmado, seu saldo será atualizado no app.'}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.doneBtn} onPress={handlePixDone}>
            <Text style={s.doneBtnText}>Já paguei</Text>
          </TouchableOpacity>
          <Text style={s.pixNote}>Seu saldo será atualizado automaticamente após a confirmação do pagamento.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Main screen
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Saldo KAVIAR</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
        {/* Balance */}
        <View style={s.balanceCard}>
          <Ionicons name="wallet-outline" size={28} color={COLORS.primary} />
          <Text style={s.balanceValue}>{balance?.balance_display ?? 'R$ 0,00'}</Text>
          <Text style={s.balanceLabel}>saldo disponível</Text>
        </View>

        {balance !== null && balance.available_cents < 1000 && (
          <View style={[s.alert, balance.available_cents === 0 && { backgroundColor: '#fde8e8' }]}>
            <Ionicons name={balance.available_cents === 0 ? 'alert-circle-outline' : 'warning-outline'} size={18} color={balance.available_cents === 0 ? COLORS.danger : COLORS.warning} />
            <Text style={[s.alertText, { color: balance.available_cents === 0 ? COLORS.danger : COLORS.warning }]}>
              {balance.available_cents === 0 ? 'Sem saldo disponível. Adicione saldo para receber corridas.' : 'Saldo baixo. Adicione saldo em breve.'}
            </Text>
          </View>
        )}

        {/* Packages */}
        <Text style={s.sectionTitle}>Adicionar saldo</Text>

        {/* Retorno Familiar KAVIAR */}
        {familyReturnData?.enabled && (
          <View style={[s.infoCard, { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.success }]}>
            <Text style={[s.infoTitle, { color: COLORS.success }]}>Retorno Familiar KAVIAR</Text>
            <Text style={s.infoText}>Acumulado: R$ {((familyReturnData.accrued_cents || 0) / 100).toFixed(2).replace('.', ',')}</Text>
            <Text style={[s.infoText, { fontSize: 11, marginTop: 4 }]}>Disponível para solicitação entre outubro e dezembro.</Text>
            <Text style={[s.infoText, { fontSize: 10, color: COLORS.textMuted, marginTop: 2 }]}>Este valor não é saldo de corrida.</Text>
          </View>
        )}

        {packages.map(pkg => (
          <TouchableOpacity key={pkg.id} style={s.packageCard} onPress={() => handleBuy(pkg)} disabled={buying}>
            <View style={{ flex: 1 }}>
              <Text style={s.packageCredits}>{pkg.label}</Text>
              <Text style={s.packagePrice}>{pkg.family_return_cents > 0 ? `Acumule R$ ${(pkg.family_return_cents / 100).toFixed(0)} no Retorno Familiar` : 'Via Pix'}</Text>
            </View>
            <View style={s.buyBtn}>
              {buying ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.buyBtnText}>Pix</Text>}
            </View>
          </TouchableOpacity>
        ))}

        {/* How it works */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Como funciona</Text>
          {familyReturn && <Text style={[s.infoText, { color: COLORS.success, fontWeight: '600' }]}>🎁 Retorno Familiar: recargas Pix acumulam {familyReturn.percent}% para resgate entre outubro e dezembro.</Text>}
          <Text style={s.infoText}>Você adiciona saldo via Pix.</Text>
          <Text style={s.infoText}>A cada corrida concluída, a taxa de uso da plataforma é descontada do seu saldo.</Text>
          <Text style={s.infoText}>Taxa atual: 18% sobre o valor da corrida.</Text>
          <Text style={s.infoText}>Você recebe 82% do valor da corrida.</Text>
          <Text style={s.infoText}>A taxa é descontada do saldo somente quando a corrida é concluída.</Text>
        </View>

        {/* History */}
        {ledger.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Últimos lançamentos</Text>
            {ledger.slice(0, 5).map((e: any) => (
              <View key={e.id} style={s.historyRow}>
                <Ionicons name={e.balance_delta_cents > 0 ? 'add-circle' : 'remove-circle'} size={16} color={e.balance_delta_cents > 0 ? COLORS.success : COLORS.warning} />
                <Text style={s.historyText}>R$ {(Math.abs(e.balance_delta_cents) / 100).toFixed(2)}</Text>
                <Text style={s.historyStatus}>{({ recharge: 'Recarga', recharge_bonus: 'Bônus de recarga 🎁', fee_debit: 'Taxa corrida', reserve: 'Reserva', cancel_release: 'Liberação cancelamento', pending_resolve: 'Taxa pendente' })[e.entry_type] || e.entry_type}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: 20, paddingBottom: 40 },
  balanceCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  balanceValue: { fontSize: 44, fontWeight: '900', color: COLORS.textPrimary, marginTop: 8 },
  balanceLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  alert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e1', padding: 12, borderRadius: 12, gap: 8, marginBottom: 16 },
  alertText: { fontSize: 13, flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  packageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  packageCredits: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  packagePrice: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  buyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  buyBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  infoCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  infoTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 2 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  historyStatus: { fontSize: 12, color: COLORS.textMuted },
  // Pix screen
  pixContainer: { padding: 20, alignItems: 'center' },
  pixCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, width: '100%' },
  pixTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
  pixSub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },
  qrImage: { width: 220, height: 220, marginBottom: 16 },
  pixLabel: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, alignSelf: 'flex-start' },
  copyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 14, gap: 10, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  copyText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
  pixInstructions: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 16, lineHeight: 19 },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20 },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  pixNote: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 12 },
  pixInfoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#f0f7ff', borderRadius: 12, padding: 14, marginTop: 16, width: '100%', borderWidth: 1, borderColor: '#d6e8f7' },
  pixInfoMain: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18 },
  pixInfoSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
});
