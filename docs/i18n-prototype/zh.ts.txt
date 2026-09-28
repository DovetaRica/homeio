import dictionary from './zh-CN.json';

// Presentation-only translation: application IDs, filenames and submitted
// settings values remain untouched. Non-string React children pass through.
const exact: Record<string, string> = dictionary;
const folded = new Map(Object.entries(exact).map(([key,value]) => [key.toLowerCase(),value]));
export function zh<T>(value: T): T {
  if (typeof value !== 'string') return value;
  const key = value.replace(/\s+/g, ' ').trim();
  let translated = exact[key] ?? folded.get(key.toLowerCase());
  if (!translated) {
    translated = key
      .replace(/^Welcome back, (.+)$/, '欢迎回来，$1')
      .replace(/^Hi, (.+)$/, '你好，$1')
      .replace(/^Open (.+)$/, '打开 $1')
      .replace(/^Toggle (.+)$/, (_, label: string) => '切换' + zh(label))
      .replace(/^Sort by: (.+) \(click to change\)$/, '排序：$1（点击切换）')
      .replace(/^Ascending.*click to reverse$/, '升序 · 点击改为降序')
      .replace(/^Descending.*click to reverse$/, '降序 · 点击改为升序')
      .replace(/(\d+) folders?\b/g, '$1 个文件夹')
      .replace(/(\d+) files?\b/g, '$1 个文件')
      .replace(/(\d+) items?\b/g, '$1 个项目')
      .replace(/(\d+) selected\b/g, '已选择 $1 项')
      .replace(/^Storage /, '存储 ')
      .replace(/^Loading (.+)\.\.\.$/, '正在加载 $1…');
  }
  return (translated === key ? value : value.replace(value.trim(), translated)) as T;
}
