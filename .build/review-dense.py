from pathlib import Path
import hashlib,json,math,posixpath,re,sys,zipfile
import xml.etree.ElementTree as E
from PIL import Image, ImageDraw, ImageFont
from preview_font import preview_font

ROOT=Path(__file__).resolve().parents[1]
rev=sys.argv[1] if len(sys.argv)>1 else 'd1'
DIR=ROOT/'.build'/('roman-structure-'+rev)
content=json.loads((DIR/'content.json').read_text(encoding='utf-8'))
data=json.loads((ROOT/'.build'/'dense-charts.json').read_text(encoding='utf-8'))
file=next((DIR/'deliverable').glob('*.pptx'))
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','c':'http://schemas.openxmlformats.org/drawingml/2006/chart','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
rel_ns='{http://schemas.openxmlformats.org/package/2006/relationships}'
per=[];chart_values={};backgrounds={}
expected={9:['investment'],10:['debt','consumption'],11:['exports','balance'],21:['renewables'],24:['ai_productivity'],25:['energy'],26:['labor_scenario']}
with zipfile.ZipFile(file) as z:
    assert z.testzip() is None
    slides=[n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)]
    notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml',n)]
    assert len(slides)==len(notes)==36
    for i,d in enumerate(content['slides'],1):
        e=E.fromstring(z.read(f'ppt/slides/slide{i}.xml'))
        txt='\n'.join(t.text or '' for t in e.findall('.//a:t',ns))
        note='\n'.join(t.text or '' for t in E.fromstring(z.read(f'ppt/notesSlides/notesSlide{i}.xml')).findall('.//a:t',ns))
        assert txt.strip()
        assert not any(bad in txt for bad in ['本页重点','下一步修改','TODO','制作备注'])
        for k in d['refs']:
            for u in content['sources'][k]['urls']:assert u in note,(i,k,u)
        bg=e.find('./p:cSld/p:bg/p:bgPr/a:solidFill/a:srgbClr',ns)
        if bg is not None:backgrounds[i]=bg.get('val')
        charts=e.findall('.//c:chart',ns)
        assert len(charts)==len(expected.get(i,[])),(i,len(charts))
        if charts:
            relationships=E.fromstring(z.read(f'ppt/slides/_rels/slide{i}.xml.rels'))
            rels={r.get('Id'):r.get('Target') for r in relationships.findall(rel_ns+'Relationship')}
            for chart,key in zip(charts,expected[i]):
                ref=chart.get('{'+ns['r']+'}id')
                loc=posixpath.normpath(posixpath.join('ppt/slides',rels[ref])).lstrip('/')
                ce=E.fromstring(z.read(loc));series=ce.findall('.//c:ser',ns)
                ser=series[-1]
                parent=ser.find('c:yVal',ns)
                if parent is None:parent=ser.find('c:val',ns)
                vals=[float(v.text) for v in parent.findall('.//c:pt/c:v',ns)]
                want=[485,950] if key=='energy' else data[key]['series'][-1]['values'] if key=='renewables' else data[key]['values']
                assert len(vals)==len(want) and all(math.isclose(a,b,abs_tol=1e-6) for a,b in zip(vals,want)),(i,key,vals,want)
                if key=='renewables':
                    first=series[0].find('c:val',ns)
                    initial=[float(v.text) for v in first.findall('.//c:pt/c:v',ns)]
                    assert initial==data[key]['series'][0]['values']
                chart_values[key]={'count':len(vals),'verified_against_saved_data':True,'series_count':len(series)}
        per.append({'page':i,'kind':d['kind'],'layout':d['layout'],'text_characters':len(txt),'connectors':len(e.findall('.//p:cxnSp',ns)),'native_charts':len(charts),'tables':len(e.findall('.//a:tbl',ns))})
assert [d['page'] for d in content['slides'] if d['kind']=='divider']==[2,8,13,19,23,29]
assert all(v=='121110' for k,v in backgrounds.items() if content['slides'][k-1]['kind']=='divider'),backgrounds
assert all(v=='F6F0E5' for k,v in backgrounds.items() if content['slides'][k-1]['kind']!='divider'),backgrounds
assert abs(sum(d['minutes'] for d in content['slides'])-30)<1e-8
validation=json.loads((DIR/'validation.json').read_text(encoding='utf-8'))
assert validation['packageIntegrity']['finding_count']==0
assert validation['presentationLayout']['finding_count']==0
assert validation['firstPartyImport']['passed']
assert not json.loads((DIR/'text-fit-warnings.json').read_text(encoding='utf-8'))
font=preview_font(20)
for group,start in enumerate(range(1,37,6),1):
    board=Image.new('RGB',(1280,1140),'#ded4c5');dr=ImageDraw.Draw(board)
    for j,n in enumerate(range(start,min(start+6,37))):
        im=Image.open(DIR/'预览'/f'slide-{n:02d}.png').convert('RGB');assert im.size==(1280,720)
        im=im.resize((640,360),Image.Resampling.LANCZOS);x=j%2*640;y=j//2*380
        board.paste(im,(x,y));dr.text((x+8,y+360),str(n),font=font,fill='#302A24')
    board.save(DIR/f'review-{group}.jpg',quality=95)
overview=Image.new('RGB',(1920,1524),'#ded4c5');dr=ImageDraw.Draw(overview)
for j in range(36):
    im=Image.open(DIR/'预览'/f'slide-{j+1:02d}.png').convert('RGB').resize((320,180),Image.Resampling.LANCZOS)
    x=j%6*320;y=j//6*254;overview.paste(im,(x,y));dr.text((x+8,y+187),str(j+1),font=font,fill='#302A24')
overview.save(DIR/'全页预览.jpg',quality=95)
report={'file':str(file),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'slide_count':36,'body_slides':26,'divider_slides':6,'cover_slides':1,'appendices':3,'minutes':30,'sources_in_notes':True,'native_chart_count':sum(d['native_charts'] for d in per),'native_chart_data':chart_values,'native_connectors':sum(d['connectors'] for d in per),'tables':sum(d['tables'] for d in per),'text_fit_estimate_warnings':0,'body_pages_light':True,'package_validation':'pass','first_party_import':'pass','native_powerpoint_tested':False,'per_slide':per}
(DIR/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='per_slide'},ensure_ascii=False,indent=2))
