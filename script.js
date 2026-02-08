import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// CONFIGURAÇÃO ATUALIZADA DO SEU NOVO PROJETO
const firebaseConfig = {
    apiKey: "AIzaSyDfZAT75UoirdIay1NrH0T1Rd40eCTJ3Vo",
    authDomain: "teste-cb833.firebaseapp.com",
    projectId: "teste-cb833",
    // Note que adicionei a URL do Database que é essencial para o Realtime Database funcionar
    databaseURL: "https://teste-cb833-default-rtdb.firebaseio.com", 
    storageBucket: "teste-cb833.firebasestorage.app",
    messagingSenderId: "792167309631",
    appId: "1:792167309631:web:cface929c635babbb2338a"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Lógica do App (Mantida e Otimizada) ---
const horariosPadrao = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"];
let bancoDadosFirebase = {};
let agendamento = {};
let seqAdmin = 0;

const inputData = document.getElementById('data-agendamento');
const dataHoje = new Date().toISOString().split('T')[0];
inputData.value = dataHoje;
inputData.min = dataHoje;

// Escuta mudanças no banco em tempo real
onValue(ref(db, 'agendamentos'), (snapshot) => {
    bancoDadosFirebase = snapshot.val() || {};
    if (document.getElementById('step-admin').classList.contains('active')) {
        abrirPainelAdmin();
    }
});

function mudarTela(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

window.gerarGradeHorarios = function() {
    const grid = document.getElementById('grid-horarios');
    grid.innerHTML = '';
    const agora = new Date();
    const horaAgora = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');

    horariosPadrao.forEach(h => {
        const btn = document.createElement('button');
        btn.innerText = h;
        btn.className = 'time-btn';

        const ocupado = Object.values(bancoDadosFirebase).find(r => 
            r.data === agendamento.data && r.horario === h && r.barbeiro === agendamento.barbeiro
        );
        const passado = (agendamento.data === dataHoje && h < horaAgora);

        if (ocupado) {
            btn.classList.add('reservado');
            btn.innerText = "Ocupado";
        } else if (passado) {
            btn.classList.add('encerrado');
            btn.innerText = "Fechado";
        } else {
            btn.classList.add('disponivel');
            btn.onclick = () => {
                agendamento.horario = h;
                prepararConfirmacao();
            };
        }
        grid.appendChild(btn);
    });
}

function prepararConfirmacao() {
    const dBr = agendamento.data.split('-').reverse().join('/');
    document.getElementById('resumo-final').innerHTML = `
        <p>🧔 <strong>Barbeiro:</strong> ${agendamento.barbeiro}</p>
        <p>✂️ <strong>Serviço:</strong> ${agendamento.servico}</p>
        <p>📅 <strong>Data:</strong> ${dBr}</p>
        <p>⏰ <strong>Horário:</strong> ${agendamento.horario}</p>
        <p>💰 <strong>Valor:</strong> R$ ${agendamento.valor},00</p>
    `;
    mudarTela('step3');
}

async function finalizar() {
    const nome = document.getElementById('nome-cliente').value;
    if (!nome) return alert("Por favor, informe seu nome.");

    agendamento.cliente = nome;

    try {
        await push(ref(db, 'agendamentos'), agendamento);
        const msg = `Olá, agendei o horário ${agendamento.horario} no dia ${agendamento.data.split('-').reverse().join('/')}. Serviço: ${agendamento.servico}. Nome: ${nome}`;
        const link = `https://api.whatsapp.com/send?phone=5599999999999&text=${encodeURIComponent(msg)}`;
        window.open(link, '_blank');
        location.reload();
    } catch (error) {
        alert("Erro ao salvar agendamento: " + error.message);
    }
}

// --- Painel Admin ---
function abrirPainelAdmin() {
    const container = document.getElementById('admin-lista-reservas');
    container.innerHTML = '';
    let hojeTotal = 0;
    let mesTotal = 0;
    const mesAtual = new Date().getMonth();

    const listaOrdenada = Object.entries(bancoDadosFirebase).sort((a, b) => 
        (a[1].data + a[1].horario).localeCompare(b[1].data + b[1].horario)
    );

    listaOrdenada.forEach(([id, r]) => {
        const dR = new Date(r.data);
        if(r.data === dataHoje) hojeTotal += parseFloat(r.valor);
        if(dR.getMonth() === mesAtual) mesTotal += parseFloat(r.valor);

        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <span><strong>${r.horario}</strong> - ${r.cliente}<br><small>${r.data} | ${r.barbeiro}</small></span>
            <button class="btn-del" data-id="${id}">Excluir</button>
        `;
        container.appendChild(item);
    });

    // Event delegation para os botões de excluir
    container.querySelectorAll('.btn-del').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            if(confirm("Excluir reserva?")) remove(ref(db, `agendamentos/${id}`));
        };
    });

    document.getElementById('fat-hoje').innerText = `R$ ${hojeTotal}`;
    document.getElementById('fat-mes').innerText = `R$ ${mesTotal}`;
}

// --- Event Listeners ---
document.getElementById('btn-ir-etapa2').onclick = () => {
    const servicoAtivo = document.querySelector('input[name="corte"]:checked');
    if (!servicoAtivo) return alert("Selecione um serviço.");

    agendamento = {
        barbeiro: document.getElementById('barbeiro').value,
        data: inputData.value,
        servico: servicoAtivo.value,
        valor: servicoAtivo.dataset.valor
    };
    document.getElementById('titulo-horario').innerText = `Horários para ${agendamento.data.split('-').reverse().join('/')}`;
    gerarGradeHorarios();
    mudarTela('step2');
};

document.getElementById('btn-voltar-etapa1').onclick = () => mudarTela('step1');
document.getElementById('btn-voltar-etapa2').onclick = () => mudarTela('step2');
document.getElementById('btn-sair-admin').onclick = () => mudarTela('step1');
document.getElementById('btn-finalizar').onclick = finalizar;

document.getElementById('logo-admin').onclick = () => {
    seqAdmin++;
    if (seqAdmin === 5) {
        seqAdmin = 0;
        const p = prompt("Senha de acesso:");
        if (p === "1234") {
            mudarTela('step-admin');
            abrirPainelAdmin();
        }
    }
};
