const DARK='#000000';
const WHITE='#ffffff';

export function luminance(hex){
  const expanded=/^#([0-9a-f]{3})$/i.test(hex||'')?'#'+hex.slice(1).split('').map(x=>x+x).join(''):hex;
  const match=/^#([0-9a-f]{6})$/i.exec(expanded||'');
  if(!match)return null;
  const [r,g,b]=match[1].match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
}

export function contrast(a,b){
  const x=luminance(a),y=luminance(b);
  if(x===null||y===null)return 0;
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

export function labelInk(background){
  return contrast(background,WHITE)>=contrast(background,DARK)?WHITE:DARK;
}

// Keep the category hue, but darken its on-screen label until white text is readable.
export function whiteLabelColor(background){
  const expanded=/^#([0-9a-f]{3})$/i.test(background||'')?'#'+background.slice(1).split('').map(x=>x+x).join(''):background;
  const match=/^#([0-9a-f]{6})$/i.exec(expanded||'');
  if(!match)return '#30433f';
  const channels=match[1].match(/../g).map(x=>parseInt(x,16));
  for(let factor=1;factor>=0;factor-=.01){
    const candidate='#'+channels.map(x=>Math.round(x*factor).toString(16).padStart(2,'0')).join('');
    if(contrast(candidate,WHITE)>=4.5)return candidate;
  }
  return '#000000';
}
