import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Alert, Clipboard, RefreshControl, Linking, Modal, Pressable } from 'react-native';
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
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Pix payment state
  const [pixData, setPixData] = useState<{ rechargeId: string; qrCode: string; copyPaste: string; amount: number; expiresAt: string } | null>(null);
  const [sumupData, setSumupData] = useState<{ rechargeId: string; checkoutUrl: string; amount: number } | null>(null);

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

  useEffect(() => {
    if (!sumupData) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled) return;
      try {
        const recharge = await driverApi.getWalletRecharge(sumupData.rechargeId);
        if (recharge.status === 'confirmed') {
          cancelled = true;
          clearInterval(id);
          setSumupData(null);
          await load();
          Alert.alert('Pagamento confirmado', 'Saldo adicionado à sua conta.');
          return;
        }
        if (recharge.status === 'expired') {
          cancelled = true;
          clearInterval(id);
          Alert.alert('Pagamento expirado', 'O checkout expirou. Gere uma nova recarga.');
        }
      } catch {}
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sumupData, load]);

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
      setLoadError(wal.status !== 'fulfilled');
    } catch (e) {
      console.warn('[Wallet] load failed:', e);
      setLoadError(true);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPaymentMethodSelector = (pkg: Package) => {
    if (buying) return;
    setSelectedPackage(pkg);
  };

  const closePaymentMethodSelector = () => {
    setSelectedPackage(null);
  };

  const handleBuy = async (provider: 'sumup' | 'asaas') => {
    if (buying || !selectedPackage) return;
    setBuying(true);
    try {
      const result = await driverApi.createWalletRecharge(selectedPackage.id, provider);

      if (result.payment_provider === 'sumup' && result.checkout?.url) {
        closePaymentMethodSelector();
        await Linking.openURL(result.checkout.url);
        setSumupData({
          rechargeId: result.rechargeId,
          checkoutUrl: result.checkout.url,
          amount: result.amount_cents / 100,
        });
        return;
      }

      if (result.payment_provider === 'asaas') {
        closePaymentMethodSelector();
        setPixData({
          rechargeId: result.rechargeId,
          qrCode: result.pix?.qrCode || '',
          copyPaste: result.pix?.copyPaste || '',
          amount: result.amount_cents / 100,
          expiresAt: result.pix?.expiresAt || '',
        });
        return;
      }

      closePaymentMethodSelector();
      Alert.alert('Erro', 'Não foi possível iniciar o pagamento.');
    } catch (e: any) {
      closePaymentMethodSelector();
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

  const handleOpenSumUpAgain = async () => {
    if (!sumupData?.checkoutUrl) return;
    try {
      await Linking.openURL(sumupData.checkoutUrl);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o checkout.');
    }
  };

  const handleSumUpPaid = async () => {
    if (!sumupData) return;
    try {
      const recharge = await driverApi.getWalletRecharge(sumupData.rechargeId);
      if (recharge.status === 'confirmed') {
        setSumupData(null);
        await load();
        Alert.alert('Pagamento confirmado', 'Saldo adicionado à sua conta.');
        return;
      }
      if (recharge.status === 'expired') {
        Alert.alert('Pagamento expirado', 'O checkout expirou. Gere uma nova recarga.');
        setSumupData(null);
        return;
      }
      Alert.alert('Pagamento pendente', 'Ainda estamos aguardando a confirmação do pagamento.');
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar o pagamento agora.');
    }
  };

  if (loading) return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <View style={s.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingTitle}>Carregando saldo KAVIAR…</Text>
          <View style={s.loadingLine} />
          <View style={[s.loadingLine, { width: '62%' }]} />
        </View>
      </View>
    </SafeAreaView>
  );

  if (loadError && !balance) return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, marginTop: 12, textAlign: 'center' }}>Sem conexão. Verifique sua internet e tente novamente.</Text>
        <TouchableOpacity style={{ marginTop: 20, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }} onPress={() => { setLoading(true); setLoadError(false); load(); }}>
          <Text style={{ fontWeight: '700', color: '#000', fontSize: 14 }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (sumupData) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setSumupData(null)}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Cartão, Google Pay ou Apple Pay</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.pixContainer}>
        <View style={s.pixCard}>
          <Ionicons name="open-outline" size={32} color={COLORS.primary} />
          <Text style={s.pixTitle}>Pagamento SumUp aberto</Text>
          <Text style={s.pixSub}>Pagamento seguro pela SumUp</Text>
          <Text style={[s.pixSub, { marginTop: 0, marginBottom: 20 }]}>Valor R$ {sumupData.amount.toFixed(2)}</Text>

          <Text style={s.pixInstructions}>Finalize o pagamento no checkout hospedado da SumUp. Após a confirmação, seu saldo será creditado automaticamente.</Text>

          <TouchableOpacity style={s.doneBtn} onPress={handleOpenSumUpAgain}>
            <Text style={s.doneBtnText}>Abrir pagamento novamente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.doneBtn, { marginTop: 10 }]} onPress={handleSumUpPaid}>
            <Text style={s.doneBtnText}>Já paguei</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Aguardando confirmação do pagamento...</Text>
          </View>
          <Text style={s.pixNote}>Esta tela verifica automaticamente o status a cada 5 segundos.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Pix payment screen
  if (pixData) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={handlePixDone}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Pix</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.pixContainer}>
        <View style={s.pixCard}>
          <Ionicons name="checkmark-circle-outline" size={32} color={COLORS.primary} />
          <Text style={s.pixTitle}>Pix</Text>
          <Text style={s.pixSub}>Código Pix para pagar pelo app do banco</Text>
          <Text style={[s.pixSub, { marginTop: 0, marginBottom: 20 }]}>Saldo R$ {pixData.amount.toFixed(2)}</Text>

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
              <Text style={s.pixInfoSub}>{familyReturn ? 'Benefícios sazonais são apurados após confirmação do Pix.' : 'Após o Pix ser confirmado, seu saldo será atualizado no app.'}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.doneBtn} onPress={handlePixDone}>
            <Text style={s.doneBtnText}>Já paguei</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Aguardando confirmação do pagamento...</Text>
          </View>
          <Text style={s.pixNote}>Seu saldo será atualizado automaticamente após a confirmação.</Text>
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

        {/* Bônus Anual KAVIAR */}
        {familyReturnData?.enabled && (
          <View style={[s.infoCard, { marginBottom: 16, borderLeftWidth: 3, borderLeftColor: COLORS.success }]}>
            <Text style={[s.infoTitle, { color: COLORS.success }]}>Bônus Anual KAVIAR</Text>
            <Text style={s.infoText}>O modelo atual de benefícios prevê bônus anual de 10%, conforme regras de elegibilidade e período de apuração.</Text>
            <Text style={[s.infoText, { fontSize: 11, marginTop: 4 }]}>Acompanhe campanhas e avisos pelo app.</Text>
          </View>
        )}

        {packages.map(pkg => (
          <TouchableOpacity key={pkg.id} style={s.packageCard} onPress={() => openPaymentMethodSelector(pkg)} disabled={buying}>
            <View style={{ flex: 1 }}>
              <Text style={s.packageCredits}>{pkg.label}</Text>
              <Text style={s.packagePrice}>{pkg.family_return_cents > 0 ? 'Benefício anual elegível de 10% conforme regras vigentes' : 'Pix ou Cartão'}</Text>
            </View>
            <View style={s.buyBtn}>
              {buying ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.buyBtnText}>Escolher</Text>}
            </View>
          </TouchableOpacity>
        ))}

        {/* How it works */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Como funciona</Text>
          {familyReturn && <Text style={[s.infoText, { color: COLORS.success, fontWeight: '600' }]}>🎁 Bônus Anual KAVIAR: o modelo atual prevê bônus anual de 10%, conforme regras vigentes de elegibilidade e apuração.</Text>}
          <Text style={s.infoText}>Você recebe do passageiro. A taxa KAVIAR é debitada do saldo apenas após corrida concluída.</Text>
          <Text style={s.infoText}>Mantenha saldo disponível para continuar recebendo corridas pelo app.</Text>
          <Text style={[s.infoText, { marginTop: 10, fontWeight: '600', color: COLORS.textPrimary }]}>Exemplo: corrida de R$ 30,00</Text>
          <Text style={s.infoText}>• Passageiro paga R$ 30,00 direto para você</Text>
          <Text style={s.infoText}>• Taxa KAVIAR 18% = R$ 5,40</Text>
          <Text style={s.infoText}>• Seu saldo KAVIAR é descontado em R$ 5,40</Text>
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

      <Modal transparent animationType="fade" visible={!!selectedPackage} onRequestClose={closePaymentMethodSelector}>
        <Pressable style={s.methodModalOverlay} onPress={closePaymentMethodSelector}>
          <Pressable style={s.methodModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={s.methodModalTitle}>Como deseja recarregar?</Text>
            <Text style={s.methodModalSubtitle}>{selectedPackage?.label ?? ''}</Text>

            <TouchableOpacity style={s.methodOption} onPress={() => handleBuy('asaas')} disabled={buying}>
              <View style={{ flex: 1 }}>
                <Text style={s.methodOptionTitle}>Pix</Text>
                <Text style={s.methodOptionSub}>Código Pix para pagar pelo app do banco</Text>
              </View>
              {buying ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="qr-code-outline" size={20} color={COLORS.primary} />}
            </TouchableOpacity>

            <TouchableOpacity style={s.methodOption} onPress={() => handleBuy('sumup')} disabled={buying}>
              <View style={{ flex: 1 }}>
                <Text style={s.methodOptionTitle}>Cartão / Google Pay / Apple Pay</Text>
                <Text style={s.methodOptionSub}>Pagamento seguro pela SumUp</Text>
              </View>
              {buying ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="card-outline" size={20} color={COLORS.primary} />}
            </TouchableOpacity>

            <TouchableOpacity style={s.methodCancelBtn} onPress={closePaymentMethodSelector} disabled={buying}>
              <Text style={s.methodCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  loadingTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 14, marginBottom: 18 },
  loadingLine: { width: '78%', height: 12, borderRadius: 6, backgroundColor: COLORS.surfaceLight, marginTop: 8 },
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
  methodModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.68)', justifyContent: 'center', padding: 20 },
  methodModalCard: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary, padding: 20, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  methodModalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  methodModalSubtitle: { marginTop: 6, marginBottom: 16, fontSize: 13, color: COLORS.textMuted },
  methodOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, backgroundColor: COLORS.background, marginBottom: 10 },
  methodOptionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  methodOptionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  methodCancelBtn: { marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, alignItems: 'center' },
  methodCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
});
