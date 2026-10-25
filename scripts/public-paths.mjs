const forbidden=/\.(?:xls|xlsx|csv|db|sqlite|sqlite3|apk|exe|mp4|m4a|jks|keystore|jpg|jpeg|webp|heic|gif|svg|pdf|docx|zip|tar|tgz|7z|wav|mp3|ogg)$/i;
const allowedJson=new Set(['shells/package.json','shells/package-lock.json','shells/capacitor.config.json']);
const approvedArt=/^shells\/android\/app\/src\/main\/res\/(?:drawable(?:-land-(?:h|m|xh|xxh|xxxh)dpi|-port-(?:h|m|xh|xxh|xxxh)dpi)?|mipmap-(?:h|m|xh|xxh|xxxh)dpi)\/(?:splash|ic_launcher|ic_launcher_foreground|ic_launcher_round)\.png$/;
const approvedDemoImages=new Set(['docs/images/timeline.png','docs/images/week.png','docs/images/focus.png']);

export function isUnsafePublicPath(path){
  return forbidden.test(path)
    ||/\.json$/i.test(path)&&!allowedJson.has(path)
    ||/\.png$/i.test(path)&&!approvedArt.test(path)&&!approvedDemoImages.has(path)
    ||/(?:^|\/)(?:private|backups|recordings)(?:\/|$)/i.test(path);
}
