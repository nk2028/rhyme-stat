let countTotal = null;
let rimeCounts = [];
let pairCounts = [];
let material = [];
let rimeNames = [];
let rimeNamesMini = '';
const inputIds = ['material', 'delimiters', 'dictionary', 'deriver-code', 'rime-names', 'rime-names-mini'];

function getInputElement(i) { return document.getElementById(inputIds[i]); }
function getInput(i) { return document.getElementById(inputIds[i]).value; }
function setInput(i, str) { document.getElementById(inputIds[i]).value = str; }

// 讀入所有韻類總字次
function loadCountTotal() {
  countTotal = document.getElementById('countTotal').value;
}

// 從文本框中讀入資料，標注好各韻腳的韻類名，計算字次韻次
function loadData(checks) {
  rimeCounts = [];
  pairCounts = [];
  if (!getInput(0)) return;
  material = getInput(0);
  let delimiters = getInput(1);
  let dictionary = getInput(2);
  let deriverCode = getInput(3);
  rimeNames = getInput(4);
  rimeNamesMini = getInput(5);
  if (checks.phonoDesc) deriverCode = '_ => {' + (deriverCode || 'return 音韻地位.韻;') + '}';
  if (checks.pinyin) deriverCode = '_ => {' + (deriverCode || 'return 漢語拼音.韻母;') + '}';

  // 若輸入的標注是音韻地位描述或編碼，則推導出韻名
  // 若輸入的標注是拼音，則推導出韻母
  // 否則認爲標注是自定韻類名，直接返回
  function derive(annotation) {
    let 音韻地位;
    let 漢語拼音;
    if (checks.phonoDesc) {
      try { 音韻地位 = Qieyun.音韻地位.from描述(annotation); } catch (_) {
        try { 音韻地位 = Qieyun.音韻地位.from編碼(annotation); } catch (_) { }
      }
    } else if (checks.pinyin) {
      try { 漢語拼音 = from拼音(annotation); } catch (_) { }
    }
    try { return eval(deriverCode)(annotation); } catch (_) { return annotation; }
  }

  // 拆分字頭和標注
  function splitAnnotation(text, fillAndDeriveAnnotation = false) {
    if (!text) return [];
    text = text.replace(/[ \t,，\(\)（）]/g, '');
    text = [...text];
    text = [text[0], text.slice(1).join('')];
    if (fillAndDeriveAnnotation) text[1] = derive(text[1] || dictionary[text[0]]);
    return text;
  }

  dictionary = Object.fromEntries(dictionary.split('\n').map(e => splitAnnotation(e)));
  const isUnt = material.includes('绿去\n天连');
  if (isUnt) {
    // 僅用於 unt 韻譜
    delimiters = delimiters.replace('□', '');
    material = material.replace(/韵脚.*\n/, '');
    setInput(1, delimiters);
  }
  material = material.replace(RegExp(`[${delimiters}]`, 'g'), '\n').trim();
  if (isUnt) [
    [/\/\//ug, ''],
    [/\{|</ug, '['], [/\}|>/ug, ']'],
    [/\]\[/ug, ''], [/\[(.)\]/ug, '$1'],
    [/(.)\[(.)/ug, '$1$2['], [/(.)\](.)/ug, ']$1$2'], [/\[.*?\]/ug, '\n'],
  ].forEach(pair => { material = material.replace(pair[0], pair[1]); });
  material = material.split('\n').map(line => {
    if (checks.rimeNameOnly) {
      line = line.replace(/[\t,，]/g, ' ');
      if (!line.includes(' ')) line = [...line].join(' ');
    } else {
      line = line.replace(/(.([\(（].*?[\)）])?)/ug, '$1 ');
    }
    line = line.replace(/ +/g, ' ');
    line = line.trim();
    return line.split(' ').map(e => checks.rimeNameOnly ? [null, derive(e)] : splitAnnotation(e, true));
  });
  material.forEach(line => {
    let e1 = line[0];
    line.slice(1).forEach(e2 => {
      let pair = getPair(e1[1], e2[1]);
      rimeCounts[e1[1]] = (rimeCounts[e1[1]] || 0) + 1;
      rimeCounts[e2[1]] = (rimeCounts[e2[1]] || 0) + 1;
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      e1 = e2;
    });
  });
  // 留空時，使用 rimeCounts 的全部 keys
  rimeNames = rimeNames ? rimeNames.split(' ') : Object.keys(rimeCounts);
}

// 韻譜轉爲文字版
function materialToText() {
  return material.map(line => line.map(e => e[0] + '(' + e[1] + ')').join('')).join('\n');
}

// 獲取無標注的韻腳字
function getUnannotated() {
  let unannotated = [];
  material.forEach(line => line.forEach(e => {
    if (e.length && !e[1] && !unannotated.includes(e[0])) unannotated.push(e[0]);
  }));
  return unannotated;
}

// 獲取排好序的兩韻
function getPair(rime1, rime2) {
  return rime1 < rime2 ? rime1 + ' ' + rime2 : rime2 + ' ' + rime1;
}

// 獲取單元格
function getCell(content = '', isTh = false, className = null) {
  let cell = document.createElement(isTh ? 'th' : 'td');
  if (content !== '') {
    let span = document.createElement('span');
    span.innerHTML = content;
    cell.appendChild(span);
    if (className) {
      span.classList.add(className);
    }
  }
  return cell;
}

// 獲取內容是數值的單元格
function getCellValue(content) {
  return getCell(content, false, 'value');
}

// 獲取內容是韻類名的單元格
function getCellRimeName(content, isTh = false) {
  if (!content) return getCell();
  content = [...content].map(e => rimeNamesMini.includes(e) ? `(${e})` : e).join('');
  content = content.replace(/\)\(/g, '');
  content = content.replace(/\(/g, '<span class="inline-note">');
  content = content.replace(/\)/g, '</span>');
  return getCell(content, isTh, 'rime-name');
}

function gen(reloadData = false, needValidateCountTotal = false) {
  let checkKeys = [
    'phono-desc', 'pinyin', 'rime-name-only',
    'rhyme', 'rhyme-group',
    'show-tf', 'combine', 'hide-half-bkgd', 'hide-zero', 'hide-all-bkgd',
  ];
  let checks = [];
  let main = document.getElementById('main');
  let output = document.getElementById('output');
  main.classList = '';
  checkKeys.forEach(key => {
    let checked = document.getElementById(key + '-check').checked;
    if (checked) {
      main.classList.add(key);
    }
    // 轉換爲駝峰式
    checks[key.replace(/-./g, s => s[1].toUpperCase())] = checked;
  });

  if (needValidateCountTotal && checks.rhymeGroup) validateCountTotal();
  loadCountTotal();
  if (reloadData) {
    loadData(checks);
    output.style.display = getInput(0) ? '' : 'none';
  }
  updatePlaceholders(checks);
  genTable(checks);
  arrangeOutput(true);
}

// 生成離合指數表
function genTable(checks) {
  // 重設表格
  let main = document.getElementById('main');
  let table = document.getElementById('table');
  let message = '';
  if (!rimeNames.length) {
    message = '請正確輸入韻段！';
  } else if (rimeNames.length > 53) {
    // 防止切換標注種類時，生成過大的表格
    message = '請正確輸入韻段！<br>當前表格過大（共 ' + rimeNames.length + ' 韻類）';
    // TODO: 增加按鈕，使強行顯示
  } else if (checks.rhymeGroup && countTotal < 2) {
    message = '請正確輸入總字次！';
  } else {
    let unannotated = getUnannotated();
    if (unannotated.length) message = '以下字無標注！</div><div style="margin-top: 0.2em;">' + unannotated.join('<br>');
  }
  if (message) {
    table.innerHTML = '<tr><th style="line-height: 1.3;"><div style="color: red;">' + message + '</div></th></tr>';
    main.classList.add(message.startsWith('請正確輸入') ? 'input-invalid' : 'has-unannotated');
    return;
  }
  table.innerHTML = '';
  main.classList.add('table-valid');

  // 生成表格
  let headRow = document.createElement('tr');
  headRow.appendChild(getCell('', true));
  headRow.appendChild(getCell('字次', true));
  table.appendChild(headRow);

  rimeNames.forEach((rime1, i) => {
    headRow.appendChild(getCellRimeName(rime1, true));
    let count1 = rimeCounts[rime1] || 0;
    let row = document.createElement('tr');
    row.appendChild(getCellRimeName(rime1));
    row.appendChild(getCellValue(count1));
    rimeNames.forEach((rime2, j) => {
      let count2 = rimeCounts[rime2] || 0;
      let count11 = pairCounts[getPair(rime1, rime1)] || 0;
      let count12 = pairCounts[getPair(rime1, rime2)] || 0;
      let count22 = pairCounts[getPair(rime2, rime2)] || 0;
      let cell = null;
      let [idx, chi2, idxResult, chi2TestResult] = checks.rhymeGroup ?
        getGroupResult(count1, count2, count12, countTotal) :
        getResult(count1, count2, count11, count12, count22);
      let result = idxResult || chi2TestResult;

      if (count12 === 0 && (checks.combine || checks.hideZero)) {
        count12 = '';
      }
      // 下面先按合併押韻次數和離合指數生成單元格
      if (isNaN(idx)) {
        cell = getCellValue('/');
        cell.classList.add('cell-nan');
      } else {
        cell = getCellValue(i === j ? '/' : idx.toFixed(
          !checks.rhymeGroup || idx.toFixed(2) <= 0 ? 0 :
            idx.toFixed(2) >= 10 ? 1 : 2)
        );
        // 生成上標（韻次）
        if (checks.combine && count12 !== '') {
          let sup = document.createElement('sup');
          sup.innerText = count12;
          cell.appendChild(sup);
        }
        // 生成下標（檢驗結果）
        if (i !== j) {
          cell.classList.add('cell-' + result[0].toLowerCase() + (result.includes('*') ? '-star' : ''));
          if (!checks.rhymeGroup) {
            let sub = document.createElement('sub');
            if (chi2TestResult) {
              sub.innerText = chi2.toFixed(chi2 > 1 ? 1 : 2);
            }
            if (checks.showTf || result.includes('*')) {
              let span = document.createElement('span');
              span.innerText = checks.showTf ? result : result.replace(/T|F/g, '');
              span.classList.add('result');
              sub.appendChild(span);
            }
            if (sub.innerHTML) {
              cell.appendChild(sub);
            }
          }
        }
      }
      // 不合併押韻次數和離合指數時，重新生成單元格
      if (!checks.combine && i >= j) {
        if (checks.hideHalfBkgd) {
          cell.classList = '';
        }
        cell.innerHTML = getCellValue(count12).innerHTML;
      }
      if (i === j) {
        cell.classList.add('cell-diag');
      }
      row.appendChild(cell);
    });
    table.appendChild(row);
  });
}

function updatePlaceholders(checks) {
  [
    !checks.rimeNameOnly ? '輸入各韻段的韻腳……' : '輸入各韻段韻腳的所屬韻類……',
    '輸入' + (!checks.rimeNameOnly ? '韻腳' : '韻類') + '中要跳過的字符……',
    '輸入各韻腳所屬' + (checks.phonoDesc ? '音韻地位或韻類' : '漢語拼音或韻類') + '……',
    '輸入由' + (checks.phonoDesc ? '音韻地位' : '漢語拼音') + '推導韻類的代碼……',
  ].forEach((v, i) => getInputElement(i).placeholder = v);
}

// 根據窗口寬度調整佈局
function arrangeOutput() {
  let input = document.getElementById('input');
  let output = document.getElementById('output');
  let instruction = document.getElementById('instruction');
  if (output.style.display === 'none') {
    let gridColumn = '2';
    // 窗口寬度不夠時，將 instruction 挪至 input 下方
    if (document.body.offsetWidth <= 470) {
      gridColumn = '1';
    } else if (document.body.offsetWidth <= 720) {
      gridColumn = '1 / span 2';
    }
    instruction.style.gridColumn = gridColumn;
    return;
  }

  let copyButton = document.getElementById('copy-button');
  let table = document.getElementById('table');
  [1, 2].forEach(i => { output.classList.remove('narrow' + i); });
  output.style.gridRow = '1 / span 3';
  output.style.gridColumn = '2';
  instruction.style.gridColumn = '1';
  copyButton.style.marginBottom = '1.5em';
  copyButton.style.marginTop = 'calc(0.25em - ' + copyButton.offsetHeight + 'px - 1.5em)';
  if (output.firstElementChild.offsetHeight < input.offsetHeight) {
    // output 不夠高則 instruction 佔滿兩列
    output.style.gridRow = '1';
    instruction.style.gridColumn = '1 / span 2';
  }
  if (table.offsetLeft + table.offsetWidth + 20 > document.body.offsetWidth) {
    // 窗口不夠寬則將 output 挪至 input 下方
    output.style.gridRow = '';
    output.style.gridColumn = '1 / span 2';
    copyButton.style.marginBottom = '';
    copyButton.style.marginTop = '';
    // 仍不夠寬則減小單元格寬度
    [1, 2].forEach(i => {
      if (table.offsetLeft + table.offsetWidth + 20 > document.body.offsetWidth) {
        output.classList.add('narrow' + i);
      }
    });
    instruction.style.gridColumn = document.body.offsetWidth <= 470 ? '1' : '1 / span 2';
  }
}

// 加載示例資料
function writeSampleData(rimeNamesMiniOnly = false, noDictionary = false) {
  const sample = [
    noDictionary ?
      '衡(庚二)横(庚二)亨(庚二)行(庚二)\n客(庚二)陌(庚二)\n泽(庚二)客(庚二)\n鳠(耕)頟(庚二)白(庚二)宅(庚二)\n形(青)灵(青)冥(青)龄(青)\n声(清)英(庚三)\n诚(清)明(庚三)牲(庚莊)缨(清)盈(清)声(清)并(清)\n声(清)精(清)英(庚三)\n英(庚三)清(清)平(庚三)\n城(清)鸣(庚三)\n盈(清)平(庚三)声(清)生(庚莊)成(清)\n岭(清)秉(庚三)景(庚三)永(庚三)聘(清)请(清)\n圣(清)命(庚三)\n碧(庚三)石(清)\n辟(清)籍(清)役(清)\n积(清)石(清)脊(清)\n适(清)尺(清)迹(清)石(清)\n嵉(青)星(青)平(庚三)形(青)经(青)成(清)垧(青)萦(清)青(青)\n明(庚三)成(清)灵(青)盈(清)声(清)情(清)\n茎(耕)莺(耕)惊(庚三)\n摘(耕)襞(清)射(清)隙(庚三)席(清)役(清)惜(清)' :
      '衡横亨行(匣開二庚平)\n客陌\n泽客\n鳠頟白宅\n形灵冥龄\n声英\n诚明牲缨盈声并\n声精英\n英清平\n城鸣\n盈平声生成\n岭秉景永聘请\n圣命\n碧石\n辟籍役\n积石脊\n适尺迹石\n嵉星平形经成垧萦青\n明成灵盈声情\n茎莺惊\n摘襞射隙席役惜',
    '□；。◎‖',
    noDictionary ? '' : '衡(匣開二庚平)\n横(匣合二庚平)\n亨(曉開二庚平)\n客(溪開二庚入)\n陌(明二庚入)\n泽(澄開二庚入)\n鳠(匣合二耕入)\n頟(疑開二庚入)\n白(並二庚入)\n宅(澄開二庚入)\n形(匣開四青平)\n灵(來開四青平)\n冥(明四青平)\n龄(來開四青平)\n声(書開三清平)\n英(影開三庚平)\n诚(常開三清平)\n明(明三庚平)\n牲(生開三庚平)\n缨(影開三清平)\n盈(以開三清平)\n并(幫三清平)\n精(精開三清平)\n清(清開三清平)\n平(並三庚平)\n城(常開三清平)\n鸣(明三庚平)\n生(生開三庚平)\n成(常開三清平)\n岭(來開三清上)\n秉(幫三庚上)\n景(見開三庚上)\n永(云合三庚上)\n聘(滂三清去)\n请(清開三清上)\n圣(書開三清去)\n命(明三庚去)\n碧(幫三庚入)\n石(常開三清入)\n辟(幫三清入)\n籍(從開三清入)\n役(以合三清入)\n积(精開三清入)\n脊(精開三清入)\n适(書開三清入)\n尺(昌開三清入)\n迹(精開三清入)\n嵉(定開四青平)\n星(心開四青平)\n经(見開四青平)\n垧(見合四青平)\n萦(影合三清平)\n青(清開四青平)\n情(從開三清平)\n茎(匣開二耕平)\n莺(影開二耕平)\n惊(見開三庚平)\n摘(知開二耕入)\n襞(幫三清入)\n射(船開三清入)\n隙(溪開三庚入)\n席(邪開三清入)\n惜(心開三清入)',
    noDictionary ? '' : "return 音韻地位.判斷([\n  ['庚韻 莊組', '庚莊'],\n  ['庚韻', '庚' + 音韻地位.等],\n  ['', 音韻地位.韻], // 其餘韻母\n]);",
    '青 清 庚莊 庚三 耕 庚二',
    '一二三四五六七八九十等 1234567890 ABCD 開开合洪細细撮口呼 內内外輕重紐纽鈕钮類类 幫帮非端知來来精莊庄章日照見见影喻云以 脣唇齒齿舌牙喉 銳鋭锐鈍钝 平上去入仄陰',
  ];
  const countTotalSample = 1000;

  if (rimeNamesMiniOnly) {
    setInput(1, sample[1]); // delimiters
    setInput(5, sample[5]); // rimeNamesMini
    return false;
  }
  if (getInput(0) || getInput(2) || getInput(3) || getInput(4)
    || getInput(1) && getInput(1) !== sample[1]
    || getInput(5) && getInput(5) !== sample[5]
  ) {
    if (!confirm('示例資料會覆蓋現有資料，確認加載？')) return false;
  }
  sample.forEach((e, i) => { setInput(i, e); });
  document.getElementById('countTotal').value = countTotalSample;
  document.getElementById('phono-desc-check').checked = true;
  return true;
}

// 檢查輸入的總字次
function validateCountTotal() {
  if (countTotal >= 2) return;

  let text = countTotal === '' ? '未輸入總字次！' : '總字次不合法！';
  let count = eval(Object.values(rimeCounts).join('+'));
  if (confirm(text + '\n\n已輸入韻段的總字次爲 ' + count + '，是否填入此值並計算？\n（這要求輸入的韻段爲所有韻類的韻段）')) {
    document.getElementById('countTotal').value = count;
  }
}

// 將韻譜或無標注的字匯出至剪貼簿
function copy() {
  const txt = getUnannotated().join('\n') || materialToText();
  function copyFailed() { alert('瀏覽器不支援匯出至剪貼簿，操作失敗'); }
  function copySuccess() { confirm('已成功匯出至剪貼簿'); }
  function copyFallback() {
    const textArea = document.createElement("textarea");
    textArea.value = txt;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy") ? copySuccess() : copyFailed();
    } catch (err) {
      copyFailed();
    }
    document.body.removeChild(textArea);
  }
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(copySuccess, () => copyFallback(txt));
  else copyFallback(txt);
}
