import React from 'react';
import { ArrowLeft, Shield, Lock, FileText, Database, Key } from 'lucide-react';

interface PrivacyViewProps {
  onBack: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
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
          <Shield className="w-3.5 h-3.5 text-steam-highlight" />
          <span>Privacidade Protegida</span>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="bg-[#1b2838]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Title */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>LGPD & Proteção de Dados</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase italic">
            Política de <span className="text-steam-highlight">Privacidade</span>
          </h1>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Última atualização: <span className="text-white font-bold">21 de Julho de 2026</span> • Master Achievement Hub
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            1. Introdução
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            A sua privacidade e a segurança dos seus dados pessoais são fundamentais no <strong className="text-white">Master Achievement Hub</strong>. Esta Política de Privacidade explica de forma transparente como coletamos, usamos, armazenamos, compartilhamos e protegemos os seus dados quando você utiliza nossa plataforma de caça a conquistas.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            2. Quais Dados Coletamos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-steam-highlight font-black text-xs uppercase tracking-wider">
                <Key className="w-4 h-4" />
                <span>Dados de Conta</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Nome de usuário (nickname), endereço de e-mail, senha criptografada (hash) e data/hora do aceite dos termos (<code className="text-steam-highlight">termsAcceptedAt</code>).
              </p>
            </div>

            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-steam-highlight font-black text-xs uppercase tracking-wider">
                <Database className="w-4 h-4" />
                <span>Progresso no App</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Conquistas desbloqueadas, nível de XP, saldo de moedas, comprovações enviadas, histórico de eventos e itens adquiridos na loja.
              </p>
            </div>

            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-steam-highlight font-black text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>Dados Técnicos</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Endereço IP, tipo de navegador, sistema operacional e registros de acesso para manter a segurança do sistema.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 - Table HTML */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            3. Tabela de Finalidades e Bases Legais do Tratamento
          </h2>
          <p className="text-sm text-gray-300">
            Abaixo detalhamos a finalidade de cada dado tratado e a respectiva base legal conforme a Lei Geral de Proteção de Dados (LGPD) e normativas aplicáveis:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-steam-highlight font-black uppercase tracking-wider">
                  <th className="p-4 w-1/3">Dado Trata do</th>
                  <th className="p-4 w-1/3">Finalidade do Tratamento</th>
                  <th className="p-4 w-1/3">Base Legal (LGPD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-white">Nome, E-mail e Senha Criptografada</td>
                  <td className="p-4">Criação de conta, autenticação, recuperação de acesso e envio de notificações importantes.</td>
                  <td className="p-4"><span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 font-bold rounded-lg border border-blue-500/20">Execução de Contrato</span></td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-white">Timestamp de Aceite (<code className="text-steam-highlight">termsAcceptedAt</code>)</td>
                  <td className="p-4">Registro formal para comprovação jurídica do consentimento e concordância com os regulamentos.</td>
                  <td className="p-4"><span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 font-bold rounded-lg border border-purple-500/20">Cumprimento de Obrigação Legal</span></td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-white">Histórico de Conquistas e Validações</td>
                  <td className="p-4">Cálculo de XP, posicionamento nos rankings da comunidade, concessão de insignias e histórico do jogador.</td>
                  <td className="p-4"><span className="px-2.5 py-1 bg-green-500/10 text-green-400 font-bold rounded-lg border border-green-500/20">Execução de Contrato / Legítimo Interesse</span></td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-white">IP e Logs de Conexão</td>
                  <td className="p-4">Garantia da segurança da plataforma, detecção de tentativas de invasão e prevenção de trapaças.</td>
                  <td className="p-4"><span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 font-bold rounded-lg border border-yellow-500/20">Legítimo Interesse / Obrigação Legal</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            4. Compartilhamento de Dados
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Nós <strong className="text-white">não vendemos</strong> e <strong className="text-white">não alugamos</strong> seus dados pessoais a terceiros. As únicas formas de exibição ou compartilhamento são:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-300 pl-2">
            <li><strong className="text-white">Perfil Público:</strong> Seu nickname, avatar, nível de XP, conquistas e insignias ficam visíveis no ranking e na comunidade do app.</li>
            <li><strong className="text-white">Provedores de Infraestrutura:</strong> Serviços de hospedagem em nuvem de ponta (Google Cloud / Firebase) com rigorosos padrões internacionais de segurança.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            5. Armazenamento e Segurança
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Utilizamos conexões seguras encriptadas (SSL/TLS) para todo tráfego de dados. Suas senhas são armazenadas utilizando algoritmos de hashing forte através do Firebase Authentication, impedindo o acesso direto até mesmo por administradores do sistema.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-steam-highlight rounded-full"></span>
            6. Direitos do Titular dos Dados
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Como titular dos dados, você tem o direito de solicitar a confirmação do tratamento, acesso aos seus dados, correção de dados incompletos ou a exclusão permanente de sua conta e informações a qualquer momento.
          </p>
        </section>

        {/* Contact DPO Box */}
        <div className="bg-black/40 p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Encarregado de Proteção de Dados (DPO)</h4>
            <p className="text-xs text-gray-400">Para exercer seus direitos de privacidade ou esclarecer dúvidas.</p>
          </div>
          <a
            href="mailto:privacidade@achievementhub.com"
            className="px-5 py-2.5 bg-steam-highlight text-steam-dark hover:bg-blue-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg"
          >
            privacidade@achievementhub.com
          </a>
        </div>
      </div>
    </div>
  );
};
