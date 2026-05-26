function oklchToRgb(L, C, H) {
  const h = (H % 360) * Math.PI / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774*a + 0.2158037573*b;
  const m_ = L - 0.1055613458*a - 0.0638541728*b;
  const s_ = L - 0.0894841775*a - 1.2914855480*b;

  const l = l_*l_*l_, m = m_*m_*m_, s = s_*s_*s_;

  const rl =  4.0767416621*l - 3.3077115913*m + 0.2309699292*s;
  const gl = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s;
  const bl = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s;

  function gam(x) {
    x = Math.max(0, Math.min(1, x));
    return x <= 0.0031308 ? 12.92*x : 1.055*Math.pow(x,1/2.4)-0.055;
  }
  return [gam(rl), gam(gl), gam(bl)];
}

function toHex(L, C, H) {
  const [r,g,b] = oklchToRgb(L, C, H);
  const h = v => Math.round(v*255).toString(16).padStart(2,'0');
  return '#'+h(r)+h(g)+h(b);
}

function luminance(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const lin = v => v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
}

function fg(hex) { return luminance(hex) > 0.3 ? '#1a1a18' : '#f5f4f0'; }

let H=165, C=0.17, Lv=0.58, nt=0, si=0, pv='light', dev='desktop', appDark=false;
let hexAnchorL = null;

const SL = [0.995,0.94,0.88,0.80,0.70,0.58,0.46];
const LB = ['50','100','200','300','400','500','600','700','800','900'];

const SEC = [
  {label:'Harmonious',  offset:30,  desc:'+30° adjacent'},
  {label:'Complementary',offset:180,desc:'+180° opposite'},
  {label:'Triadic',     offset:120, desc:'+120° triadic'},
];

function adjH(base, minD) {
  const d = Math.abs(((base-H+540)%360)-180);
  return d < minD ? (base+40)%360 : base;
}

function taperedC(l, c) {
  if (l >= 0.85) {
    const t = (l - 0.85) / (0.995 - 0.85);
    return c * (1 - t * 0.96);
  }
  if (l <= 0.25) {
    const t = (0.25 - l) / (0.25 - 0.10);
    return c * (1 - t * 0.4);
  }
  return c;
}

function strip(id, h, c, ls, labels) {
  document.getElementById(id).innerHTML = ls.map((l,i)=>{
    const tc  = taperedC(l, c);
    const hex = toHex(l, tc, h);
    const f   = fg(hex);
    const lbl = labels ? labels[i] : '';
    return `<div class="chip"
      style="background:${hex};flex:1;"
      data-hex="${hex}"
      data-l="${l.toFixed(3)}"
      data-c="${tc.toFixed(3)}"
      data-h="${Math.round(h)}"
      data-step="${lbl}"
      onmouseenter="showTip(event,this)"
      onmousemove="moveTip(event)"
      onmouseleave="hideTip()"
      onclick="chipClick(this.dataset.hex)">
      <span style="color:${f}">${lbl}</span>
    </div>`;
  }).join('');
}

function renderNeutral(dynL) {
  const nc = [0, 0.012, 0.028][nt];
  const nh = nt>0 ? H : 0;
  const ls = dynL || dynamicStops(Lv);
  document.getElementById('stripNeutral').innerHTML = ls.map((l,i)=>{
    const tc  = taperedC(l, nc);
    const hex = toHex(l, tc, nh);
    const f   = fg(hex);
    const lbl = LB[i];
    return `<div class="chip"
      style="background:${hex};flex:1;"
      data-hex="${hex}"
      data-l="${l.toFixed(3)}"
      data-c="${tc.toFixed(3)}"
      data-h="${Math.round(nh)}"
      data-step="${lbl}"
      onmouseenter="showTip(event,this)"
      onmousemove="moveTip(event)"
      onmouseleave="hideTip()"
      onclick="chipClick(this.dataset.hex)">
      <span style="color:${f}">${lbl}</span>
    </div>`;
  }).join('');
}

function renderSemantic() {
  const S = [
    {name:'Danger',  h:adjH(22,28),  c:0.22},
    {name:'Warning', h:adjH(78,28),  c:0.19},
    {name:'Success', h:adjH(145,28), c:0.20},
    {name:'Info',    h:adjH(248,28), c:0.18},
  ];
  document.getElementById('semGrid').innerHTML = S.map(s=>{
    const chips = SL.map((l,i)=>{
      const hex = toHex(l,s.c,s.h);
      return `<div class="sem-chip"
        style="background:${hex};height:26px;"
        data-hex="${hex}"
        data-l="${l.toFixed(3)}"
        data-c="${s.c.toFixed(3)}"
        data-h="${Math.round(s.h)}"
        data-step="${LB[i]}"
        onmouseenter="showTip(event,this)"
        onmousemove="moveTip(event)"
        onmouseleave="hideTip()"
        onclick="chipClick(this.dataset.hex)">
      </div>`;
    }).join('');
    return `<div>
      <div class="sec-head" style="margin-bottom:5px">${s.name.toLowerCase()}</div>
      <div class="sem-strip">${chips}</div>
    </div>`;
  }).join('');
}

