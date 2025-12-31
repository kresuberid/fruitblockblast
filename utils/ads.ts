
// Ad Configuration
export const AD_CONFIG = {
  APP_ID: 'ca-app-pub-6859885802745834~8345344478',
  REWARDED_ID: 'ca-app-pub-6859885802745834/8410931266', // Standard Reward (Shop)
  MULTIPLIER_ID: 'ca-app-pub-6859885802745834/9824101193', // Multiplier Reward (Speedometer)
  PUB_ID: 'ca-app-pub-6859885802745834'
};

export const AdManager = {
  initialized: false,

  init() {
    if (this.initialized) return;
    console.log('AdManager: Initializing with ID', AD_CONFIG.APP_ID);
    
    // Check for native AdMob plugins (Cordova/Capacitor)
    if ((window as any).admob) {
       (window as any).admob.start();
    }
    
    this.initialized = true;
  },

  /**
   * Attempts to show a rewarded ad.
   * @param adUnitId Optional specific Ad Unit ID. Defaults to REWARDED_ID if not provided.
   * Returns a Promise that resolves to TRUE if reward should be granted, 
   * or FALSE if the ad failed to load/show (triggering fallback).
   */
  async showRewarded(adUnitId?: string): Promise<boolean> {
    const targetId = adUnitId || AD_CONFIG.REWARDED_ID;

    // 1. Check for Native AdMob (e.g. admob-plus-cordova, capacitor-admob)
    if ((window as any).admob) {
      try {
        console.log('AdManager: Requesting Native AdMob ID:', targetId);
        await (window as any).admob.rewardVideo.load({ id: targetId });
        await (window as any).admob.rewardVideo.show();
        return true; 
      } catch (e) {
        console.error('AdManager: Native Ad failed', e);
        // Fallthrough to mock
      }
    }

    // 2. Check for Google H5 Games Ads (adsbygoogle)
    if ((window as any).adBreak) {
      return new Promise((resolve) => {
        (window as any).adBreak({
          type: 'reward',
          name: 'multiplier_bonus',
          beforeAd: () => { console.log('Ad started'); },
          afterAd: () => { console.log('Ad finished'); },
          adBreakDone: (placementInfo: any) => {
             console.log('AdBreak Done', placementInfo);
             if (placementInfo.breakStatus === 'viewed') {
               resolve(true);
             } else {
               resolve(false);
             }
          }
        });
      });
    }

    // 3. Fallback: If no ad system is detected (Web/Vercel), return false 
    // so the App can show a "Mock/Simulated" ad UI.
    console.log('AdManager: No active ad system found. Triggering mock fallback.');
    return false;
  }
};
