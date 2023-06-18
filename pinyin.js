function from拼音(拼音) {
  Object.entries({
    i: 'īíǐì', u: 'ūúǔù', ü: 'ǖǘǚǜ',
    e: 'ēéěè', o: 'ōóǒò', a: 'āáǎà',
  }).some(([原字母, 帶調字母列表]) => {
    return [...帶調字母列表].some((帶調字母, i) => {
      if (拼音.includes(帶調字母)) {
        拼音 = 拼音.replace(帶調字母, 原字母) + (i + 1);
        return true;
      }
    });
  });
  [
    ['yu', 'ü'], [/yi?/, 'i'], [/wu?/, 'u'],
    ['iou', 'iu'], ['uei', 'ui'], ['uen', 'un'],
    [/([jqx])u/, '$1ü'],
    [/([zcs]h?|r)i/, '$1ï'], ['ïi', 'i'],
    [/(.)er/, '$1e-r'],
  ].forEach(pair => { 拼音 = 拼音.replace(pair[0], pair[1]); });
  let 韻母idx = 拼音.search(/[iueoaïüëöä]/);
  if (韻母idx < 0) throw new Error('Invalid pinyin!');
  let 聲調idx = 拼音.search(/[0-9]/);
  if (聲調idx < 0) {
    拼音 += '0'; // 未標聲調的一律視爲 0 調
    聲調idx = 拼音.search(/[0-9]/);
  }
  const 音節 = {
    聲母: 拼音.slice(0, 韻母idx),
    韻母: 拼音.slice(韻母idx, 聲調idx),
    聲調: 拼音.slice(聲調idx),
  };
  return 音節;
}
