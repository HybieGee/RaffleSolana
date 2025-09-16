const { Keypair } = require('@solana/web3.js')
const fs = require('fs')

// Generate a new keypair
const keypair = Keypair.generate()

// Get the public key
const publicKey = keypair.publicKey.toBase58()

// Get the secret key as a base64 string (for environment variables)
const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64')

// Get the secret key as a JSON array (for backup)
const secretKeyArray = Array.from(keypair.secretKey)

console.log('🔑 Generated new Solana keypair for payouts:')
console.log('─'.repeat(60))
console.log(`Public Key: ${publicKey}`)
console.log(`Secret Key (Base64): ${secretKeyBase64}`)
console.log('─'.repeat(60))

// Save to files for backup
const keyData = {
  publicKey,
  secretKeyBase64,
  secretKeyArray,
  generated: new Date().toISOString()
}

fs.writeFileSync('payout-keypair.json', JSON.stringify(keyData, null, 2))

console.log('✅ Keypair saved to payout-keypair.json')
console.log('⚠️  Keep this file secure and never commit it to git!')
console.log('')
console.log('📋 Add these to your environment variables:')
console.log(`CREATOR_WALLET=${publicKey}`)
console.log(`PAYOUT_SIGNER_SECRET=${secretKeyBase64}`)