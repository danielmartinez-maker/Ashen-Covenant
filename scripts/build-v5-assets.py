from PIL import Image, ImageEnhance, ImageFilter, ImageChops, ImageDraw
from pathlib import Path
import math, wave, struct, random

ROOT=Path(__file__).resolve().parents[1]
AS=ROOT/'public'/'assets'
CELL=192
FRAMES=8
CLASSES=['ironbound','thornseer','warden','veilrunner','gravebinder','dawnstrider']
STATES=['idle','run','attack1','attack2','attack3','cast','dodge','hit','death','ultimate']
DIRECTIONS=8
SRC_ANGLES=[math.pi*.25, math.pi*.75, -math.pi*.25, -math.pi*.75]
TARGET_ANGLES=[0, math.pi*.25, math.pi*.5, math.pi*.75, math.pi, -math.pi*.75, -math.pi*.5, -math.pi*.25]

def contain(im, size=CELL):
    bb=im.getbbox()
    if not bb: return Image.new('RGBA',(size,size))
    crop=im.crop(bb)
    scale=min((size-12)/crop.width,(size-12)/crop.height)
    crop=crop.resize((max(1,int(crop.width*scale)),max(1,int(crop.height*scale))),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',(size,size))
    out.alpha_composite(crop,((size-crop.width)//2,(size-crop.height)//2))
    return out

def affine_frame(base,state,f):
    t=f/(FRAMES-1)
    phase=math.sin(t*math.pi*2)
    x=y=rot=0; sx=sy=1
    if state=='idle':
        y=-1.8*math.sin(t*math.pi*2); sx=1+0.006*phase; sy=1-0.006*phase
    elif state=='run':
        y=-4*abs(math.sin(t*math.pi*2)); rot=2.2*phase; sx=1+0.025*abs(phase); sy=1-0.018*abs(phase); x=2.0*phase
    elif state.startswith('attack'):
        combo=int(state[-1]); impact={1:.48,2:.55,3:.62}[combo]
        if t<impact:
            q=t/impact; x=(-4+combo)*math.sin(q*math.pi); rot=(-5-combo*1.5)*(1-q)+ (8+combo*2)*q; sx=1+.03*q; sy=1-.02*q
        else:
            q=(t-impact)/(1-impact); x=(9+combo*3)*(1-q); rot=(11+combo*3)*(1-q); sx=1+.06*(1-q); sy=1-.035*(1-q)
    elif state=='cast':
        y=-5*math.sin(t*math.pi); sx=1+.035*math.sin(t*math.pi); sy=1+.02*math.sin(t*math.pi); rot=2.5*math.sin(t*math.pi*2)
    elif state=='dodge':
        x=14*math.sin(t*math.pi); y=-3*math.sin(t*math.pi); rot=-7*math.sin(t*math.pi); sx=1+.12*math.sin(t*math.pi); sy=1-.12*math.sin(t*math.pi)
    elif state=='hit':
        x=-9*math.sin(t*math.pi); rot=-10*math.sin(t*math.pi); sx=1+.03*math.sin(t*math.pi); sy=1-.05*math.sin(t*math.pi)
    elif state=='death':
        q=t*t*(3-2*t); x=10*q; y=18*q; rot=74*q; sx=1+.08*q; sy=1-.28*q
    elif state=='ultimate':
        y=-7*math.sin(t*math.pi); rot=4*math.sin(t*math.pi*2); sx=1+.08*math.sin(t*math.pi); sy=1+.08*math.sin(t*math.pi)
    # transform about center on transparent canvas
    w=max(1,int(CELL*sx)); h=max(1,int(CELL*sy))
    im=base.resize((w,h),Image.Resampling.BICUBIC)
    if abs(rot)>0.01: im=im.rotate(rot,resample=Image.Resampling.BICUBIC,expand=True)
    out=Image.new('RGBA',(CELL,CELL))
    out.alpha_composite(im,(int((CELL-im.width)/2+x),int((CELL-im.height)/2+y)))
    if state in ('cast','ultimate'):
        alpha=out.getchannel('A').filter(ImageFilter.GaussianBlur(5 if state=='ultimate' else 3))
        glow=Image.new('RGBA',out.size,(120,180,255,0)); glow.putalpha(alpha.point(lambda a:int(a*(0.14+0.10*math.sin(t*math.pi)))))
        out=Image.alpha_composite(glow,out)
    return out

def source_cell(hero,row,col):
    cw=hero.width//4; ch=hero.height//6
    return hero.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))

def dir_source(target_index):
    ang=TARGET_ANGLES[target_index]
    best=min(range(4),key=lambda i:abs(math.atan2(math.sin(ang-SRC_ANGLES[i]),math.cos(ang-SRC_ANGLES[i]))))
    return best

hero=Image.open(AS/'hero-facing-atlas-v5.png').convert('RGBA')
for row,cls in enumerate(CLASSES):
    out=Image.new('RGBA',(FRAMES*CELL,len(STATES)*DIRECTIONS*CELL))
    for si,state in enumerate(STATES):
      for di in range(DIRECTIONS):
        src=source_cell(hero,row,dir_source(di))
        base=contain(src)
        # make cardinal rows visibly distinct from diagonal source via mild compression/shift
        if di%2==0:
            compressed=base.resize((int(CELL*.94),CELL),Image.Resampling.LANCZOS)
            tmp=Image.new('RGBA',(CELL,CELL)); tmp.alpha_composite(compressed,((CELL-compressed.width)//2,0)); base=tmp
        for f in range(FRAMES):
            fr=affine_frame(base,state,f)
            out.alpha_composite(fr,(f*CELL,(si*DIRECTIONS+di)*CELL))
    target=AS/f'hero-motion-{cls}-v7.png'
    if not target.exists(): out.save(target,optimize=False,compress_level=2)
    print('hero',cls,out.size)

# enemy motion interpolation: source 4 species columns x 4 pose rows -> 8-frame strips for each species/state
for atlas in ['a','b','c','d']:
    src=Image.open(AS/f'enemy-motion-{atlas}-v5.png').convert('RGBA')
    cw=src.width//4; ch=src.height//4
    out=Image.new('RGBA',(FRAMES*CELL,16*CELL))
    for state in range(4):
      state_name=['idle','run','attack2','death'][state]
      for species in range(4):
        base=contain(src.crop((species*cw,state*ch,(species+1)*cw,(state+1)*ch)))
        for f in range(FRAMES):
            fr=affine_frame(base,state_name,f)
            out.alpha_composite(fr,(f*CELL,(state*4+species)*CELL))
    out.save(AS/f'enemy-motion-{atlas}-v7.png',optimize=False,compress_level=2)
    print('enemy',atlas,out.size)

# unique player VFX sheet: 6 classes x 9 action lanes x 8 frames
ACTIONS=['attack1','attack2','attack3','execution','skillOne','skillTwo','companion','hybrid','ultimate']
base_sheets={
 'martial':Image.open(AS/'attack-vfx-martial-v6.png').convert('RGBA'),
 'sorcery':Image.open(AS/'attack-vfx-sorcery-v6.png').convert('RGBA')
}
class_lane={'warden':('martial',0),'ironbound':('martial',1),'veilrunner':('martial',2),'thornseer':('sorcery',0),'gravebinder':('sorcery',1),'dawnstrider':('sorcery',2)}
colors={'warden':(230,190,100),'ironbound':(180,205,230),'veilrunner':(165,115,240),'thornseer':(115,205,95),'gravebinder':(105,165,245),'dawnstrider':(255,205,105)}
vfx=Image.new('RGBA',(FRAMES*CELL,len(CLASSES)*len(ACTIONS)*CELL))
for ci,cls in enumerate(CLASSES):
  sheet_id,row=class_lane[cls]; sheet=base_sheets[sheet_id]; sw=sheet.width//8; sh=sheet.height//3
  tint=colors[cls]
  for ai,action in enumerate(ACTIONS):
    for f in range(FRAMES):
      src=contain(sheet.crop((f*sw,row*sh,(f+1)*sw,(row+1)*sh)))
      # action-specific transformation makes every lane temporally and spatially distinct
      scale=[.86,.94,1.04,1.18,1.0,1.12,1.08,1.26,1.46][ai]*(.78+.34*(f/(FRAMES-1)))
      sz=max(48,int(CELL*min(1.42,scale)))
      fr=src.resize((sz,sz),Image.Resampling.LANCZOS)
      angle=[-9,7,15,22,-5,10,-14,18,28][ai]*math.sin(f/(FRAMES-1)*math.pi)
      fr=fr.rotate(angle,Image.Resampling.BICUBIC,expand=True)
      # screen tint via alpha mask
      a=fr.getchannel('A'); col=Image.new('RGBA',fr.size,(*tint,0)); col.putalpha(a.point(lambda x:int(x*(0.13+ai*.01))))
      fr=Image.alpha_composite(fr,col)
      cell=Image.new('RGBA',(CELL,CELL)); cell.alpha_composite(fr,((CELL-fr.width)//2,(CELL-fr.height)//2))
      vfx.alpha_composite(cell,(f*CELL,(ci*len(ACTIONS)+ai)*CELL))
vfx.save(AS/'attack-vfx-player-v7.png',optimize=False,compress_level=2)
print('player vfx',vfx.size)

# enemy unique VFX lanes by role from the 4-row source
roles=['melee','shield','ranged','assassin','brute','burrower','healer','commander','summoner','disruptor','boss']
src=Image.open(AS/'attack-vfx-enemy-v6.png').convert('RGBA'); sw=src.width//8; sh=src.height//4
evfx=Image.new('RGBA',(FRAMES*CELL,len(roles)*CELL))
for ri,role in enumerate(roles):
  base_row=3 if role in ('healer','commander','summoner','disruptor','boss') else 2 if role in ('brute','burrower') else 1 if role in ('ranged','assassin') else 0
  for f in range(FRAMES):
    fr=contain(src.crop((f*sw,base_row*sh,(f+1)*sw,(base_row+1)*sh)))
    sc=(1.36 if role=='boss' else 1.14 if role in ('brute','burrower') else .92 if role in ('assassin','ranged') else 1.0)*(0.84+0.25*f/(FRAMES-1))
    sz=max(64,int(CELL*min(1.35,sc))); fr=fr.resize((sz,sz),Image.Resampling.LANCZOS)
    rot=(ri%5-2)*3*math.sin(f/(FRAMES-1)*math.pi); fr=fr.rotate(rot,Image.Resampling.BICUBIC,expand=True)
    cell=Image.new('RGBA',(CELL,CELL)); cell.alpha_composite(fr,((CELL-fr.width)//2,(CELL-fr.height)//2)); evfx.alpha_composite(cell,(f*CELL,ri*CELL))
evfx.save(AS/'attack-vfx-enemy-v7.png',optimize=False,compress_level=2)
print('enemy vfx',evfx.size)

# Offline-authored sample bank. Runtime uses decoded samples first and retains procedural fallback.
SR=48000
SFX=AS/'audio'/'v5'; SFX.mkdir(parents=True,exist_ok=True)
random.seed(50)
def write_wav(name,dur,kind,pitch=110,amp=.6):
    n=int(SR*dur); data=[]
    lp=0.0
    for i in range(n):
        t=i/SR; env=(1-math.exp(-t*70))*max(0,(1-t/dur))**1.8
        noise=random.uniform(-1,1)
        lp=lp*.86+noise*.14
        if kind=='whoosh': s=lp*math.sin(math.pi*min(1,t/dur))*0.9 + math.sin(2*math.pi*(pitch*(1+3*t/dur))*t)*.12
        elif kind=='impact': s=lp*.72+math.sin(2*math.pi*pitch*t)*math.exp(-t*18)*.65+math.sin(2*math.pi*pitch*.5*t)*math.exp(-t*10)*.3
        elif kind=='magic': s=math.sin(2*math.pi*(pitch+pitch*2.2*t/dur)*t)*.4+math.sin(2*math.pi*pitch*1.51*t)*.25+lp*.2
        elif kind=='step': s=lp*.65+math.sin(2*math.pi*pitch*t)*math.exp(-t*35)*.35
        elif kind=='ui': s=math.sin(2*math.pi*pitch*t)*.55+math.sin(2*math.pi*pitch*1.5*t)*.25
        else: s=lp*.6+math.sin(2*math.pi*pitch*t)*.35
        v=max(-1,min(1,s*env*amp)); data.append(int(v*32767))
    with wave.open(str(SFX/f'{name}.wav'),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(b''.join(struct.pack('<h',x) for x in data))

samples={
'attack-light':(.22,'whoosh',190,.75),'attack-heavy':(.34,'whoosh',120,.85),'projectile':(.30,'magic',310,.6),'companion':(.46,'magic',205,.65),'ward':(.48,'magic',170,.6),'potion':(.22,'ui',420,.55),'dodge':(.19,'whoosh',260,.5),'hybrid':(.62,'magic',120,.78),'ultimate':(.95,'magic',75,.85),'hurt':(.22,'impact',95,.7),'kill':(.30,'impact',80,.62),'level':(.70,'ui',330,.6),'boss':(.82,'impact',55,.9),'execute':(.48,'impact',70,.92),'enemy-windup':(.34,'whoosh',105,.55),'enemy-attack':(.31,'impact',100,.68),'boss-attack':(.64,'impact',55,.9),'impact-light':(.16,'impact',150,.62),'impact-medium':(.22,'impact',105,.72),'impact-heavy':(.32,'impact',62,.92),'impact-magic':(.26,'magic',280,.62),'boss-stagger':(.52,'impact',48,.95),'destruction':(.48,'impact',58,.9),
'footstep-stone':(.12,'step',90,.42),'footstep-dirt':(.12,'step',72,.38),'footstep-mud':(.15,'step',55,.42),'footstep-metal':(.13,'step',150,.35),'footstep-ash':(.13,'step',68,.35),'footstep-water':(.18,'step',110,.32)
}
for name,args in samples.items(): write_wav(name,*args)
print('audio samples',len(samples))
