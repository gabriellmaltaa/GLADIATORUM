import type { GameState } from './rules';
export interface Contract { id: string; title: string; description: string; kind: 'wins' | 'loot' | 'training'; target: number; gold: number; }
export const CONTRACTS: Contract[] = [
  { id: 'first_blood', title: 'O primeiro estandarte', description: 'Conquiste uma vitória em combate.', kind: 'wins', target: 1, gold: 40 },
  { id: 'five_victories', title: 'Disciplina do Ludus', description: 'Conquiste cinco vitórias.', kind: 'wins', target: 5, gold: 100 },
  { id: 'veteran', title: 'Nome na areia', description: 'Conquiste vinte vitórias.', kind: 'wins', target: 20, gold: 220 },
  { id: 'champion', title: 'A província se curva', description: 'Conquiste cinquenta vitórias.', kind: 'wins', target: 50, gold: 450 },
  { id: 'tribute', title: 'Tributo de Cápua', description: 'Recolha 200 denários de combate.', kind: 'loot', target: 200, gold: 80 },
  { id: 'treasury', title: 'Tesouro da legião', description: 'Recolha 1.000 denários de combate.', kind: 'loot', target: 1000, gold: 250 },
  { id: 'doctore', title: 'Sob o olhar do Doctore', description: 'Compre cinco pontos de atributos em treinamento.', kind: 'training', target: 5, gold: 100 },
  { id: 'discipline', title: 'Corpo de aço', description: 'Compre quinze pontos de atributos em treinamento.', kind: 'training', target: 15, gold: 280 },
];
export function contractProgress(state: GameState, contract: Contract): number {
  const progress = contract.kind === 'wins' ? state.wins : contract.kind === 'loot' ? state.goldLooted
    : Object.values(state.baseStats).reduce((sum, n) => sum + n, 0) - 43;
  return Math.min(contract.target, Math.max(0, progress));
}
export function claimContract(state: GameState, id: string): { state: GameState; error?: string } {
  const contract = CONTRACTS.find(c => c.id === id);
  if (!contract || state.claimedContracts?.includes(id)) return { state, error: 'Contrato inexistente ou já recolhido.' };
  if (contractProgress(state, contract) < contract.target) return { state, error: 'Conclua o objetivo antes de recolher.' };
  return { state: { ...state, gold: state.gold + contract.gold, claimedContracts: [...(state.claimedContracts ?? []), id] } };
}
