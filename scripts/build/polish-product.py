"""Apply the local UI templates without touching databases or API settings."""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
p = root / 'web/v2.js'
s = p.read_text(encoding='utf-8')

def replace_function(name, body):
    global s
    a = s.index('function ' + name + '(')
    b = s.index('\nfunction ', a + 1)
    s = s[:a] + body.strip() + '\n' + s[b:]

replace_function('login', '''
function login(){$('#root').innerHTML=`<div class="login-shell"><section class="login-story">${brand}<span class="eyebrow">知安 · 专业情境学习</span><h1>把每一次判断，<br>练成安心的习惯。</h1><p>从你的专业出发，在图片与真实任务中学习。<br>一次十题，认真看见每一个细节。</p><div class="login-mascot">${sprite('xiaoping','quarter')}<span class="story-orbit orbit-one"></span><span class="story-orbit orbit-two"></span></div><div class="story-foot"><span>专业场景</span><span>图片交互</span><span>错题再练</span></div></section><section class="login"><div class="entry-switch"><a href="/student" class="${role==='student'?'active':''}">学生端</a><a href="/teacher" class="${role==='teacher'?'active':''}">教师端</a></div><span class="eyebrow">${role==='teacher'?'教学工作台':'开始我的学习'}</span><h1>${role==='teacher'?'欢迎回来，老师':'选好专业，开始练习'}</h1><p class="login-subtitle">${role==='teacher'?'管理专业题库，检查每一张学习卡。':'为你准备与专业任务相符的十道题。'}</p><form id="login-form">${role==='student'?'<label for="username">试用账号</label><select id="username" name="username">'+[1,2,3,4,5].map(n=>`<option value="student0${n}">试用学生 0${n}</option>`).join('')+'</select>'+(majors.length?'<label for="major">我的专业</label><select id="major" name="major" required><option value="">请选择专业</option>'+majors.map(m=>`<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('')+'</select>':''):''}<label for="password">登录密码</label><input id="password" name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required><button class="btn" type="submit">${role==='teacher'?'进入教师工作台':'进入我的学习'} <span aria-hidden="true">↗</span></button><p id="login-error" class="mini-error" role="alert"></p></form><p class="setting-note login-demo">本地试用密码：123456</p><a class="back-entry" href="/">← 返回首页</a></section></div>`;}
''')
replace_function('studentHome', '''
function studentHome(){const active=home.runs.find(r=>r.status==='active'),ready=!home.major||home.available>=10,finished=home.runs.filter(r=>r.status==='submitted').length,course=home.curriculum;return `<div class="learning-greeting"><div><p class="eyebrow">我的专业学习空间</p><h1>今天，和交小安一起进步。</h1></div><span class="student-id">${esc(home.username||'')} · ${esc(home.major||'校园安全')}</span></div><section class="student-hero"><div class="hero-text"><span class="badge">${esc(home.major||'校园安全')} · 专业情境练习</span><h1>看清场景，<br>做出你的判断。</h1><div class="actions">${button(home.major?'随机开始10题 →':'开始练习 →','start','',ready&&home.available?'':'disabled')}${active?`<button class="btn secondary" data-resume="${active.id}">继续上次</button>`:''}</div><p class="hero-footnote">每组 ${home.settings.batchSize} 题 · ${home.settings.feedback==='batch'?'提交后查看答案与解析':'逐题查看答案与解析'}</p></div><div class="hero-art" aria-hidden="true">${sprite(home.settings.characterId,'quarter')}<span class="art-label">学习，从看见细节开始。</span></div></section><div class="learning-stats"><div><span class="stat-index">01</span><strong>${home.available}</strong><span>本专业正式题</span></div><div><span class="stat-index">02</span><strong>${home.coverage||0}</strong><span>交互题型</span></div><div><span class="stat-index">03</span><strong>${finished}</strong><span>已完成练习组</span></div></div>${home.major&&!ready?'<section class="panel"><h2>题库暂未开放</h2><p>本专业正式题库尚未准备好，开放后即可开始10题练习。</p></section>':''}<div class="learning-shortcuts"><button class="learning-link" data-action="wrong" ${home.available?'':'disabled'}><span class="shortcut-icon">↻</span><span><strong>错题再练</strong><small>把没掌握的细节，再看一次。</small></span><span class="shortcut-arrow">↗</span></button><button class="learning-link" data-page="history"><span class="shortcut-icon">▤</span><span><strong>学习记录</strong><small>回看作答结果与每次练习。</small></span><span class="shortcut-arrow">↗</span></button></div>`;}
''')
if 'function teacherOverview(' not in s:
    a = s.index('function library()')
    s = s[:a] + '''function teacherOverview(rows){const published=rows.filter(q=>q.status==='published'),coverage=new Set(published.map(q=>q.candidate?.route).filter(Boolean)).size;return `<section class="teacher-banner"><div><p class="eyebrow">教师工作台</p><h2>让内容有质量，让管理有条理。</h2><p>${esc(bankMajorFilter||'全部专业')} · 查看题目、画面与判断依据。</p></div><div class="teacher-counts"><div><strong>${published.length}</strong><span>当前正式题</span></div><div><strong>${coverage}</strong><span>交互题型</span></div></div></section>`;}
''' + s[a:]
s = s.replace("return title('学习卡片'", "return teacherOverview(rows)+title('学习卡片'")
a = s.index('function quizPage()')
b = s.index('\nfunction ', a + 1)
part = s[a:b].replace('</span></div><section class="quiz-card">', '</span></div><div class="quiz-progress" role="progressbar" aria-label="本组保存进度" aria-valuenow="${Object.keys(run.selections).length}" aria-valuemin="0" aria-valuemax="${run.cards.length}"><span style="width:${Object.keys(run.selections).length/run.cards.length*100}%"></span></div><section class="quiz-card">')
s = s[:a] + part + s[b:]
p.write_text(s, encoding='utf-8')
for file in ['web/index.html', 'web/business-review.html']:
    p = root / file
    s = p.read_text(encoding='utf-8')
    if 'product-theme.css' not in s:
        s = s.replace('</head>', '<link rel="stylesheet" href="/product-theme.css"></head>')
    p.write_text(s, encoding='utf-8')
print('Updated login, student home, teacher overview and shared theme.')
