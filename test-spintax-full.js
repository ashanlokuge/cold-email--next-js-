// Complete test of the spintax system
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

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
  
  console.log('🔍 Starting expandSpintax:');
  console.log('  Input:', text.substring(0, 100));
  console.log('  Has spintax:', /{[^}]*\|[^}]*}/.test(text));
  console.log('  Seed:', seed);
  
  while (/{[^}]*\|[^}]*}/.test(result) && iterations < maxIterations) {
    const before = result;
    result = result.replace(/{([^}]+)}/, (match, content) => {
      const options = content.split('|').map((s) => s.trim());
      if (options.length <= 1) return match;
      
      const randomIndex = Math.floor(random() * options.length);
      console.log(`  Iteration ${iterations}: "${match}" → "${options[randomIndex]}" (index ${randomIndex} of ${options.length})`);
      return options[randomIndex] || options[0];
    });
    iterations++;
    
    if (iterations > 10) {
      console.log('⚠️  Too many iterations, stopping...');
      break;
    }
  }
  
  console.log('✅ Final result:', result.substring(0, 150));
  console.log('  Iterations:', iterations);
  console.log('  Still has spintax:', /{[^}]*\|[^}]*}/.test(result));
  
  return result;
}

function personalizeContent(content, recipient, recipientIndex = 0, senderEmail = '') {
  if (!content || !recipient) return content;
  
  console.log('\n🎯 PersonalizeContent called for:', recipient.email);
  
  const emailDomain = recipient.email.split('@')[1] || '';
  const contentHash = simpleHash(content.substring(0, 100));
  const uniqueString = `${recipient.email}_${recipientIndex}_${emailDomain}_${contentHash}`;
  const seed = simpleHash(uniqueString);
  
  console.log('  Seed generated:', seed);
  
  let personalized = expandSpintax(content, seed);
  
  const senderNames = {
    'sales': 'John from Sales',
    'support': 'Sarah from Support',
    'marketing': 'Mike from Marketing',
    'info': 'The Team',
    'hello': 'Customer Success',
    'contact': 'Business Development'
  };
  
  const senderUsername = senderEmail.split('@')[0] || '';
  const senderName = senderNames[senderUsername] || 'The Team';
  
  personalized = personalized
    .replace(/\{\{name\}\}/g, recipient.name || recipient.email.split('@')[0])
    .replace(/\{\{email\}\}/g, recipient.email)
    .replace(/\{\{firstName\}\}/g, (recipient.name || recipient.email.split('@')[0]).split(' ')[0])
    .replace(/\{\{lastName\}\}/g, (recipient.name || recipient.email.split('@')[0]).split(' ').slice(1).join(' ') || '')
    .replace(/\{\{senderName\}\}/g, senderName);
  
  return personalized;
}

// Test cases
console.log('='.repeat(80));
console.log('TEST 1: Simple spintax');
console.log('='.repeat(80));
const test1 = personalizeContent(
  '{Hi|Hello|Hey} {{firstName}}, {quick|important} {message|update}',
  { email: 'ashan@example.com', name: 'Ashan' },
  0,
  'sales@company.com'
);
console.log('\n📧 RESULT:', test1);

console.log('\n' + '='.repeat(80));
console.log('TEST 2: Full email body');
console.log('='.repeat(80));
const test2 = personalizeContent(
  `{Hi|Hello|Hey} {{firstName}},

I hope you're {doing well|having a great day|doing fantastic}.

{Would you|Could you|Can you} {spare|give me} {5|10} minutes?

{Thanks|Regards|Best},
{{senderName}}`,
  { email: 'sarah@company.com', name: 'Sarah Smith' },
  0,
  'support@company.com'
);
console.log('\n📧 RESULT:\n', test2);

console.log('\n' + '='.repeat(80));
console.log('TEST 3: Same content, different recipient');
console.log('='.repeat(80));
const test3 = personalizeContent(
  `{Hi|Hello|Hey} {{firstName}}, {quick|important} {message|update}`,
  { email: 'mike@startup.com', name: 'Mike Johnson' },
  0,
  'sales@company.com'
);
console.log('\n📧 RESULT:', test3);

console.log('\n' + '='.repeat(80));
console.log('SUMMARY: All tests completed!');
console.log('='.repeat(80));
