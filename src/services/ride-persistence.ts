import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ride } from '../types/ride';

const DRIVER_RIDE_KEY = 'kaviar_driver_active_ride';
const PASSENGER_RIDE_KEY = 'kaviar_passenger_active_ride';

export async function persistDriverRide(ride: Ride | null): Promise<void> {
  if (ride) {
    await AsyncStorage.setItem(DRIVER_RIDE_KEY, JSON.stringify(ride));
  } else {
    await AsyncStorage.removeItem(DRIVER_RIDE_KEY);
  }
}

export async function getPersistedDriverRide(): Promise<Ride | null> {
  try {
    const raw = await AsyncStorage.getItem(DRIVER_RIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function persistPassengerRide(ride: Ride | null): Promise<void> {
  if (ride) {
    await AsyncStorage.setItem(PASSENGER_RIDE_KEY, JSON.stringify(ride));
  } else {
    await AsyncStorage.removeItem(PASSENGER_RIDE_KEY);
  }
}

export async function getPersistedPassengerRide(): Promise<Ride | null> {
  try {
    const raw = await AsyncStorage.getItem(PASSENGER_RIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
