import { supabase } from '../supabase.js';

export function Planes(container) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; position: relative;">

      <div style="max-width: 1000px; margin: 0 auto; padding: 60px 0; text-align: center; animation: fadeIn 0.8s ease-out;">
        <h1 style="font-size: 3.5rem; letter-spacing: -2px; margin-bottom: 16px;">Elige tu <span class="text-gradient">Camino</span></h1>
        <p style="color: var(--text-secondary); font-size: 1.2rem; max-width: 680px; margin: 0 auto 24px;">Tu cuenta free te deja entrar al contenido gratuito. Activa una membresia para desbloquear todo el contenido premium y la experiencia completa del Campus.</p>
        <div id="checkout-status" style="display:none; margin: 0 auto 26px; max-width: 520px; font-size: 0.95rem;"></div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px;">
          <div class="glass-panel" style="padding: 40px; border-radius: 20px; display: flex; flex-direction: column; transition: transform 0.3s, border-color 0.3s;" onmouseover="this.style.transform='translateY(-10px)'; this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--panel-border)'">
            <h3 style="font-size: 1.1rem; margin-bottom: 12px; color: var(--text-secondary);">Mensual</h3>
            <div style="font-size: 2.5rem; font-weight: 800; margin-bottom: 8px;">$57<span style="font-size: 1rem; font-weight: 500; color: var(--text-secondary);">/mes</span></div>
            <p style="margin: 0 0 20px 0; color: var(--text-muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 1px;">Renovacion automatica mensual</p>
            <ul style="text-align: left; list-style: none; padding: 0; margin: 0 0 40px 0; display: flex; flex-direction: column; gap: 12px; color: var(--text-secondary); font-size: 0.9rem;">
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Acceso a todas las lecciones</li>
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Comunidad en tiempo real</li>
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Ranking de avance</li>
            </ul>
            <button onclick="window.buyPlan(event, 'price_monthly', 'basic', 'Suscripcion Basic Mensual')" class="btn-primary" style="margin-top: auto; padding: 14px; justify-content: center; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);">Suscribirme</button>
          </div>

          <div class="glass-panel" style="padding: 40px; border-radius: 20px; display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%); border: 2px solid var(--accent-color); position: relative; transform: scale(1.05); box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
            <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: var(--accent-color); color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 1px;">MAS POPULAR</div>
            <h3 style="font-size: 1.1rem; margin-bottom: 12px; color: var(--text-primary);">Trimestral</h3>
            <div style="font-size: 2.5rem; font-weight: 800; margin-bottom: 8px;">$147<span style="font-size: 1rem; font-weight: 500; color: var(--text-secondary);">/3 meses</span></div>
            <p style="margin: 0 0 20px 0; color: rgba(255,255,255,0.72); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 1px;">Renovacion automatica trimestral</p>
            <ul style="text-align: left; list-style: none; padding: 0; margin: 0 0 40px 0; display: flex; flex-direction: column; gap: 12px; color: var(--text-primary); font-size: 0.95rem;">
              <li><i data-lucide="zap" style="width: 16px; color: #fbbf24; margin-right: 8px;"></i> <b>Mentorias VIP semanales</b></li>
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Todo el contenido premium</li>
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Certificado de alumno</li>
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Red de alianzas</li>
            </ul>
            <button onclick="window.buyPlan(event, 'price_quarterly', 'premium', 'Suscripcion Premium Trimestral')" class="btn-primary" style="margin-top: auto; padding: 14px; justify-content: center; box-shadow: 0 10px 20px var(--accent-glow);">Suscribirme</button>
          </div>

          <div class="glass-panel" style="padding: 40px; border-radius: 20px; display: flex; flex-direction: column; transition: transform 0.3s, border-color 0.3s;" onmouseover="this.style.transform='translateY(-10px)'; this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--panel-border)'">
            <h3 style="font-size: 1.1rem; margin-bottom: 12px; color: var(--text-secondary);">Anual</h3>
            <div style="font-size: 2.5rem; font-weight: 800; margin-bottom: 8px;">$497<span style="font-size: 1rem; font-weight: 500; color: var(--text-secondary);">/ano</span></div>
            <p style="margin: 0 0 20px 0; color: var(--text-muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 1px;">Renovacion automatica anual</p>
            <ul style="text-align: left; list-style: none; padding: 0; margin: 0 0 40px 0; display: flex; flex-direction: column; gap: 12px; color: var(--text-secondary); font-size: 0.9rem;">
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> <b>Ahorra un 30%</b></li>
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Soporte tecnico prioritario</li>
              <li><i data-lucide="check" style="width: 16px; color: var(--accent-color); margin-right: 8px;"></i> Consultoria one-to-one</li>
            </ul>
            <button onclick="window.buyPlan(event, 'price_yearly', 'enterprise', 'Suscripcion Enterprise Anual')" class="btn-primary" style="margin-top: auto; padding: 14px; justify-content: center; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);">Suscribirme</button>
          </div>
        </div>

        <p style="margin-top: 50px; color: var(--text-secondary); font-size: 0.85rem;">Pagos seguros procesados por Stripe. Puedes cancelar la renovacion desde tu gestion de suscripcion.</p>
      </div>

    </div>
  `;
}

function setCheckoutStatus(message, tone = 'neutral') {
  const status = document.getElementById('checkout-status');
  if (!status) return;

  if (!message) {
    status.style.display = 'none';
    status.textContent = '';
    return;
  }

  const color = tone === 'error' ? '#ef4444' : '#22c55e';
  const background = tone === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)';
  status.style.display = 'block';
  status.style.color = color;
  status.style.background = background;
  status.style.padding = '14px 18px';
  status.style.borderRadius = '12px';
  status.textContent = message;
}

window.buyPlan = async (event, priceId, planCode, planLabel) => {
  const btn = event?.currentTarget;
  const originalText = btn?.innerHTML;
  setCheckoutStatus('', 'neutral');

  if (btn) {
    btn.innerHTML = `<div class="spinner" style="width:16px; height:16px; border-width:2px; margin:0;"></div>`;
    btn.disabled = true;
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        price_id: priceId,
        plan_code: planCode,
        plan_label: planLabel
      }
    });

    if (error) throw error;
    if (!data?.url) throw new Error('Stripe no devolvio una URL de checkout');

    setCheckoutStatus(`Redirigiendo al checkout seguro para ${planLabel}...`, 'success');
    window.location.href = data.url;
  } catch (error) {
    setCheckoutStatus(`Error al iniciar el pago: ${error.message}`, 'error');
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
};
