// Direct import test
const { personalizeContent, expandSpintax } = require('./src/lib/utils.ts');

const testRecipient = {
  email: 'john.doe@example.com',
  name: 'John Doe'
};

const testSubject = '{Quick|Important|Special} {update|message|news} for you';
const testBody = `Hello {there|friend},

I hope you're {doing well|having a great day|doing fantastic}.

{Thanks|Regards|Best}`;

console.log('=== Testing expandSpintax directly ===');
const expanded = expandSpintax(testSubject, 12345);
console.log('Result:', expanded);

console.log('\n=== Testing personalizeContent ===');
const personalized = personalizeContent(testBody, testRecipient, 0, 'sales@example.com');
console.log('Result:', personalized);
