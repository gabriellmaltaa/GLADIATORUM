import React from 'react';
import type { GameState } from '../../game/rules';
import { GameButton, RomanPanel } from '../ui/RomanComponents';

export const MailboxScreen: React.FC<{
  state: GameState;
  onClaim: (messageId: string) => void;
}> = ({ state, onClaim }) => {
  const messages = [...(state.mailbox ?? [])].sort((a, b) => b.createdAtMs - a.createdAtMs);
  const unclaimed = messages.filter((message) => message.claimedAtMs === null).length;
  return (
    <RomanPanel
      title="Correio Imperial"
      subtitle={`${unclaimed} anexo${unclaimed === 1 ? '' : 's'} aguardando resgate`}
      variant="parchment"
    >
      <p className="mb-4 text-sm text-[#5C4935]">
        Ouro de batalhas e contratos chega aqui. Resgate os anexos para adicionar os denários à sua bolsa.
      </p>
      {messages.length === 0 ? (
        <div className="border border-[#947044]/60 bg-[#E8D7B5] p-5 text-center text-sm text-[#5C4935]">
          O correio está vazio. Suas próximas recompensas em ouro serão entregues aqui.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="flex flex-wrap items-center justify-between gap-3 border border-[#947044]/60 bg-[#E8D7B5] p-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-roman font-bold text-[#30251A]">{message.title}</h3>
                <p className="mt-1 text-xs text-[#5C4935]">{message.body}</p>
                <strong className="mt-2 block text-sm text-[#76511F]">{message.goldAmount.toLocaleString('pt-BR')} denários</strong>
              </div>
              {message.claimedAtMs === null ? (
                <GameButton onClick={() => onClaim(message.id)}>Resgatar ouro</GameButton>
              ) : (
                <span className="rounded border border-[#61734C] bg-[#D5E0C2] px-3 py-2 text-xs font-bold text-[#3F5A32]">Resgatado</span>
              )}
            </article>
          ))}
        </div>
      )}
    </RomanPanel>
  );
};

