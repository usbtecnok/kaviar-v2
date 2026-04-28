import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { TripComposition } from './TripComposition';
import { ScheduleSelector } from './ScheduleSelector';

interface Place { text: string; lat: number; lng: number; placeId: string }
interface PostWaitDest { lat: number; lng: number; text: string }
type ScheduleOption = 'now' | '15min' | '30min' | 'custom';

interface Props {
  // Step 1 — Destination
  origin: Place | null;
  destination: Place | null;
  onSearchOrigin: () => void;
  onSearchDestination: () => void;
  estimate: { price: number; distance_km: number; wait_charge_estimate?: number | null } | null;
  estimateLoading: boolean;
  // Step 2 — Details
  passengerCount: number;
  onPassengerChange: (n: number) => void;
  hasLuggage: boolean;
  onLuggageToggle: () => void;
  // Step 3 — Wait
  waitEstimatedMin: number | null;
  onWaitChange: (min: number | null) => void;
  postWaitDest: PostWaitDest | null;
  onPostWaitClear: () => void;
  onPostWaitSearch: () => void;
  // Step 4 — Summary
  scheduleOption: ScheduleOption;
  onScheduleChange: (opt: ScheduleOption) => void;
  customTime: Date | null;
  scheduleLabel: string;
  loading: boolean;
  onSubmit: () => void;
  onStepChange?: (step: number) => void;
}

const STEPS = ['Destino', 'Detalhes', 'Espera', 'Resumo'] as const;

