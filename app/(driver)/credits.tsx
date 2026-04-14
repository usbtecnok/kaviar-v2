import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Alert, Clipboard, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '../../src/api/driver.api';
import { COLORS } from '../../src/config/colors';

type Package = { id: string; credits: number; price: number; priceCents: number };
type Purchase = { id: string; status: string; credits_amount: number; amount_cents: number; created_at: string; paid_at: string | null };

export default function DriverCredits() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);

  // Pix payment state
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; credits: number; amount: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const [cred, pkgs, hist] = await Promise.allSettled([
        driverApi.getCredits(),
        driverApi.getCreditPackages(),
        driverApi.getCreditPurchases(),
      ]);
      if (cred.status === 'fulfilled') setBalance(cred.value.balance);
      if (pkgs.status === 'fulfilled') setPackages(pkgs.value);
      if (hist.status === 'fulfilled') setPurchases(hist.value);
    } catch (e) {
      console.warn('[Credits] load failed:', e);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (pkg: Package) => {
    setBuying(true);
    try {
      const result = await driverApi.purchaseCredits(pkg.id);
      setPixData({
        qrCode: result.pix?.qrCode || '',
        copyPaste: result.pix?.copyPaste || '',
        credits: result.credits,
        amount: result.amountCents / 100,
      });
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível criar a cobrança.');
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
          <Text style={s.pixSub}>{pixData.credits} créditos • R$ {pixData.amount.toFixed(2)}</Text>

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
              <Text style={s.pixInfoMain}>Os créditos entram automaticamente após a confirmação do pagamento.</Text>
              <Text style={s.pixInfoSub}>Após o Pix ser confirmado, seu saldo será atualizado no app.</Text>
            </View>
          </View>

          <TouchableOpacity style={s.doneBtn} onPress={handlePixDone}>
            <Text style={s.doneBtnText}>Já paguei</Text>
          </TouchableOpacity>
          <Text style={s.pixNote}>Seus créditos serão adicionados automaticamente após a confirmação do pagamento.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Main screen
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={s.title}>Créditos</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
        {/* Balance */}
        <View style={s.balanceCard}>
          <Ionicons name="wallet-outline" size={28} color={COLORS.primary} />
          <Text style={s.balanceValue}>{balance ?? '—'}</Text>
          <Text style={s.balanceLabel}>crédito{balance !== 1 ? 's' : ''} disponíve{balance !== 1 ? 'is' : 'l'}</Text>
        </View>

        {balance !== null && balance < 5 && (
          <View style={[s.alert, balance === 0 && { backgroundColor: '#fde8e8' }]}>
            <Ionicons name={balance === 0 ? 'alert-circle-outline' : 'warning-outline'} size={18} color={balance === 0 ? COLORS.danger : COLORS.warning} />
            <Text style={[s.alertText, { color: balance === 0 ? COLORS.danger : COLORS.warning }]}>
              {balance === 0 ? 'Sem créditos. Você não receberá corridas.' : 'Créditos acabando. Recarregue em breve.'}
            </Text>
          </View>
        )}

        {/* Packages */}
        <Text style={s.sectionTitle}>Comprar créditos</Text>
        {packages.map(pkg => (
          <TouchableOpacity key={pkg.id} style={s.packageCard} onPress={() => handleBuy(pkg)} disabled={buying}>
            <View style={{ flex: 1 }}>
              <Text style={s.packageCredits}>{pkg.credits} créditos</Text>
              <Text style={s.packagePrice}>R$ {pkg.price.toFixed(2)}</Text>
            </View>
            <View style={s.buyBtn}>
              {buying ? <ActivityIndicator size="small" color="#000" /> : <Text style={s.buyBtnText}>Pix</Text>}
            </View>
          </TouchableOpacity>
        ))}

        {/* How it works */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Como funciona</Text>
          <Text style={s.infoText}>Corrida local: 1 crédito • Corrida externa: 2 créditos</Text>
          <Text style={s.infoText}>Pague via Pix e seus créditos são adicionados automaticamente.</Text>
        </View>

        {/* History */}
        {purchases.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Últimas compras</Text>
            {purchases.slice(0, 5).map(p => (
              <View key={p.id} style={s.historyRow}>
                <Ionicons name={p.status === 'confirmed' ? 'checkmark-circle' : 'time-outline'} size={16} color={p.status === 'confirmed' ? COLORS.success : COLORS.warning} />
                <Text style={s.historyText}>{p.credits_amount} créditos • R$ {(p.amount_cents / 100).toFixed(2)}</Text>
                <Text style={s.historyStatus}>{p.status === 'confirmed' ? 'Pago' : 'Pendente'}</Text>
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
