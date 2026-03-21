import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Redirect para map (solicitar corrida é feito na tela principal)
export default function RequestRide() {
  const router = useRouter();
  useEffect(() => { router.replace('/(passenger)/map'); }, []);
  return null;
}
