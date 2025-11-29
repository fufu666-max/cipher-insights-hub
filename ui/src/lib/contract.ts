import { ethers } from 'ethers';
import deploymentData from '../../../deployments/sepolia/ProductSatisfactionSurvey.json';

const CONTRACT_ADDRESSES: Record<number, string> = {
  31337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  11155111: '0xAf2b3F90961B065CD0Ca1752e6A99204Dc489020', // Updated Sepolia address
};

export const CONTRACT_ABI = deploymentData.abi as any[];

// Enhanced address resolution with fallback
export function getContractAddress(chainId?: number): string {
  if (chainId && CONTRACT_ADDRESSES[chainId]) {
    return CONTRACT_ADDRESSES[chainId];
  }
  // Fallback to localhost if chainId not found
  return CONTRACT_ADDRESSES[31337];
}

export async function getContract(signerOrProvider: any, chainId?: number) {
  try {
    const address = getContractAddress(chainId);
    if (!address) throw new Error('Contract address not set');
    return new ethers.Contract(address, CONTRACT_ABI, signerOrProvider);
  } catch (error: any) {
    throw new Error(`Contract interaction failed: ${error.message}`);
  }
}

function validateContractAddress(address: string): boolean {
  return address && address.length === 42 && address.startsWith('0x');
}

function getContractWithValidation(signerOrProvider: any, chainId?: number) {
  const address = getContractAddress(chainId);
  if (!validateContractAddress(address)) {
    throw new Error(`Invalid contract address: ${address}`);
  }
  return getContract(signerOrProvider, chainId);
}

