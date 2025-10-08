// Quick test of spintax expansion
function expandSpintax(text, seed = null) {
  if (!text || typeof text !== 'string') return text;
  
  let random = Math.random;
  if (seed !== null) {
    let currentSeed = seed;
    random = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }
  
  let result = text;
  let iterations = 0;
  const maxIterations = 100;
  
  while (/{[^}]*\|[^}]*}/.test(result) && iterations < maxIterations) {
    result = result.replace(/{([^}]+)}/, (match, content) => {
      const options = content.split('|').map((s) => s.trim());
      if (options.length <= 1) return match;
      
      const randomIndex = Math.floor(random() * options.length);
      return options[randomIndex] || options[0];
    });
    iterations++;
  }
  
  return result;
}

const testText = `Hey Ashan,

I hope you're {doing well|having a great day|doing fantastic}.

I {wanted to|thought I'd|needed to} {share|tell you about|show you} something {interesting|amazing|special}.`;

console.log('=== Test 1: No seed (fully random) ===');
console.log(expandSpintax(testText));

console.log('\n=== Test 2: With seed 12345 ===');
console.log(expandSpintax(testText, 12345));

console.log('\n=== Test 3: With seed 67890 ===');
console.log(expandSpintax(testText, 67890));
