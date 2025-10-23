#!/usr/bin/env node

// Simple Railway worker starter that doesn't need Next.js build
console.log('🚀 Starting Railway Worker...');

// Load the worker directly
require('./worker-commonjs.js');