const URL_API = "https://script.google.com/macros/s/AKfycby4UGWj-f3Atf_30dxaFXyyeQA8bXg6s9Vp4OJcbj-4zalBR28hqnEiJGs4lYhhF3c/exec"; 
const slotsFixos = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];

// Navegação entre Cliente e Admin
function switchTab(tab) {
    document.getElementById('view-cliente').style.display = tab === 'cliente' ? 'block' : 'none';
    document.getElementById('view-admin').style.display = tab === 'admin' ? 'block' : 'none';
    document.getElementById('tab-cli').className = tab === 'cliente' ? 'active' : '';
    document.getElementById('tab-adm').className = tab === 'admin' ? 'active' : '';
}

// Máscara de Telefone
document.getElementById('cli-tel').addEventListener('input', (e) => {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
});

// Sincronia de Horários
[document.getElementById('cli-barbeiro'), document.getElementById('cli-data')].forEach(el => el.addEventListener('change', async () => {
    const b = document.getElementById('cli-barbeiro').value;
    const d = document.getElementById('cli-data').value;
    const sH = document.getElementById('cli-hora');
    if (!b || !d) return;
    sH.disabled = true; sH.innerHTML = '<option>Consultando...</option>';
    try {
        const res = await fetch(`${URL_API}?t=${Date.now()}`);
        const reg = await res.json();
        const ocupados = Array.isArray(reg) ? reg.filter(a => a.barbeiro === b && a.data === d).map(a => a.hora) : [];
        sH.disabled = false; sH.innerHTML = '<option value="" disabled selected>Horário</option>';
        slotsFixos.forEach(s => {
            const opt = document.createElement('option'); opt.value = s;
            opt.textContent = ocupados.includes(s) ? `${s} (Ocupado)` : s;
            opt.disabled = ocupados.includes(s); sH.appendChild(opt);
        });
    } catch (e) { sH.innerHTML = '<option>Erro de Sincronia</option>'; }
}));

// Agendar
document.getElementById('form-agendamento').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit'); btn.disabled = true;
    const serv = document.getElementById('cli-servico');
    const barb = document.getElementById('cli-barbeiro');
    
    const dados = {
        id: Date.now(),
        nome: document.getElementById('cli-nome').value.toUpperCase(),
        telefone: document.getElementById('cli-tel').value.replace(/\D/g, ''),
        barbeiro: barb.value,
        servico: serv.value,
        valor: serv.selectedOptions[0].dataset.price,
        data: document.getElementById('cli-data').value,
        hora: document.getElementById('cli-hora').value
    };

    try {
        await fetch(URL_API, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dados) });
        window.open(`https://wa.me/${barb.selectedOptions[0].dataset.phone}?text=Olá, agendei um ${dados.servico} para as ${dados.hora}`);
        alert("Agendamento Concluído!"); location.reload();
    } catch (e) { alert("Erro ao salvar!"); btn.disabled = false; }
});

// Admin Login com Nova Senha (admin1234)
async function entrarAdmin() {
    const senha = document.getElementById('pass-admin').value;
    const res = await fetch(`${URL_API}?acao=login&senha=${encodeURIComponent(senha)}`);
    const data = await res.json();
    if (data.auth === true) {
        document.getElementById('admin-auth').style.display = 'none';
        document.getElementById('admin-painel').style.display = 'block';
        listarAgendamentos();
    } else { alert("Senha Incorreta!"); }
}

async function listarAgendamentos() {
    const lista = document.getElementById('lista-agendamentos');
    lista.innerHTML = 'Carregando...';
    try {
        const res = await fetch(`${URL_API}?t=${Date.now()}`);
        const dados = await res.json();
        const total = dados.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

        let html = `
            <div class="card metrics-card">
                <small>VALOR EM CAIXA ESTIMADO</small>
                <h2>R$ ${total.toFixed(2)}</h2>
            </div>
        `;

        lista.innerHTML = html + dados.reverse().map(a => `
            <div class="card agenda-item">
                <div>
                    <b>${a.nome || 'Cliente'}</b><br>
                    <small style="color:var(--gold)">${a.hora} | R$ ${parseFloat(a.valor || 0).toFixed(2)}</small><br>
                    <small style="color:#888">${a.servico || 'Serviço'}</small>
                </div>
                <button onclick="concluirServico('${a.id}')" style="background:none; border:1px solid var(--gold); color:var(--gold); border-radius:50%; width:35px; height:35px; cursor:pointer">✓</button>
            </div>
        `).join('');
    } catch (e) { lista.innerHTML = 'Erro ao carregar dados.'; }
}

async function concluirServico(id) {
    if (confirm("Marcar como concluído?")) {
        await fetch(URL_API, { method: 'POST', mode: 'no-cors', body: JSON.stringify({acao: "deletar", id: id}) });
        listarAgendamentos();
    }
}