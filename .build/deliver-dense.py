from pathlib import Path
import hashlib,json,shutil,sys,zipfile
import xml.etree.ElementTree as E
from PIL import Image,ImageDraw,ImageFont
from preview_font import preview_font

ROOT=Path(__file__).resolve().parents[1]
rev=sys.argv[1] if len(sys.argv)>1 else 'd1'
DIR=ROOT/'.build'/('roman-structure-'+rev)
audit=json.loads((DIR/'audit.json').read_text(encoding='utf-8'))
review=json.loads((DIR/'visual-review.json').read_text(encoding='utf-8'))
assert review['passed'] and review['sha256']==audit['sha256']
d=json.loads((DIR/'content.json').read_text(encoding='utf-8'))
src=Path(audit['file']);assert hashlib.sha256(src.read_bytes()).hexdigest()==audit['sha256']
out=ROOT/'成品';out.mkdir(exist_ok=True)
target=out/src.name;shutil.copy2(src,target)
assert hashlib.sha256(target.read_bytes()).hexdigest()==audit['sha256']
previews=out/'信息深化预览';previews.mkdir(exist_ok=True)
for page in range(1,37):shutil.copy2(DIR/'预览'/f'slide-{page:02d}.png',previews/f'slide-{page:02d}.png')
shutil.copy2(DIR/'全页预览.jpg',out/'信息深化-全页预览.jpg')
font=preview_font(20)
board=Image.new('RGB',(1280,1140),'#ded4c5');dr=ImageDraw.Draw(board)
for i,n in enumerate([3,15,16,21,26,31]):
    im=Image.open(previews/f'slide-{n:02d}.png').convert('RGB').resize((640,360),Image.Resampling.LANCZOS)
    x=i%2*640;y=i//2*380;board.paste(im,(x,y));dr.text((x+8,y+360),str(n),font=font,fill='#302A24')
board.save(out/'信息深化-重点页面.jpg',quality=95)
geometry=json.loads((DIR/'text-geometry.json').read_text(encoding='utf-8'))
headings={r['page']:r['text'] for r in geometry if r['name']=='slide-heading'}
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(target) as z:
    for s in d['slides']:
        s['display_title']=headings[s['page']]
        s['screen_text']='\n'.join(x.text or '' for x in E.fromstring(z.read(f"ppt/slides/slide{s['page']}.xml")).findall('.//a:t',ns))
