const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const keys = {
  shared: [
    {id:'shared-ab', label:'SHARED KEY', owner:'AliceとBobが共有', note:'2人だけが所持'},
    {id:'alice-only', label:'PRIVATE KEY', owner:'Aliceの秘密鍵', note:'Alice本人だけが所持'},
    {id:'public-eve', label:'PUBLIC KEY', owner:'Eveの公開鍵', note:'誰でも利用可能'}
  ],
  public: [
    {id:'alice-public', label:'PUBLIC KEY', owner:'Aliceの公開鍵', note:'誰でも利用可能'},
    {id:'alice-private', label:'PRIVATE KEY', owner:'Aliceの秘密鍵', note:'Alice本人だけが所持'},
    {id:'bob-public', label:'PUBLIC KEY', owner:'Bobの公開鍵', note:'誰でも利用可能'},
    {id:'bob-private', label:'PRIVATE KEY', owner:'Bobの秘密鍵', note:'Bob本人だけが所持'}
  ]
};

function keyButton(key, handler){
  const button=document.createElement('button');
  button.className='key-card'; button.dataset.key=key.id;
  button.innerHTML=`<span class="icon" aria-hidden="true">🔑</span><b>${key.label}</b><strong>${key.owner}</strong><span>${key.note}</span>`;
  button.addEventListener('click',()=>handler(key,button)); return button;
}

