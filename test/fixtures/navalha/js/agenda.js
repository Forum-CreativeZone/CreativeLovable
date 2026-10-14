// Agendamento: valida perto do campo e confirma sem perder o que foi digitado.
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('formAgenda');
  var dia = document.getElementById('dia');
  var hoje = new Date();
  dia.min = hoje.toISOString().slice(0, 10);
  dia.value = dia.min;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = document.getElementById('nome');
    var erro = document.getElementById('nome-erro');
    var vazio = !nome.value.trim();
    erro.hidden = !vazio;
    nome.setAttribute('aria-invalid', vazio ? 'true' : 'false');
    if (vazio) { nome.focus(); return; }
    var ok = document.getElementById('agendaOk');
    ok.hidden = false;
    ok.textContent = 'Pronto, ' + nome.value.trim().split(' ')[0] + '! Seu horário foi reservado. A confirmação chega no WhatsApp.';
  });
});
