import React from 'react';
import { ArrowLeft, FileText, ShieldCheck, CheckCircle, HelpCircle } from 'lucide-react';

interface TermsViewProps {
  onBack: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onBack }) => {
  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto text-gray-300 animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/10 active:scale-95 group"
        >
          <ArrowLeft className="w-4 h-4 text-steam-highlight group-hover:-translate-x-1 transition-transform" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-steam-highlight" />
          <span>Documento Oficial</span>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="bg-[#1b2838]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Title */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-steam-highlight/10 text-steam-highlight rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
            <FileText className="w-3.5 h-3.5" />
            <span>Regulamento Geral</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase italic">
            Termos de <span className="text-steam-highlight">Uso</span>
          </h1>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Última atualização: <span className="text-white font-bold">21 de Julho de 2026</span> • Master Achievement Hub
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            1. Aceitação dos Termos
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Ao criar uma conta, acessar ou utilizar a plataforma <strong className="text-white">Master Achievement Hub</strong> (Central de Caçadores), você declara que leu, compreendeu e concorda expressamente em cumprir estes <strong className="text-white">Termos de Uso</strong> e a nossa <strong className="text-white">Política de Privacidade</strong>. Se você não concordar com qualquer disposição aqui contida, você não deve acessar nem utilizar nossos serviços.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            2. Elegibilidade e Cadastro de Conta
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Para acessar determinados recursos da plataforma (como desbloqueio de conquistas, participação no ranking global, envio de comprovações e loja de itens), você deve registrar uma conta fornecendo dados verdadeiros e atualizados.
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-300 pl-2">
            <li>É necessário fornecer um <strong className="text-white">nickname</strong> válido, <strong className="text-white">endereço de e-mail</strong> e <strong className="text-white">senha segura</strong>.</li>
            <li>Você é o único responsável por manter a confidencialidade das suas credenciais de acesso.</li>
            <li>É estritamente proibida a criação de múltiplas contas por uma mesma pessoa para manipular rankings, acumular XP ou burlar punições anteriores.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            3. Conduta do Usuário e Fair Play
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            O Master Achievement Hub promove um ambiente saudável, honesto e competitivo para caçadores de conquistas. São condutas estritamente vedadas:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-xs font-black text-red-400 uppercase tracking-wider block">🚫 Cheats e Modificações</span>
              <p className="text-xs text-gray-400">Uso de softwares de automação, leitores de memória, cheats ou envio de prints falsificados para obter conquistas.</p>
            </div>
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-1">
              <span className="text-xs font-black text-red-400 uppercase tracking-wider block">🚫 Assédio e Discurso de Ódio</span>
              <p className="text-xs text-gray-400">Ofensas, discriminação, spam ou comportamento tóxico nos chats, fóruns e comentários de conquistas.</p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            4. Conquistas, Validações e Pontuação (XP)
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            A submissão de provas para validação de conquistas está sujeita à verificação da equipe de moderação ou por integração de APIs parceiras. A administração reserva-se o direito de anular conquistas e deduzir XP de contas suspeitas de irregularidades sem aviso prévio.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            5. Propriedade Intelectual
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Todas as marcas registradas, títulos de jogos, artes e logos exibidos na plataforma pertencem aos seus respectivos desenvolvedores e publicadoras. O Master Achievement Hub é um serviço independente criado por e para fãs da comunidade de jogos eletrônicos.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            6. Modificações e Suspensão de Serviços
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Podemos atualizar estes Termos de Uso periodicamente. A continuidade do uso da plataforma após alterações significa a aceitação das novas condições. Reservamo-nos o direito de suspender ou encerrar contas que violarem este regulamento.
          </p>
        </section>

        {/* Section 7 - Contact */}
        <div className="bg-black/40 p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-steam-highlight/10 flex items-center justify-center text-steam-highlight">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Dúvidas sobre os Termos?</h4>
              <p className="text-xs text-gray-400">Entre em contato com o nosso time de suporte.</p>
            </div>
          </div>
          <a
            href="mailto:suporte@achievementhub.com"
            className="px-5 py-2.5 bg-steam-highlight text-steam-dark hover:bg-blue-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg"
          >
            suporte@achievementhub.com
          </a>
        </div>
      </div>
    </div>
  );
};
