import {createHash} from 'node:crypto';
import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseImport, backupText, BACKUP_FORMAT} from '../web/portability.mjs';

export function inspectBackup(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw Error('备份文件为空或无法读取');
  const original = JSON.parse(bytes.toString('utf8'));
  if (original?.format !== BACKUP_FORMAT) throw Error('请选择本产品导出的完整 JSON 备份');
  const restored = parseImport(bytes.toString('utf8'));
  const secondPass = parseImport(backupText(restored));
  if (JSON.stringify(restored) !== JSON.stringify(secondPass)) throw Error('恢复后的再次读取不一致');
  const reviews = restored.reviews ?? {};
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    events: restored.events.length,
    categories: restored.categories.length,
    logs: restored.logs.length,
    dailyReviews: Object.keys(reviews).filter(key => key.startsWith('day:')).length,
    weeklyReviews: Object.keys(reviews).filter(key => key.startsWith('week:')).length,
    monthlyReviews: Object.keys(reviews).filter(key => key.startsWith('month:')).length,
    runningEvents: restored.events.filter(event => event.end === null).length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    console.error('用法：node scripts/check-private-backup.mjs <私有完整备份.json>');
    process.exitCode = 2;
  } else {
    try {
      const file = resolve(process.argv[2]);
      if (!statSync(file).isFile()) throw Error('目标不是文件');
      const result = inspectBackup(readFileSync(file));
      console.log(JSON.stringify(result, null, 2));
    } catch {
      // Errors from imported records can contain private IDs; never print them.
      console.error('核验失败：文件为空、损坏，或不符合完整备份格式。原文件未被修改。');
      process.exitCode = 1;
    }
  }
}
