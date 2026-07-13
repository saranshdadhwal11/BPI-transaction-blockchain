const fs = require('fs');
const path = require('path');
const solc = require('solc');

// --- Helper function to find imports ---
// This function tells the compiler how to find any imported file.
function findImports(dependencyPath) {
    try {
        // First, try to find the file in node_modules
        const fullPath = require.resolve(dependencyPath, { paths: [path.resolve(__dirname, '..', 'node_modules')] });
        const source = fs.readFileSync(fullPath, 'utf8');
        return { contents: source };
    } catch (error) {
        try {
            // If not in node_modules, try to find it relative to the contracts directory
            const fullPath = path.resolve(__dirname, '..', 'src', 'contracts', dependencyPath);
            const source = fs.readFileSync(fullPath, 'utf8');
            return { contents: source };
        } catch (innerError) {
            return { error: `File not found: ${dependencyPath}` };
        }
    }
}

async function compileContracts() {
    console.log('🔧 Compiling BPI Smart Contracts...');

    // We only need to read our top-level contracts now.
    // The import callback will handle reading all the dependencies from node_modules.
    const BPI_TOKEN_SOURCE = fs.readFileSync(path.resolve(__dirname, '../src/contracts/BPIToken.sol'), 'utf8');
    const BPI_REGISTRY_SOURCE = fs.readFileSync(path.resolve(__dirname, '../src/contracts/BPIRegistry.sol'), 'utf8');
    const BPI_PAYMENTS_SOURCE = fs.readFileSync(path.resolve(__dirname, '../src/contracts/BPIPayments.sol'), 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'BPIToken.sol': { content: BPI_TOKEN_SOURCE },
            'BPIRegistry.sol': { content: BPI_REGISTRY_SOURCE },
            'BPIPayments.sol': { content: BPI_PAYMENTS_SOURCE },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };

    try {
        // Pass the import callback to the compiler
        const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

        // Check for compilation errors
        let hasErrors = false;
        if (output.errors) {
            output.errors.forEach(error => {
                if (error.severity === 'error') {
                    console.error('❌ Compilation Error:', error.formattedMessage);
                    hasErrors = true;
                } else {
                    console.warn('⚠️  Compilation Warning:', error.formattedMessage);
                }
            });

            if (hasErrors) {
                console.error('\nCompilation failed due to errors.');
                process.exit(1);
            }
        }
        
        const artifactsDir = path.resolve(__dirname, '../artifacts');
        if (!fs.existsSync(artifactsDir)) {
            fs.mkdirSync(artifactsDir, { recursive: true });
        }
        
        console.log('\n✅ Compilation successful. Saving artifacts...');

        for (const contractFile in output.contracts) {
            for (const contractName in output.contracts[contractFile]) {
                const artifact = {
                    contractName,
                    abi: output.contracts[contractFile][contractName].abi,
                    bytecode: output.contracts[contractFile][contractName].evm.bytecode.object,
                };

                fs.writeFileSync(
                    path.join(artifactsDir, `${contractName}.json`),
                    JSON.stringify(artifact, null, 2)
                );
                console.log(`   - Saved artifact for ${contractName}`);
            }
        }

        console.log(`\n🎉 All contracts compiled successfully!`);
        console.log(`📁 Artifacts saved to: ${artifactsDir}`);

    } catch (error) {
        console.error('❌ An unexpected error occurred:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    compileContracts();
}

module.exports = { compileContracts };