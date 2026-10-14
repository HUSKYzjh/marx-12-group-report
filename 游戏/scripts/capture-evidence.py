"""Read source PDFs, render identified title regions, retain provenance. No PDF is edited."""
from pathlib import Path
import json, hashlib
import pdfplumber

root=Path(__file__).resolve().parents[1]
research=root.parent/'科技与资本主义基本矛盾研究'/'深化研究'
items=[
 ('ai-paper',root/'tmp/pdfs/AI_at_work_arxiv_v2.pdf',(100,100,510,244),'https://arxiv.org/pdf/2304.11771v2','PDF第1页，标题、作者与机构；2024年作者稿，非2025年期刊版截图'),
 ('cloud-report',research/'原始证据/CMA_2025_final_summary.pdf',(75,48,550,316),'https://assets.publishing.service.gov.uk/media/688b20e6ff8c05468cb7b120/summary_of_final_decision.pdf','PDF第1页，2025-07-31最终决定摘要封面'),
 ('board-paper',research/'制度机制原始证据/Boardroom_QJE_final.pdf',(150,85,462,264),'https://eml.berkeley.edu/~schoefer/schoefer_files/Labor_in_the_Boardroom_Final_QJE_Forthcoming.pdf','PDF第1页，标题、作者、2020-10-20稿件日期；研究2021年正式发表'),
]
manifest=[]
for name,source,box,url,note in items:
 with pdfplumber.open(source) as pdf:
  page=pdf.pages[0]
  # Full-page inspection image is separate from the deliberately bounded public excerpt.
  page.to_image(resolution=100).save(root/'tmp/pdfs'/f'{name}-page1.png',format='PNG')
  page.crop(box).to_image(resolution=160).save(root/'public/evidence'/f'{name}.png',format='PNG')
 manifest.append(dict(file=f'{name}.png',source_url=url,source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),pdf_page=1,crop_points=box,note=note))
 print(name,source.name,box)
(root/'public/evidence/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