function renderSecOpts() {
  document.getElementById('secOpts').innerHTML = SEC.map((o,i)=>{
    const sh = (H+o.offset)%360;
    const col = toHex(0.55, C*0.88, sh);
    return `<div class="sec-opt${i===si?' on':''}" onclick="pickSec(${i})">
      <div class="sec-dot" style="background:${col}"></div>
      <div class="sec-info">
        <div class="sec-name">${o.label}</div>
        <div class="sec-desc">${o.desc}</div>
      </div>
      <div class="sec-radio"></div>
    </div>`;
  }).join('');
}

function buildSemanticTokens() {
  const dynL = dynamicStops(Lv);
  const nc = [0, 0.012, 0.028][nt];
  const nh = nt > 0 ? H : 0;
  const n = dynL.map(l => toHex(l, taperedC(l, nc), nh));
  const p = dynL.map(l => toHex(l, taperedC(l, C), H));
  const dH=adjH(22,28), wH=adjH(78,28), sH=adjH(145,28), iH=adjH(248,28);

  // surface sits halfway between step 50 and step 100 for a subtler elevation
  const neu = l => toHex(l, taperedC(l, nc), nh);
  const surfLightL = (dynL[0] + dynL[1]) / 2;

  const light = {
    background:      n[0],              // neutral-50
    surface:         neu(surfLightL),   // midpoint 50→100
    border:          n[1],              // neutral-100 (was 200)
    text:            n[9],  // neutral-900
    textSecondary:   n[6],  // neutral-600
    textMuted:       n[4],  // neutral-400
    brand:           p[5],  // primary-500
    brandFg:         fg(p[5]),
    brandSubtle:     p[1],  // primary-100
    brandSubtleText: p[7],  // primary-700
    brandHover:      p[6],  // primary-600
    dangerBg:    toHex(0.95, 0.09, dH),  dangerText:  toHex(0.38, 0.22, dH),
    warningBg:   toHex(0.95, 0.08, wH),  warningText: toHex(0.40, 0.18, wH),
    successBg:   toHex(0.95, 0.08, sH),  successText: toHex(0.36, 0.20, sH),
    infoBg:      toHex(0.95, 0.07, iH),  infoText:    toHex(0.36, 0.18, iH),
  };

  const dark = {
    background:      n[9],  // neutral-900
    surface:         n[8],  // neutral-800
    border:          n[7],  // neutral-700
    text:            n[0],  // neutral-50
    textSecondary:   n[3],  // neutral-300
    textMuted:       n[5],  // neutral-500
    brand:           p[5],  // primary-500 (same)
    brandFg:         fg(p[5]),
    brandSubtle:     p[8],  // primary-800
    brandSubtleText: p[2],  // primary-200
    brandHover:      p[4],  // primary-400
    dangerBg:    toHex(0.18, 0.12, dH),  dangerText:  toHex(0.78, 0.22, dH),
    warningBg:   toHex(0.18, 0.10, wH),  warningText: toHex(0.76, 0.18, wH),
    successBg:   toHex(0.18, 0.10, sH),  successText: toHex(0.80, 0.20, sH),
    infoBg:      toHex(0.18, 0.09, iH),  infoText:    toHex(0.78, 0.18, iH),
  };

  return { light, dark };
}

