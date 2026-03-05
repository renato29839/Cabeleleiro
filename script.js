import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDfZAT75UoirdIay1NrH0T1Rd40eCTJ3Vo",
    authDomain: "teste-cb833.firebaseapp.com",
    projectId: "teste-cb833",
    databaseURL: "https://teste-cb833-default-rtdb.firebaseio.com", 
    storageBucket: "teste-cb833.firebasestorage.app",
    messagingSenderId: "792167309631",
    appId: "1:792167309631:web:cface929c635babbb2338a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const horariosPadrao = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"];
let bancoDadosFirebase = {};
let agendamento = {};
let seqAdmin = 0;

const inputData = document.getElementById('data-agendamento');
const dataHoje = new Date().toISOString().split('T')[0];
inputData.value = dataHoje;
inputData.min = dataHoje;

// Monitoramento do banco em tempo real
onValue(ref(db, 'agendamentos'), (snapshot) => {
    bancoDadosFirebase = snapshot.val() || {};
    if (document.getElementById('step-admin').classList.contains('active')) abrirPainelAdmin();
});

function mudarTela(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
}

// Lógica de bloqueio automático de horários
window.gerarGradeHorarios = function() {
    const grid = document.getElementById('grid-horarios');
    grid.innerHTML = '';
    const agora = new Date();
    const horaAgora = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');

    horariosPadrao.forEach(h => {
        const btn = document.createElement('button');
        btn.innerText = h;
        btn.className = 'time-btn';

        // Verifica se o barbeiro escolhido já tem agendamento nesta data e hora
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
                prepararFinalizacao();
            };
        }
        grid.appendChild(btn);
    });
}

function prepararFinalizacao() {
    const dBr = agendamento.data.split('-').reverse().join('/');
    document.getElementById('resumo-final').innerHTML = `
        <p>🧔 <strong>Barbeiro:</strong> ${agendamento.barbeiro}</p>
        <p>✂️ <strong>Serviço:</strong> ${agendamento.servico}</p>
        <p>📅 <strong>Data:</strong> ${dBr}</p>
        <p>⏰ <strong>Horário:</strong> ${agendamento.horario}</p>
        <p>💰 <strong>Valor:</strong> R$ ${agendamento.valor},00</p>
    `;
    mudarTela('step4');
}

async function finalizar() {
    const nome = document.getElementById('nome-cliente').value;
    const tel = document.getElementById('tel-cliente').value.replace(/\D/g, '');

    if (!nome) return alert("Por favor, informe seu nome.");
    if (tel.length < 10) return alert("Informe um WhatsApp válido.");

    agendamento.cliente = nome;
    agendamento.telefone = tel;

    try {
        await push(ref(db, 'agendamentos'), agendamento);
        alert("Agendamento confirmado!");
        
        // Mensagem automática para o WhatsApp da barbearia
        const msg = `Olá, agendei o horário ${agendamento.horario} no dia ${agendamento.data.split('-').reverse().join('/')}. Serviço: ${agendamento.servico}. Nome: ${nome}`;
        window.open(`https://api.whatsapp.com/send?phone=5599999999999&text=${encodeURIComponent(msg)}`, '_blank');
        
        location.reload();
    } catch (error) {
        alert("Erro ao salvar agendamento: " + error.message);
    }
}

// Painel do Barbeiro
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
        if(r.data === dataHoje) hojeTotal += parseFloat(r.valor);
        const dR = new Date(r.data);
        if(dR.getMonth() === mesAtual) mesTotal += parseFloat(r.valor);

        // API para o barbeiro confirmar com o cliente
        const msgConfirm = `Olá ${r.cliente}, confirmamos seu horário na BarberShop dia ${r.data.split('-').reverse().join('/')} às ${r.horario} para o serviço ${r.servico}. Até lá!`;
        const linkWpp = `https://api.whatsapp.com/send?phone=55${r.telefone}&text=${encodeURIComponent(msgConfirm)}`;

        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <div style="flex:1">
                <strong>${r.horario} - ${r.cliente}</strong><br>
                <small>${r.data} | ${r.barbeiro} | ${r.servico}</small>
            </div>
            <div style="display:flex; gap:5px;">
                <a href="${linkWpp}" target="_blank" class="btn-api-wpp">Confirmar</a>
                <button class="btn-del" data-id="${id}">X</button>
            </div>
        `;
        container.appendChild(item);
    });

    container.querySelectorAll('.btn-del').forEach(btn => {
        btn.onclick = () => { if(confirm("Excluir reserva?")) remove(ref(db, `agendamentos/${btn.dataset.id}`)); };
    });

    document.getElementById('fat-hoje').innerText = `R$ ${hojeTotal}`;
    document.getElementById('fat-mes').innerText = `R$ ${mesTotal}`;
}

// Listeners de navegação
document.getElementById('btn-iniciar').onclick = () => mudarTela('step1');
document.getElementById('btn-voltar-home').onclick = () => mudarTela('step-home');
document.getElementById('btn-ir-servicos').onclick = () => {
    agendamento.barbeiro = document.getElementById('barbeiro').value;
    agendamento.data = inputData.value;
    mudarTela('step2');
};
document.getElementById('btn-ir-horarios').onclick = () => {
    const servico = document.querySelector('input[name="corte"]:checked');
    agendamento.servico = servico.value;
    agendamento.valor = servico.dataset.valor;
    gerarGradeHorarios();
    mudarTela('step3');
};
document.getElementById('btn-finalizar').onclick = finalizar;
document.querySelectorAll('[id^="btn-voltar-etapa"]').forEach(btn => {
    btn.onclick = () => mudarTela('step' + (parseInt(btn.id.slice(-1)) - 1));
});
document.getElementById('btn-sair-admin').onclick = () => mudarTela('step-home');

// Gatilho Admin (5 cliques no logo)
document.getElementById('logo-admin').onclick = () => {
    seqAdmin++;
    if (seqAdmin === 5) {
        seqAdmin = 0;
        if (prompt("Senha de acesso:") === "1234") { mudarTela('step-admin'); abrirPainelAdmin(); }
    }
};
