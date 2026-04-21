/**
 * Projeto TEAeduca
 * Foco: Acessibilidade (WCAG) e Educação Especial (TEA)
 * Alunos: Desenvolvimento Web - Campo Largo do Piauí
 */
import './index.css';
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Inicialização Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const provider = new GoogleAuthProvider();

// 1. Dicionário de Pictogramas
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

// Auth e Perfil
const authLoggedOut = document.getElementById('auth-logged-out');
const authLoggedIn = document.getElementById('auth-logged-in');
const userGreeting = document.getElementById('user-greeting');
const btnLoginGoogle = document.getElementById('btn-login-google');
const btnLogout = document.getElementById('btn-logout');
const secaoCadastro = document.getElementById('secao-cadastro');
const secaoEvolucao = document.getElementById('secao-evolucao');
const formCadastro = document.getElementById('form-cadastro') as HTMLFormElement;

// Stats
const statAcertos = document.getElementById('stat-acertos');
const statTentativas = document.getElementById('stat-tentativas');
const statPrecisao = document.getElementById('stat-precisao');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

// --- Lógica de Autenticação e Perfil ---

async function atualizarStats(uid: string) {
  const evolutionRef = doc(db, 'evolution', uid);
  const evolutionSnap = await getDoc(evolutionRef);
  
  if (evolutionSnap.exists()) {
    const data = evolutionSnap.data();
    const acertos = data.acertos || 0;
    const tentativas = data.tentativas || 0;
    const precisao = tentativas > 0 ? Math.round((acertos / tentativas) * 100) : 0;

    if (statAcertos) statAcertos.innerText = acertos.toString();
    if (statTentativas) statTentativas.innerText = tentativas.toString();
    if (statPrecisao) statPrecisao.innerText = `${precisao}%`;
    secaoEvolucao?.classList.remove('hidden');
  }
}

async function handleProfile(user: User) {
  const profileRef = doc(db, 'profiles', user.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    const data = profileSnap.data();
    if (userGreeting) userGreeting.innerText = `Olá, ${data.nome}!`;
    secaoCadastro?.classList.add('hidden');
    atualizarStats(user.uid);
  } else {
    if (userGreeting) userGreeting.innerText = `Olá!`;
    secaoCadastro?.classList.remove('hidden');
    secaoEvolucao?.classList.add('hidden');
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    authLoggedOut?.classList.add('hidden');
    authLoggedIn?.classList.remove('hidden');
    handleProfile(user);
  } else {
    authLoggedOut?.classList.remove('hidden');
    authLoggedIn?.classList.add('hidden');
    secaoCadastro?.classList.add('hidden');
    secaoEvolucao?.classList.add('hidden');
  }
});

btnLoginGoogle?.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user') {
      console.log("Login cancelado pelo usuário.");
    } else {
      console.error("Erro ao fazer login:", err);
      alert("Houve um problema ao entrar com o Google. Tente novamente.");
    }
  }
});
btnLogout?.addEventListener('click', () => signOut(auth));

formCadastro?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const nome = (document.getElementById('reg-nome') as HTMLInputElement).value;
  const idade = parseInt((document.getElementById('reg-idade') as HTMLInputElement).value);
  const serie = (document.getElementById('reg-serie') as HTMLInputElement).value;
  const emailResponsavel = (document.getElementById('reg-email-resp') as HTMLInputElement).value;
  const pin = (document.getElementById('reg-pin') as HTMLInputElement).value;

  try {
    await setDoc(doc(db, 'profiles', user.uid), {
      uid: user.uid,
      nome,
      idade,
      serie,
      emailResponsavel,
      pin,
      createdAt: new Date().toISOString()
    });
    
    await setDoc(doc(db, 'evolution', user.uid), {
      uid: user.uid,
      acertos: 0,
      tentativas: 0,
      ultimaAtividade: serverTimestamp()
    });

    handleProfile(user);
  } catch (err) {
    console.error("Erro ao salvar perfil:", err);
    alert("Erro ao salvar perfil. Tente novamente.");
  }
});