d.update(presentation_file=str(target),presentation_revision='2026-10-13 '+d.get('presentation_revision','信息深化与图形重绘版'),build_entry='.build/dense-layout.mjs',pages_entry='.build/logic-pages.mjs + .build/dense-pages.mjs + .build/restructure-pages.mjs + .build/information-pages.mjs',data_file='.build/dense-charts.json')
d['outline']=d.get('outline','基本矛盾 → 投资、消费、出口的应对 → 技术扩大剩余价值 → 韦伯的组织解释 → 新技术与AI的作用 → UBI与公有AI的制度回应')
(ROOT/'内容与来源.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
intro='共36页：封面1页、黑色章节页6页、浅色正文26页、浅色附录3页。按约30分钟编排；附录不计入主讲。保留古罗马斗兽场主题。'
outline=['# 科学技术与资本主义基本矛盾：当前PPT提纲\n',intro+'\n','论证主线：**'+d['outline']+'**\n',f'[当前PPT]({target.as_posix()})\n','中心判断：科技扩大生产与协作能力；收入分配、劳动制度和生产条件的控制权，决定新增能力怎样影响资本主义基本矛盾。\n']
speech=['# 信息深化与图形重绘版：逐页讲稿\n',intro+'\n']
scheme=['# 信息深化与图形重绘版：逐页内容与版式\n',intro+'\n']
for s in d['slides']:
    title=s['display_title'].replace('\n','')
    mins=s['minutes'];timing=f'{mins:g}分钟' if mins else '讨论时查阅'
    if s['kind']=='divider':
        outline.extend([f"## {s['section']}\n",f"第{s['page']}页为黑色章节页：{title}。\n",'本节逻辑：'+s.get('logic_text',' → '.join(s['chain']))+'\n'])
        if s.get('bridge'):outline.append('章节衔接：'+s['bridge']+'\n')
    elif s['kind']=='appendix':
        outline.extend([f"### 第{s['page']}页 · {s['section']}：{title}\n",s['notes']+'\n'])
    else:
        outline.extend([f"### 第{s['page']}页　{title}（{timing}）\n",s['notes']+'\n'])
    speech.extend([f"## {s['page']:02d}　{title}\n",f"类型：{s['kind']}；建议讲述：{timing}。\n",s['notes']+'\n','参考资料：\n'])
    speech.extend(f"- [{k}] {d['sources'][k]['text']}\n" for k in s['refs'])
    scheme.extend([f"## {s['page']:02d}　{title}\n",f"版式：{s['layout']}；建议讲述：{timing}。\n",s['screen_text']+'\n'])
(ROOT/'汇报提纲-每页一个重点.md').write_text('\n'.join(outline),encoding='utf-8')
(ROOT/'共用讲稿.md').write_text('\n'.join(speech),encoding='utf-8')
(ROOT/'逐页内容方案.md').write_text('\n'.join(scheme),encoding='utf-8')
if d.get('logic_revision'):
    logic=['# 论证逻辑与章节衔接\n','主线：'+d['outline']+'\n','中心判断：技术扩大生产能力，收入分配、劳动安排与资源控制影响新增能力能否转为普遍受益。下列箭头表示有条件的传导；并行途径在PPT中分支呈现。\n']
    for c in d['logic_revision']['chapters']:
        logic.extend([f"## 第{c['page']}页：{c['title']}\n",c['logic_text']+'\n','推理条件：'+c['clarification']+'\n','章节衔接：'+c['bridge']+'\n'])
    logic.append('## 回答主题\n\n降本收益经由价格、收入、工时和公共供给向社会传递时，具体冲突可以缓和；新增收益和控制权集中、劳动收入损失未获补偿且能力接入受限时，需求压力与依附关系可能加深。两类效应可以同时存在。生活改善、劳动受益与共同决定权是并列的检验标准，不能把收入补贴或模型开放直接等同于占有关系改变。\n')
    (ROOT/'论证逻辑与章节衔接.md').write_text('\n'.join(logic),encoding='utf-8')
refs=['# 参考资料：信息深化与图形重绘版\n','图表使用世界银行、美联储、BEA、IRENA和客服AI研究；原始下载与作图CSV保存在“资料/重排数据-20261013”。B站转写稿仍为观点材料，专名和直接引文需要回听核对。\n']
for prefix,label in [('R','理论、研究和官方数据'),('V','B站文字稿'),('Z','讨论材料')]:
    refs.append('## '+label+'\n')
    for k in sorted((k for k in d['sources'] if k.startswith(prefix)),key=lambda k:int(k[1:])):
        pages=[str(s['page']) for s in d['slides'] if k in s['refs']]
        refs.append(f"- [{k}] {d['sources'][k]['text']}\n  当前引用页：{'、'.join(pages) if pages else '背景材料'}。\n")
(ROOT/'参考资料-信息深化与图形重绘版.md').write_text('\n'.join(refs),encoding='utf-8')
data_note='''# 新增图表的数据与计算

核验日期：2026-10-13。原始JSON/CSV和作图CSV均保存在本目录。

- 苹果：iPhone 14 Pro Max 128GB美国毫米波型号，Apple 2022年发布税前起售价1099美元；Counterpoint 2023年估计物料成本最高约474美元。差额625美元为计算余项，包含其他成本与利润，不能当作净利润。未把不同型号的混合物料份额套入本机型。
- investment-plotted.csv：美国全社会固定资本形成，2000—2024，万亿美元、2015年不变价；原始值除以10^12。包括私人和政府，不含存货、金融资产交易。危机标记为事件年份，并非额外观测序列。
- debt-plotted.csv：美联储TDSP季度数据，2007Q1—2012Q4；债务偿付额占可支配收入的百分比。使用2024年新方法的回溯序列。
- consumption-plotted.csv：BEA实际PCE月度数据取季度平均，再除以2007Q4均值乘100。与债务图采用相同季度范围；避免名义价格变化影响比较。
- exports-plotted.csv：全球货物与服务出口，2000—2024，万亿美元、2015年不变价。包含服务，不使用WTO仅货物贸易量的口径解释这条曲线。
- balance-plotted.csv：中国、德国、美国2024年货物与服务差额/GDP。各国GDP分母不同，比例不能直接相加；也不是经常账户余额。
- 图表显示历史变化与机制相容性，不以简单时间先后或共同变化代替政策因果识别。

Counterpoint关于iPhone 15的文件为筛选资料；正式PPT采用可直接核验价格与物料口径的iPhone 14案例，未把筛选中的502美元用于正文。
'''
(ROOT/'资料'/'重排数据-20261013'/'数据口径与计算.md').write_text(data_note,encoding='utf-8')
audit.update(delivered_path=str(target),preview_path=str(out/'信息深化-重点页面.jpg'),visual_review=review,source_count=len(d['sources']))
(DIR/'delivery.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
receipt=f'''# 信息深化与图形重绘版验收

- {intro}
- 六节依次为：基本矛盾、三条应对路径、技术增殖与韦伯、技术对三条路径的影响、AI与劳动控制、UBI与公有AI。
- 正式提问置于第一节末；21个正文及附录页面补充信息、缩小字号并重绘机制图。
- 6个黑色章节页含本节逻辑链和全局主线；使用原横向斗兽场拱廊，以PPT图片翻转功能移至上沿，右侧颜色更清晰。正文与附录均为浅色，封面保持原设计。
- 六节导图区分条件因果、并行路径与理论互补；第7、12、18、22、28页补足章节衔接，第33页以两条有条件的传导路径回答主题。全局导航与六节一一对应。
- 苹果具体型号、售价、物料估计及差额含义已注明；未将差额冒充净利润。
- 9个原生图表（本次新增能源成本、客服提效与工时情景3图），25年投资和出口序列、季度消费和偿债数据已逐值核对；原始数据与计算结果保存。
- 36页全部渲染；分页缩略图逐页查看，新增复杂页面及修订页面按原尺寸检查。具体记录见visual-review.json。
- PPT包结构、重新导入与几何检查通过，文字高度估计没有溢出；未进行原生PowerPoint播放测试。
- 共{len(d['sources'])}项资料；逐页备注、提纲、讲稿及来源文档同步到新页码。
- 旧成品保留；共享提纲等的修改前备份在“制作/信息深化前-20261013”。

SHA256：{audit['sha256']}
'''
(ROOT/'制作').mkdir(exist_ok=True)
(ROOT/'制作'/'信息深化与图形重绘验收-20261013.md').write_text(receipt,encoding='utf-8')
print(json.dumps({k:audit[k] for k in ['delivered_path','slide_count','minutes','native_chart_count','source_count','sha256','preview_path']},ensure_ascii=False,indent=2))