export function RideWizard(props: Props & { step: number }) {
  const step = props.step;
  const setStep = (s: number) => props.onStepChange?.(s);

  const canAdvance = () => {
    if (step === 0) return !!props.destination;
    return true;
  };

  const next = () => { if (canAdvance() && step < 3) { const s = step + 1; setStep(s); props.onStepChange?.(s); } };
  const back = () => { if (step > 0) { const s = step - 1; setStep(s); props.onStepChange?.(s); } };

  return (
    <View style={s.container}>
      {/* Progress dots */}
      <View style={s.progress}>
        {STEPS.map((label, i) => (
          <View key={label} style={s.progressItem}>
            <View style={[s.progressDot, i <= step && s.progressDotActive]} />
            <Text style={[s.progressLabel, i <= step && s.progressLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Step 1 — Destination */}
      {step === 0 && (
        <View>
          <Text style={s.stepTitle}>Para onde você vai?</Text>
          <TouchableOpacity style={s.addressRow} onPress={props.onSearchOrigin}>
            <View style={[s.dot, { backgroundColor: COLORS.success }]} />
            <View style={s.addressInfo}>
              <Text style={s.addressLabel}>EMBARQUE</Text>
              <Text style={s.addressText} numberOfLines={1}>{props.origin?.text || 'Obtendo localização...'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.addressRow, { borderBottomWidth: 0 }]} onPress={props.onSearchDestination}>
            <View style={[s.dot, { backgroundColor: COLORS.danger }]} />
            <View style={s.addressInfo}>
              <Text style={s.addressLabel}>DESTINO</Text>
              <Text style={[s.addressText, !props.destination && { color: COLORS.textMuted }]} numberOfLines={1}>
                {props.destination?.text || 'Toque para buscar endereço'}
              </Text>
            </View>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {props.estimate && (
            <View style={s.estimateRow}>
              <Text style={s.estimateText}>~{props.estimate.distance_km.toFixed(1)} km</Text>
              <Text style={s.estimatePrice}>R$ {props.estimate.price.toFixed(2)}</Text>
            </View>
          )}
          {props.estimateLoading && !props.estimate && props.destination && (
            <Text style={s.estimateLoading}>Calculando estimativa...</Text>
          )}
        </View>
      )}

      {/* Step 2 — Details */}
      {step === 1 && (
        <View>
          <Text style={s.stepTitle}>Detalhes da viagem</Text>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>👥 Passageiros</Text>
            <View style={s.counter}>
              <TouchableOpacity onPress={() => props.onPassengerChange(Math.max(1, props.passengerCount - 1))} style={s.counterBtn}><Text style={s.counterBtnText}>−</Text></TouchableOpacity>
              <Text style={s.counterValue}>{props.passengerCount}</Text>
              <TouchableOpacity onPress={() => props.onPassengerChange(Math.min(4, props.passengerCount + 1))} style={s.counterBtn}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={s.detailRow} onPress={props.onLuggageToggle} activeOpacity={0.7}>
            <Text style={s.detailLabel}>🧳 Bagagem</Text>
            <View style={[s.toggle, props.hasLuggage && s.toggleOn]}>
              <Text style={s.toggleText}>{props.hasLuggage ? 'Sim' : 'Não'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3 — Wait */}
      {step === 2 && (
        <View>
          <Text style={s.stepTitle}>Precisa de espera no destino?</Text>
          <View style={s.waitGrid}>
            {[null, 10, 20, 30, 45, 60].map(min => (
              <TouchableOpacity
                key={String(min)}
                onPress={() => props.onWaitChange(min)}
                activeOpacity={0.7}
                style={[s.waitChip, props.waitEstimatedMin === min && s.waitChipActive]}
              >
                <Text style={s.waitChipText}>{min === null ? 'Não' : `${min} min`}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {props.waitEstimatedMin !== null && (
            <View style={{ marginTop: 16 }}>
              <Text style={s.detailLabel}>Depois da espera, vai para outro destino?</Text>
              {props.postWaitDest ? (
                <View style={s.postWaitCard}>
                  <View style={[s.dot, { backgroundColor: '#1565c0' }]} />
                  <Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: 14 }} numberOfLines={1}>{props.postWaitDest.text}</Text>
                  <TouchableOpacity onPress={props.onPostWaitClear} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={[s.addressRow, { borderBottomWidth: 0, backgroundColor: COLORS.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border }]}
                    onPress={props.onPostWaitSearch}
                    activeOpacity={0.7}
                  >
                    <View style={[s.dot, { backgroundColor: COLORS.textMuted }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: COLORS.textMuted }}>Para onde depois da espera?</Text>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Toque para buscar ou deixe vazio</Text>
                    </View>
                    <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
              {props.postWaitDest && (
                <Text style={{ fontSize: 12, color: '#2e7d32', marginTop: 8, fontWeight: '600' }}>
                  ✓ Valor incluirá ida + trecho após espera + tempo de espera
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Step 4 — Summary */}
      {step === 3 && (
        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
          <Text style={s.stepTitle}>Confirme sua corrida</Text>
          <View style={s.summaryBlock}>
            <SummaryRow icon="📍" label="Embarque" value={props.origin?.text || '—'} />
            <SummaryRow icon="🏁" label={props.waitEstimatedMin ? 'Parada' : 'Destino'} value={props.destination?.text || '—'} />
            {props.waitEstimatedMin != null && (
              <SummaryRow icon="⏳" label="Espera" value={`~${props.waitEstimatedMin} min`} />
            )}
            {props.postWaitDest && (
              <SummaryRow icon="📍" label="Após espera" value={props.postWaitDest.text} accent />
            )}
            <SummaryRow icon="👥" label="Passageiros" value={String(props.passengerCount)} />
            {props.hasLuggage && <SummaryRow icon="🧳" label="Bagagem" value="Sim" />}
          </View>
          {props.estimate && (
            <View style={s.summaryPrice}>
              {props.estimate.wait_charge_estimate ? (
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Rota completa</Text>
                    <Text style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' }}>R$ {props.estimate.price.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Espera estimada (~{props.waitEstimatedMin} min)</Text>
                    <Text style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' }}>+ R$ {props.estimate.wait_charge_estimate.toFixed(2)}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 6 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Total estimado</Text>
                    <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '800' }}>R$ {(props.estimate.price + props.estimate.wait_charge_estimate).toFixed(2)}</Text>
                  </View>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 4 }}>A espera será cobrada pelo tempo real.</Text>
                </View>
              ) : (
                <>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Estimativa</Text>
                  <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '800' }}>R$ {props.estimate.price.toFixed(2)}</Text>
                </>
              )}
            </View>
          )}
          <ScheduleSelector
            scheduleOption={props.scheduleOption}
            onOptionChange={props.onScheduleChange}
            customTime={props.customTime}
          />
        </ScrollView>
      )}

      {/* Navigation */}
      <View style={s.nav}>
        {step > 0 ? (
          <TouchableOpacity style={s.navBack} onPress={back}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
            <Text style={s.navBackText}>Voltar</Text>
          </TouchableOpacity>
        ) : <View />}
        {step < 3 ? (
          <TouchableOpacity
            style={[s.navNext, !canAdvance() && s.navNextDisabled]}
            onPress={next}
            disabled={!canAdvance()}
            activeOpacity={0.7}
          >
            <Text style={s.navNextText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.navSubmit, props.loading && { opacity: 0.6 }]}
            onPress={props.onSubmit}
            disabled={props.loading || (props.scheduleOption === 'custom' && !props.customTime)}
            activeOpacity={0.7}
          >
            <Text style={s.navSubmitText}>
              {props.loading ? 'Solicitando...' : props.scheduleOption === 'now' ? 'Pedir KAVIAR' : `Agendar para ${props.scheduleLabel}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SummaryRow({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: boolean }) {
  return (
    <View style={s.summaryRow}>
      <Text style={{ fontSize: 14, width: 24 }}>{icon}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, accent && { color: '#1565c0' }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 10,
  },
  progress: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressItem: { alignItems: 'center', flex: 1 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border, marginBottom: 2 },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  progressLabelActive: { color: COLORS.primary },
  stepTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },

  // Address rows (step 1)
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 2 },
  addressText: { fontSize: 15, color: COLORS.textPrimary },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  estimateText: { fontSize: 13, color: COLORS.textSecondary },
  estimatePrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  estimateLoading: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 12 },

  // Details (step 2)
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  detailLabel: { fontSize: 15, color: COLORS.textPrimary },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  counterBtnText: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary },
  counterValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  toggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  toggleOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  // Wait (step 3)
  waitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  waitChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  waitChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  waitChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  postWaitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#1565c0' },

  // Summary (step 4)
  summaryBlock: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 12, color: COLORS.textMuted, width: 80 },
  summaryValue: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  summaryPrice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },

  // Navigation
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  navBack: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 8 },
  navBackText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  navNext: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  navNextDisabled: { opacity: 0.4 },
  navNextText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  navSubmit: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginLeft: 12 },
  navSubmitText: { fontSize: 17, fontWeight: '800', color: COLORS.textDark },
});
