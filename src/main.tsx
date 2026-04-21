/**
 * Projeto TEAlento
 * Foco: Acessibilidade (WCAG) e Educação Especial (TEA)
 * Alunos: Desenvolvimento Web - Campo Largo do Piauí
 */
import './index.css';
import { GoogleGenAI } from "@google/genai";

// 1. Dicionário de Pictogramas
// Mapeia palavras-chave para símbolos visuais.
const dicionarioPictogramas: Record<string, string> = {
  "eu": "🙋‍♂️",
  "quero": "👉",
  "comer": "🥪",
  "beber": "🥤",
  "agua": "💧",
  "escola": "🏫",
  "banheiro": "🚽",
  "ajuda": "🆘",
  "feliz": "😊",
  "triste": "😢",
  "obrigado": "🙏",
  "casa": "🏠",
  "sono": "😴",
  "brincar": "🧩",
  "maca": "🍎",
  "caju": "🍎",
  "peixe": "🐟",
  "galo": "🐓"
};

// 2. Seletores de Elementos (DOM)
const btnCalmo = document.getElementById('btn-tema-calmo');
const btnContraste = document.getElementById('btn-tema-alto-contraste');
const inputFrase = document.getElementById('input-frase') as HTMLInputElement;
const containerResultado = document.getElementById('resultado-pictogramas');

// Tabs e Views
const tabCrianca = document.getElementById('tab-crianca');
const tabEducador = document.getElementById('tab-educador');
const viewCrianca = document.getElementById('view-crianca');
const viewEducador = document.getElementById('view-educador');

// IA Adaptador
const inputPerfil = document.getElementById('input-perfil-aluno') as HTMLTextAreaElement;
const inputConteudo = document.getElementById('input-conteudo-original') as HTMLTextAreaElement;
const btnAdaptar = document.getElementById('btn-adaptar');
const outputAdaptado = document.getElementById('output-adaptado');
const btnCopiar = document.getElementById('btn-copiar-adaptado');

/**
 * Interface com a Gemini API
 */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

