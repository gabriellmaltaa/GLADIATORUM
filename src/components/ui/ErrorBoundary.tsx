import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error Boundary de proteção contra falhas de renderização (Item 1).
 * Exibe mensagem compreensível na estética romana e permite tentar novamente
 * sem apagar nem sobrescrever o progresso salvo do jogador no localStorage.
 */
export class GameErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : 'Erro inesperado ao renderizar a interface do Ludus.';
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('[Gladiatorum ErrorBoundary]:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen w-full bg-[#17120F] text-[#EFE2C4] flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full surface-stone frame-bronze p-5 space-y-4">
            <div className="border-b border-[#947044] pb-2">
              <span className="text-xs font-roman uppercase tracking-wider text-[#D4B26A]">
                Proteção do Ludus
              </span>
              <h1 className="font-roman font-bold text-lg text-[#EFE2C4] mt-0.5">
                Interrupção Temporária na Interface
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-[#D6C29A] leading-relaxed">
              Ocorreu uma falha inesperada ao exibir esta tela. Seu progresso salvo permanece
              intacto no aparelho e nenhum item ou denário foi perdido.
            </p>

            {this.state.errorMessage && (
              <div className="p-2.5 bg-[#120D0A] border border-[#5E4527] text-xs text-[#B8A686] font-mono break-words">
                Detalhe: {this.state.errorMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleRetry}
                className="min-h-[44px] px-4 py-2 bg-gradient-to-b from-[#8E332F] to-[#611F1C] text-[#EFE2C4] border-2 border-[#B79552] font-roman font-bold text-xs sm:text-sm tracking-wider cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[44px] px-4 py-2 bg-[#2B2119] text-[#D6C29A] border-2 border-[#947044] font-roman font-bold text-xs sm:text-sm tracking-wider cursor-pointer"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
