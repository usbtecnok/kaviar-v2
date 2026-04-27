import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { drain } from './offline-queue';

let unsubscribe: (() => void) | null = null;
let wasDisconnected = false;

export function startNetInfoListener(): void {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    if (!state.isConnected) {
      wasDisconnected = true;
      return;
    }

    // Reconnected — drain queue
    if (wasDisconnected && state.isConnected) {
      wasDisconnected = false;
      AsyncStorage.getItem('auth_token').then(token => {
        if (token) drain(token).catch(() => {});
      });
    }
  });
}

export function stopNetInfoListener(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
