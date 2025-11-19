# Cipher Insights Hub - Anonymous Product Satisfaction Surveys

A fully homomorphic encryption (FHE) powered anonymous product satisfaction survey system built on Zama's fhEVM. This decentralized application enables completely private product ratings where individual ratings remain encrypted throughout the entire survey process until results are publicly revealed by the admin.

## 🎯 Features

- **Fully Anonymous Ratings**: Ratings are encrypted using FHE and remain private on-chain
- **Encrypted Aggregation**: Smart contract performs homomorphic addition on encrypted ratings
- **Admin-Only Decryption**: Only survey admins can decrypt the final rating sums
- **Tamper-Proof**: All data stored on blockchain with cryptographic guarantees
- **Modern UI**: Beautiful, responsive interface with RainbowKit wallet integration

## 🏗️ Architecture

### Smart Contract (ProductSatisfactionSurvey.sol)

The contract supports:
- Creating surveys with 2-5 products
- Submitting encrypted ratings (1-5) for each product
- On-chain homomorphic addition of encrypted ratings
- Admin finalization and decryption of results
- Prevention of double submission

### Rating Encoding

Products are rated on a scale of 1-5:
- 1 = Very Unsatisfied
- 2 = Unsatisfied
- 3 = Neutral
- 4 = Satisfied
- 5 = Very Satisfied

The smart contract sums all encrypted ratings for each product. The admin can then decrypt the sum and calculate average ratings using the total response count.

## 📋 Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Rainbow Wallet** or compatible Web3 wallet (MetaMask, etc.)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install contract dependencies
npm install

# Install UI dependencies
cd ui
npm install
cd ..
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Run Tests

```bash
# Run local tests
npm run test
```

### 4. Deploy to Local Network

**Terminal 1: Start local FHEVM node**
```bash
npx hardhat node
```

**Terminal 2: Deploy contract**
```bash
npx hardhat deploy --network localhost
```

**Copy the deployed contract address** and update it in `ui/src/config/contracts.ts`:

```typescript
export const ProductSatisfactionSurveyAddresses: Record<string, { address: `0x${string}`, chainId: number, chainName: string }> = {
  "31337": {
    "address": "0xYourDeployedContractAddress", // Update this
    "chainId": 31337,
    "chainName": "hardhat"
  },
  // ...
};
```

### 5. Configure WalletConnect Project ID

Update `ui/src/config/wagmi.ts` with your WalletConnect project ID:

```typescript
export const config = getDefaultConfig({
  appName: 'Cipher Insights Hub',
  projectId: 'YOUR_PROJECT_ID', // Get from cloud.walletconnect.com
  chains: [localhost, sepolia, mainnet, polygon],
  ssr: false,
});
```

### 6. Start Frontend

```bash
cd ui
npm run dev
```

Visit `http://localhost:5173` to use the application.

## 🧪 Testing

### Local Testing

```bash
npm run test
```

The test suite includes:
- Survey creation
- Encrypted rating submission
- Rating aggregation
- Double submission prevention
- Survey finalization
- Decryption

### Sepolia Testnet

