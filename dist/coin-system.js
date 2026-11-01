// Additional coin tiers use a separate deterministic RNG stream. This avoids
// consuming the original APK pattern director's randomness.
export const COIN_VALUES=Object.freeze([1,5,10]);
export const COIN_BOOST_DURATION=15; // seconds of actual gameplay
export const COIN_TIER_GREEN_RATE=.08;
export const COIN_TIER_RED_RATE=.02;
export function coinTierFromRoll(roll){
 return roll<COIN_TIER_RED_RATE?2:roll<COIN_TIER_RED_RATE+COIN_TIER_GREEN_RATE?1:0;
}
export function coinPayout(tier,shopDouble=false,pickupDouble=false){
 return (COIN_VALUES[tier]??COIN_VALUES[0])*(shopDouble?2:1)*(pickupDouble?2:1);
}
