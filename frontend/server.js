const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 0; // Use 0 for dynamic port assignment

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS middleware
app.use(cors());

// Serve static assets from the frontend directory itself
app.use(express.static(path.join(__dirname)));

// Logging function for server
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
}

// Helper function to get demo file path
function getDemoFilePath(demoType) {
    const fs = require('fs');
    const path = require('path');
    
    const demoFiles = {
        'atomic-swap': 'demos/finp2p/finp2p-atomic-swap-coordination-demo.js',
        'hedera-sui': 'demos/finp2p/hedera-sui-adapters-demo.js',
        'fusion': 'demos/finp2p/fusion-multi-chain-demo.js',
        'fusion-pure': 'demos/pure/fusion-pure-demo.js'
    };
    
    const demoFile = demoFiles[demoType];
    if (!demoFile) return null;
    
    const fullPath = path.join(process.cwd(), demoFile);
    return fs.existsSync(fullPath) ? fullPath : null;
}

// Function to execute demo commands
async function executeDemo(demoType) {
    return new Promise((resolve, reject) => {
        let command, args;
        
        switch (demoType) {
            case 'atomic-swap':
                command = 'npm';
                args = ['run', 'demo:atomic-swap'];
                break;
            case 'hedera-sui':
                command = 'npm';
                args = ['run', 'demo:adapters'];
                break;
            case 'fusion':
                command = 'npm';
                args = ['run', 'demo:fusion'];
                break;
            case 'fusion-pure':
                command = 'npm';
                args = ['run', 'demo:fusion-pure'];
                break;
            default:
                reject(new Error('Unknown demo type'));
                return;
        }

        console.log(`🚀 Executing: ${command} ${args.join(' ')}`);
        
        // Use shell: true to ensure npm is found in PATH
        const child = spawn(command, args, {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            env: { ...process.env }
        });

        let output = '';
        let errorOutput = '';
        
        // Set a timeout for the demo execution (5 minutes)
        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error(`Demo execution timed out after 5 minutes`));
        }, 5 * 60 * 1000);

        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log(`[${demoType}] ${text.trim()}`);
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            console.error(`[${demoType} ERROR] ${text.trim()}`);
        });

        child.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                resolve({
                    success: true,
                    output: output,
                    errorOutput: errorOutput,
                    exitCode: code
                });
            } else {
                resolve({
                    success: false,
                    output: output,
                    errorOutput: errorOutput,
                    exitCode: code
                });
            }
        });

        child.on('error', (error) => {
            clearTimeout(timeout);
            console.error(`❌ Failed to execute ${demoType} demo:`, error);
            
            // If npm fails, try using node directly as fallback
            if (error.code === 'ENOENT' && command === 'npm') {
                console.log('🔄 Trying fallback with node...');
                
                // Try to execute the demo file directly
                const demoFile = getDemoFilePath(demoType);
                if (demoFile) {
                    const nodeChild = spawn('node', [demoFile], {
                        cwd: process.cwd(),
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: true,
                        env: { ...process.env }
                    });
                    
                    let nodeOutput = '';
                    let nodeErrorOutput = '';
                    
                    nodeChild.stdout.on('data', (data) => {
                        const text = data.toString();
                        nodeOutput += text;
                        console.log(`[${demoType} NODE] ${text.trim()}`);
                    });
                    
                    nodeChild.stderr.on('data', (data) => {
                        const text = data.toString();
                        nodeErrorOutput += text;
                        console.error(`[${demoType} NODE ERROR] ${text.trim()}`);
                    });
                    
                    nodeChild.on('close', (code) => {
                        clearTimeout(timeout);
                        if (code === 0) {
                            resolve({
                                success: true,
                                output: nodeOutput,
                                errorOutput: nodeErrorOutput,
                                exitCode: code
                            });
                        } else {
                            resolve({
                                success: false,
                                output: nodeOutput,
                                errorOutput: nodeErrorOutput,
                                exitCode: code
                            });
                        }
                    });
                    
                    nodeChild.on('error', (nodeError) => {
                        clearTimeout(timeout);
                        reject(new Error(`Both npm and node execution failed: ${error.message}, ${nodeError.message}`));
                    });
                } else {
                    reject(new Error(`Demo file not found for ${demoType}`));
                }
            } else {
                reject(error);
            }
        });
    });
}

