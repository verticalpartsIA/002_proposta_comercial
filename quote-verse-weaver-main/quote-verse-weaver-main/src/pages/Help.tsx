import { FileText, Users, BarChart3, Mail, ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como criar uma nova RFQ?",
    answer:
      "Clique em 'Nova RFQ' no menu lateral. Preencha as informações do produto (título, descrição, material, dimensões, quantidade, prazo e moeda). Em seguida, selecione os fornecedores que deseja consultar e envie a solicitação.",
  },
  {
    question: "Como cadastrar um fornecedor?",
    answer:
      "Acesse a página 'Fornecedores' e clique em 'Novo Fornecedor'. Informe o nome, país, e-mail e idioma de contato. O sistema preencherá automaticamente a bandeira e o idioma sugerido com base no país selecionado.",
  },
  {
    question: "Como o fornecedor envia a cotação?",
    answer:
      "Ao enviar uma RFQ, cada fornecedor recebe um e-mail com um link exclusivo e seguro. Através desse link, o fornecedor preenche os dados da cotação (preço, prazo, incoterm etc.) sem precisar criar uma conta no sistema.",
  },
  {
    question: "O que é o score da cotação?",
    answer:
      "O score é uma pontuação calculada pela análise de IA que considera preço, prazo de produção, prazo de entrega, incoterm e validade. Quanto maior o score, mais competitiva é a cotação em relação às demais recebidas para a mesma RFQ.",
  },
  {
    question: "Qual a diferença entre RFQ e cotação?",
    answer:
      "RFQ (Request for Quotation) é a sua solicitação enviada aos fornecedores — contém as especificações do produto que você precisa cotar. A cotação é a resposta do fornecedor, com preço e condições comerciais.",
  },
  {
    question: "Posso enviar uma RFQ para vários fornecedores ao mesmo tempo?",
    answer:
      "Sim. Na criação da RFQ você seleciona múltiplos fornecedores. Cada um recebe um link individual e as respostas ficam centralizadas em 'Minhas Cotações' para comparação.",
  },
  {
    question: "Como alterar minha senha?",
    answer:
      "Acesse 'Configurações' no menu lateral e utilize a seção 'Alterar Senha'. Informe a nova senha (mínimo 6 caracteres), confirme e salve.",
  },
];

const sections = [
  {
    icon: FileText,
    title: "Nova RFQ",
    description: "Crie solicitações de cotação com especificações técnicas detalhadas e envie para múltiplos fornecedores simultaneamente.",
  },
  {
    icon: Users,
    title: "Fornecedores",
    description: "Gerencie sua base de fornecedores internacionais. Cada fornecedor recebe um link seguro único para responder às RFQs.",
  },
  {
    icon: BarChart3,
    title: "Análise IA",
    description: "A inteligência artificial analisa e pontua automaticamente cada cotação recebida, facilitando a tomada de decisão.",
  },
  {
    icon: Mail,
    title: "Cotações",
    description: "Visualize e compare todas as cotações recebidas em um só lugar, ordenadas por score e condições comerciais.",
  },
];

export default function Help() {
  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajuda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saiba como usar o VP Quotation para gerenciar suas cotações com fornecedores internacionais
        </p>
      </div>

      {/* Visão geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.title} className="glass-card rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{s.title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Perguntas Frequentes</h2>
        <Accordion type="single" collapsible className="space-y-1">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
              <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-3">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Contato */}
      <div className="glass-card rounded-xl p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Precisa de suporte?</p>
          <p className="text-xs text-muted-foreground">
            Entre em contato com a equipe VerticalParts pelo e-mail{" "}
            <a href="mailto:suporte@verticalparts.com.br" className="text-primary hover:underline">
              suporte@verticalparts.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
