/* Баланс — бесплатный офлайн-дневник. Личная информация никогда не отправляется на сервер. */
(() => {
  'use strict';
  const KEY='balans-local-v1';
  // Справочные средние значения на 100 г. Разные продукты и рецепты отличаются.
  const FOODS=[
    ['Яйцо варёное',155,13,11,1.1,0],['Куриная грудка готовая',165,31,3.6,0,0],
    ['Индейка готовая',150,29,2.7,0,0],['Говядина нежирная готовая',210,27,10,0,0],
    ['Гречка варёная',110,3.6,1.1,21.3,2.7],['Рис варёный',130,2.7,.3,28,.4],
    ['Овсянка на воде',70,2.5,1.5,12,1.7],['Макароны варёные',158,5.8,.9,30.9,1.8],
    ['Картофель варёный',87,1.9,.1,20.1,1.8],['Чечевица варёная',116,9,.4,20,7.9],
    ['Творог 5%',121,17,5,1.8,0],['Йогурт натуральный',63,5,3.2,3.5,0],
    ['Молоко 2,5%',52,2.8,2.5,4.7,0],['Сыр твёрдый',350,25,27,1.5,0],
    ['Хлеб цельнозерновой',247,13,4.2,41,7],['Яблоко',52,.3,.2,14,2.4],
    ['Банан',89,1.1,.3,23,2.6],['Голубика',57,.7,.3,14.5,2.4],
    ['Помидор',18,.9,.2,3.9,1.2],['Огурец',15,.7,.1,3.6,.5],
    ['Брокколи варёная',35,2.4,.4,7.2,3.3],['Авокадо',160,2,14.7,8.5,6.7],
    ['Миндаль',579,21.2,49.9,21.6,12.5],['Масло оливковое',884,0,100,0,0],
    ['Лосось готовый',206,22.1,12.4,0,0]
  ];
  const $=sel=>document.querySelector(sel);
  const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const cleanNum=(v,fallback=0)=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:fallback};
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const fmt=(n,d=0)=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d,minimumFractionDigits:d});
  const prettyDate=d=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return '—';return new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'})};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nval=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const defaultData=()=>({
    version:1,settings:{startDate:today(),startWeight:67,goalWeight:55,height:'',age:'',sex:'',activity:1.375,pace:0.4,waterGoal:2000,stepsGoal:7000},
    weights:[{date:today(),value:67,id:'start'}],days:{}
  });
  let store;
  try{store=JSON.parse(localStorage.getItem(KEY)||'null')||defaultData()}catch{store=defaultData()}
  function normalise(raw){
    if(!raw||typeof raw!=='object'||!raw.settings||!Array.isArray(raw.weights)||!raw.days||typeof raw.days!=='object')throw new Error('Неверная структура файла');
    const defaults=defaultData();
    const s={...defaults.settings,...raw.settings};
    if(!(nval(s.startWeight)>20&&nval(s.startWeight)<450&&nval(s.goalWeight)>20&&nval(s.goalWeight)<450))throw new Error('Проверьте значения веса');
    s.startWeight=clamp(nval(s.startWeight),20,450);s.goalWeight=clamp(nval(s.goalWeight),20,450);
    s.height=s.height===''?'':clamp(nval(s.height),90,240);s.age=s.age===''?'':clamp(nval(s.age),12,110);
    s.sex=['male','female'].includes(s.sex)?s.sex:'';
    s.activity=[1.2,1.375,1.55,1.725].includes(nval(s.activity))?nval(s.activity):1.375;
    s.pace=clamp(nval(s.pace,0.4),0.15,0.75);
    s.waterGoal=clamp(nval(s.waterGoal,2000),250,5000);
    s.stepsGoal=clamp(nval(s.stepsGoal,7000),1000,30000);
    s.startDate=/^\d{4}-\d{2}-\d{2}$/.test(s.startDate)?s.startDate:today();
    const weights=raw.weights.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&nval(x.value)>20&&nval(x.value)<450).map(x=>({date:x.date,value:nval(x.value),id:String(x.id||'entry').slice(0,30)})).slice(-10000);
    const days={};
    for(const [date,entry] of Object.entries(raw.days).slice(-5000)){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!entry||typeof entry!=='object')continue;
      days[date]={water:clamp(nval(entry.water),0,20000),steps:clamp(nval(entry.steps),0,100000),exercise:clamp(nval(entry.exercise),0,1440),notes:String(entry.notes||'').slice(0,2000),meals:(Array.isArray(entry.meals)?entry.meals:[]).slice(-200).map(m=>({id:String(m.id||'meal').slice(0,80),name:String(m.name||'Продукт').slice(0,120),kcal:clamp(nval(m.kcal),0,5000),protein:clamp(nval(m.protein),0,600),fat:clamp(nval(m.fat),0,600),carbs:clamp(nval(m.carbs),0,600),fiber:clamp(nval(m.fiber),0,200)}))};
    }
    return {version:1,settings:s,weights:weights.length?weights:[{date:s.startDate,value:s.startWeight,id:'start'}],days};
  }
  try{store=normalise(store)}catch{store=defaultData()}
  let tab='today', selectedDay=today(),toastTimeout;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(store));return true}catch{flash('Не удалось сохранить. Экспортируйте резервную копию.');return false}}
  save();
  const getDay=date=>store.days[date]||{water:0,steps:0,exercise:0,notes:'',meals:[]};
  function editableDay(date){if(!store.days[date])store.days[date]={water:0,steps:0,exercise:0,notes:'',meals:[]};return store.days[date]}
  function weightEntries(){return [...store.weights].sort((a,b)=>a.date.localeCompare(b.date))}
  function latestWeight(){const entries=weightEntries().filter(x=>x.date<=today());return entries.length?entries[entries.length-1].value:store.settings.startWeight}
  function weightFor(date){return store.weights.find(w=>w.date===date)?.value??null}
  function totals(date){return getDay(date).meals.reduce((t,m)=>({kcal:t.kcal+m.kcal,protein:t.protein+m.protein,fat:t.fat+m.fat,carbs:t.carbs+m.carbs,fiber:t.fiber+m.fiber}),{kcal:0,protein:0,fat:0,carbs:0,fiber:0})}
  const maxWidth=n=>Math.min(100,Math.max(0,n));
  function estimation(){
    const s=store.settings,weight=latestWeight();
    const base={ready:false,weight,bmi: s.height?weight/(nval(s.height)/100)**2:null,targetBmi:s.height?s.goalWeight/(nval(s.height)/100)**2:null};
    if(!s.age||!s.height||!s.sex)return {...base,reason:'Заполните рост, возраст и параметры расчёта в разделе «Мой план».'};
    if(nval(s.age)<18)return {...base,reason:'Для людей младше 18 лет расчёт дефицита калорий по взрослой формуле не подходит. Нужен врач или диетолог.'};
    if(base.bmi<18.5||base.targetBmi<18.5)return {...base,reason:'Исходный или целевой ИМТ ниже 18,5. Дефицит не рассчитывается: сначала обсудите цель с врачом.'};
    const bmr=10*weight+6.25*nval(s.height)-5*nval(s.age)+(s.sex==='male'?5:-161);
    const maintain=bmr*nval(s.activity);
    // Консервативная верхняя граница дефицита ~20%; без двойного учёта тренировок.
    const wanted=Math.max(0,(weight-s.goalWeight)>0? nval(s.pace)*7700/7 : 0);
    const minCal=s.sex==='female'?1200:1500; // скрининг-порог, не индивидуальное назначение
    const deficit=Math.min(wanted,maintain*.2,Math.max(0,maintain-minCal));
    const target=Math.round(maintain-deficit);
    const actualRate=deficit*7/7700;
    const protein=Math.round(weight*1.3),fat=Math.round(target*.29/9),carbs=Math.max(0,Math.round((target-protein*4-fat*9)/4));
    let eta=null,days=null;
    if(weight>s.goalWeight&&actualRate>=0.08){
      days=Math.ceil((weight-s.goalWeight)/actualRate*7);
      const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);eta=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    }
    return {...base,ready:true,bmr:Math.round(bmr),maintain:Math.round(maintain),target,protein,fat,carbs,fiber:25,actualRate,eta,days,atFloor:Math.round(maintain-deficit)<=minCal,atGoal:weight<=s.goalWeight};
  }
  function flash(text){const el=$('#toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),3200)}
  const formNum=(v,dec=0)=>typeof v==='number'?fmt(v,dec):'—';
  function header(title,subtitle,eyebrow='МОЙ ДНЕВНИК'){
    return `<div class="eyebrow">${esc(eyebrow)}</div><h1 class="greeting">${esc(title)}</h1><p class="subhead">${esc(subtitle)}</p>`;
  }
  function summaryHero(){
    const s=store.settings,w=latestWeight(),loss=Math.max(0,s.startWeight-w),needed=Math.max(0,s.startWeight-s.goalWeight),pct=needed?maxWidth(loss/needed*100):100,e=estimation();
    return `<section class="hero"><div class="hero-top"><span class="hero-chip">✦ ВАША ЛИЧНАЯ ЦЕЛЬ</span><span class="hero-mark">✳</span></div>
      <div class="numbers"><span class="main-number">${fmt(w,1)}<span class="unit"> кг</span></span><span class="hero-arrow">→</span><span class="goal-number">${fmt(s.goalWeight,1)} <span class="unit">кг</span></span></div>
      <div class="hero-caption">${w<=s.goalWeight?'Цель достигнута — самое время перейти к поддержанию веса.':`Осталось ${fmt(w-s.goalWeight,1)} кг ${e.ready&&e.eta?'· ориентир: '+prettyDate(e.eta):'· персональный срок появится после настройки'}`}</div>
      <div class="progress-track" role="progressbar" aria-label="Прогресс снижения веса" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
      <div class="hero-foot"><span>Старт: ${fmt(s.startWeight,1)} кг</span><span>Прогресс: ${fmt(Math.min(loss,needed),1)} из ${fmt(needed,1)} кг</span></div></section>`;
  }
  function caloriesCard(date){const e=estimation(),t=totals(date);if(!e.ready)return `<section class="card"><div class="card-label">Дневная норма калорий</div><div class="row" style="margin:12px 0"><div><div class="big-number">— <small>ккал</small></div><p class="caption">Сначала уточним данные, чтобы не назначать случайные 1200 ккал.</p></div><span style="font-size:41px">🍃</span></div><button class="btn small" data-tab="plan">Настроить расчёт</button></section>`;
    const rem=e.target-t.kcal,pct=maxWidth(t.kcal/e.target*100);
    return `<section class="card"><div class="row"><div><div class="card-label">Съедено сегодня</div><div class="big-number">${fmt(t.kcal)} <small>из ${fmt(e.target)} ккал</small></div><div class="caption">${rem>=0?'Остаётся примерно '+fmt(rem)+' ккал':'Превышение на '+fmt(-rem)+' ккал — это не повод пропускать приёмы пищи.'}</div></div><div class="ring" style="--p:${pct}%"><span>${Math.round(pct)}%</span></div></div><div class="progress-track" style="margin-top:14px"><span style="width:${pct}%"></span></div></section>`;
  }
  function macrosCard(date){const e=estimation();if(!e.ready)return '';const t=totals(date);let rows=[['Белки','protein',t.protein,e.protein],['Жиры','fat',t.fat,e.fat],['Углеводы','carb',t.carbs,e.carbs]];
    return `<div class="card"><div class="row"><h3 class="card-title">Баланс БЖУ</h3><span class="pill">ориентиры</span></div><div class="macro-bars">${rows.map(([name,key,used,target])=>`<div class="macro-row"><span>${name}</span><div class="macro-bar ${key}"><span style="width:${maxWidth(used/Math.max(target,1)*100)}%"></span></div><span class="macro-val">${fmt(used,0)} / ${fmt(target,0)} г</span></div>`).join('')}</div><p class="helper">Белок и другие нутриенты оцениваются по введённым вами данным. Неточные порции влияют на результат.</p></div>`;
  }
  function activityCard(date){const d=getDay(date),s=store.settings;
    return `<div class="card"><div class="row"><h3 class="card-title">Вода и активность</h3><span class="pill">${esc(prettyDate(date))}</span></div><div class="grid-2" style="margin-top:12px"><div class="mini-stat"><div class="card-label">💧 Вода</div><div class="value">${fmt(d.water)} <small style="font-size:12px">мл</small></div><div class="caption">Цель: ${fmt(s.waterGoal)} мл</div></div><div class="mini-stat"><div class="card-label">👟 Шаги</div><div class="value">${fmt(d.steps)}</div><div class="caption">Цель: ${fmt(s.stepsGoal)}</div></div></div>
      <div class="quick-actions"><button class="btn small secondary" data-water="250" data-date="${date}">+ 250 мл</button><button class="btn small secondary" data-water="500" data-date="${date}">+ 500 мл</button><button class="btn small outline" data-water="-250" data-date="${date}">− 250 мл</button></div><form id="activity-form" data-date="${date}" class="form-grid" style="margin-top:16px"><div class="field"><label for="steps">Шаги за день</label><input id="steps" name="steps" type="number" min="0" max="100000" step="1" inputmode="numeric" value="${d.steps}" required></div><div class="field"><label for="exercise">Тренировка, мин</label><input id="exercise" name="exercise" type="number" min="0" max="1440" step="1" inputmode="numeric" value="${d.exercise}" required></div><div class="field full"><button type="submit" class="btn small outline">Сохранить активность</button></div></form><p class="helper">Тренировки уже учтены через общий уровень активности в профиле; мы не прибавляем их калории второй раз.</p></div>`;
  }
  function mealForm(date){return `<form id="meal-form" data-date="${date}" class="form-grid"><details class="field full" style="background:#f4f8ee;padding:13px;border-radius:13px"><summary style="cursor:pointer;color:#578641;font-weight:750">Быстро добавить из справочника продуктов</summary><div class="form-grid" style="margin-top:13px"><div class="field full"><label for="preset-food">Продукт (значения приблизительные)</label><select id="preset-food"><option value="">Выберите продукт</option>${FOODS.map((f,i)=>`<option value="${i}">${esc(f[0])}</option>`).join('')}</select></div><div class="field"><label for="preset-grams">Количество, г</label><input id="preset-grams" type="number" min="1" max="5000" step="1" inputmode="decimal" value="100"></div><div class="field"><label>&nbsp;</label><button class="btn small secondary full" type="button" id="use-preset">Подставить</button></div></div><p class="helper">Для домашних блюд и разных брендов БЖУ может отличаться. Уточните по упаковке или рецепту.</p></details><div class="field full"><label for="meal-name">Что ели?</label><input id="meal-name" name="name" maxlength="120" required placeholder="Например, омлет и тост"></div><div class="field"><label for="meal-calories">Калории, ккал</label><input id="meal-calories" name="kcal" type="number" min="0" max="5000" step="1" inputmode="decimal" placeholder="350" required></div><div class="field"><label for="meal-protein">Белки, г</label><input id="meal-protein" name="protein" type="number" min="0" max="600" step="0.1" inputmode="decimal" placeholder="20"></div><div class="field"><label for="meal-fat">Жиры, г</label><input id="meal-fat" name="fat" type="number" min="0" max="600" step="0.1" inputmode="decimal" placeholder="12"></div><div class="field"><label for="meal-carbs">Углеводы, г</label><input id="meal-carbs" name="carbs" type="number" min="0" max="600" step="0.1" inputmode="decimal" placeholder="31"></div><div class="field"><label for="meal-fiber">Клетчатка, г</label><input id="meal-fiber" name="fiber" type="number" min="0" max="200" step="0.1" inputmode="decimal" placeholder="3"></div><div class="field"><label>&nbsp;</label><button type="submit" class="btn full">+ Добавить еду</button></div></form>`;}
  function mealsList(date){const meals=getDay(date).meals;if(!meals.length)return `<div class="empty">Пока нет записей. Добавьте первый приём пищи — даже примерная запись полезнее пустого дневника.</div>`;
    return meals.map(m=>`<div class="entry"><div><strong>${esc(m.name)}</strong><div class="meta">Б ${fmt(m.protein,1)} · Ж ${fmt(m.fat,1)} · У ${fmt(m.carbs,1)} · Клетчатка ${fmt(m.fiber,1)} г</div></div><div class="entry-side"><span class="entry-kcal">${fmt(m.kcal)} ккал</span><button type="button" class="delete-btn" data-delete-meal="${esc(m.id)}" data-date="${date}" aria-label="Удалить приём пищи">×</button></div></div>`).join('');
  }
  function isDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)}
  function adviceItems(){
    const e=estimation(),d=getDay(today()),t=totals(today()),w=latestWeight();let list=[];
    if(!e.ready)list.push(['⚙','Настройте личную формулу',e.reason]);
    if(e.ready&&e.atGoal)list.push(['★','Вы достигли цели','Резкий дальнейший дефицит не нужен. Измените цель на поддержание веса и наблюдайте за самочувствием.']);
    if(e.ready&&!e.atGoal)list.push(['◔','Плавный темп','Расчётный темп около '+fmt(e.actualRate,2)+' кг/нед. Это модель, а не обещание: реальная динамика нелинейна.']);
    if(d.meals.length===0)list.push(['✎','Начните с одной записи','Сегодня ещё не записано питание. Введите то, что действительно ели; не нужно стремиться к идеальному дню.']);
    else if(e.ready&&t.protein<e.protein*.7)list.push(['◉','Проверьте белок','В дневнике пока '+fmt(t.protein)+' г белка. Ориентир на день около '+fmt(e.protein)+' г; указывайте реальные порции.']);
    if(d.meals.length&&t.fiber<15)list.push(['♧','Добавьте клетчатку','В записях мало клетчатки. Овощи, фрукты, бобовые и крупы помогут сделать рацион разнообразнее.']);
    if(d.water<store.settings.waterGoal*.6)list.push(['💧','Следите за питьём','Отмечено '+fmt(d.water)+' мл. Пейте с учётом жажды, нагрузки и рекомендаций врача; цель в настройках можно изменить.']);
    const entries=weightEntries().filter(x=>x.date<=today());
    if(entries.length>=3){const recent=entries.filter(x=>new Date(today()+'T12:00:00')-new Date(x.date+'T12:00:00')<=14*86400000);if(recent.length>=3){const first=recent[0],last=recent[recent.length-1],weeks=(new Date(last.date+'T12:00:00')-new Date(first.date+'T12:00:00'))/604800000;if(weeks>=.7&&(first.value-last.value)/weeks>Math.max(.9,w*.01))list.unshift(['!','Вес снижается быстро','По последним записям снижение превышает примерно 1% веса в неделю. Проверьте самочувствие, питание и обсудите темп с врачом.']);}}
    if(!list.length)list.push(['✓','Хороший старт','Продолжайте вести записи, следите за сном и самочувствием. Изменения оценивайте по нескольким неделям, а не по одному дню.']);
    return list.slice(0,5);
  }
  function adviceCard(short=false){let items=adviceItems();if(short)items=items.slice(0,2);return `<section class="card"><div class="row"><h3 class="card-title">Подсказки по вашему дневнику</h3><span class="pill">без подписки</span></div>${items.map(([ico,title,desc])=>`<div class="advice"><div class="advice-icon">${esc(ico)}</div><div><strong>${esc(title)}</strong><p>${esc(desc)}</p></div></div>`).join('')}<p class="helper">Автоматические подсказки по общим рекомендациям, а не консультация врача.</p></section>`}
  function renderToday(){const e=estimation(),date=today();return `${header('Ваш путь к балансу',prettyDate(date)+' · маленькие шаги каждый день','НАЧНЁМ С СЕГОДНЯ')}${summaryHero()}
    <div class="desktop-two"><div>${caloriesCard(date)}${macrosCard(date)}</div><div>${activityCard(date)}</div></div>
    <h2 class="section-title">Записать питание</h2><section class="card">${mealForm(date)}<div class="thin-divider"></div><div class="row"><strong>Сегодня в дневнике</strong><span class="pill">${getDay(date).meals.length} записей</span></div>${mealsList(date)}</section>
    <h2 class="section-title">Контроль веса</h2><section class="card"><form id="weight-form" data-date="${date}" class="form-grid"><div class="field"><label for="today-weight">Вес сегодня, кг</label><input id="today-weight" type="number" name="weight" min="20" max="450" step="0.1" inputmode="decimal" value="${weightFor(date)??''}" placeholder="${fmt(latestWeight(),1)}" required></div><div class="field"><label>&nbsp;</label><button type="submit" class="btn full">Сохранить вес</button></div></form></section>
    <h2 class="section-title">Рекомендации</h2>${adviceCard(true)}<footer class="app-foot">Ваши данные остаются на этом устройстве. Экспортируйте резервную копию в разделе «Мой план».</footer>`;}
  function renderDiary(){const date=selectedDay,d=getDay(date),t=totals(date);return `${header('Дневник питания','Записывайте еду, воду, шаги и тренировки — без запретов и чувства вины.')}
    <section class="card"><div class="row"><strong>Выбранный день</strong><div class="date-switch"><input id="diary-date" type="date" value="${esc(date)}" min="2020-01-01" max="2100-12-31" aria-label="Дата дневника"></div></div><div class="grid-2" style="margin-top:15px"><div class="mini-stat"><div class="card-label">Калории</div><div class="value">${fmt(t.kcal)}</div><div class="caption">Сумма всех записей</div></div><div class="mini-stat"><div class="card-label">Приёмов пищи</div><div class="value">${d.meals.length}</div><div class="caption">За этот день</div></div></div></section>
    <h2 class="section-title">Добавить продукт или блюдо</h2><section class="card">${mealForm(date)}</section>
    <h2 class="section-title">Что вы ели</h2><section class="card">${mealsList(date)}<div class="thin-divider"></div><div class="row"><b>Всего</b><b>${fmt(t.kcal)} ккал</b></div><p class="helper">Б ${fmt(t.protein,1)} г · Ж ${fmt(t.fat,1)} г · У ${fmt(t.carbs,1)} г · клетчатка ${fmt(t.fiber,1)} г</p></section>
    <h2 class="section-title">Вода и движение</h2>${activityCard(date)}<section class="card"><form id="note-form" data-date="${date}"><div class="field"><label for="diary-note">Заметки и самочувствие</label><textarea id="diary-note" name="notes" placeholder="Как спали, как себя чувствовали, что помогло?">${esc(d.notes)}</textarea></div><button class="btn small secondary" style="margin-top:10px">Сохранить заметку</button></form></section>`;}
  function weightChart(){
    const pts=weightEntries().filter(x=>isDate(x.date));const s=store.settings;
    if(pts.length<2||new Set(pts.map(x=>x.date)).size<2)return `<div class="empty">Здесь появится график после второго взвешивания в другой день.</div>`;
    const W=700,H=288,L=50,R=20,T=21,B=43;
    const dates=pts.map(x=>new Date(x.date+'T12:00:00').getTime());const loD=Math.min(...dates),hiD=Math.max(...dates),span=Math.max(86400000,hiD-loD);
    const vals=[...pts.map(x=>x.value),s.goalWeight];const low=Math.floor((Math.min(...vals)-1)*2)/2,high=Math.ceil((Math.max(...vals)+1)*2)/2,ySpan=Math.max(1,high-low);
    const x=v=>L+(v-loD)/span*(W-L-R),y=v=>T+(high-v)/ySpan*(H-T-B);
    const horiz=[0,.25,.5,.75,1].map(f=>{const yy=T+f*(H-T-B),val=high-f*ySpan;return `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#e5eade" stroke-dasharray="4 6"/><text x="${L-8}" y="${yy+4}" text-anchor="end" class="chart-label">${fmt(val,1)}</text>`}).join('');
    const path=pts.map((p,i)=>`${i===0?'M':'L'} ${x(dates[i]).toFixed(2)} ${y(p.value).toFixed(2)}`).join(' ');
    const circles=pts.map((p,i)=>`<circle cx="${x(dates[i])}" cy="${y(p.value)}" r="5" fill="#fff" stroke="#76ad4b" stroke-width="3"><title>${prettyDate(p.date)}: ${fmt(p.value,1)} кг</title></circle>`).join('');
    const area=path+` L ${x(dates[dates.length-1])} ${H-B} L ${x(dates[0])} ${H-B} Z`;
    return `<div class="chart-wrap"><svg class="weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="График изменения веса от ${fmt(pts[0].value,1)} до ${fmt(pts[pts.length-1].value,1)} кг"> <defs><linearGradient id="gradWeight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bce69d" stop-opacity=".45"/><stop offset="100%" stop-color="#bce69d" stop-opacity="0"/></linearGradient></defs>${horiz}<line x1="${L}" y1="${y(s.goalWeight)}" x2="${W-R}" y2="${y(s.goalWeight)}" stroke="#e1b963" stroke-width="1.8" stroke-dasharray="7 6"/><path d="${area}" fill="url(#gradWeight)"/><path d="${path}" fill="none" stroke="#77b64a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>${circles}<text x="${L}" y="${H-12}" class="chart-label">${prettyDate(pts[0].date)}</text><text x="${W-R}" y="${H-12}" text-anchor="end" class="chart-label">${prettyDate(pts[pts.length-1].date)}</text><text x="${W-R-4}" y="${y(s.goalWeight)-8}" text-anchor="end" class="chart-label">Цель ${fmt(s.goalWeight,1)} кг</text></svg></div>`;
  }
  function renderProgress(){const e=estimation(),w=latestWeight(),loss=store.settings.startWeight-w,rows=weightEntries().reverse();return `${header('Ваш прогресс','Смотрите на тенденцию за недели, а не на колебания за один день.')}${summaryHero()}
    <div class="grid-2"><div class="card"><div class="card-label">Изменение от старта</div><div class="big-number ${loss>=0?'accent':'danger-text'}">${loss>0?'−':loss<0?'+':''}${fmt(Math.abs(loss),1)} <small>кг</small></div></div><div class="card"><div class="card-label">Расчётный темп</div><div class="big-number">${e.ready?fmt(e.actualRate,2):'—'} <small>кг/нед</small></div></div></div>
    <h2 class="section-title">График веса</h2><section class="card">${weightChart()}<p class="helper">Линия показывает только введённые взвешивания. Вес может меняться из-за воды, соли и других факторов.</p></section>
    <h2 class="section-title">Новое взвешивание</h2><section class="card"><form id="weight-form" class="form-grid"><div class="field"><label for="progress-date">Дата</label><input id="progress-date" name="date" type="date" min="2020-01-01" max="2100-12-31" value="${today()}" required></div><div class="field"><label for="progress-weight">Вес, кг</label><input id="progress-weight" name="weight" type="number" min="20" max="450" step="0.1" inputmode="decimal" placeholder="${fmt(w,1)}" required></div><div class="field full"><button type="submit" class="btn full">Сохранить измерение</button></div></form></section>
    <h2 class="section-title">История взвешиваний</h2><section class="card timeline">${rows.map(x=>`<div class="timeline-row"><span class="muted">${prettyDate(x.date)}</span><strong>${fmt(x.value,1)} кг</strong>${x.id==='start'&&x.date===store.settings.startDate?'<span class="pill">старт</span>':`<button type="button" class="delete-btn" data-delete-weight="${esc(x.date)}" aria-label="Удалить запись взвешивания">×</button>`}</div>`).join('')}</section>`;}
  function option(value,label,selected){return `<option value="${value}"${String(value)===String(selected)?' selected':''}>${esc(label)}</option>`}
  function renderPlan(){const s=store.settings,e=estimation();return `${header('Личный план','Параметры можно менять. Расчёт автоматически обновит ориентиры.')}
    <section class="card"><div class="row"><h3 class="card-title">Ваши данные</h3><span class="pill">редактируются</span></div><form id="profile-form" class="form-grid three">
    <div class="field"><label for="p-start">Стартовый вес, кг</label><input id="p-start" name="startWeight" type="number" min="20" max="450" step="0.1" value="${s.startWeight}" required></div>
    <div class="field"><label for="p-goal">Цель, кг</label><input id="p-goal" name="goalWeight" type="number" min="20" max="450" step="0.1" value="${s.goalWeight}" required></div>
    <div class="field"><label for="p-date">Дата старта</label><input id="p-date" name="startDate" type="date" min="2020-01-01" max="2100-12-31" value="${s.startDate}" required></div>
    <div class="field"><label for="p-height">Рост, см</label><input id="p-height" name="height" type="number" min="90" max="240" step="1" value="${s.height}" placeholder="например, 159"></div>
    <div class="field"><label for="p-age">Возраст, лет</label><input id="p-age" name="age" type="number" min="12" max="110" step="1" value="${s.age}" placeholder="например, 39"></div>
    <div class="field"><label for="p-sex">Параметр формулы</label><select id="p-sex" name="sex" required>${option('','Выберите',s.sex)}${option('female','Женский',s.sex)}${option('male','Мужской',s.sex)}</select></div>
    <div class="field full"><label for="p-activity">Обычная активность</label><select id="p-activity" name="activity">${option(1.2,'Низкая — в основном сидячий день',s.activity)}${option(1.375,'Лёгкая — прогулки, 1–3 тренировки в неделю',s.activity)}${option(1.55,'Средняя — 3–5 тренировок в неделю',s.activity)}${option(1.725,'Высокая — физическая работа или активные тренировки',s.activity)}</select></div>
    <div class="field"><label for="p-pace">Желаемый темп</label><select id="p-pace" name="pace">${option(.25,'0,25 кг/нед',s.pace)}${option(.4,'0,40 кг/нед',s.pace)}${option(.5,'0,50 кг/нед',s.pace)}${option(.65,'0,65 кг/нед',s.pace)}${option(.75,'0,75 кг/нед',s.pace)}</select></div>
    <div class="field"><label for="p-water">Ориентир воды, мл</label><input id="p-water" name="waterGoal" type="number" min="250" max="5000" step="50" value="${s.waterGoal}" required></div>
    <div class="field"><label for="p-steps">Ориентир шагов</label><input id="p-steps" name="stepsGoal" type="number" min="1000" max="30000" step="500" value="${s.stepsGoal}" required></div>
    <div class="field full"><button type="submit" class="btn full">Сохранить и пересчитать план</button></div></form><p class="helper">Параметр формулы нужен только для оценки обмена энергии по Mifflin–St Jeor. Эти расчёты являются приближенными. При беременности, кормлении грудью, заболеваниях или расстройствах пищевого поведения нужен индивидуальный план специалиста.</p></section>
    <h2 class="section-title">Ваши ориентиры</h2>${e.ready?`<div class="grid-2"><section class="card"><div class="card-label">На поддержание веса</div><div class="big-number">${fmt(e.maintain)} <small>ккал</small></div><p class="caption">Оценка TDEE с учётом обычной активности</p></section><section class="card"><div class="card-label">С учётом цели</div><div class="big-number accent">${fmt(e.target)} <small>ккал</small></div><p class="caption">Безопасно ограниченный расчётный дефицит</p></section><section class="card"><div class="card-label">Белок</div><div class="big-number">${fmt(e.protein)} <small>г/день</small></div><p class="caption">Около 1,3 г/кг текущего веса</p></section><section class="card"><div class="card-label">Жиры · углеводы</div><div class="big-number" style="font-size:24px">${fmt(e.fat)} · ${fmt(e.carbs)} <small>г</small></div><p class="caption">Ориентир, не строгие обязательства</p></section></div><div class="notice">${e.eta?'Примерный срок достижения цели: <strong>'+prettyDate(e.eta)+'</strong>.':'Нет расчётной даты достижения цели.'} Фактический темп около ${fmt(e.actualRate,2)} кг/нед может отличаться. ${e.atFloor?'Достигнут нижний ориентир калорий; дополнительное снижение без специалиста не предлагается.':''}</div>`:`<div class="notice notice-warn">${esc(e.reason)}</div>`}
    <h2 class="section-title">Рекомендации для вас</h2>${adviceCard(false)}
    <h2 class="section-title">Спросить ChatGPT</h2><section class="card"><h3 class="card-title">Персональная сводка</h3><p class="caption">Одним нажатием получите текст с вашим обезличенным дневником. Вставьте его в ChatGPT и попросите оценить питание и прогресс. Это не автоматическое подключение к ChatGPT.</p><button class="btn full" id="copy-summary">Скопировать сводку для GPT</button></section>
    <h2 class="section-title">Данные и приватность</h2><section class="card"><div class="btn-group"><button class="btn secondary" id="export-json">↓ Резервная копия JSON</button><button class="btn outline" id="export-csv">↓ Таблица CSV</button><button class="btn outline" id="import-json">↑ Восстановить данные</button></div><input id="import-file" type="file" accept=".json,application/json" hidden><p class="helper">Все записи находятся в памяти вашего браузера на этом устройстве. Очистка Safari или удаление данных сайта может их стереть. Регулярно сохраняйте резервную копию в «Файлы».</p><div class="thin-divider"></div><button class="btn small danger" id="reset-all">Удалить все данные</button></section>
    <h2 class="section-title">Научная основа</h2><section class="card sources"><div><strong>Mifflin–St Jeor</strong> — оценка основного обмена. Расчёт ориентиров, а не измерение обмена.</div><div><a href="https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html" target="_blank" rel="noopener noreferrer">CDC</a> — постепенное снижение веса, сон и активность.</div><div><a href="https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner" target="_blank" rel="noopener noreferrer">NIDDK / NIH</a> — персональное планирование веса.</div><div><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5819889/" target="_blank" rel="noopener noreferrer">AHA / ACC / TOS</a> — клинические рекомендации по управлению весом.</div><div><a href="https://medlineplus.gov/ency/article/002093.htm" target="_blank" rel="noopener noreferrer">MedlinePlus</a> — питание и нутриенты.</div><p class="helper">Никаких скрытых платежей, рекламы и сетевого обмена дневником. Приложение работает локально и не является медицинским изделием.</p></section>
    <div class="notice install-tip"><strong>Установка на iPhone:</strong> откройте опубликованный HTTPS-адрес в Safari → кнопка «Поделиться» → «На экран Домой». После первого открытия приложение доступно и без сети.</div>`;
  }
  function render(){const container=$('#screen');container.innerHTML=tab==='today'?renderToday():tab==='diary'?renderDiary():tab==='progress'?renderProgress():renderPlan();document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('is-active',el.dataset.tab===tab&&el.classList.contains('nav-item')))}
  function setTab(next){if(!['today','diary','progress','plan'].includes(next))return;tab=next;render();window.scrollTo({top:0,behavior:'instant'})}
  function asNumber(value,min,max){const n=cleanNum(value,NaN);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
  function saveWeight(date,value){if(!isDate(date)){flash('Неправильная дата');return}let idx=store.weights.findIndex(x=>x.date===date);const item={date,value,id:idx>=0?store.weights[idx].id:'entry'};if(idx>=0)store.weights[idx]=item;else store.weights.push(item);save();render();flash('Вес записан ✓')}
  function doExport(data,name,type='application/json'){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
  function quoteCsv(v){let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  function csvText(){const records=[['Тип','Дата','Название','Вес (кг)','Ккал','Белки (г)','Жиры (г)','Углеводы (г)','Клетчатка (г)','Вода (мл)','Шаги','Тренировка (мин)','Заметки']];for(const w of weightEntries())records.push(['вес',w.date,'',w.value,'','','','','','','','','']);for(const [date,d] of Object.entries(store.days).sort((a,b)=>a[0].localeCompare(b[0]))){records.push(['день',date,'','','','','','','',d.water,d.steps,d.exercise,d.notes]);for(const m of d.meals)records.push(['еда',date,m.name,'',m.kcal,m.protein,m.fat,m.carbs,m.fiber,'','','',''])}return '\ufeff'+records.map(line=>line.map(quoteCsv).join(';')).join('\r\n')}
  function gptSummary(){let s=store.settings,e=estimation(),end=weightEntries().slice(-10),dates=Object.keys(store.days).sort().slice(-7);let txt=`Проанализируй мой дневник как помощник по здоровым привычкам. Опирайся на CDC, NIDDK и доказательную диетологию. Не ставь диагноз и не предлагай экстремальные диеты. Дай 3–5 конкретных советов, укажи ограничения данных.\n\nСтартовый вес: ${s.startWeight} кг; текущий ${latestWeight()} кг; цель ${s.goalWeight} кг. Возраст: ${s.age||'не указан'}, рост: ${s.height||'не указан'} см, параметр формулы: ${s.sex==='female'?'женский':s.sex==='male'?'мужской':'не выбран'}, активность: ${s.activity}. Желаемый темп: ${s.pace} кг/нед.\nРасчётный калораж: ${e.ready?e.target+' ккал':'не определён (не хватает данных или есть противопоказания)'}; ориентир белка: ${e.ready?e.protein+' г':'не определён'}.\nИстория веса: ${end.map(x=>x.date+' — '+x.value+' кг').join('; ')}.\nПоследние записи:\n`;
    for(let date of dates){let d=getDay(date),t=totals(date);txt+=`${date}: ${t.kcal} ккал, белки ${fmt(t.protein,1)} г, жиры ${fmt(t.fat,1)} г, углеводы ${fmt(t.carbs,1)} г, клетчатка ${fmt(t.fiber,1)} г, вода ${d.water} мл, шаги ${d.steps}, тренировка ${d.exercise} мин. Продукты: ${d.meals.map(m=>m.name).join(', ')||'не записаны'}.\n`}
    return txt+'\nПредложи разумные изменения без категоричных запретов. Напомни, что данные самостоятельного учёта приблизительные.';
  }
  async function copyText(value){try{await navigator.clipboard.writeText(value);flash('Сводка скопирована. Вставьте её в ChatGPT.')}catch{const ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');flash('Сводка скопирована')}catch{window.prompt('Скопируйте сводку:',value)}ta.remove()}}
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-tab]');if(nav){setTab(nav.dataset.tab);return}
    const water=e.target.closest('[data-water]');if(water){const day=editableDay(water.dataset.date);day.water=clamp(day.water+Number(water.dataset.water),0,20000);save();render();return}
    const meal=e.target.closest('[data-delete-meal]');if(meal){if(!confirm('Удалить эту запись питания?'))return;const day=editableDay(meal.dataset.date);day.meals=day.meals.filter(m=>m.id!==meal.dataset.deleteMeal);save();render();flash('Запись удалена');return}
    const weight=e.target.closest('[data-delete-weight]');if(weight){if(!confirm('Удалить взвешивание за '+prettyDate(weight.dataset.deleteWeight)+'?'))return;store.weights=store.weights.filter(w=>w.date!==weight.dataset.deleteWeight);if(!store.weights.length)store.weights=[{date:store.settings.startDate,value:store.settings.startWeight,id:'start'}];save();render();flash('Запись удалена');return}
    if(e.target.closest('#use-preset')){
      const form=e.target.closest('#meal-form'); const index=Number(form?.querySelector('#preset-food')?.value); const selected=form?.querySelector('#preset-food')?.value; const grams=asNumber(form?.querySelector('#preset-grams')?.value,1,5000);
      if(selected===''||!FOODS[index]||grams===null){flash('Выберите продукт и количество');return}
      const item=FOODS[index],factor=grams/100;
      const values={name:item[0]+' — '+grams+' г',kcal:Math.round(item[1]*factor),protein:Number((item[2]*factor).toFixed(1)),fat:Number((item[3]*factor).toFixed(1)),carbs:Number((item[4]*factor).toFixed(1)),fiber:Number((item[5]*factor).toFixed(1))};
      for(const [name,value] of Object.entries(values))form.elements[name].value=value;
      flash('Значения подставлены — проверьте и добавьте');return;
    }
    if(e.target.closest('#copy-summary')){copyText(gptSummary());return}
    if(e.target.closest('#export-json')){doExport(JSON.stringify(store,null,2),'balans-backup-'+today()+'.json');flash('Резервная копия подготовлена');return}
    if(e.target.closest('#export-csv')){doExport(csvText(),'balans-diary-'+today()+'.csv','text/csv;charset=utf-8');flash('CSV подготовлен');return}
    if(e.target.closest('#import-json')){$('#import-file')?.click();return}
    if(e.target.closest('#reset-all')){if(confirm('Все записи веса и питания в этом браузере будут удалены. Продолжить?')&&confirm('Это действие нельзя отменить без резервной копии. Удалить?')){store=defaultData();save();setTab('today');flash('Данные сброшены')}return}
  });
  document.addEventListener('change',async e=>{
    if(e.target.id==='diary-date'){if(isDate(e.target.value)){selectedDay=e.target.value;render()}return}
    if(e.target.id==='import-file'){
      const file=e.target.files?.[0];if(!file)return;
      try{if(file.size>5_000_000)throw new Error('Файл слишком большой');const candidate=normalise(JSON.parse(await file.text()));if(!confirm('Заменить текущий дневник содержимым файла?'))return;store=candidate;save();render();flash('Данные восстановлены ✓')}catch(err){flash('Не удалось импортировать: '+err.message)}
    }
  });
  document.addEventListener('submit',e=>{
    const form=e.target;if(!(form instanceof HTMLFormElement))return;
    if(!['meal-form','activity-form','weight-form','profile-form','note-form'].includes(form.id))return;
    e.preventDefault();const v=new FormData(form);
    if(form.id==='meal-form'){
      const kcal=asNumber(v.get('kcal'),0,5000);const name=String(v.get('name')||'').trim().slice(0,120);if(!name||kcal===null){flash('Укажите блюдо и калории');return}
      const meal={id:(crypto.randomUUID?.()||Date.now()+'-'+Math.random()),name,kcal,protein:clamp(cleanNum(v.get('protein')),0,600),fat:clamp(cleanNum(v.get('fat')),0,600),carbs:clamp(cleanNum(v.get('carbs')),0,600),fiber:clamp(cleanNum(v.get('fiber')),0,200)};
      editableDay(form.dataset.date).meals.push(meal);save();render();flash('Блюдо добавлено ✓');return;
    }
    if(form.id==='activity-form'){
      const steps=asNumber(v.get('steps'),0,100000),exercise=asNumber(v.get('exercise'),0,1440);if(steps===null||exercise===null){flash('Проверьте шаги и минуты');return}
      const d=editableDay(form.dataset.date);d.steps=Math.round(steps);d.exercise=Math.round(exercise);save();render();flash('Активность сохранена');return;
    }
    if(form.id==='weight-form'){
      const weight=asNumber(v.get('weight'),20,450);const date=String(v.get('date')||form.dataset.date||today());if(weight===null){flash('Вес должен быть от 20 до 450 кг');return}saveWeight(date,weight);return;
    }
    if(form.id==='note-form'){editableDay(form.dataset.date).notes=String(v.get('notes')||'').slice(0,2000);save();flash('Заметка сохранена');return}
    if(form.id==='profile-form'){
      let startWeight=asNumber(v.get('startWeight'),20,450),goalWeight=asNumber(v.get('goalWeight'),20,450),height=v.get('height')?asNumber(v.get('height'),90,240):'',age=v.get('age')?asNumber(v.get('age'),12,110):'';
      if(startWeight===null||goalWeight===null||height===null||age===null||!isDate(v.get('startDate'))){flash('Проверьте вес, рост, возраст и дату');return}
      const oldStart=store.settings.startDate;const oldWeight=store.settings.startWeight;
      store.settings={startWeight,goalWeight,height,age,sex:['female','male'].includes(v.get('sex'))?v.get('sex'):'',activity:cleanNum(v.get('activity'),1.375),pace:cleanNum(v.get('pace'),.4),waterGoal:cleanNum(v.get('waterGoal'),2000),stepsGoal:cleanNum(v.get('stepsGoal'),7000),startDate:v.get('startDate')};
      const startEntry=store.weights.find(w=>w.id==='start'&&w.date===oldStart&&w.value===oldWeight);
      if(startEntry){startEntry.date=store.settings.startDate;startEntry.value=startWeight}
      else if(!store.weights.find(w=>w.date===store.settings.startDate))store.weights.push({id:'start',date:store.settings.startDate,value:startWeight});
      save();render();flash('План пересчитан ✓');return;
    }
  });
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  window.addEventListener('online',()=>{$('#connection-pill').textContent='Личный дневник'});
  window.addEventListener('offline',()=>{$('#connection-pill').textContent='Без интернета ✓'});
  if(!navigator.onLine)$('#connection-pill').textContent='Без интернета ✓';
  render();
})();
