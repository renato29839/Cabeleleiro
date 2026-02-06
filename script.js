// Configurações de Horários
const horariosPadrao = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"];
let bancoDados = JSON.parse(localStorage.getItem('barber_data')) || [];
let agendamento = {};
let seqAdmin = 0;

// Configurar Data Inicial
const inputData = document.getElementById('data-agendamento');
const dataHoje = new Date().toISOString().split('T')[0];
inputData.value = dataHoje;
inputData.min = dataHoje;

// Fluxo de Navegação
function mudarTela(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function irParaEtapa1() { mudarTela('step1'); }

function irParaEtapa2() {
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
}

// Lógica de Disponibilidade
function gerarGradeHorarios() {
    const grid = document.getElementById('grid-horarios');
    grid.innerHTML = '';
    
    const agora = new Date();
    const horaAgora = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');

    horariosPadrao.forEach(h => {
        const btn = document.createElement('button');
        btn.innerText = h;
        btn.className = 'time-btn';

        const ocupado = bancoDados.find(r => r.data === agendamento.data && r.horario === h && r.barbeiro === agendamento.barbeiro);
        const passado = (agendamento.data === dataHoje && h < horaAgora);

        if (ocupado) {
            btn.classList.add('reservado');
            btn.innerText = "Reservado";
        } else if (passado) {
            btn.classList.add('encerrado');
            btn.innerText = "Encerrado";
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

// WhatsApp e Persistência
function finalizar() {
    const nome = document.getElementById('nome-cliente').value;
    if (!nome) return alert("Por favor, informe seu nome.");

    agendamento.cliente = nome;
    bancoDados.push({...agendamento});
    localStorage.setItem('barber_data', JSON.stringify(bancoDados));

    const msg = `Olá, agendei o horário ${agendamento.horario} no dia ${agendamento.data.split('-').reverse().join('/')}. Corte: ${agendamento.servico} com ${agendamento.barbeiro}. Nome: ${nome}`;
    const link = `https://api.whatsapp.com/send?phone=5599999999999&text=${encodeURIComponent(msg)}`;
    
    window.open(link, '_blank');
    location.reload(); 
}

// Área do Barbeiro (Admin)
function handleAdminClick() {
    seqAdmin++;
    if (seqAdmin === 5) {
        seqAdmin = 0;
        const p = prompt("Senha de acesso:");
        if (p === "1234") abrirPainelAdmin();
    }
}

function abrirPainelAdmin() {
    mudarTela('step-admin');
    const container = document.getElementById('admin-lista-reservas');
    container.innerHTML = '';
    
    let hojeTotal = 0;
    let mesTotal = 0;
    const mesAtual = new Date().getMonth();

    bancoDados.sort((a,b) => (a.data + a.horario).localeCompare(b.data + b.horario)).forEach((r, idx) => {
        const dR = new Date(r.data);
        if(r.data === dataHoje) hojeTotal += parseFloat(r.valor);
        if(dR.getMonth() === mesAtual) mesTotal += parseFloat(r.valor);

        container.innerHTML += `
            <div class="admin-item">
                <span><strong>${r.horario}</strong> - ${r.cliente}<br><small>${r.data} | ${r.barbeiro}</small></span>
                <button class="btn-del" onclick="remover(${idx})">Excluir</button>
            </div>
        `;
    });

    document.getElementById('fat-hoje').innerText = `R$ ${hojeTotal}`;
    document.getElementById('fat-mes').innerText = `R$ ${mesTotal}`;
}

function remover(idx) {
    if(confirm("Deseja cancelar esta reserva?")) {
        bancoDados.splice(idx, 1);
        localStorage.setItem('barber_data', JSON.stringify(bancoDados));
        abrirPainelAdmin();
    }
}
