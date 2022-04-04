let rimeCounts = [];
let pairCounts = [];
let rimes = '';
let rimesMini = '';

// 從文本框中讀入數據
function loadData() {
  rimeCounts = [];
  pairCounts = [];
  rimes = '';
  rimesMini = '';
  let material = document.getElementById('material');
  let rimeNames = document.getElementById('rimeNames');
  let rimeNamesMini = document.getElementById('rimeNamesMini');
  if (material.value) {
    material.value.split('\n').forEach(line => {
      line = splitRimeNames(line);
      let rime1 = line[0];
      line.slice(1).forEach(rime2 => {
        let pair = getPair(rime1, rime2);
        rimeCounts[rime1] = (rimeCounts[rime1] || 0) + 1;
        rimeCounts[rime2] = (rimeCounts[rime2] || 0) + 1;
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
        rime1 = rime2;
      });
    });
    // 留空時，使用 rimeCounts 的全部 keys
    rimes = rimeNames.value ? splitRimeNames(rimeNames.value) : Object.keys(rimeCounts);
    rimesMini = rimeNamesMini.value;
  }
}

// 拆分（解析）韻類名
function splitRimeNames(rimeNames) {
  // 支持的格式：
  //  腳(韻)腳(韻)腳(韻)
  //  韻,韻,韻
  //  韻\t韻\t韻
  //  韻 韻 韻
  //  韻韻韻
  rimeNames = rimeNames.replace(/.\(|\)|,|\t/g, ' ');
  rimeNames = rimeNames.replace(/ +/g, ' ');
  return rimeNames.trim().split(rimeNames.includes(' ') ? ' ' : '');
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
function getCellRimeName(content, rimeNamesMini = '', isTh = false) {
  if (!content) return getCell();
  content = content.split('').map(e => { return rimeNamesMini.includes(e) ? `(${e})` : e; }).join('');
  content = content.replace(/\)\(/g, '');
  content = content.replace(/\(/g, '<span class="inline-note">');
  content = content.replace(/\)/g, '</span>');
  return getCell(content, isTh, 'rime-name');
}

function gen(reloadData = false) {
  let checkKeys = ['show-tf', 'combine', 'hide-half-bkgd', 'hide-zero'];
  let checks = [];
  let output = document.getElementById('output');
  output.classList = '';
  checkKeys.forEach(key => {
    let checked = document.getElementById(key + '-check').checked;
    if (checked) {
      output.classList.add(key);
    }
    // 轉換爲駝峰式
    checks[key.replace(/-./g, s => { return s[1].toUpperCase(); })] = checked;
  });
  if (reloadData) {
    loadData();
    output.style.display = '';
  }
  genTable(checks);
  arrangeOutput(true);
}

// 生成離合指數表
function genTable(checks) {
  // 重設表格
  let table = document.getElementById('table');
  if (!rimes) {
    table.innerHTML = '<tr style="color: red;"><th><span>請正確輸入韻段！</span></th></tr>';
    return;
  }
  table.innerHTML = '';

  // 生成表格
  let headRow = document.createElement('tr');
  headRow.appendChild(getCell('', true));
  headRow.appendChild(getCell('字次', true));
  table.appendChild(headRow);

  rimes.forEach((rime1, i) => {
    headRow.appendChild(getCellRimeName(rime1, rimesMini, true));
    let count1 = rimeCounts[rime1] || 0;
    let row = document.createElement('tr');
    row.appendChild(getCellRimeName(rime1, rimesMini));
    row.appendChild(getCellValue(count1));
    rimes.forEach((rime2, j) => {
      let count2 = rimeCounts[rime2] || 0;
      let count11 = pairCounts[getPair(rime1, rime1)] || 0;
      let count12 = pairCounts[getPair(rime1, rime2)] || 0;
      let count22 = pairCounts[getPair(rime2, rime2)] || 0;
      let cell = null;
      let [idx, chi2, idxResult, chi2TestResult] = getResult(count1, count2, count11, count12, count22);
      let result = idxResult || chi2TestResult;

      if (count12 === 0 && (checks.combine || checks.hideZero)) {
        count12 = '';
      }
      // 下面先按合併押韻次數和離合指數生成單元格
      if (isNaN(idx)) {
        cell = getCellValue('/');
        cell.classList.add('cell-nan');
      } else {
        cell = getCellValue(i === j ? '/' : idx.toFixed());
        // 生成上標（韻次）
        if (checks.combine && count12 !== '') {
          let sup = document.createElement('sup');
          sup.innerText = count12;
          cell.appendChild(sup);
        }
        // 生成下標（檢驗結果）
        if (i !== j) {
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
          cell.classList.add('cell-' + result[0].toLowerCase() + (result.includes('*') ? '-star' : ''));
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

  let table = document.getElementById('table');
  [1, 2].forEach(i => { output.classList.remove('narrow' + i); });
  output.style.gridRow = '1 / span 3';
  output.style.gridColumn = '2';
  instruction.style.gridColumn = '1';
  if (output.firstElementChild.offsetHeight < input.offsetHeight) {
    // output 不夠高則 instruction 佔滿兩列
    output.style.gridRow = '1';
    instruction.style.gridColumn = '1 / span 2';
  }
  if (table.offsetLeft + table.offsetWidth + 20 > document.body.offsetWidth) {
    // 窗口不夠寬則將 output 挪至 input 下方
    output.style.gridRow = '';
    output.style.gridColumn = '1 / span 2';
    // 仍不夠寬則減小單元格寬度
    [1, 2].forEach(i => {
      if (table.offsetLeft + table.offsetWidth + 20 > document.body.offsetWidth) {
        output.classList.add('narrow' + i);
      }
    });
    instruction.style.gridColumn = document.body.offsetWidth <= 470 ? '1' : '1 / span 2';
  }
}