function showStage(id){
  $$('.stage').forEach(s=>s.classList.toggle('active',s.id===id));
  $$('.stage-tab').forEach(b=>{const active=b.dataset.stage===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',active)});
}
$$('.stage-tab').forEach(b=>b.addEventListener('click',()=>showStage(b.dataset.stage)));

keys.shared.forEach(key=>$('#shared-keys').append(keyButton(key,(selected,button)=>{
  $$('#shared-keys .key-card').forEach(b=>b.classList.remove('correct','wrong'));
  const log=$('#shared-log');
  if(selected.id==='shared-ab'){
    button.classList.add('correct'); $('#shared-packet').textContent='7f 2a 91 c4 …（暗号文）'; $('#shared-eve').textContent='暗号文は見えるが，共通鍵がないので読めない！';
    log.className='log success'; log.innerHTML='<strong>通信成功！</strong><ol><li>AliceとBobが事前に同じ共通鍵を共有</li><li>Aliceが共通鍵で暗号化</li><li>Bobが同じ共通鍵で復号</li></ol><b>注意：</b>共通鍵を安全に渡す方法が別に必要です．';
  }else{
    button.classList.add('wrong'); $('#shared-packet').textContent='送信できません';
    log.className='log error'; log.innerHTML=selected.id==='alice-only'?'<strong>その鍵はBobが持っていません．</strong><br>同じ鍵で復号する共通鍵暗号では，AliceとBobが共有する鍵が必要です．':'<strong>Eveも秘密鍵を持っています．</strong><br>Eve宛ての通信になり，AliceとBobだけの秘密を守れません．';
  }
})));

let direction='alice-bob';
function renderPublicKeys(){
  const box=$('#public-keys'); box.innerHTML='';
  keys.public.forEach(key=>box.append(keyButton(key,judgePublic)));
}
function setDirection(next){
  direction=next; const forward=next==='alice-bob';
  $$('.direction-switch button').forEach(b=>b.classList.toggle('active',b.dataset.direction===next));
  $('#alice-role').textContent=forward?'送信者':'受信者'; $('#bob-role').textContent=forward?'受信者':'送信者';
  $('#public-message').textContent=forward?'「テストの範囲は3章」':'「了解，確認します」'; $('#public-arrow').textContent=forward?'──────▶':'◀──────';
  $('#key-question').textContent=`${forward?'Alice':'Bob'}が暗号化に使う鍵は？`;
  $('#public-log').className='log'; $('#public-log').textContent='4本の鍵から1本を選んでください．';
  $('#crypto-flow').innerHTML='<span>鍵を選んで通信開始</span>'; $('#public-eve').textContent='暗号文なら盗み見できるかも？'; renderPublicKeys();
}
function judgePublic(key,button){
  $$('#public-keys .key-card').forEach(b=>b.classList.remove('correct','wrong'));
  const receiver=direction==='alice-bob'?'Bob':'Alice'; const sender=direction==='alice-bob'?'Alice':'Bob';
  const correct=direction==='alice-bob'?'bob-public':'alice-public'; const log=$('#public-log');
  if(key.id===correct){
    button.classList.add('correct'); log.className='log success';
    log.innerHTML=`<strong>通信成功！</strong><ol><li>${sender}が${receiver}の公開鍵で暗号化</li><li>暗号文を送信</li><li>${receiver}が自分の秘密鍵で復号</li></ol>公開鍵は公開してよく，対応する秘密鍵は本人だけが保持します．`;
    $('#crypto-flow').innerHTML=`<span>🔑 ${receiver}の公開鍵</span><span>暗号化</span><span>▧ 暗号文</span><span>🔑 ${receiver}の秘密鍵</span><span>復号成功</span>`;
    $('#public-eve').textContent='暗号文は盗聴できた．でも秘密鍵がないので復号できない！';
  }else{
    button.classList.add('wrong'); log.className='log error';
    if(key.label==='PRIVATE KEY' && !key.owner.startsWith(sender)) log.innerHTML=`<strong>他人の秘密鍵は使えません．</strong><br>${key.owner}は，本人だけが所持します．${sender}が自由に入手して使える鍵ではありません．`;
    else if(key.label==='PRIVATE KEY') log.innerHTML=`<strong>送信者の秘密鍵で暗号化するミッションではありません．</strong><br>秘密鍵を使うデジタル署名は，次のステージで目的を分けて学びます．`;
    else log.innerHTML=`<strong>受信者ではなく送信者の公開鍵です．</strong><br>${receiver}だけが読めるようにするには，${receiver}の公開鍵を選びます．`;
    $('#crypto-flow').innerHTML='<span>鍵の選択を見直そう</span>';
  }
}
$$('.direction-switch button').forEach(b=>b.addEventListener('click',()=>setDirection(b.dataset.direction)));
setDirection('alice-bob');

async function sha256(text){
  if(crypto?.subtle){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  let h=2166136261; for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)} return `教材用代替値-${(h>>>0).toString(16).padStart(8,'0')}`;
}
let signedHash='';
$('#sign-button').addEventListener('click',async()=>{
  const message=$('#sign-message').value.trim(); if(!message)return;
  signedHash=await sha256(message); $('#received-message').value=message; $('#received-message').disabled=false;
  const items=$$('#signature-flow li'); items.forEach(i=>i.classList.add('done'));
  items[0].querySelector('small').textContent=message; items[1].querySelector('small').textContent=signedHash.slice(0,18)+'…';
  items[2].querySelector('small').textContent='署名データを作成'; items[3].querySelector('small').textContent='ハッシュ一致 ✓';
  $('#tamper-button').disabled=false; $('#verify-button').disabled=false;
  $('#signature-result').className='log success'; $('#signature-result').innerHTML='<strong>署名の検証に成功しました．</strong><br>Aliceの公開鍵で検証できたため，Aliceの秘密鍵を持つ本人が作成し，内容も変わっていないと確認できます．';
});
$('#tamper-button').addEventListener('click',()=>{$('#received-message').value=$('#received-message').value.replace('10時','11時');$('#signature-result').className='log';$('#signature-result').textContent='Eveがメッセージを書き換えました．Bobが再検証してください．'});
$('#verify-button').addEventListener('click',async()=>{
  const receivedHash=await sha256($('#received-message').value); const ok=receivedHash===signedHash; const result=$('#signature-result'); result.className=`log ${ok?'success':'error'}`;
  result.innerHTML=ok?'<strong>検証成功：ハッシュが一致しました．</strong><br>メッセージは署名後に変わっていません．':`<strong>検証失敗：改ざんを検出しました．</strong><br>署名時：${signedHash.slice(0,16)}…<br>受信時：${receivedHash.slice(0,16)}…<br>1文字でも変わるとハッシュ値が変わるため，署名と一致しません．`;
  const last=$$('#signature-flow li')[3]; last.classList.toggle('done',ok); last.querySelector('small').textContent=ok?'ハッシュ一致 ✓':'ハッシュ不一致 ✕';
});
