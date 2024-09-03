let countTotal = null;
let rimeCounts = [];
let pairCounts = [];
let material = [];
let rimeNames = [];
let rimeNamesMini = '';
let inputs = [];

function loadInputs() {
  inputs = Object.fromEntries([
    'caption-input', 'material', 'delimiters', 'dictionary', 'deriver-code', 'rime-names', 'rime-names-mini'
  ].map(inputId => [
    inputId.replace(/-./g, s => s[1].toUpperCase()), // 轉換爲駝峰式
    document.getElementById(inputId),
  ]));
}

// 讀入所有韻類總字次
function loadCountTotal() {
  countTotal = document.getElementById('countTotal').value;
}

// 從文本框中讀入資料，標注好各韻腳的韻類名，計算字次韻次
function loadData(checks) {
  rimeCounts = [];
  pairCounts = [];
  if (!inputs.material.value) return;
  let delimiters, dictionary, deriverCode;
  [_, material, delimiters, dictionary, deriverCode, rimeNames, rimeNamesMini] = Object.values(inputs).map(e => e.value);
  if (checks.rimeCountOnly) {
    [
      [/[O。]/g, '0 '],
      [/[IJl]/g, '1'],
      [/[\t,，]/g, ' '],
      [/ (?=[ \n])/g, '$&0'],
      [/(?<= )\/(?= ])/g, 'NaN'],
    ].forEach(pair => { material = material.replace(...pair); });
    material = material.trim().split('\n');
    material = material.map(line => {
      // 當韻類名和數字之間沒有空格時，插入空格以便拆分
      line = line.replace(/^([^0-9 ])([0-9])/, '$1 $2');
      return line.split(' ');
    });
    // 若果首行爲韻類名，則捨棄首行
    if (material.length > material.slice(-1)[0].length - 2) material = material.slice(1);
    let rimesExtractedFromFirstColumn = material.map(line => line[0]);
    material.forEach((line, i) => {
      let rime1 = line[0];
      rimeCounts[rime1] = Number(line[1]);
      line.slice(2).forEach((cell, j) => {
        if (j > i) return true;
        let rime2 = rimesExtractedFromFirstColumn[j];
        let pair = getPair(rime1, rime2);
        pairCounts[pair] = Number(cell);
      });
    });
    material = [];
    loadRimeNames();
    return;
  }
  if (checks.phonoDesc) deriverCode = '_ => {' + (deriverCode || 'return 音韻地位.韻;') + '}';
  if (checks.pinyin) deriverCode = '_ => {' + (deriverCode || 'return 漢語拼音.韻母;') + '}';

  // 若輸入的標注是音韻地位描述或編碼，則推導出韻名
  // 若輸入的標注是拼音，則推導出韻母
  // 否則認爲標注是自定韻類名，直接返回
  function derive(annotation) {
    let 音韻地位;
    let 漢語拼音;
    if (checks.phonoDesc) {
      try { 音韻地位 = TshetUinh.音韻地位.from描述(annotation); } catch (_) {
        try { 音韻地位 = TshetUinh.音韻地位.from編碼(annotation); } catch (_) { }
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
    inputs.delimiters.value = delimiters;
  }
  material = material.replace(RegExp(`[${delimiters}]`, 'g'), '\n').trim();
  if (isUnt) [
    [/\/\//ug, ''],
    [/\{|</ug, '['], [/\}|>/ug, ']'],
    [/\]\[/ug, ''], [/\[(.)\]/ug, '$1'],
    [/(.)\[(.)/ug, '$1$2['], [/(.)\](.)/ug, ']$1$2'], [/\[.*?\]/ug, '\n'],
  ].forEach(pair => { material = material.replace(...pair); });
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
      rimeCounts[e1[1]] = (typeof rimeCounts[e1[1]] === 'number' && rimeCounts[e1[1]] || 0) + 1;
      rimeCounts[e2[1]] = (typeof rimeCounts[e2[1]] === 'number' && rimeCounts[e2[1]] || 0) + 1;
      pairCounts[pair] = (typeof pairCounts[pair] === 'number' && pairCounts[pair] || 0) + 1;
      e1 = e2;
    });
  });
  loadRimeNames();
}