/**
 * Interface com a Gemini API
 */
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
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Adapte o seguinte conteúdo escolar para um aluno com autismo:
      PERFIL DO ALUNO: ${perfil}
      CONTEÚDO ORIGINAL: ${conteudo}
      DIRETRIZES: Use linguagem simples, listas, foque nos interesses e inclua 3 questões.`,
    });

    const textoFormatado = response.text?.replace(/\n/g, '<br>');
    outputAdaptado.innerHTML = `<div class="p-2">${textoFormatado}</div>`;
  } catch (error) {
    console.error("Erro na IA:", error);
    outputAdaptado.innerHTML = "Erro ao conectar com a IA.";
  } finally {
    btnAdaptar.innerHTML = '<span>✨</span> Adaptar Conteúdo com IA';
    btnAdaptar.style.opacity = '1';
    btnAdaptar.style.pointerEvents = 'auto';
  }
}

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

function falarTexto(texto: string) {
  window.speechSynthesis.cancel();
  const mensagem = new SpeechSynthesisUtterance(texto);
  mensagem.lang = 'pt-BR';
  window.speechSynthesis.speak(mensagem);
}

function trocarTema(tema: 'calmo' | 'contraste') {
  if (tema === 'contraste') {
    document.body.classList.add('theme-alto-contraste');
    document.body.classList.remove('theme-calmo');
  } else {
    document.body.classList.add('theme-calmo');
    document.body.classList.remove('theme-alto-contraste');
  }
}

function processarTextoParaPictogramas() {
  if (!containerResultado || !inputFrase) return;
  const texto = inputFrase.value.toLowerCase();
  const palavras = texto.split(/\s+/).filter(p => p.length > 0);
  containerResultado.innerHTML = '';
  if (palavras.length === 0) {
    containerResultado.innerHTML = '<p class="text-muted italic self-center">Os símbolos aparecerão aqui...</p>';
    return;
  }
  palavras.forEach(palavra => {
    const palavraNormalizada = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const simbolo = dicionarioPictogramas[palavraNormalizada] || "❓";
    const card = document.createElement('div');
    card.className = 'pictogram-card';
    card.innerHTML = `<div class="pictogram-img">${simbolo}</div><div class="font-bold uppercase">${palavra}</div>`;
    card.addEventListener('click', () => falarTexto(palavra));
    containerResultado.appendChild(card);
  });
}

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
tabCrianca?.addEventListener('click', () => alternarAba('crianca'));
tabEducador?.addEventListener('click', () => alternarAba('educador'));
btnAdaptar?.addEventListener('click', adaptarConteudoComIA);
btnCopiar?.addEventListener('click', () => {
  if (outputAdaptado) {
    navigator.clipboard.writeText(outputAdaptado.innerText).then(() => alert("Copiado!"));
  }
});
inputFrase?.addEventListener('input', processarTextoParaPictogramas);

// --- Jogo e Evolução ---

async function registrarAtividade(uid: string, acerto: boolean) {
  const evolutionRef = doc(db, 'evolution', uid);
  try {
    await updateDoc(evolutionRef, {
      acertos: acerto ? increment(1) : increment(0),
      tentativas: increment(1),
      ultimaAtividade: serverTimestamp()
    });
    atualizarStats(uid);
  } catch (err) {
    console.error("Erro ao registrar atividade:", err);
  }
}

const draggables = document.querySelectorAll('.draggable-item');
const dropTargets = document.querySelectorAll('.drop-target');

function initGame() {
  draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', () => draggable.classList.add('dragging'));
    draggable.addEventListener('dragend', () => draggable.classList.remove('dragging'));
  });

  dropTargets.forEach(target => {
    target.addEventListener('dragover', (e) => { e.preventDefault(); target.classList.add('over'); });
    target.addEventListener('dragleave', () => target.classList.remove('over'));
    target.addEventListener('drop', async (e) => {
      e.preventDefault();
      target.classList.remove('over');
      const draggingItem = document.querySelector('.dragging') as HTMLElement;
      if (!draggingItem) return;
      const user = auth.currentUser;
      const targetId = target.getAttribute('data-id');
      const itemTarget = draggingItem.getAttribute('data-target');

      if (targetId === itemTarget) {
        target.querySelector('.target-slot')?.appendChild(draggingItem);
        falarTexto("Muito bem!");
        if (user) await registrarAtividade(user.uid, true);
        if (document.getElementById('game-items')?.children.length === 0) falarTexto("Parabéns!");
      } else {
        falarTexto("Tente de novo.");
        if (user) await registrarAtividade(user.uid, false);
      }
    });
  });
}

document.getElementById('btn-reset-jogo')?.addEventListener('click', () => location.reload());
initGame();
console.log("TEAeduca iniciado com sucesso.");
