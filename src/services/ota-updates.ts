import * as Updates from 'expo-updates';

export async function attemptOtaUpdate(): Promise<boolean> {
  try {
    console.log('[OTA] checking');
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) {
      console.log('[OTA] no update');
      return false;
    }

    console.log('[OTA] update available');
    const fetched = await Updates.fetchUpdateAsync();
    if (!fetched.isNew) {
      console.log('[OTA] no update');
      return false;
    }

    console.log('[OTA] update fetched, reloading');
    await Updates.reloadAsync();
    return true;
  } catch (e) {
    console.warn('[OTA] check failed', e);
    return false;
  }
}
