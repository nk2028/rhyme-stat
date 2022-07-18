// 計算韻離合指數（rhyme mixing index）
function calcIdx(count1, count2, count11, count12, count22) {
  // count1, count2: 字次
  // count11, count12, count22: 韻次
  // 若韻次之和爲 0，則返回 NaN

  // 理論互押概率（假如兩韻無別）
  let p = (2 * count1 * count2) / ((count1 + count2) * (count1 + count2 - 1));

  // 實際互押頻率
  let r = count12 / (count11 + count12 + count22);

  // 離合指數
  let idx = (r / p) * 100;
  return idx;
}

// 計算轍離合指數（rhyme group mixing index）
function calcGroupIdx(count1, count2, count12, countTotal) {
  // count1, count2: 字次
  // count12: 韻次
  // countTotal: 總字次
  return count12 * (countTotal - 1) / (count1 * count2);
}

// 計算 χ² 值
function calcChi2(o11, o12, o22) {
  // o：observed
  // e：expected
  let sum = o11 + o12 + o22;
  let factor1 = (2 * o11 + o12) / 2 / sum;
  let factor2 = (2 * o22 + o12) / 2 / sum;
  let e11 = sum * factor1 * factor1;
  let e22 = sum * factor2 * factor2;
  let e12 = sum * factor1 * factor2 * 2;
  let chi2 =
    (o11 - e11) ** 2 / e11 +
    (o12 - e12) ** 2 / e12 +
    (o22 - e22) ** 2 / e22;
  return chi2;
}

// 獲取韻離合指數和檢驗結果
function getResult(count1, count2, count11, count12, count22) {
  let idx = calcIdx(count1, count2, count11, count12, count22);
  let chi2 = calcChi2(count11, count12, count22);
  let idxResult = '';
  let chi2TestResult = '';
  if (idx >= 90) {
    idxResult = 'T';
  } else if (idx < 50) {
    idxResult = 'F';
  } else {
    if (chi2 < 7.378) {
      chi2TestResult = chi2 < 4.605 ? 'T' : 'T*';
    } else {
      chi2TestResult = chi2 > 10.597 ? 'F' : 'F*';
    }
  }
  return [idx, chi2, idxResult, chi2TestResult];
}

// 獲取轍離合指數
function getGroupResult(count1, count2, count12, countTotal) {
  let idx = calcGroupIdx(count1, count2, count12, countTotal);
  let idxResult = '';
  if (idx >= 2) {
    idxResult = 'T';
  } else if (idx >= 1.5) {
    idxResult = 'T*';
  } else if (idx >= 1) {
    idxResult = 'F*';
  } else {
    idxResult = 'F';
  }
  return [idx, null, idxResult, null];
}