function renderPreview() {
  const dark = pv==='dark', mob = dev==='mobile';
  const sem = buildSemanticTokens();
  const tok = dark ? sem.dark : sem.light;
  const dynL = dynamicStops(Lv);
  const pr = i => toHex(dynL[i], taperedC(dynL[i], C), H);

  const dangerFg  = tok.dangerText;
  const dangerBg  = tok.dangerBg;
  const successFg = tok.successText;
  const successBg = tok.successBg;
  const warnFg    = tok.warningText;
  const warnBg    = tok.warningBg;

  const bg    = tok.background;
  const surf  = tok.surface;
  const brd   = tok.border;
  const txt   = tok.text;
  const txt2  = tok.textSecondary;
  const txt3  = tok.textMuted;
  const prim  = tok.brand;
  const primXL = dark ? toHex(dynL[8], taperedC(dynL[8], C * 0.4), H) : pr(0);
  const primL  = dark ? toHex(dynL[7], taperedC(dynL[7], C * 0.35), H) : pr(1);
  const primFg = tok.brandFg;
  const p300   = pr(3);

  document.getElementById('uiFrame').className = mob?'mob':'';
  document.getElementById('pvLabel').textContent =
    `${dark?'Dark':'Light'} · ${mob?'Mobile':'Desktop'}`;

  const barData = [40,55,35,70,60,80,50,90,75,95,65,100];
  const barMax  = Math.max(...barData);
  const chartH  = 64;
  const bars = barData.map((v,i) => {
    const h   = Math.round((v/barMax)*chartH);
    const gap = chartH - h;
    const col = i >= barData.length-3 ? prim : p300;
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:0;">
      <div style="height:${gap}px;"></div>
      <div style="height:${h}px;background:${col};border-radius:3px 3px 0 0;width:100%;min-width:6px;"></div>
    </div>`;
  }).join('');

  const navItems = ['Dashboard','Analytics','Projects','Reports','Settings'];
  const navHTML = navItems.map((n,i) => {
    const active = i===1;
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;
      border-radius:7px;cursor:pointer;margin-bottom:2px;
      background:${active ? primXL : 'transparent'};
      color:${active ? prim : txt2};font-weight:${active?'600':'400'};font-size:12px;">
      <div style="width:3px;height:14px;border-radius:2px;background:${active ? prim : 'transparent'};flex-shrink:0;"></div>
      ${n}
    </div>`;
  }).join('');

  const rows = [
    {name:'Q1 Revenue',   val:'$124,000', delta:'+12%',  status:'success'},
    {name:'Q2 Revenue',   val:'$98,400',  delta:'-8%',   status:'danger'},
    {name:'Active users', val:'23,400',   delta:'+22%',  status:'success'},
    {name:'Churn rate',   val:'3.2%',     delta:'+0.4%', status:'warning'},
  ];
  const rowsHTML = rows.map((r) => {
    const sFg = r.status==='success'?successFg : r.status==='danger'?dangerFg : warnFg;
    const sBg = r.status==='success'?successBg : r.status==='danger'?dangerBg : warnBg;
    const sLabel = r.status==='success'?'↑ Up' : r.status==='danger'?'↓ Down' : '→ Flat';
    return `<div style="display:flex;align-items:center;padding:9px 0;border-bottom:1px solid ${brd};">
      <div style="flex:2;font-size:12px;color:${txt};">${r.name}</div>
      <div style="flex:1;font-size:12px;font-weight:600;color:${txt};text-align:right;">${r.val}</div>
      <div style="flex:1;text-align:right;">
        <span style="font-size:10px;font-weight:600;padding:3px 7px;border-radius:20px;background:${sBg};color:${sFg};">${sLabel} ${r.delta}</span>
      </div>
    </div>`;
  }).join('');

  const desktopLayout = `
<div style="display:flex;height:100%;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:${txt};min-height:480px;">
  <div style="width:180px;flex-shrink:0;background:${bg};border-right:1px solid ${brd};display:flex;flex-direction:column;padding:16px 10px;">
    <div style="font-weight:700;font-size:14px;color:${txt};padding:4px 10px;margin-bottom:20px;">Acme <span style="color:${prim}">HQ</span></div>
    ${navHTML}
    <div style="flex:1;"></div>
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-top:1px solid ${brd};margin-top:8px;">
      <div style="width:26px;height:26px;border-radius:50%;background:${primL};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${prim};flex-shrink:0;">AK</div>
      <div>
        <div style="font-size:11px;font-weight:600;color:${txt};">Abhi K.</div>
        <div style="font-size:10px;color:${txt2};">Admin</div>
      </div>
    </div>
  </div>
  <div style="flex:1;overflow:auto;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:48px;background:${bg};border-bottom:1px solid ${brd};flex-shrink:0;">
      <div>
        <div style="font-size:14px;font-weight:700;color:${txt};">Analytics</div>
        <div style="font-size:10px;color:${txt2};">Overview · Last 30 days</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="font-size:11px;color:${txt2};padding:5px 10px;border:1px solid ${brd};border-radius:6px;background:${bg};">Mar 2025</div>
        <button style="font-size:11px;font-weight:600;padding:5px 12px;border-radius:6px;border:none;cursor:pointer;color:${primFg};background:${prim};font-family:inherit;">+ New report</button>
      </div>
    </div>
    <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px;flex:1;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
        ${[
          {label:'Total revenue', val:'$248.4K', delta:'+14%', up:true},
          {label:'Active users',  val:'23,400',  delta:'+22%', up:true},
          {label:'Conversion',    val:'3.8%',    delta:'-0.3%',up:false},
          {label:'Avg. session',  val:'4m 12s',  delta:'+8%',  up:true},
        ].map(s=>`
          <div style="background:${surf};border:1px solid ${brd};border-radius:10px;padding:14px;">
            <div style="font-size:10px;color:${txt2};margin-bottom:6px;">${s.label}</div>
            <div style="font-size:20px;font-weight:700;color:${txt};line-height:1;margin-bottom:6px;">${s.val}</div>
            <span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;background:${s.up?successBg:dangerBg};color:${s.up?successFg:dangerFg};">${s.delta}</span>
          </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px;">
        <div style="background:${surf};border:1px solid ${brd};border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
            <div>
              <div style="font-size:12px;font-weight:600;color:${txt};margin-bottom:2px;">Monthly revenue</div>
              <div style="font-size:10px;color:${txt2};">Jan – Dec 2024</div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
              <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:${txt2};"><span style="width:8px;height:8px;border-radius:2px;background:${prim};display:inline-block;"></span>Current</span>
              <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:${txt2};"><span style="width:8px;height:8px;border-radius:2px;background:${p300};display:inline-block;"></span>Previous</span>
            </div>
          </div>
          <div style="display:flex;align-items:flex-end;gap:4px;height:${chartH}px;padding:0 2px;">${bars}</div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;padding:0 2px;">
            ${['J','F','M','A','M','J','J','A','S','O','N','D'].map(m=>`<div style="flex:1;text-align:center;font-size:8px;color:${txt3};">${m}</div>`).join('')}
          </div>
        </div>
        <div style="background:${prim};border-radius:10px;padding:16px;width:140px;display:flex;flex-direction:column;justify-content:space-between;">
          <div style="font-size:10px;font-weight:600;color:${primFg};opacity:.8;margin-bottom:8px;">Target progress</div>
          <div style="font-size:28px;font-weight:700;color:${primFg};line-height:1;">78%</div>
          <div style="margin-top:10px;">
            <div style="height:4px;background:rgba(255,255,255,.25);border-radius:2px;overflow:hidden;">
              <div style="width:78%;height:100%;background:${primFg};border-radius:2px;opacity:.9;"></div>
            </div>
            <div style="font-size:10px;color:${primFg};opacity:.7;margin-top:5px;">of annual goal</div>
          </div>
          <span style="margin-top:12px;font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;background:${successBg};color:${successFg};align-self:flex-start;">↑ On track</span>
        </div>
      </div>
      <div style="background:${surf};border:1px solid ${brd};border-radius:10px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:600;color:${txt};">Key metrics</div>
          <div style="font-size:10px;color:${prim};cursor:pointer;font-weight:500;">View all →</div>
        </div>
        <div style="display:flex;padding:0 0 6px;border-bottom:1px solid ${brd};">
          <div style="flex:2;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${txt3};">Metric</div>
          <div style="flex:1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${txt3};text-align:right;">Value</div>
          <div style="flex:1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${txt3};text-align:right;">Change</div>
        </div>
        ${rowsHTML}
      </div>
    </div>
  </div>
</div>`;

  const mobileLayout = `
<div style="background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:${txt};min-height:560px;">
  <div style="background:${prim};padding:16px 16px 20px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div style="font-size:15px;font-weight:700;color:${primFg};">Analytics</div>
      <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:13px;color:${primFg};">⚙</div>
    </div>
    <div style="font-size:10px;color:${primFg};opacity:.75;margin-bottom:4px;">WEEKLY STATS</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:${primFg};opacity:.75;margin-bottom:4px;">Revenue</div>
        <div style="font-size:20px;font-weight:700;color:${primFg};">$48.2K</div>
      </div>
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:${primFg};opacity:.75;margin-bottom:4px;">Users</div>
        <div style="font-size:20px;font-weight:700;color:${primFg};">23,400</div>
        <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:20px;background:${successBg};color:${successFg};margin-top:4px;display:inline-block;">+22%</span>
      </div>
    </div>
  </div>
  <div style="padding:14px;display:flex;flex-direction:column;gap:12px;margin-top:-8px;">
    <div style="background:${surf};border-radius:10px;border:1px solid ${brd};padding:14px;">
      <div style="font-size:12px;font-weight:600;color:${txt};margin-bottom:12px;">Monthly revenue</div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:${chartH}px;">${bars}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div style="background:${surf};border:1px solid ${brd};border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:${txt2};margin-bottom:4px;">Conversion</div>
        <div style="font-size:18px;font-weight:700;color:${txt};">3.8%</div>
      </div>
      <div style="background:${surf};border:1px solid ${brd};border-radius:10px;padding:12px;">
        <div style="font-size:10px;color:${txt2};margin-bottom:4px;">Avg. session</div>
        <div style="font-size:18px;font-weight:700;color:${txt};">4m 12s</div>
      </div>
    </div>
    <div style="background:${surf};border:1px solid ${brd};border-radius:10px;padding:14px;">
      <div style="font-size:12px;font-weight:600;color:${txt};margin-bottom:8px;">Key metrics</div>
      ${rowsHTML}
    </div>
    <button style="width:100%;padding:13px;border-radius:10px;border:none;background:${prim};color:${primFg};font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;font-family:inherit;">${dark ? 'DARK MODE' : 'LIGHT MODE'}</button>
  </div>
</div>`;

  document.getElementById('uiFrame').innerHTML = mob ? mobileLayout : desktopLayout;
}

function hexToOklch(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  if (hex.length !== 6) return null;
  const ri = parseInt(hex.slice(0,2),16)/255;
  const gi = parseInt(hex.slice(2,4),16)/255;
  const bi = parseInt(hex.slice(4,6),16)/255;
  const lin = v => v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  const rl = lin(ri), gl = lin(gi), bl = lin(bi);
  const l = 0.4122214708*rl + 0.5363325363*gl + 0.0514459929*bl;
  const m = 0.2119034982*rl + 0.6806995451*gl + 0.1073969566*bl;
  const s = 0.0883024619*rl + 0.2817188376*gl + 0.6299787005*bl;
  const lc = Math.cbrt(l), mc = Math.cbrt(m), sc = Math.cbrt(s);
  const L = 0.2104542553*lc + 0.7936177850*mc - 0.0040720468*sc;
  const a = 1.9779984951*lc - 2.4285922050*mc + 0.4505937099*sc;
  const b2= 0.0259040371*lc + 0.7827717662*mc - 0.8086757660*sc;
  const C2 = Math.sqrt(a*a + b2*b2);
  let hDeg = Math.atan2(b2, a) * 180 / Math.PI;
  if (hDeg < 0) hDeg += 360;
  return { L: Math.max(0,Math.min(1,L)), C: Math.max(0,C2), H: hDeg };
}

function isValidHex(v) { return /^#?[0-9a-fA-F]{6}$/.test(v.trim()); }

function onHexInput(val) {
  const el = document.getElementById('mainSwatch');
  if (isValidHex(val)) {
    const hex = val.startsWith('#') ? val : '#'+val;
    el.style.background = hex;
    document.getElementById('swatchHex').style.color = fg(hex);
  }
}

function onHexCommit(val) {
  val = val.trim();
  if (!val.startsWith('#')) val = '#'+val;
  if (!isValidHex(val)) {
    const current = toHex(Lv, C, H);
    const inp = document.getElementById('swatchHex');
    inp.value = current.toUpperCase();
    inp.style.color = fg(current);
    document.getElementById('mainSwatch').style.background = current;
    return;
  }
  const oklch = hexToOklch(val);
  if (!oklch) return;

  H  = Math.round(oklch.H);
  C  = Math.min(0.28, Math.max(0.03, oklch.C));
  Lv = Math.min(0.75, Math.max(0.40, oklch.L));
  hexAnchorL = Lv;

  document.getElementById('sHue').value    = H;
  document.getElementById('sChroma').value = Math.round(C * 100);
  document.getElementById('sLight').value  = Math.round(Lv * 100);

  go();
}

function showTip(e, el) {
  const d = el.dataset;
  document.getElementById('tipSwatch').style.background = d.hex;
  document.getElementById('tipStep').textContent = `Step ${d.step}`;
  document.getElementById('tipL').textContent    = `L  ${d.l}`;
  document.getElementById('tipC').textContent    = `C  ${d.c}`;
  document.getElementById('tipH').textContent    = `H  ${d.h}°`;
  document.getElementById('tipHex').textContent  = d.hex.toUpperCase();
  document.getElementById('tipHint').textContent = 'click to copy';
  document.getElementById('colorTip').classList.remove('copied-flash');
  moveTip(e);
  document.getElementById('colorTip').classList.add('show');
}

function moveTip(e) {
  const tip = document.getElementById('colorTip');
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = e.clientX + 14;
  let y = e.clientY - 14;
  if (x + tw > vw - 8) x = e.clientX - tw - 14;
  if (y + th > vh - 8) y = e.clientY - th - 4;
  if (y < 8) y = 8;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function hideTip() {
  document.getElementById('colorTip').classList.remove('show');
}

function chipClick(hex) {
  if (!hex) return;
  const doFlash = () => {
    const tip = document.getElementById('colorTip');
    document.getElementById('tipHint').textContent = 'copied!';
    tip.classList.add('copied-flash');
    setTimeout(() => {
      document.getElementById('tipHint').textContent = 'click to copy';
      tip.classList.remove('copied-flash');
    }, 1600);
  };
  navigator.clipboard.writeText(hex.toUpperCase())
    .then(doFlash)
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = hex.toUpperCase();
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      doFlash();
    });
}

function openModal() { document.getElementById('oklchModal').style.display = 'flex'; }
function closeModal() { document.getElementById('oklchModal').style.display = 'none'; }
function openExportModal() { document.getElementById('exportModal').style.display = 'flex'; }
function closeExportModal() { document.getElementById('exportModal').style.display = 'none'; }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeExportModal(); }
});

function downloadFile(name, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type: mime}));
  a.download = name;
  a.click();
}

function buildPalette() {
  const dynL = dynamicStops(Lv);
  const secH = (H + SEC[si].offset) % 360;
  const nc   = [0, 0.012, 0.028][nt];
  const nh   = nt > 0 ? H : 0;
  const semDefs = [
    {name:'danger',  h:adjH(22,28),  c:0.22},
    {name:'warning', h:adjH(78,28),  c:0.19},
    {name:'success', h:adjH(145,28), c:0.20},
    {name:'info',    h:adjH(248,28), c:0.18},
  ];
  const semL = [0.995,0.94,0.88,0.80,0.70,0.58,0.46];
  const semSteps = ['50','100','200','300','400','500','600'];

  function scaleEntries(h, c, ls, labels) {
    return labels.map((lbl, i) => {
      const tc  = taperedC(ls[i], c);
      const hex = toHex(ls[i], tc, h);
      return { step: lbl, l: +ls[i].toFixed(3), c: +tc.toFixed(3), h: Math.round(h), hex };
    });
  }
  return {
    primary:   scaleEntries(H,    C,      dynL,   LB),
    secondary: scaleEntries(secH, C*0.88, dynL,   LB),
    neutral:   scaleEntries(nh,   nc,     dynL,   LB),
    status:    Object.fromEntries(semDefs.map(s =>
      [s.name, scaleEntries(s.h, s.c, semL, semSteps)]
    )),
  };
}

function exportSemanticCSS(mode = 'both') {
  const { light, dark } = buildSemanticTokens();
  const lightBlock = (selector) => [
    `${selector} {`,
    '  /* surfaces */',
    `  --color-background:         ${light.background};`,
    `  --color-surface:            ${light.surface};`,
    `  --color-border:             ${light.border};`,
    '',
    '  /* text */',
    `  --color-text:               ${light.text};`,
    `  --color-text-secondary:     ${light.textSecondary};`,
    `  --color-text-muted:         ${light.textMuted};`,
    '',
    '  /* brand */',
    `  --color-brand:              ${light.brand};`,
    `  --color-brand-fg:           ${light.brandFg};`,
    `  --color-brand-subtle:       ${light.brandSubtle};`,
    `  --color-brand-subtle-text:  ${light.brandSubtleText};`,
    `  --color-brand-hover:        ${light.brandHover};`,
    '',
    '  /* status */',
    `  --color-danger-bg:          ${light.dangerBg};`,
    `  --color-danger-text:        ${light.dangerText};`,
    `  --color-warning-bg:         ${light.warningBg};`,
    `  --color-warning-text:       ${light.warningText};`,
    `  --color-success-bg:         ${light.successBg};`,
    `  --color-success-text:       ${light.successText};`,
    `  --color-info-bg:            ${light.infoBg};`,
    `  --color-info-text:          ${light.infoText};`,
    '}',
  ];
  const darkBlock = (selector) => [
    `${selector} {`,
    '  /* surfaces */',
    `  --color-background:         ${dark.background};`,
    `  --color-surface:            ${dark.surface};`,
    `  --color-border:             ${dark.border};`,
    '',
    '  /* text */',
    `  --color-text:               ${dark.text};`,
    `  --color-text-secondary:     ${dark.textSecondary};`,
    `  --color-text-muted:         ${dark.textMuted};`,
    '',
    '  /* brand */',
    `  --color-brand:              ${dark.brand};`,
    `  --color-brand-fg:           ${dark.brandFg};`,
    `  --color-brand-subtle:       ${dark.brandSubtle};`,
    `  --color-brand-subtle-text:  ${dark.brandSubtleText};`,
    `  --color-brand-hover:        ${dark.brandHover};`,
    '',
    '  /* status */',
    `  --color-danger-bg:          ${dark.dangerBg};`,
    `  --color-danger-text:        ${dark.dangerText};`,
    `  --color-warning-bg:         ${dark.warningBg};`,
    `  --color-warning-text:       ${dark.warningText};`,
    `  --color-success-bg:         ${dark.successBg};`,
    `  --color-success-text:       ${dark.successText};`,
    `  --color-info-bg:            ${dark.infoBg};`,
    `  --color-info-text:          ${dark.infoText};`,
    '}',
  ];

  let lines = ["/* Generated by Ok, let's LCH — Semantic Tokens */", ''];
  if (mode === 'both') {
    lines = [...lines, ...lightBlock(':root'), '', ...darkBlock('.dark')];
  } else if (mode === 'light') {
    lines = [...lines, ...lightBlock(':root')];
  } else {
    lines = [...lines, ...darkBlock(':root')];
  }

  const filename = mode === 'both' ? 'semantic-tokens.css' : `semantic-tokens-${mode}.css`;
  downloadFile(filename, lines.join('\n'), 'text/css');
}

function exportCSS() {
  const p = buildPalette();
  const lines = ["/* Generated by Ok, let's LCH */", "/* oklch() native; hex as fallback */", '', ':root {'];
  const add = (name, e) => lines.push(`  --color-${name}-${e.step}: oklch(${e.l} ${e.c} ${e.h}); /* ${e.hex} */`);
  p.primary.forEach(e => add('primary', e)); lines.push('');
  p.secondary.forEach(e => add('secondary', e)); lines.push('');
  p.neutral.forEach(e => add('neutral', e)); lines.push('');
  Object.entries(p.status).forEach(([k,v]) => { v.forEach(e => add(k, e)); lines.push(''); });
  lines.push('}');
  downloadFile('palette.css', lines.join('\n'), 'text/css');
}

function exportJSON() {
  const p = buildPalette();
  const toObj = scale => Object.fromEntries(scale.map(e => [e.step, {
    oklch: `oklch(${e.l} ${e.c} ${e.h})`, hex: e.hex, l: e.l, c: e.c, h: e.h,
  }]));
  const out = {
    _meta: { generator: "Ok, let's LCH", colorSpace: 'oklch' },
    primary:   toObj(p.primary),
    secondary: toObj(p.secondary),
    neutral:   toObj(p.neutral),
    status:    Object.fromEntries(Object.entries(p.status).map(([k,v]) => [k, toObj(v)])),
  };
  downloadFile('palette.json', JSON.stringify(out, null, 2), 'application/json');
}

function exportTailwind() {
  const p = buildPalette();
  const toObj = (scale, indent) => {
    const pad = ' '.repeat(indent);
    return '{\n' + scale.map(e => `${pad}  ${e.step}: '${e.hex}', /* oklch(${e.l} ${e.c} ${e.h}) */`).join('\n') + `\n${pad}}`;
  };
  const lines = [
    "// Generated by Ok, let's LCH",
    '// Paste into tailwind.config.js → theme.extend.colors', '',
    'colors: {',
    `  primary:   ${toObj(p.primary,   2)},`,
    `  secondary: ${toObj(p.secondary, 2)},`,
    `  neutral:   ${toObj(p.neutral,   2)},`,
    '  status: {',
    ...Object.entries(p.status).map(([k,v]) => `    ${k}: ${toObj(v, 4)},`),
    '  },', '},',
  ];
  downloadFile('tailwind-colors.js', lines.join('\n'), 'text/javascript');
}

function exportFigma() {
  const p = buildPalette();
  const hexToRgb01 = hex => ({
    r: parseInt(hex.slice(1,3),16)/255,
    g: parseInt(hex.slice(3,5),16)/255,
    b: parseInt(hex.slice(5,7),16)/255, a: 1,
  });
  const variables = [];
  const addScale = (group, scale) => scale.forEach(e => variables.push({
    name: `${group}/${e.step}`,
    resolvedType: 'COLOR',
    valuesByMode: { Default: hexToRgb01(e.hex) },
    description: `oklch(${e.l} ${e.c} ${e.h})`,
  }));
  addScale('Primary', p.primary);
  addScale('Secondary', p.secondary);
  addScale('Neutral', p.neutral);
  Object.entries(p.status).forEach(([k,v]) => addScale('Status/' + k.charAt(0).toUpperCase() + k.slice(1), v));
  downloadFile(
    'figma-variables.json',
    JSON.stringify({ version:'1.0', collections:[{ name:'Palette', modes:['Default'], variables }] }, null, 2),
    'application/json'
  );
}

function exportSVG() {
  const p = buildPalette();
  const chipW = 48, chipH = 48, gap = 2, labelH = 28, groupGap = 20, padX = 20;
  const groups = [
    { name:'Primary',   scale: p.primary   },
    { name:'Secondary', scale: p.secondary },
    { name:'Neutral',   scale: p.neutral   },
    ...Object.entries(p.status).map(([k,v]) => ({ name: k.charAt(0).toUpperCase()+k.slice(1), scale: v })),
  ];
  const totalW  = padX + LB.length * (chipW + gap) - gap + padX;
  const totalH  = 36 + groups.length * (labelH + chipH + groupGap);
  let y = 36, chips = '';
  groups.forEach(g => {
    chips += `<text x="${padX}" y="${y}" font-family="'Courier New',monospace" font-size="9" fill="#9a9a90" letter-spacing="1.5">${g.name.toUpperCase()}</text>`;
    y += labelH;
    g.scale.forEach((e, i) => {
      const x = padX + i * (chipW + gap);
      const tf = luminance(e.hex) > 0.35 ? '#1a1a16' : '#f5f4f0';
      chips += `<rect x="${x}" y="${y}" width="${chipW}" height="${chipH}" fill="${e.hex}"/>`;
      chips += `<text x="${x+chipW/2}" y="${y+chipH-6}" text-anchor="middle" font-family="'Courier New',monospace" font-size="7" fill="${tf}" opacity="0.55">${e.step}</text>`;
    });
    y += chipH + groupGap;
  });
  downloadFile('palette.svg', `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="#f5f4f0"/>
  <text x="${padX}" y="18" font-family="'Courier New',monospace" font-size="9" fill="#9a9a90" letter-spacing="0.5">ok, let's lch — palette</text>
  ${chips}
</svg>`, 'image/svg+xml');
}

function dynamicStops(anchor) {
  const top    = 0.995;
  const bottom = 0.10;
  const stops  = [];
  for (let i = 0; i < 5; i++) {
    stops.push(top - (top - anchor) * (i / 5));
  }
  stops.push(anchor);
  for (let i = 1; i <= 4; i++) {
    stops.push(anchor - (anchor - bottom) * (i / 4));
  }
  return stops;
}

function go() {
  H  = parseInt(document.getElementById('sHue').value);
  C  = parseInt(document.getElementById('sChroma').value)/100;
  Lv = parseInt(document.getElementById('sLight').value)/100;

  const vHue = document.getElementById('vHue');
  if (document.activeElement !== vHue) vHue.value = H + '°';
  const vChroma = document.getElementById('vChroma');
  if (document.activeElement !== vChroma) vChroma.value = C.toFixed(2);
  const vLight = document.getElementById('vLight');
  if (document.activeElement !== vLight) vLight.value = Lv.toFixed(2);

  const base = toHex(Lv, C, H);
  const f    = fg(base);
  document.getElementById('mainSwatch').style.background = base;
  const hexInp = document.getElementById('swatchHex');
  if (document.activeElement !== hexInp) {
    hexInp.value = base.toUpperCase();
  }
  hexInp.style.color = f;
  document.documentElement.style.setProperty('--accent', base);
  document.getElementById('hueThumbStyle').textContent =
    `.hue-slider::-webkit-slider-thumb { background: ${base}; }`;

  const tintLight = toHex(0.94, C * 0.08, H);
  const tintDark  = toHex(0.12, C * 0.12, H);
  document.documentElement.style.setProperty('--tint', appDark ? tintDark : tintLight);

  const dot  = document.getElementById('anchorDot');
  const text = document.getElementById('anchorText');
  if (hexAnchorL !== null) {
    const isExact = Math.abs(hexAnchorL - Lv) < 0.005;
    dot.className  = 'hex-anchor-dot' + (isExact ? ' exact' : '');
    text.textContent = isExact
      ? 'hex is exact at step 500'
      : `hex shifted to step 500 (was L ${hexAnchorL.toFixed(2)})`;
  } else {
    dot.className = 'hex-anchor-dot';
    text.textContent = 'lightness set manually';
  }

  const dynL = dynamicStops(Lv);
  strip('stripPrimary',  H, C, dynL, LB);
  strip('stripSecondary',(H+SEC[si].offset)%360, C*.88, dynL, LB);
  renderNeutral(dynL);
  renderSemantic();
  renderSecOpts();
  renderPreview();
}

function commitH(val) {
  const v = parseInt(val);
  if (isNaN(v)) { document.getElementById('vHue').value = H + '°'; return; }
  H = ((v % 360) + 360) % 360;
  document.getElementById('sHue').value = H;
  go();
}
function commitC(val) {
  const v = parseFloat(val);
  if (isNaN(v)) { document.getElementById('vChroma').value = C.toFixed(2); return; }
  C = Math.min(0.28, Math.max(0.03, v));
  document.getElementById('sChroma').value = Math.round(C * 100);
  go();
}
function commitL(val) {
  const v = parseFloat(val);
  if (isNaN(v)) { document.getElementById('vLight').value = Lv.toFixed(2); return; }
  hexAnchorL = null;
  Lv = Math.min(0.75, Math.max(0.40, v));
  document.getElementById('sLight').value = Math.round(Lv * 100);
  go();
}

function pickSec(i) { si=i; go(); }
function setNt(n) {
  nt=n; [0,1,2].forEach(i=>document.getElementById('nt'+i).classList.toggle('on',i===n)); go();
}
function setPv(m) {
  pv=m;
  appDark = (m === 'dark');
  document.body.classList.toggle('app-dark', appDark);
  document.getElementById('pvLt').classList.toggle('on', m==='light');
  document.getElementById('pvDk').classList.toggle('on', m==='dark');
  const tintLight = toHex(0.94, C * 0.08, H);
  const tintDark  = toHex(0.12, C * 0.12, H);
  document.documentElement.style.setProperty('--tint', appDark ? tintDark : tintLight);
  renderPreview();
}
function setDev(d) {
  dev=d;
  document.getElementById('pvDe').classList.toggle('on', d==='desktop');
  document.getElementById('pvMo').classList.toggle('on', d==='mobile');
  renderPreview();
}

go();