1. **Set up environment variables:**

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
```

2. **Deploy to Sepolia:**

```bash
npx hardhat deploy --network sepolia
```

3. **Update contract address in UI config**

4. **Run Sepolia tests:**

```bash
npx hardhat test --network sepolia test/ProductSatisfactionSurveySepolia.ts
```

## 📱 Using the Application

### Creating a Survey

1. Connect your wallet using RainbowKit
2. Click "Create Survey"
3. Fill in:
   - Survey title
   - Description
   - Product names (2-5 products)
   - Duration in hours
4. Submit transaction

### Submitting Ratings

1. Browse active surveys
2. Click "Submit Ratings" on a survey
3. Rate each product (1-5) using the slider
4. Your ratings are encrypted locally before submission
5. Submit the encrypted ratings transaction

### Viewing Results (Admin Only)

1. After the survey ends, admins can click "View & Decrypt Results"
2. Click "Decrypt Product Results" for each product to reveal the encrypted sum
3. The system calculates average ratings
4. Click "Mark Survey as Fully Finalized" when all products are decrypted

## 🔐 Security Features

- **End-to-End Encryption**: Ratings are encrypted on the client before submission
- **On-Chain Privacy**: Encrypted ratings stored on blockchain without revealing content
- **Homomorphic Computation**: Rating aggregation happens on encrypted data
- **Admin-Only Decryption**: Only the survey creator can decrypt results
- **Replay Protection**: Built-in double submission prevention

## 📁 Project Structure

```
cipher-insights-hub/
├── contracts/
│   ├── ProductSatisfactionSurvey.sol  # Main survey contract
│   └── FHECounter.sol                 # Example FHE contract
├── deploy/
│   └── deploy.ts                       # Deployment script
├── test/
│   ├── ProductSatisfactionSurvey.ts   # Local tests
│   ├── ProductSatisfactionSurveySepolia.ts # Sepolia integration tests
│   └── FHECounter.ts                  # Example tests
├── ui/
│   ├── src/
│   │   ├── components/                # React components
│   │   │   ├── SurveyCard.tsx
│   │   │   ├── SubmitRatingDialog.tsx
│   │   │   ├── ViewResultsDialog.tsx
│   │   │   ├── CreateSurveyDialog.tsx
│   │   │   └── Header.tsx
│   │   ├── hooks/                       # Custom React hooks
│   │   │   ├── useSurveyContract.ts
│   │   │   └── useZamaInstance.ts
│   │   ├── config/                     # Configuration
│   │   │   ├── contracts.ts            # Contract ABI & address
│   │   │   └── wagmi.ts               # Wallet config
│   │   ├── lib/                        # Utilities
│   │   │   └── fhevm.ts               # FHE encryption utilities
│   │   └── pages/
│   │       └── Index.tsx              # Main page
│   └── public/
│       ├── favicon.svg                 # Site favicon
│       └── logo.svg                    # Logo
├── hardhat.config.ts                    # Hardhat configuration
└── package.json
```

## 🛠️ Configuration

### Wallet Configuration

Update `ui/src/config/wagmi.ts` with your WalletConnect project ID:

```typescript
export const config = getDefaultConfig({
  appName: 'Cipher Insights Hub',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from cloud.walletconnect.com
  chains: [localhost, sepolia, mainnet, polygon],
  ssr: false,
});
```

### Network Configuration

The contract is configured for localhost (31337) by default. To use Sepolia testnet, update:
- `hardhat.config.ts` for deployment networks
- `ui/src/config/wagmi.ts` for frontend networks
- `ui/src/config/contracts.ts` for contract addresses

## 📚 Technology Stack

### Smart Contracts
- **Solidity 0.8.24**
- **FHEVM by Zama** - Fully Homomorphic Encryption
- **Hardhat** - Development environment
- **Hardhat Deploy** - Deployment management

### Frontend
- **React 18**
- **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **RainbowKit** - Wallet connection
- **Wagmi** - Ethereum hooks
- **Zama Relayer SDK** - FHE encryption

## 🔍 How It Works

### Rating Encryption Flow

1. **User rates products** in the UI (1-5 scale)
2. **Local encryption**: Ratings encrypted using Zama FHE SDK
3. **Submit transaction**: Encrypted ratings + proofs sent to smart contract
4. **On-chain aggregation**: Contract performs homomorphic addition for each product
5. **Admin decryption**: After survey ends, admin decrypts the sums
6. **Result calculation**: Using sums and total responses, average ratings are calculated

### Mathematical Example

For 2 products (A and B) with 3 responses:
- User 1: A=5, B=4
- User 2: A=4, B=5
- User 3: A=3, B=3

On-chain sums: 
- Product A: Enc(5) + Enc(4) + Enc(3) = Enc(12)
- Product B: Enc(4) + Enc(5) + Enc(3) = Enc(12)

After decryption:
- Product A: Sum = 12, Total = 3, Average = 4.0
- Product B: Sum = 12, Total = 3, Average = 4.0

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/zama-ai/fhevm/issues)
- Zama Documentation: [docs.zama.ai](https://docs.zama.ai)
- Zama Discord: [discord.gg/zama](https://discord.gg/zama)

---

**Built with ❤️ using Zama's FHE technology**