function loadRimeNames() {
  // 留空時，使用 rimeCounts 的全部 keys
  rimeNames = rimeNames ? rimeNames.split(' ') : Object.keys(rimeCounts);
}

// 韻譜轉爲文字版
function materialToText(rimeNameOnly = false) {
  return material.map(line => line.map(e => {
    if (!e) return '';
    if (rimeNameOnly) return e[1];
    return e[0] + '(' + e[1] + ')';
  }).join(rimeNameOnly ? ' ' : '')).join('\n');
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

function gen(reloadData = false, needValidateCountTotal = false, needfixCount = false) {
  let checkKeys = [
    'phono-desc', 'pinyin', 'rime-name-only', 'rime-count-only',
    'rhyme', 'rhyme-group',
    'show-tf', 'grad-bkgd', 'skip-test', 'combine', 'hide-half-bkgd', 'hide-zero', 'hide-all-bkgd',
  ];
  let checks = [];
  let main = document.getElementById('main');
  let output = document.getElementById('output');
  document.getElementById('grad-bkgd-check').disabled = document.getElementById('hide-all-bkgd-check').checked;
  document.getElementById('skip-test-check').disabled = document.getElementById('hide-all-bkgd-check').checked || !document.getElementById('grad-bkgd-check').checked;
  document.getElementById('show-tf-check').disabled = !document.getElementById('grad-bkgd-check').disabled && document.getElementById('grad-bkgd-check').checked;
  main.classList = '';
  checkKeys.forEach(key => {
    let control = document.getElementById(key + '-check');
    if (!control) return;
    if (!control.disabled && control.checked) {
      main.classList.add(key);
    }
    // 轉換爲駝峰式
    checks[key.replace(/-./g, s => s[1].toUpperCase())] = !control.disabled && control.checked;
  });

  if (needValidateCountTotal && checks.rhymeGroup) validateCountTotal();
  loadCountTotal();
  if (reloadData) {
    loadData(checks);
    if (needfixCount) fixCount();
    output.style.display = inputs.material.value ? '' : 'none';
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
  table.lang = document.getElementById('simplified-check').checked ? 'zh-CN' : 'zh-HK';
  main.classList.add('table-valid');
  let caption = document.createElement('caption');
  caption.innerHTML = document.getElementById('caption-input').value;
  if (caption.innerHTML) table.appendChild(caption);

  function addDummyClassesAndClearIfDummy(element, rime) {
    addedClasses = {
      '|': ['dummy', 'add-border'],
      '|_': ['dummy', 'add-border', 'gray-border'],
      '||': ['dummy', 'add-border', 'double-border'],
    }[rime];
    if (addedClasses) {
      element.classList.add(...addedClasses);
      element.innerHTML = '';
    }
  }
  // 生成表格
  let headRow = document.createElement('tr');
  table.appendChild(headRow);
  headRow.appendChild(getCell('', true));
  headRow.appendChild(getCell('字次', true));
  rimeNames.some((rime1, i) => {
    if (rime1 === '\\') return true;
    let cell = getCellRimeName(rime1, true);
    addDummyClassesAndClearIfDummy(cell, rime1);
    headRow.appendChild(cell);
  });
  rimeNames.forEach((rime1, i) => {
    if (rime1 === '\\') return;
    let count1 = rimeCounts[rime1] || 0;
    let row = document.createElement('tr');
    row.appendChild(getCellRimeName(rime1));
    row.appendChild(getCellValue(count1 || '/'));
    rimeNames.some((rime2, j) => {
      if (rime2 === '\\') return true;
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
      if (isNaN(idx) || idx == Infinity) {
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
          if (checks.gradBkgd) {
            let useChi2 = checks.rhyme && !checks.skipTest && chi2TestResult;
            let lower = useChi2 ? 10.597 : 50;
            let upper = useChi2 ? 4.605 : 100; // 採用 100 而不是 90 以展示更多顏色
            let scale = ((useChi2 ? chi2 : idx) - lower) / (upper - lower);
            scale = scale < 0 ? 0 : scale > 1 ? 1 : scale;
            let lowerH = useChi2 ? 330 : 360;
            let upperH = useChi2 ? 210 : 180;
            let h = scale * (upperH - lowerH) + lowerH;
            h = Math.round(h);
            if (h === 360) h = 0;
            cell.style.background = 'hsl(' + h + 'deg 100% 95%)';
          }
          if (!checks.rhymeGroup && !checks.skipTest) {
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
      addDummyClassesAndClearIfDummy(cell, rime2);
      row.appendChild(cell);
    });
    addDummyClassesAndClearIfDummy(row, rime1);
    table.appendChild(row);
  });
}

function updatePlaceholders(checks) {
  inputs.material.placeholder = checks.rimeCountOnly ? '輸入韻次表……' :
    !checks.rimeNameOnly ? '輸入各韻段的韻腳……' : '輸入各韻段韻腳的所屬韻類……';
  inputs.delimiters.placeholder = '輸入' + (!checks.rimeNameOnly ? '韻腳' : '韻類') + '中要跳過的字符……';
  inputs.dictionary.placeholder = '輸入各韻腳所屬' + (checks.phonoDesc ? '音韻地位或韻類' : '漢語拼音或韻類') + '……';
  inputs.deriverCode.placeholder = '輸入由' + (checks.phonoDesc ? '音韻地位' : '漢語拼音') + '推導韻類的代碼……';
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

  let copyButtons = document.getElementById('copy-buttons');
  let table = document.getElementById('table');
  [1, 2].forEach(i => { output.classList.remove('narrow' + i); });
  output.style.gridRow = '1 / span 3';
  output.style.gridColumn = '2';
  instruction.style.gridColumn = '1';
  copyButtons.classList.add('absolute');
  if (output.firstElementChild.offsetHeight < input.offsetHeight) {
    // output 不夠高則 instruction 佔滿兩列
    output.style.gridRow = '1';
    instruction.style.gridColumn = '1 / span 2';
  }
  if (table.offsetLeft + table.offsetWidth + 20 > document.body.offsetWidth) {
    // 窗口不夠寬則將 output 挪至 input 下方
    output.style.gridRow = '';
    output.style.gridColumn = '1 / span 2';
    copyButtons.classList.remove('absolute');
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
function writeSampleData(writeDefaultSampleOnly = false, noDictionary = false) {
  const isPinyin = document.getElementById('pinyin-check').checked;
  const defaultSample = {
    delimiters: '□；。◎‖',
    dictionary: '',
    deriverCode: '',
    rimeNamesMini: '一二三四五六七八九十等 1234567890 ABCD 開开合洪細细撮口呼 內内外輕轻重紐纽鈕钮類类 幫帮非端知來来精莊庄章日照見见影喻云以 脣唇齒齿舌牙喉 銳鋭锐鈍钝 平上去入仄陰',
  };
  const sample = {
    ...defaultSample,
    ...(writeDefaultSampleOnly ? {} : isPinyin ? {
      captionInput: '北京歌谣集释 · 言前辙<br><span style="font-size: 75%;">扣除“天、三”二字</span>',
      delimiters: '；天三',
      rimeNames: 'ian üan an uan \\ | ai',
    } : {
      captionInput: '沈約梗攝用韻',
      rimeNames: '青 清 庚莊 庚三 耕 |_ 庚二',
    }),
    ...(writeDefaultSampleOnly ? {} : {
      'phono-desc-check': noDictionary ? {
        material: '衡(庚二)横(庚二)亨(庚二)行(庚二)\n客(庚二)陌(庚二)\n泽(庚二)客(庚二)\n鳠(耕)頟(庚二)白(庚二)宅(庚二)\n形(青)灵(青)冥(青)龄(青)\n声(清)英(庚三)\n诚(清)明(庚三)牲(庚莊)缨(清)盈(清)声(清)并(清)\n声(清)精(清)英(庚三)\n英(庚三)清(清)平(庚三)\n城(清)鸣(庚三)\n盈(清)平(庚三)声(清)生(庚莊)成(清)\n岭(清)秉(庚三)景(庚三)永(庚三)聘(清)请(清)\n圣(清)命(庚三)\n碧(庚三)石(清)\n辟(清)籍(清)役(清)\n积(清)石(清)脊(清)\n适(清)尺(清)迹(清)石(清)\n嵉(青)星(青)平(庚三)形(青)经(青)成(清)垧(青)萦(清)青(青)\n明(庚三)成(清)灵(青)盈(清)声(清)情(清)\n茎(耕)莺(耕)惊(庚三)\n摘(耕)襞(清)射(清)隙(庚三)席(清)役(清)惜(清)',
      } : {
        material: '衡横亨行(匣開二庚平)\n客陌\n泽客\n鳠頟白宅\n形灵冥龄\n声英\n诚明牲缨盈声并\n声精英\n英清平\n城鸣\n盈平声生成\n岭秉景永聘请\n圣命\n碧石\n辟籍役\n积石脊\n适尺迹石\n嵉星平形经成垧萦青\n明成灵盈声情\n茎莺惊\n摘襞射隙席役惜',
        dictionary: '衡(匣開二庚平)\n横(匣合二庚平)\n亨(曉開二庚平)\n客(溪開二庚入)\n陌(明二庚入)\n泽(澄開二庚入)\n鳠(匣合二耕入)\n頟(疑開二庚入)\n白(並二庚入)\n宅(澄開二庚入)\n形(匣開四青平)\n灵(來開四青平)\n冥(明四青平)\n龄(來開四青平)\n声(書開三清平)\n英(影開三B庚平)\n诚(常開三清平)\n明(明三B庚平)\n牲(生開三庚平)\n缨(影開三A清平)\n盈(以開三清平)\n并(幫三A清平)\n精(精開三清平)\n清(清開三清平)\n平(並三B庚平)\n城(常開三清平)\n鸣(明三B庚平)\n生(生開三庚平)\n成(常開三清平)\n岭(來開三清上)\n秉(幫三B庚上)\n景(見開三B庚上)\n永(云合三B庚上)\n聘(滂三A清去)\n请(清開三清上)\n圣(書開三清去)\n命(明三B庚去)\n碧(幫三B庚入)\n石(常開三清入)\n辟(幫三A清入)\n籍(從開三清入)\n役(以合三清入)\n积(精開三清入)\n脊(精開三清入)\n适(書開三清入)\n尺(昌開三清入)\n迹(精開三清入)\n嵉(定開四青平)\n星(心開四青平)\n经(見開四青平)\n垧(見合四青平)\n萦(影合三A清平)\n青(清開四青平)\n情(從開三清平)\n茎(匣開二耕平)\n莺(影開二耕平)\n惊(見開三B庚平)\n摘(知開二耕入)\n襞(幫三A清入)\n射(船開三清入)\n隙(溪開三B庚入)\n席(邪開三清入)\n惜(心開三清入)',
        deriverCode: "return 音韻地位.判斷([\n  ['庚韻 莊組', '庚莊'],\n  ['庚韻', '庚' + 音韻地位.等],\n  ['', 音韻地位.韻], // 其餘韻母\n]);",
      },
      'pinyin-check': noDictionary ? {
        material: '边(ian)端(uan)；尖(ian)端(uan)瓣(an)安(an)\n眼(ian)碗(uan)\n转(uan)站(an)\n欢(uan)单(an)\n暖(uan)圆(üan)管(uan)然(an)烟(ian)\n汗(an)站(an)\n欢(uan)关(uan)团(uan)\n圆(üan)南(an)杆(an)烟(ian)山(an)天\n圆(üan)线(ian)\n奸(ian)三\n难(an)男(an)联(ian)\n面(ian)滥(an)按(an)面(ian)线(ian)转(uan)瓣(an)淡(an)饭(an)\n三烟(ian)\n甜(ian)钱(ian)\n汉(an)干(an)汗(an)\n碗(uan)脸(ian)；碗(uan)纂(uan)\n寒(an)丸(uan)\n圆(üan)甜(ian)连(ian)\n年(ian)圆(üan)\n点(ian)眼(ian)\n碗(uan)眼(ian)\n匾(ian)馆(uan)；殿(ian)监(ian)；签(ian)县(ian)\n淡(an)面(ian)\n还(uan)南(an)\n辕(üan)钱(ian)；南(an)船(uan)\n散(an)见(ian)\n面(ian)转(uan)碗(uan)\n钱(ian)帘(ian)；弦(ian)船(uan)；鞍(an)天\n战(an)线(ian)窜(uan)\n钱(ian)还(uan)\n圆(üan)钱(ian)\n面(ian)线(ian)转(uan)瓣(an)碗(uan)鞭(ian)砖(uan)山(an)\n干(an)弹(an)万(uan)\n汉(an)饭(an)\n难(an)干(an)\n天山(an)毡(an)盘(an)幡(an)全(üan)餐(an)\n三衫(an)\n钱(ian)船(uan)钱(ian)烟(ian)钱(ian)年(ian)\n坛(an)元(üan)\n转(uan)饭(an)\n眼(ian)赶(an)钱(ian)管(uan)眼(ian)\n镰(ian)纂(uan)\n汉(an)蛋(an)\n伞(an)纂(uan)\n站(an)沿(ian)船(uan)半(an)\n弯(uan)边(ian)天\n钱(ian)看(an)劝(üan)\n盘(an)年(ian)\n钱(ian)南(an)\n烟(ian)湾(uan)；烟(ian)奶(ai)\n转(uan)毽(ian)天扇(an)\n半(an)钻(uan)半(an)半(an)半(an)散(an)\n难(an)转(uan)蹿(uan)见(ian)天\n善(an)面(ian)蒜(uan)念(ian)；善(an)蛋(an)\n毡(an)砖(uan)颤(an)天\n脸(ian)碱(ian)饭(an)蛋(an)\n喊(an)管(uan)\n天前(ian)眠(ian)；边(ian)前(ian)\n全(üan)年(ian)完(uan)\n尖(ian)圆(üan)丹(an)南(an)\n眼(ian)反(an)\n肩(ian)边(ian)毡(an)天寒(an)难(an)天；板(an)卷(üan)\n面(ian)片(ian)线(ian)转(uan)瓣(an)碗(uan)眼(ian)；砖(uan)鞭(ian)烟(ian)\n三关(uan)\n三边(ian)\n涟(ian)怜(ian)\n尖(ian)关(uan)山(an)\n尖(ian)圆(üan)丹(an)鞭(ian)\n盘(an)员(üan)\n线(ian)看(an)\n衫(an)湾(uan)\n碗(uan)眼(ian)\n边(ian)天\n天山(an)杆(an)砖(uan)\n酸(uan)蛋(an)\n山(an)饭(an)碗(uan)\n圆(üan)怜(ian)年(ian)\n馋(an)年(ian)天三粘(an)\n看(an)劝(üan)\n软(uan)眼(ian)\n片(ian)蛋(an)\n片(ian)沿(ian)蛋(an)\n钱(ian)烟(ian)钱(ian)年(ian)\n咸(ian)酸(uan)圆(üan)汉(an)山(an)盐(ian)\n钱(ian)莲(ian)边(ian)；边(ian)扇(an)扇(an)\n短(uan)晚(uan)\n谭(an)袁(üan)\n三捐(üan)\n三天\n三烟(ian)\n燕(ian)线(ian)\n年(ian)钱(ian)\n汗(an)颤(an)便(ian)\n店(ian)面(ian)\n三万(uan)\n看(an)蛋(an)\n短(uan)眼(ian)\n丹(an)元(üan)\n天园(üan)；涟(ian)年(ian)\n看(an)饭(an)\n缎(uan)换(uan)见(ian)\n看(an)仙(ian)钱(ian)年(ian)\n杆(an)搀(an)毡(an)前(ian)鞍(an)安(an)先(ian)\n元(üan)含(an)官(uan)\n山(an)三边(ian)棺(uan)仙(ian)边(ian)三扦(ian)烟(ian)幡(an)全(üan)三船(uan)杆(an)穿(uan)纤(ian)搬(an)男(an)万(uan)三莲(ian)天\n难(an)嫌(ian)前(ian)难(an)番(an)嫌(ian)眼(ian)粘(an)干(an)三咱(an)蒜(uan)嫌(ian)涎(ian)咽(ian)天变(ian)间(ian)馋(an)烂(an)前(ian)嫌(ian)寒(an)酸(uan)钻(uan)难(an)言(ian)遍(ian)寒(an)缠(an)痰(an)咱(an)前(ian)年(ian)酸(uan)难(an)山(an)完(uan)三烦(an)完(uan)参(an)嫌(ian)年(ian)难(an)传(uan)\n年(ian)丹(an)园(üan)关(uan)',
      } : {
        material: '边端；尖端瓣安\n眼碗\n转(zhuan4)站\n欢单\n暖圆管然烟\n汗站\n欢关团\n圆南杆(gan1)烟山天\n圆线\n奸三\n难(nan2)男联\n面滥按面线转(zhuan4)瓣淡饭\n三烟\n甜钱\n汉干(gan4)汗\n碗脸；碗纂\n寒丸\n圆甜连\n年圆\n点眼\n碗眼\n匾馆；殿监(jian4)；签县\n淡面\n还南\n辕钱；南船\n散(san04)见(jian04)\n面转(zhuan4)碗\n钱帘；弦船；鞍天\n战线窜(cuan4)\n钱还\n圆钱\n面线转(zhuan4)瓣碗鞭砖山\n干(gan4)弹(dan4)万\n汉饭\n难(nan2)干(gan1)\n天山毡盘幡全餐\n三衫\n钱船钱烟钱年\n坛元\n转(zhuan4)饭\n眼赶钱管眼\n镰纂\n汉蛋\n伞纂\n站沿(yan4)船半\n弯边天\n钱看劝\n盘年\n钱南\n烟湾；烟奶(nai03)\n转(zhuan4)毽天扇(shan4)\n半钻(zuan4)半半半散(san4)\n难(nan2)转(zhuan4)蹿见天\n善面蒜念；善蛋\n毡砖颤(zhan4)天\n脸碱饭蛋\n喊管\n天前眠；边前\n全年完\n尖圆丹南\n眼反\n肩边毡天寒难(nan2)天；板卷(juan3)\n面片(pian4)线转(zhuan4)瓣碗眼；砖鞭烟\n三关\n三边\n涟(lian1♡←2)怜\n尖关山\n尖圆丹鞭\n盘员\n线看\n衫湾\n碗眼\n边天\n天山杆(gan1)砖\n酸蛋(dan1♡)\n山饭碗\n圆怜年\n馋年天三粘(zhan1)\n看劝\n软眼\n片(pian4)蛋\n片(pian4)沿蛋\n钱烟钱年\n咸酸圆汉山盐\n钱莲边；边扇(shan1)扇(shan1)\n短晚\n谭袁\n三捐\n三天\n三烟\n燕线\n年钱\n汗颤(zhan4)便\n店面\n三万\n看蛋\n短眼\n丹元\n天园；涟(lian1♡←2)年\n看饭\n缎换见\n看仙钱年\n杆(gan1)搀毡前鞍安先\n元含官\n山三边棺仙边三扦烟幡全三船杆(gan1)穿纤搬男万三莲天\n难(nan2)嫌前难(nan2)番嫌眼粘(zhan1)干(gan1)三咱蒜嫌涎咽(yan4)天变间(jian1)馋烂前嫌寒酸钻(zuan1)难(nan2)言遍寒缠痰咱前年酸难(nan2)山完三烦完参(can1)嫌年难(nan2)传(chuan2)\n年丹园关',
        dictionary: '边 bian1\n端 duan1\n尖 jian1\n瓣 ban4\n安 an1\n眼 yan3\n碗 wan3\n要 yao4\n臊 sao4\n站 zhan4\n欢 huan1\n单 dan1\n暖 nuan3\n圆 yuan2\n管 guan3\n然 ran2\n烟 yan1\n汗 han4\n关 guan1\n业 ye4\n团 tuan2\n南 nan2\n山 shan1\n天 tian1\n线 xian4\n奸 jian1\n三 san1\n男 nan2\n联 lian2\n面 mian4\n滥 lan4\n按 an4\n淡 dan4\n饭 fan4\n甜 tian2\n钱 qian2\n汉 han4\n脸 lian3\n纂 zuan3\n寒 han2\n丸 wan2\n连 lian2\n年 nian2\n点 dian3\n匾 bian3\n馆 guan3\n殿 dian4\n签 qian1\n县 xian4\n还 huan2\n辕 yuan2\n船 chuan2\n帘 lian2\n弦 xian2\n鞍 an1\n战 zhan4\n鞭 bian1\n砖 zhuan1\n万 wan4\n毡 zhan1\n盘 pan2\n幡 fan1\n全 quan2\n餐 can1\n衫 shan1\n坛 tan2\n元 yuan2\n赶 gan3\n镰 lian2\n蛋 dan4\n伞 san3\n半 ban4\n弯 wan1\n看 kan4\n劝 quan4\n湾 wan1\n毽 jian4\n蹿 cuan1\n见 jian4\n善 shan4\n蒜 suan4\n念 nian4\n碱 jian3\n喊 han3\n前 qian2\n眠 mian2\n完 wan2\n丹 dan1\n反 fan3\n肩 jian1\n板 ban3\n怜 lian2\n员 yuan2\n酸 suan1\n馋 chan2\n软 ruan3\n沿 yan2\n咸 xian2\n盐 yan2\n莲 lian2\n短 duan3\n晚 wan3\n谭 tan2\n袁 yuan2\n捐 juan1\n燕 yan4\n便 bian4\n店 dian4\n园 yuan2\n缎 duan4\n换 huan4\n仙 xian1\n搀 chan1\n先 xian1\n含 han2\n官 guan1\n棺 guan1\n扦 qian1\n穿 chuan1\n纤 xian1\n搬 ban1\n嫌 xian2\n番 fan1\n咱 zan2\n涎 xian2\n变 bian4\n烂 lan4\n言 yan2\n遍 bian4\n缠 chan2\n痰 tan2\n烦 fan2',
      },
      'rime-name-only-check': {
        material: '庚二 庚二 庚二 庚二\n庚二 庚二\n庚二 庚二\n耕 庚二 庚二 庚二\n青 青 青 青\n清 庚三\n清 庚三 庚莊 清 清 清 清\n清 清 庚三\n庚三 清 庚三\n清 庚三\n清 庚三 清 庚莊 清\n清 庚三 庚三 庚三 清 清\n清 庚三\n庚三 清\n清 清 清\n清 清 清\n清 清 清 清\n青 青 庚三 青 青 清 青 清 青\n庚三 清 青 清 清 清\n耕 耕 庚三\n耕 清 清 庚三 清 清 清'
      },
      'rime-count-only-check': {
        material: ' 字次 青 清 庚莊 庚三 耕 庚二\n青 18 5\n清 59 6 17\n庚莊 4  3 \n庚三 23 2 15 1 2\n耕 5  1  1 1\n庚二 15     1 7',
      },
    }[document.querySelector('input[name="annotation-type"]:checked').id]),
  };
  const okToWriteSample = Object.keys(sample).every(key =>
    inputs[key].value === '' ||
    inputs[key].value === sample[key] ||
    inputs[key].value === defaultSample[key]
  );
  if (!okToWriteSample && !confirm('示例資料會覆蓋現有資料，確認加載？')) return false;
  Object.keys(sample).forEach(key => { inputs[key].value = sample[key]; });
  if (!writeDefaultSampleOnly) {
    document.getElementById('countTotal').value = 1000;
    document.getElementById('simplified-check').checked = isPinyin;
  }
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

function fixCount() {
  Object.keys(rimeCounts).forEach(rime1 => {
    if (isNaN(rimeCounts[rime1])) return;
    rimeCounts[rime1] = Object.keys(rimeCounts).reduce((rimeCount, rime2) => {
      let pairCount = pairCounts[getPair(rime1, rime2)] || 0;
      if (rime1 === rime2) pairCount *= 2;
      return rimeCount + pairCount;
    }, 0);
  });
}

// 複製韻譜或無標注的字
function copy(isGetUnannotated = false, rimeNameOnly = false) {
  const txt = isGetUnannotated ? getUnannotated().join('\n') : materialToText(rimeNameOnly);
  function copyFailed() { alert('瀏覽器不支援複製到剪貼簿，操作失敗'); }
  function copySuccess() { confirm('已成功複製到剪貼簿'); }
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