async function adaptarConteudoComIA() {
  if (!btnAdaptar || !outputAdaptado) return;

  const perfil = inputPerfil.value.trim();
  const conteudo = inputConteudo.value.trim();

  if (!perfil || !conteudo) {
    alert("Por favor, preencha o perfil do aluno e o conteúdo original.");
    return;
  }

  btnAdaptar.innerHTML = '<span>⏳</span> Adaptando...';
  btnAdaptar.style.opacity = '0.5';
  btnAdaptar.style.pointerEvents = 'none';
  outputAdaptado.innerHTML = 'Pensando... 🧠';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Adapte o seguinte conteúdo escolar para um aluno com autismo:
      
      PERFIL DO ALUNO: ${perfil}
      CONTEÚDO ORIGINAL: ${conteudo}
      
      DIRETRIZES DE ADAPTAÇÃO:
      - Use linguagem simples e direta.
      - Transforme parágrafos longos em listas ou frases curtas.
      - Foque nos interesses do aluno citados no perfil.
      - Use reforço visual descrito em texto (ex: [ÍCONE DE LIVRO]).
      - Crie 3 perguntas simples de múltipla escolha ao final para verificar a compreensão.
      - Mantenha o tom encorajador.`,
    });

    // Substitui quebras de linha por <br> e formata melhor
    const textoFormatado = response.text?.replace(/\n/g, '<br>');
    outputAdaptado.innerHTML = `<div class="p-2">${textoFormatado}</div>` || "Não foi possível gerar a resposta.";
  } catch (error) {
    console.error("Erro na IA:", error);
    outputAdaptado.innerHTML = "Erro ao conectar com a IA. Verifique sua conexão e tente novamente.";
  } finally {
    btnAdaptar.innerHTML = '<span>✨</span> Adaptar Conteúdo com IA';
    btnAdaptar.style.opacity = '1';
    btnAdaptar.style.pointerEvents = 'auto';
  }
}

/**
 * Alterna entre abas
 */
function alternarAba(aba: 'crianca' | 'educador') {
  if (!tabCrianca || !tabEducador || !viewCrianca || !viewEducador) return;

  if (aba === 'crianca') {
    viewCrianca.classList.remove('hidden');
    viewEducador.classList.add('hidden');
    tabCrianca.classList.add('bg-accent', 'text-[#1E3A28]', 'border-accent');
    tabEducador.classList.remove('bg-accent', 'text-[#1E3A28]', 'border-accent');
  } else {
    viewCrianca.classList.add('hidden');
    viewEducador.classList.remove('hidden');
    tabEducador.classList.add('bg-accent', 'text-[#1E3A28]', 'border-accent');
    tabCrianca.classList.remove('bg-accent', 'text-[#1E3A28]', 'border-accent');
  }
}

/**
 * Função didática: Converte texto em voz (TTS).
 * @param {string} texto - O texto que deve ser falado.
 */
function falarTexto(texto: string) {
  window.speechSynthesis.cancel();
  const mensagem = new SpeechSynthesisUtterance(texto);
  mensagem.lang = 'pt-BR';
  mensagem.rate = 1.0;
  mensagem.pitch = 1.2;
  window.speechSynthesis.speak(mensagem);
}

/**
 * Função didática: Alterna o tema visual do aplicativo.
 * @param {string} tema - Nome da classe do tema.
 */
function trocarTema(tema: 'calmo' | 'contraste') {
  if (tema === 'contraste') {
    document.body.classList.add('theme-alto-contraste');
    document.body.classList.remove('theme-calmo');
  } else {
    document.body.classList.add('theme-calmo');
    document.body.classList.remove('theme-alto-contraste');
  }
}

/**
 * Função principal: Converte o texto digitado em pictogramas visuais.
 */
function processarTextoParaPictogramas() {
  if (!containerResultado || !inputFrase) return;

  const texto = inputFrase.value.toLowerCase();
  // Divide a frase em palavras, ignorando espaços extras
  const palavras = texto.split(/\s+/).filter(p => p.length > 0);

  // Limpa o container antes de adicionar novos
  containerResultado.innerHTML = '';

  if (palavras.length === 0) {
    containerResultado.innerHTML = '<p class="text-muted italic self-center">Os símbolos aparecerão aqui...</p>';
    return;
  }

  palavras.forEach(palavra => {
    // Busca a palavra no dicionário (removendo acentos básicos para facilitar a busca)
    const palavraNormalizada = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const simbolo = dicionarioPictogramas[palavraNormalizada] || "❓";

    // Cria o card do pictograma
    const card = document.createElement('div');
    card.className = 'pictogram-card';
    card.setAttribute('role', 'img'); 
    card.setAttribute('aria-label', `${palavra}: ${simbolo}`);
    
    card.innerHTML = `
      <div class="pictogram-img" aria-hidden="true">${simbolo}</div>
      <div class="font-bold uppercase tracking-wider">${palavra}</div>
    `;

    // Adiciona evento de clique para falar a palavra
    card.addEventListener('click', () => {
      falarTexto(palavra);
    });
    
    // Melhora a acessibilidade: permite clicar com Enter/Espaço
    card.tabIndex = 0;
    card.style.cursor = 'pointer';

    containerResultado.appendChild(card);
  });
}

// 3. Event Listeners (Ouvintes de Eventos)
// Delegação para botões grandes futuros (adicionados no HTML)
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const botaoGrande = target.closest('.botao-grande');
  if (botaoGrande) {
    const texto = botaoGrande.getAttribute('data-fala');
    if (texto) falarTexto(texto);
  }
});
btnCalmo?.addEventListener('click', () => trocarTema('calmo'));
btnContraste?.addEventListener('click', () => trocarTema('contraste'));

// Listeners para Tabs
tabCrianca?.addEventListener('click', () => alternarAba('crianca'));
tabEducador?.addEventListener('click', () => alternarAba('educador'));

// Listener para IA
btnAdaptar?.addEventListener('click', adaptarConteudoComIA);

// Listener para Copiar
btnCopiar?.addEventListener('click', () => {
  if (outputAdaptado) {
    const texto = outputAdaptado.innerText;
    navigator.clipboard.writeText(texto).then(() => {
      alert("Conteúdo copiado com sucesso!");
    });
  }
});

// Escuta a digitação no input
inputFrase?.addEventListener('input', () => {
  // Chamamos a função de processamento
  processarTextoParaPictogramas();
});

// Inicialização (pode carregar preferências do usuário aqui no futuro)
console.log("TEAlento iniciado com sucesso! Foco em acessibilidade.");

// 4. Lógica do Jogo de Pareamento (Gamificação)
const draggables = document.querySelectorAll('.draggable-item');
const dropTargets = document.querySelectorAll('.drop-target');
const btnReset = document.getElementById('btn-reset-jogo');

function initGame() {
  draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', () => {
      draggable.classList.add('dragging');
      // Feedback tátil/sonoro pode ser adicionado aqui
    });

    draggable.addEventListener('dragend', () => {
      draggable.classList.remove('dragging');
    });
  });

  dropTargets.forEach(target => {
    target.addEventListener('dragover', (e) => {
      e.preventDefault(); // Necessário para permitir o drop
      target.classList.add('over');
    });

    target.addEventListener('dragleave', () => {
      target.classList.remove('over');
    });

    target.addEventListener('drop', (e) => {
      e.preventDefault();
      target.classList.remove('over');
      
      const draggingItem = document.querySelector('.dragging');
      if (!draggingItem) return;

      const targetId = target.getAttribute('data-id');
      const itemTarget = draggingItem.getAttribute('data-target');

      if (targetId === itemTarget) {
        // Acerto!
        const slot = target.querySelector('.target-slot');
        if (slot) {
          slot.appendChild(draggingItem);
          falarTexto("Muito bem! Você acertou!");
          verificarVitoria();
        }
      } else {
        // Erro
        falarTexto("Quase lá! Tente de novo.");
      }
    });
  });
}

function verificarVitoria() {
  const gameItemsContainer = document.getElementById('game-items');
  if (gameItemsContainer && gameItemsContainer.children.length === 0) {
    setTimeout(() => {
      falarTexto("Parabéns! Você completou todos os tesouros do Piauí!");
    }, 1000);
  }
}

btnReset?.addEventListener('click', () => {
  location.reload(); // Forma mais simples de resetar o estado
});

// Inicializa o jogo
initGame();