// API routes for demo
app.get('/api/status', (req, res) => {
    const status = {
        server: { 
            status: 'running', 
            port: PORT,
            timestamp: new Date().toISOString()
        },
        demos: {
            atomicSwap: { status: 'ready', command: 'npm run demo:atomic-swap' },
            hederaSui: { status: 'ready', command: 'npm run demo:adapters' },
            fusion: { status: 'ready', command: 'npm run demo:fusion' }
        }
    };
    res.json(status);
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
                 features: [
             'Real Testnet Transactions',
             'Live Terminal Output',
             'Transaction Tracking',
             'Balance Monitoring'
         ]
    });
});

// Serve the main demo page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoints for demo operations
app.post('/api/demo/:demoType', express.json(), async (req, res) => {
    const { demoType } = req.params;
    
    try {
        addLog(`🚀 Starting ${demoType} demo execution...`, 'info');
        
        const result = await executeDemo(demoType);
        
        // Parse the output to extract key information
        const parsedResult = parseDemoOutput(demoType, result.output);
        
        res.json({
            success: result.success,
            message: `${demoType} demo ${result.success ? 'completed' : 'failed'}`,
            data: {
                demoType: demoType,
                exitCode: result.exitCode,
                output: result.output,
                errorOutput: result.errorOutput,
                parsed: parsedResult,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error(`${demoType} Demo Error:`, error);
        
        // Provide more helpful error messages
        let errorMessage = error.message;
        if (error.message.includes('ENOENT')) {
            errorMessage = 'Demo command not found. Please ensure npm is installed and available in PATH.';
        } else if (error.message.includes('timed out')) {
            errorMessage = 'Demo execution timed out. The operation took too long to complete.';
        }
        
        res.status(500).json({
            success: false,
            message: `${demoType} demo failed`,
            error: errorMessage,
            details: {
                demoType: demoType,
                timestamp: new Date().toISOString(),
                suggestion: 'Try running the demo manually to see detailed error messages'
            }
        });
    }
});

// Function to parse demo output and extract key information
function parseDemoOutput(demoType, output) {
    const lines = output.split('\n');
    const result = {
        transactions: [],
        balances: {},
        balanceChanges: {},
        errors: [],
        summary: {},
        initialBalances: {},
        finalBalances: {}
    };
    
    // Track unique transaction IDs to prevent duplicates
    const seenTransactions = new Set();

    let currentSection = '';
    let isInBalanceSection = false;
    let currentContext = 'Unknown';

    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Debug: Log first few lines to see the actual output format
        if (lines.indexOf(line) < 10) {
            console.log(`🔍 Line ${lines.indexOf(line)}: "${trimmedLine}"`);
        }
        
        // Debug: Log any line that contains "balance" to see what we're missing
        if (trimmedLine.toLowerCase().includes('balance')) {
            console.log(`🔍 Balance-related line ${lines.indexOf(line)}: "${trimmedLine}"`);
        }
        
        // Track sections
        if (trimmedLine.includes('Getting INITIAL balances') || trimmedLine.includes('Getting INITIAL account balances') || 
            trimmedLine.match(/\d{2}:\d{2}:\d{2}\s+\[info\]:\s*💰 Getting INITIAL balances/) ||
            trimmedLine.includes('💰 Getting INITIAL balances') ||
            trimmedLine.includes('💰 Getting INITIAL balances before Fusion demo...') ||
            trimmedLine.includes('💰 Getting INITIAL balances before Pure Fusion demo...')) {
            currentSection = 'initial';
            isInBalanceSection = true;
            console.log('🔍 Balance section: INITIAL detected');
        } else if (trimmedLine.includes('Getting FINAL balances') || trimmedLine.includes('Getting FINAL account balances') ||
                   trimmedLine.match(/\d{2}:\d{2}:\d{2}\s+\[info\]:\s*💰 Getting FINAL balances/) ||
                   trimmedLine.includes('💰 Getting FINAL balances') ||
                   trimmedLine.includes('💰 Getting FINAL balances after Fusion demo...') ||
                   trimmedLine.includes('💰 Getting FINAL balances after Pure Fusion demo...')) {
            currentSection = 'final';
            isInBalanceSection = true;
            console.log('🔍 Balance section: FINAL detected');
        } else if (trimmedLine.includes('🔄 REAL CROSS-CHAIN TRANSFERS') ||
                   trimmedLine.includes('🎯 FUSION API v1.0.0 COMPLIANCE SUMMARY')) {
            isInBalanceSection = false;
            console.log('🔍 Balance section: Exiting balance section');
        }
        
        // Debug: Check if we're missing the initial balance section
        if (trimmedLine.includes('Getting') && trimmedLine.includes('balance') && !isInBalanceSection) {
            console.log(`🔍 Potential missed balance section: "${trimmedLine}"`);
            console.log(`🔍 Current section: ${currentSection}, isInBalanceSection: ${isInBalanceSection}`);
        }
        
        // Debug: Log all lines that might be balance-related
        if (trimmedLine.includes('Getting') && trimmedLine.includes('balance')) {
            console.log(`🔍 Potential balance section line: "${trimmedLine}"`);
        }
        
        // Debug: Log transaction-related lines
        if (trimmedLine.includes('Transaction') || trimmedLine.includes('txn') || trimmedLine.includes('txId')) {
            console.log(`🔍 Transaction line found: "${trimmedLine}"`);
        }
        
        // Track context for transaction type detection
        if (trimmedLine.includes('Sui') || trimmedLine.includes('SUI') || 
            trimmedLine.includes('Executing Sui') || trimmedLine.includes('Sui FinP2P') || 
            trimmedLine.includes('Sui direct')) {
            currentContext = 'SUI';
        } else if (trimmedLine.includes('Hedera') || trimmedLine.includes('HBAR') || 
                   trimmedLine.includes('Executing Hedera') || trimmedLine.includes('Hedera FinP2P') || 
                   trimmedLine.includes('Hedera direct')) {
            currentContext = 'HBAR';
        }
        
                 // Extract transaction IDs - improved pattern matching for Fusion demo
        if (trimmedLine.includes('Transaction Hash:') || trimmedLine.includes('txn:') || trimmedLine.includes('txId:') || 
            trimmedLine.includes('SUI Transfer:') || trimmedLine.includes('Hedera Transfer:')) {
            
            // Handle Fusion demo specific formats
            if (trimmedLine.includes('SUI Transfer:')) {
                const match = trimmedLine.match(/SUI Transfer:\s*([a-zA-Z0-9]+)/);
                if (match && match[1] && match[1] !== 'undefined') {
                    const txId = match[1];
                    if (!seenTransactions.has(txId)) {
                        result.transactions.push(`${txId} (SUI)`);
                        seenTransactions.add(txId);
                    }
                }
            } else if (trimmedLine.includes('Hedera Transfer:')) {
                const match = trimmedLine.match(/Hedera Transfer:\s*([a-zA-Z0-9@.]+)/);
                if (match && match[1] && match[1] !== 'undefined') {
                    const txId = match[1];
                    if (!seenTransactions.has(txId)) {
                        result.transactions.push(`${txId} (HBAR)`);
                        seenTransactions.add(txId);
                    }
                }
            } else {
                // Handle standard transaction hash formats
                const patterns = [
                    /(?:Transaction Hash:|txn:|txId:)\s*([a-zA-Z0-9@._-]+)/,
                    /(?:Transaction Hash:|txn:|txId:)\s*([a-zA-Z0-9@._-]+@[0-9.]+)/,
                    /(?:Transaction Hash:|txn:|txId:)\s*([a-zA-Z0-9@.]+)/
                ];
                
                for (const pattern of patterns) {
                    const match = trimmedLine.match(pattern);
                    if (match && match[1] && match[1] !== 'undefined') {
                        // Determine transaction type from context
                        let txType = 'Unknown';

                        // Check for ETH transactions in Fusion demo (most common)
                        if (
                            trimmedLine.includes('Real transaction executed successfully') ||
                            trimmedLine.includes('View on Etherscan') ||
                            trimmedLine.includes('Broadcasting real transaction to Sepolia')
                        ) {
                            txType = 'ETH';
                        } else if (trimmedLine.includes('SUI') || trimmedLine.includes('sui') ||
                            trimmedLine.includes('Alice → Bob SUI') || trimmedLine.includes('SUI transfer')) {
                            txType = 'SUI';
                        } else if (trimmedLine.includes('HBAR') || trimmedLine.includes('hbar') ||
                            trimmedLine.includes('Bob → Alice HBAR') || trimmedLine.includes('HBAR transfer')) {
                            txType = 'HBAR';
                        }

                        // --- PATCH: If this is a Transaction Hash line and the next line is View on Etherscan, force ETH ---
                        if (trimmedLine.startsWith('Transaction Hash:')) {
                            const nextLineIdx = lines.indexOf(line) + 1;
                            if (nextLineIdx < lines.length) {
                                const nextLine = lines[nextLineIdx].trim();
                                if (nextLine.includes('View on Etherscan')) {
                                    txType = 'ETH';
                                }
                            }
                        }
                        // --- END PATCH ---

                        // If still unknown, check the transaction hash format and context
                        if (txType === 'Unknown') {
                            const txId = match[1];
                            // ETH transaction hashes start with 0x and are 66 characters long
                            if (txId.startsWith('0x') && txId.length === 66) {
                                txType = 'ETH';
                            } else if (txId.includes('@')) {
                                // Hedera transaction IDs contain @ symbol
                                txType = 'HBAR';
                            } else if (txId.length > 40 && /^[A-Za-z0-9]+$/.test(txId) && !txId.startsWith('0x')) {
                                // SUI transaction hashes are long alphanumeric strings (but not ETH)
                                txType = 'SUI';
                            } else if (currentContext !== 'Unknown') {
                                // Use the context we've been tracking
                                txType = currentContext;
                            }
                        }
                        
                        // Handle both real and simulated transactions
                        if (match[1] === 'SIMULATED_TXN_HASH') {
                            const simulatedTx = `🎭 SIMULATED_TXN_HASH (${txType} - Demo Mode)`;
                            if (!seenTransactions.has(simulatedTx)) {
                                result.transactions.push(simulatedTx);
                                seenTransactions.add(simulatedTx);
                            }
                        } else {
                            const txId = match[1];
                            const txEntry = `${txId} (${txType})`;
                            if (!seenTransactions.has(txId)) {
                                result.transactions.push(txEntry);
                                seenTransactions.add(txId);
                            }
                        }
                        break;
                    }
                }
            }
        }
         
                   // Also check for transaction IDs in the detailed logs
          if (trimmedLine.includes('txId') && trimmedLine.includes('@')) {
              const txMatch = trimmedLine.match(/txId["\s]*[:=]\s*["]?([^"\s]+)["]?/);
              if (txMatch && txMatch[1] && txMatch[1] !== 'undefined') {
                  const txId = txMatch[1];
                  if (!seenTransactions.has(txId)) {
                      result.transactions.push(`${txId} (HBAR)`);
                      seenTransactions.add(txId);
                  }
              }
          }
         
                   // Check for SUI transaction hashes (they don't have @ symbol)
          if (trimmedLine.includes('txHash') && !trimmedLine.includes('@')) {
              const txMatch = trimmedLine.match(/txHash["\s]*[:=]\s*["]?([^"\s]+)["]?/);
              if (txMatch && txMatch[1] && txMatch[1] !== 'undefined') {
                  const txId = txMatch[1];
                  if (!seenTransactions.has(txId)) {
                      result.transactions.push(`${txId} (SUI)`);
                      seenTransactions.add(txId);
                  }
              }
          }
        
        // Extract balance information with changes - handle both detailed and Fusion demo formats
        if (isInBalanceSection && 
            (trimmedLine.includes('Balance:') || trimmedLine.includes('SUI') || trimmedLine.includes('HBAR') || trimmedLine.includes('ETH'))) {
            console.log(`🔍 Balance parsing: "${trimmedLine}" (section: ${currentSection})`);
            
            // Parse detailed balance lines like "Alice SUI Balance: 0.777532 SUI" or "Bob HBAR Balance: 1.076840 HBAR (Change: -0.100000)"
            // Also handle Fusion demo format with leading spaces like "   Alice ETH Balance: 1.234 ETH"
            // And handle logger timestamp format like "15:30:45 [info]:    Alice ETH Balance: 1.234 ETH"
            // Also handle Pure Fusion format like "   Account1 ETH Balance: 1.234567 ETH (Change: -0.001000)"
            let balanceMatch = trimmedLine.match(/(Account\d+|\w+)\s+(SUI|HBAR|ETH)\s+Balance:\s+([0-9.]+)\s+(SUI|HBAR|ETH)(?:\s+\(Change:\s+([+-]?[0-9.-]+)\))?/);
            
            // If no match, try alternative format for Fusion demo with leading spaces
            if (!balanceMatch) {
                balanceMatch = trimmedLine.match(/\s*(Account\d+|\w+)\s+(SUI|HBAR|ETH)\s+Balance:\s+([0-9.]+)\s+(SUI|HBAR|ETH)(?:\s+\(Change:\s+([+-]?[0-9.-]+)\))?/);
            }
            
            // If still no match, try a more flexible pattern that handles any amount of leading whitespace
            if (!balanceMatch) {
                balanceMatch = trimmedLine.match(/\s*(Account\d+|\w+)\s+(SUI|HBAR|ETH)\s+Balance:\s*([0-9.]+)\s*(SUI|HBAR|ETH)(?:\s*\(Change:\s*([+-]?[0-9.-]+)\))?/);
            }
            
            // If still no match, try pattern that handles logger timestamp format
            if (!balanceMatch) {
                balanceMatch = trimmedLine.match(/\d{2}:\d{2}:\d{2}\s+\[info\]:\s*(Account\d+|\w+)\s+(SUI|HBAR|ETH)\s+Balance:\s*([0-9.]+)\s*(SUI|HBAR|ETH)(?:\s*\(Change:\s*([+-]?[0-9.-]+)\))?/);
            }
            
            // If still no match, try the exact format from the Fusion demo output
            if (!balanceMatch) {
                balanceMatch = trimmedLine.match(/\d{2}:\d{2}:\d{2}\s+\[info\]:\s*(Account\d+|\w+)\s+(SUI|HBAR|ETH)\s+Balance:\s*([0-9.]+)\s+(SUI|HBAR|ETH)(?:\s*\(Change:\s*([+-]?[0-9.-]+)\))?/);
            }
            
            if (balanceMatch) {
                const [, account, token, amount, tokenType, change] = balanceMatch;
                const key = `${account}_${tokenType}`;
                
                console.log(`✅ Balance parsed: ${account} ${tokenType} = ${amount} (change: ${change || 'none'})`);
                
                if (currentSection === 'initial') {
                    result.initialBalances[key] = {
                        account: account,
                        token: tokenType,
                        amount: parseFloat(amount),
                        display: `${account} ${tokenType}: ${amount}`
                    };
                    console.log(`📊 Stored initial balance: ${key} = ${amount}`);
                } else if (currentSection === 'final') {
                    result.finalBalances[key] = {
                        account: account,
                        token: tokenType,
                        amount: parseFloat(amount),
                        change: change ? parseFloat(change) : null,
                        display: `${account} ${tokenType}: ${amount}${change ? ` (${change > 0 ? '+' : ''}${change})` : ''}`
                    };
                    console.log(`📊 Stored final balance: ${key} = ${amount} (change: ${change || 'none'})`);
                }
                
                // Store in legacy balances format for compatibility
                // Use account-specific keys to avoid overwriting
                result.balances[`${account}_${tokenType}`] = amount;
            }
            // Note: Lines containing ETH/SUI/HBAR that aren't balance lines are correctly skipped
        }
        
        // Extract legacy balance format (only if not already parsed as detailed balance)
        if ((trimmedLine.includes('balance:') || trimmedLine.includes('Balance:')) && 
            !trimmedLine.match(/(\w+)\s+(SUI|HBAR|ETH)\s+Balance:/)) {
            const match = trimmedLine.match(/(?:balance:|Balance:)\s*([0-9.]+)\s*([A-Z]+)/);
            if (match) {
                result.balances[match[2]] = match[1];
            }
        }
        
        // Extract errors
        if (trimmedLine.includes('ERROR') || trimmedLine.includes('Error:')) {
            result.errors.push(trimmedLine);
        }
        
        // Extract endpoint results for Fusion demos (both types)
        if ((demoType === 'fusion' || demoType === 'fusion-pure') && trimmedLine.includes('=') && 
            (trimmedLine.includes('/balance') || trimmedLine.includes('/nonce') || 
             trimmedLine.includes('/smartContract-read') || trimmedLine.includes('/transfer-proposal') ||
             trimmedLine.includes('/execute') || trimmedLine.includes('/transaction') ||
             trimmedLine.includes('/block') || trimmedLine.includes('/smartContractWrite-proposal') ||
             trimmedLine.includes('/smartContractDeploy-proposal'))) {
            
            // Updated regex to handle "endpoint = value (status)" format
            const match = trimmedLine.match(/\/?([a-zA-Z-]+)\s*=\s*(.+?)(?:\s*\((success|failed)\))?$/);
            if (match) {
                const [, endpoint, value, status] = match;
                if (!result.endpointResults) {
                    result.endpointResults = {};
                }
                // Store both value and status
                const resultText = value.trim();
                const statusText = status || (resultText === 'Error' ? 'failed' : 'success');
                result.endpointResults[endpoint] = `${resultText} (${statusText})`;
            }
        }
        
        // Extract summary information
        if (trimmedLine.includes('✅ Demo completed successfully')) {
            result.summary.status = 'success';
        }
        if (trimmedLine.includes('❌ Demo failed')) {
            result.summary.status = 'failed';
        }
    }

    // Calculate changes for any final balances that don't have explicit changes
    Object.keys(result.finalBalances).forEach(key => {
        const finalBalance = result.finalBalances[key];
        const initialBalance = result.initialBalances[key];
        
        if (finalBalance && initialBalance && (finalBalance.change === null || finalBalance.change === 0)) {
            // Calculate the change with high precision
            const change = parseFloat((finalBalance.amount - initialBalance.amount).toFixed(8));
            result.finalBalances[key].change = change;
            console.log(`🔄 Calculated change for ${key}: ${change}`);
        }
    });

    console.log('🔍 Final parsed result:');
    console.log('Initial balances count:', Object.keys(result.initialBalances).length);
    console.log('Final balances count:', Object.keys(result.finalBalances).length);
    console.log('Initial balance keys:', Object.keys(result.initialBalances));
    console.log('Final balance keys:', Object.keys(result.finalBalances));
    console.log('Legacy balances:', result.balances);
    
    return result;
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
  });
});

// Start server
const server = app.listen(PORT, () => {
    const actualPort = server.address().port;
         console.log(`🚀 FinP2P Fusion Adapter Transaction Server running on port ${actualPort}`);
    console.log(`📱 Frontend available at: http://localhost:${actualPort}`);
    console.log(`🔗 API endpoints available at: http://localhost:${actualPort}/api`);
    console.log(`📊 Health check: http://localhost:${actualPort}/api/health`);
    console.log(`📈 Status: http://localhost:${actualPort}/api/status`);
});

module.exports = { app, parseDemoOutput }; 