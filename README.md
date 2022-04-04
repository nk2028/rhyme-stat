# rhyme-stat

A tool to analyze rhyming material using statistical methods.

## Statistical Methods

- Rhyme mixing index 韻離合指數, proposed by Zhu Xiaonong 朱曉農[^1][^2]

- *χ*² test, introduced by William H. Baxter[^2][^3]

## Sample Input

各韻段的韻腳所屬韻類 (rhyme categories of rhyme words from rhyming material):

```
衡(庚二)横(庚二)亨(庚二)行(庚二)
客(庚二)陌(庚二)
泽(庚二)客(庚二)
鳠(耕)頟(庚二)白(庚二)宅(庚二)
形(青)灵(青)冥(青)龄(青)
声(清)英(庚三)
诚(清)明(庚三)牲(庚莊)缨(清)盈(清)声(清)并(清)
声(清)精(清)英(庚三)
英(庚三)清(清)平(庚三)
城(清)鸣(庚三)
盈(清)平(庚三)声(清)生(庚莊)成(清)
岭(清)秉(庚三)景(庚三)永(庚三)聘(清)请(清)
圣(清)命(庚三)
碧(清)石(清)
辟(清)籍(清)役(清)
积(清)石(清)脊(清)
适(清)尺(清)迹(清)石(清)
嵉(青)星(青)平(庚三)形(青)经(青)成(清)垧(青)萦(清)青(青)
明(庚三)成(清)灵(青)盈(清)声(清)情(清)
茎(耕)莺(耕)惊(庚三)
摘(耕)襞(清)射(清)隙(庚三)席(清)役(清)惜(清)
```

要在結果中顯示的韻類 (rhyme categories to show):

```
青 清 庚莊 庚三 耕 庚二
```

This material is all rhyme words in _kaengq_ classes 梗攝 by Shen Yue 沈約[^4].

[^1]: 朱曉農. 北宋中原韻轍考, pp. 34–37.
[^2]: 張建坤. 齊梁陳隋押韻材料的數理分析, pp. 11–18.
[^3]: William H. Baxter. _A Handbook of Old Chinese Phonology_, pp. 87–137.
[^4]: 張建坤. 齊梁陳隋押韻材料的數理分析, pp. 227–234 & 293–294.
