// Quick test of delay calculation
import { calculateHumanLikeDelay } from './src/lib/utils';

console.log('Testing delay calculation...');
for(let i = 0; i < 5; i++) {
  const delay = calculateHumanLikeDelay(i, i+1, 100, 'test@example.com', Date.now());
  console.log(`Email ${i+1}: ${Math.round(delay/1000)}s delay`);
}