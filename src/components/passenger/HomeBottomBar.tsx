import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';

interface Props {
  onCall: () => void;
  onHome: () => void;
  onAccount: () => void;
}

export function HomeBottomBar({ onCall, onHome, onAccount }: Props) {
  return (
    <View style={s.outer}>
      <View style={s.bar}>
        <TouchableOpacity style={s.tab} onPress={onHome} activeOpacity={0.7}>
          <Ionicons name="home-outline" size={22} color="#777" />
          <Text style={s.tabLabel}>Início</Text>
        </TouchableOpacity>

        <View style={s.centerWrap}>
          <TouchableOpacity style={s.callBtn} onPress={onCall} activeOpacity={0.85}>
            <Ionicons name="car-sport" size={28} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={s.callLabel}>CHAMAR</Text>
        </View>

        <TouchableOpacity style={s.tab} onPress={onAccount} activeOpacity={0.7}>
          <Ionicons name="person-outline" size={22} color="#777" />
          <Text style={s.tabLabel}>Conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BOTTOM_SAFE = Platform.OS === 'ios' ? 24 : 48;

const s = StyleSheet.create({
  outer: {
    backgroundColor: '#F8F6EF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(214,169,40,0.2)',
    paddingBottom: BOTTOM_SAFE,
    paddingTop: 12,
  },
  tab: { alignItems: 'center', flex: 1, paddingTop: 8 },
  tabLabel: { fontSize: 10, color: '#555', marginTop: 3, fontWeight: '600' },
  centerWrap: { alignItems: 'center', marginTop: -32 },
  callBtn: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: COLORS.primary,
    borderWidth: 3, borderColor: '#D6A928',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 14,
  },
  callLabel: {
    fontSize: 9, fontWeight: '900', color: '#D6A928',
    letterSpacing: 2, marginTop: 5,
  },
});
