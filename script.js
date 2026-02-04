/**
 * SISTEMA DE AGENDAMENTO - BARBEARIA D'MARCY
 * Versão Final: Correção de Exclusão e Sincronização Real-Time
 */

// 1. CONFIGURAÇÕES GERAIS
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzfcC8rOGoZ89vDzyHHNiVKLkDU1O4TgQYBzIcElpF39nw5qZWpedkpU1u0PjXmbK7g/exec"; // Certifique-se de usar a URL da 'Nova Versão'
const SENHA_MESTRA = "2024";

let isAdmin = false;
let clickCount = 0;
let clickTimer;
let agendamentosDB = [];
let agendamentoPendente = {};

// 2. CONTROLE DE ACESSO ADMIN (5 Cliques na Logo)
document.getElementById('btn-admin').addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 1000);

    if (clickCount === 5) {
        clickCount = 0;
        if (isAdmin) {
            isAdmin = false;
            document.body.classList.remove('admin-active');
            alert("Modo Admin Desativado.");
            renderizarHorarios();
        } else {
            document.getElementById('modal-admin').style.display = 'flex';
        }
    }
});

function verificarSenha() {
    const input = document.getElementById('senha-admin');
    if (input.value === SENHA_MESTRA) {
        isAdmin = true;
        document.body.classList.add('admin-active');
        document.getElementById('modal-admin').style.display = 'none';
        input.value = '';
        alert("Acesso Admin Liberado!");
        renderizarHorarios();
    } else {
        alert("Senha Incorreta!");
        input.value = '';
    }
}

function fecharModalAdmin() {
    document.getElementById('modal-admin').style.display = 'none';
    document.getElementById('senha-admin').value = '';
}

// 3. COMUNICAÇÃO COM A PLANILHA (GET)
async function carregarDados() {
    const statusBox = document.getElementById('info-status');
    statusBox.innerText = "Sincronizando agenda...";

    try {
        const response = await fetch(WEB_APP_URL);
        const dadosRaw = await response.json();
        
        // Normaliza as datas para o formato AAAA-MM-DD para evitar erros de match
        agendamentosDB = dadosRaw.map(item => ({
            ...item,
            data: item.data.includes('T') ? item.data.split('T')[0] : item.data
        }));
        
        renderizarHorarios();
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        statusBox.innerText = "Erro ao carregar dados.";
    }
}

// 4. RENDERIZAÇÃO DA INTERFACE
function renderizarHorarios() {
    const grade = document.getElementById('grade-horarios');
    const dataSelecionada = document.getElementById('data-seletor').value;
    const profSelecionado = document.getElementById('profissional-seletor').value;
    
    const horariosPadrao = ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "16:00", "17:00", "18:00", "19:00"];

    grade.innerHTML = '';

    horariosPadrao.forEach(hora => {
        const agendamento = agendamentosDB.find(a => 
            String(a.data).trim() === String(dataSelecionada).trim() && 
            String(a.hora).trim() === String(hora).trim() && 
            String(a.prof).trim() === String(profSelecionado).trim()
        );

        const card = document.createElement('div');
        card.className = `card ${agendamento ? 'ocupado' : ''}`;
        
        let botaoHTML = "";
        if (agendamento) {
            botaoHTML = isAdmin 
                ? `<button class="btn-acao btn-excluir" onclick="excluirHorario('${hora}')">EXCLUIR</button>`
                : `<button class="btn-acao" style="background:#ccc; color:#666" disabled>OCUPADO</button>`;
        } else {
            botaoHTML = `<button class="btn-acao" onclick="abrirModal('${hora}')">AGENDAR</button>`;
        }

        card.innerHTML = `
            <div>
                <span class="hora">${hora}</span>
                <span class="status-text">${agendamento ? 'Reserva: ' + agendamento.nome : 'DISPONÍVEL'}</span>
            </div>
            ${botaoHTML}
        `;
        grade.appendChild(card);
    });

    document.getElementById('info-status').innerText = `Agenda: ${profSelecionado} | ${dataSelecionada}`;
}

