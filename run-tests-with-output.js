const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Starting simple test execution...');
  const output = execSync('npx jest tests/simple.test.js --verbose --no-cache --no-silent', { 
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('Test Results:');
  console.log(output);
  
  // Also write to file
  fs.writeFileSync('test-results.txt', output);
  console.log('\nTest results also saved to test-results.txt');
  
} catch (error) {
  console.log('Test execution completed with exit code:', error.status);
  console.log('Output:', error.stdout);
  if (error.stderr) {
    console.log('Errors:', error.stderr);
  }
  
  // Write both stdout and stderr to file
  const fullOutput = `Exit Code: ${error.status}\n\nSTDOUT:\n${error.stdout}\n\nSTDERR:\n${error.stderr || 'No errors'}`;
  fs.writeFileSync('test-results.txt', fullOutput);
  console.log('\nTest results saved to test-results.txt');
}