import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, Dimensions, Platform, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = SCREEN_W * 0.78;

export interface DrawerItem {
  key: string;
  label: string;
  icon: string;          // Ionicons name
  badge?: string;        // e.g. "✦"
  danger?: boolean;      // red text (for logout)
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userPhone?: string;
  items: DrawerItem[];
}

export function DrawerMenu({ visible, onClose, userName, userPhone, items }: Props) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const initials = userName
    ? userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.userName} numberOfLines={1}>{userName || 'Passageiro'}</Text>
          {userPhone ? <Text style={s.userPhone}>{userPhone}</Text> : null}
          <View style={s.headerLine} />
        </View>

        {/* Items */}
        <View style={s.itemsContainer}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <React.Fragment key={item.key}>
                {/* Separator before logout */}
                {item.danger && <View style={s.separator} />}
                <TouchableOpacity
                  style={s.item}
                  onPress={() => {
                    // DEBUG: Evidência de clique no drawer
                    Alert.alert('DEBUG Drawer', `Item clicado: ${item.label}`);
                    
                    if (item.danger) {
                      item.onPress();
                      onClose();
                    } else {
                      onClose();
                      setTimeout(item.onPress, 350);
                    }
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.danger ? COLORS.danger : COLORS.textSecondary}
                    style={s.itemIcon}
                  />
                  <Text style={[s.itemLabel, item.danger && { color: COLORS.danger }]}>
                    {item.label}
                  </Text>
                  {item.badge ? (
                    <Text style={s.badge}>{item.badge}</Text>
                  ) : null}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerBrand}>KAVIAR</Text>
          <Text style={s.footerTagline}>Mobilidade com identidade</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: DRAWER_W,
    backgroundColor: COLORS.background,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: STATUSBAR_H,
  },
  // Header
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 20, fontWeight: '800',
    color: COLORS.primary,
  },
  userName: {
    fontSize: 18, fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userPhone: {
    fontSize: 13, color: COLORS.textMuted,
    marginTop: 3,
  },
  headerLine: {
    height: 2, width: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
    marginTop: 16,
  },
  // Items
  itemsContainer: {
    flex: 1,
    paddingTop: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  itemIcon: {
    width: 28,
    marginRight: 16,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  badge: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 6,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 24,
    marginVertical: 8,
  },
  // Footer
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerBrand: {
    fontSize: 14, fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
  },
  footerTagline: {
    fontSize: 10, color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