// 5. FUNÇÕES DE AGENDAMENTO (POST)
function abrirModal(hora) {
    const seletorServ = document.getElementById('servico-seletor');
    agendamentoPendente = {
        hora: hora,
        prof: document.getElementById('profissional-seletor').value,
        data: document.getElementById('data-seletor').value,
        servico: seletorServ.value,
        preco: seletorServ.options[seletorServ.selectedIndex].getAttribute('data-preco')
    };

    document.getElementById('resumo-agendamento').innerHTML = `
        <strong>Profissional:</strong> ${agendamentoPendente.prof}<br>
        <strong>Serviço:</strong> ${agendamentoPendente.servico}<br>
        <strong>Horário:</strong> ${agendamentoPendente.hora}
    `;
    document.getElementById('modal-reserva').style.display = 'flex';
}

async function processarAcao() {
    const nomeCliente = document.getElementById('nome-cliente').value.trim();
    if (!nomeCliente) return alert("Por favor, digite seu nome.");

    const btn = document.getElementById('btn-confirmar-modal');
    btn.innerText = "SALVANDO...";
    btn.disabled = true;

    // Monta a URL com parâmetros (Método mais seguro para o Google Scripts)
    const queryString = new URLSearchParams({
        data: agendamentoPendente.data,
        hora: agendamentoPendente.hora,
        prof: agendamentoPendente.prof,
        servico: agendamentoPendente.servico,
        nome: nomeCliente,
        valor: agendamentoPendente.preco
    }).toString();

    // Atualização Otimista (mostra na tela antes de confirmar no banco)
    agendamentosDB.push({ ...agendamentoPendente, nome: nomeCliente });
    renderizarHorarios();

    try {
        await fetch(`${WEB_APP_URL}?${queryString}`, { method: 'POST' });
        
        // Envio para WhatsApp
        const msgWhatsapp = `Agendamento Barbearia D'marcy:%0A*Cliente:* ${nomeCliente}%0A*Serviço:* ${agendamentoPendente.servico}%0A*Hora:* ${agendamentoPendente.hora}`;
        window.open(`https://wa.me/5585986950225?text=${msgWhatsapp}`, '_blank');

        fecharModal();
    } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        alert("Erro ao salvar na planilha, mas o aviso foi enviado.");
        fecharModal();
    }
}

// 6. FUNÇÃO DE EXCLUSÃO (CORRIGIDA)
async function excluirHorario(hora) {
    if (!confirm("Confirmar exclusão definitiva na planilha?")) return;

    const dataSel = document.getElementById('data-seletor').value;
    const profSel = document.getElementById('profissional-seletor').value;

    // Remove do visual imediatamente
    agendamentosDB = agendamentosDB.filter(a => !(
        String(a.data).trim() === String(dataSel).trim() && 
        String(a.hora).trim() === String(hora).trim() && 
        String(a.prof).trim() === String(profSel).trim()
    ));
    renderizarHorarios();

    // Envia comando DELETE via URL
    const queryDelete = new URLSearchParams({
        action: "DELETE",
        data: dataSel,
        hora: hora,
        prof: profSel
    }).toString();

    try {
        await fetch(`${WEB_APP_URL}?${queryDelete}`, { method: 'POST' });
        console.log("Exclusão processada na planilha.");
    } catch (error) {
        console.error("Erro na exclusão:", error);
        alert("Erro de conexão. Recarregue a página.");
        carregarDados();
    }
}

// 7. UTILITÁRIOS E INICIALIZAÇÃO
function fecharModal() {
    document.getElementById('modal-reserva').style.display = 'none';
    document.getElementById('nome-cliente').value = '';
    const btn = document.getElementById('btn-confirmar-modal');
    btn.innerText = "CONFIRMAR";
    btn.disabled = false;
}

// Define data de hoje no seletor e carrega dados
document.getElementById('data-seletor').valueAsDate = new Date();
carregarDados();
