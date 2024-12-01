// 브라우저 호환성
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// 결과 테이블 파싱 함수를 window 객체에 등록
window.parsingResultTableList = function(doc) {
  const table = doc.getElementById('status-table');
  if (!table) return [];

  const headers = Array.from(table.rows[0].cells, (x) => convertResultTableHeader(x.innerText.trim()));

  const list = [];
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const cells = Array.from(row.cells, (x, index) => {
      switch (headers[index]) {
        case 'result':
          return {
            result: x.innerText.trim(),
            resultCategory: x.firstChild.getAttribute('data-color').replace('-eng', '').trim()
          };
        case 'language':
          return x.innerText.unescapeHtml().replace(/\/.*$/g, '').trim();
        case 'submissionTime':
          const el = x.querySelector('a.show-date');
          if (!el) return null;
          return el.getAttribute('data-original-title');
        case 'problemId':
          const a = x.querySelector('a.problem_title');
          if (!a) return null;
          return {
            problemId: a.getAttribute('href').replace(/^.*\/([0-9]+)$/, '$1'),
          };
        default:
          return x.innerText.trim();
      }
    });

    let obj = {
      elementId: row.id
    };

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cells[j];
    }
    obj = { ...obj, ...obj.result, ...obj.problemId };
    list.push(obj);
  }

  log('TableList', list);
  return list;
};

// 결과 테이블 존재 여부 확인 함수를 window 객체에 등록
window.isExistResultTable = function() {
  return document.getElementById('status-table') !== null;
};

// 결과 테이블에서 데이터 찾기 함수를 window 객체에 등록
window.findFromResultTable = function() {
  if (!window.isExistResultTable()) {
    log('Result table not found');
    return [];
  }
  return window.parsingResultTableList(document);
};

// parsing.js

// findData 함수를 window 객체에 등록
window.findData = async function(data) {
  try {
    if (isNull(data)) {
      let table = window.findFromResultTable();
      if (isEmpty(table)) return null;
      table = filter(table, {
        'resultCategory': RESULT_CATEGORY.RESULT_ACCEPTED,
        'username': findUsername(),
        'language': table[0]["language"]
      });
      data = selectBestSubmissionList(table)[0];
    }

    if (isNaN(Number(data.problemId)) || Number(data.problemId) < 1000) {
      throw new Error(`정책상 대회 문제는 업로드 되지 않습니다. 대회 문제가 아니라고 판단된다면 이슈로 남겨주시길 바랍니다.\n문제 ID: ${data.problemId}`);
    }

    data = { 
      ...data, 
      ...await findProblemInfoAndSubmissionCode(data.problemId, data.submissionId) 
    };
    const detail = await makeDetailMessageAndReadme(preProcessEmptyObj(data));
    return { ...data, ...detail };
  } catch (error) {
    console.error('Error in findData:', error);
    return null;
  }
};

// 관련 헬퍼 함수들도 window 객체에 등록
window.findUsername = function() {
  const el = document.querySelector('a.username');
  if (isNull(el)) return null;
  const username = el?.innerText?.trim();
  if (isEmpty(username)) return null;
  return username;
};

window.filter = function(array, conditions) {
  return array.filter(item => {
    return Object.entries(conditions).every(([key, value]) => item[key] === value);
  });
};

window.selectBestSubmissionList = function(submissions) {
  if (isNull(submissions) || submissions.length === 0) return [];
  return maxValuesGroupBykey(submissions, 'problemId', (a, b) => -compareSubmission(a, b));
};

window.findProblemInfoAndSubmissionCode = async function(problemId, submissionId) {
  try {
    if (!isNull(problemId) && !isNull(submissionId)) {
      const [description, code, solvedJson] = await Promise.all([
        getProblemDescriptionById(problemId),
        getSubmitCodeById(submissionId),
        getSolvedACById(problemId)
      ]);

      const problem_tags = solvedJson.tags
        .flatMap((tag) => tag.displayNames)
        .filter((tag) => tag.language === 'ko')
        .map((tag) => tag.name);

      const title = solvedJson.titleKo;
      const level = bj_level[solvedJson.level];

      const { problem_description, problem_input, problem_output } = description;
      
      return {
        problemId,
        submissionId,
        title,
        level,
        code,
        problem_description,
        problem_input,
        problem_output,
        problem_tags
      };
    }
    return null;
  } catch (err) {
    console.error('Error in findProblemInfoAndSubmissionCode:', err);
    uploadState.uploading = false;
    markUploadFailedCSS();
    throw err;
  }
};

window.makeDetailMessageAndReadme = async function(data) {
  const {
    problemId, submissionId, result, title, level, problem_tags,
    problem_description, problem_input, problem_output, submissionTime,
    code, language, memory, runtime
  } = data;

  const score = parseNumberFromString(result);
  const directory = await getDirNameByOrgOption(
    `백준/${level.replace(/ .*/, '')}/${problemId}. ${convertSingleCharToDoubleChar(title)}`,
    langVersionRemove(language, null)
  );

  const message = `[${level}] Title: ${title}, Time: ${runtime} ms, Memory: ${memory} KB`
    + ((isNaN(score)) ? ' ' : `, Score: ${score} point `)
    + `-BaekjoonHub`;

  const category = problem_tags.join(', ');
  const fileName = `${convertSingleCharToDoubleChar(title)}.${languages[language]}`;
  const dateInfo = submissionTime ?? getDateString(new Date(Date.now()));

  const readme = `# [${level}] ${title} - ${problemId} \n\n`
    + `[문제 링크](https://www.acmicpc.net/problem/${problemId}) \n\n`
    + `### 성능 요약\n\n`
    + `메모리: ${memory} KB, `
    + `시간: ${runtime} ms\n\n`
    + `### 분류\n\n`
    + `${category || "Empty"}\n\n`
    + (!!problem_description ? ''
    + `### 제출 일자\n\n`
    + `${dateInfo}\n\n`
    + `### 문제 설명\n\n${problem_description}\n\n`
    + `### 입력 \n\n ${problem_input}\n\n`
    + `### 출력 \n\n ${problem_output}\n\n` : '');

  return {
    directory,
    fileName,
    message,
    readme,
    code
  };
};
// parsing.js에 추가

window.getProblemDescriptionById = async function(problemId) {
  let problem = await getProblemFromStats(problemId);
  if (isNull(problem)) {
    problem = await fetchProblemDescriptionById(problemId);
    updateProblemsFromStats(problem); // not await
  }
  return problem;
};

window.fetchProblemDescriptionById = async function(problemId) {
  try {
    const response = await fetch(`https://www.acmicpc.net/problem/${problemId}`);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return parseProblemDescription(doc);
  } catch (error) {
    console.error('Error fetching problem description:', error);
    return null;
  }
};

window.getSubmitCodeById = async function(submissionId) {
  let code = await getSubmitCodeFromStats(submissionId);
  if (isNull(code)) {
    code = await fetchSubmitCodeById(submissionId);
    updateSubmitCodeFromStats({ submissionId, code }); // not await
  }
  return code;
};

window.fetchSubmitCodeById = async function(submissionId) {
  try {
    const response = await fetch(`https://www.acmicpc.net/source/download/${submissionId}`, {
      method: 'GET'
    });
    return response.text();
  } catch (error) {
    console.error('Error fetching submit code:', error);
    return null;
  }
};

window.getSolvedACById = async function(problemId) {
  try {
    let jsonData = await getSolvedACFromStats(problemId);
    if (!jsonData) {
      console.log('Fetching SolvedAC data for problem:', problemId);
      jsonData = await fetchSolvedACById(problemId);
      console.log('Received SolvedAC data:', jsonData);
      
      if (jsonData && !jsonData.error) {
        await updateSolvedACFromStats({ problemId, jsonData });
      } else {
        console.warn('Invalid SolvedAC data received');
        return null;
      }
    }
    return jsonData;
  } catch (error) {
    console.error('Error getting SolvedAC data:', error);
    return null;
  }
};

window.fetchSolvedACById = async function(problemId) {
  try {
    const response = await browser.runtime.sendMessage({
      sender: "baekjoon",
      task: "SolvedApiCall",
      problemId: problemId
    });
    
    if (response && response.error) {
      throw new Error(response.error);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching SolvedAC data:', error);
    return null;
  }
};

window.fetchSolvedACById = async function(problemId) {
  try {
    return await browser.runtime.sendMessage({
      sender: "baekjoon",
      task: "SolvedApiCall",
      problemId: problemId
    });
  } catch (error) {
    console.error('Error fetching SolvedAC data:', error);
    return null;
  }
};

window.parseProblemDescription = function(doc = document) {
  try {
    convertImageTagAbsoluteURL(doc.getElementById('problem_description'));
    const problemId = doc.getElementsByTagName('title')[0].textContent.split(':')[0].replace(/[^0-9]/, '');
    const problem_description = unescapeHtml(doc.getElementById('problem_description').innerHTML.trim());
    const problem_input = doc.getElementById('problem_input')?.innerHTML.trim?.().unescapeHtml?.() || 'Empty';
    const problem_output = doc.getElementById('problem_output')?.innerHTML.trim?.().unescapeHtml?.() || 'Empty';

    if (problemId && problem_description) {
      log(`문제번호 ${problemId}의 내용을 저장합니다.`);
      updateProblemsFromStats({ problemId, problem_description, problem_input, problem_output});
      return { problemId, problem_description, problem_input, problem_output};
    }
    return {};
  } catch (error) {
    console.error('Error parsing problem description:', error);
    return {};
  }
};

// storage.js 관련 함수들도 window에 등록
window.getProblemFromStats = async function(problemId) {
  try {
    return await problemCache.get(problemId);
  } catch (error) {
    console.error('Error getting problem from stats:', error);
    return null;
  }
};

window.getSubmitCodeFromStats = async function(submissionId) {
  try {
    const result = await submitCodeCache.get(submissionId);
    return result?.data;
  } catch (error) {
    console.error('Error getting submit code from stats:', error);
    return null;
  }
};

window.getSolvedACFromStats = async function(problemId) {
  try {
    const result = await SolvedACCache.get(problemId);
    return result?.data;
  } catch (error) {
    console.error('Error getting SolvedAC data from stats:', error);
    return null;
  }
};

window.updateProblemsFromStats = async function(problem) {
  try {
    const data = {
      id: problem.problemId,
      problem_description: problem.problem_description,
      problem_input: problem.problem_input,
      problem_output: problem.problem_output,
    };
    await problemCache.update(data);
  } catch (error) {
    console.error('Error updating problems stats:', error);
  }
};

window.updateSubmitCodeFromStats = async function(obj) {
  try {
    const data = {
      id: obj.submissionId,
      data: obj.code,
    };
    await submitCodeCache.update(data);
  } catch (error) {
    console.error('Error updating submit code stats:', error);
  }
};

window.updateSolvedACFromStats = async function(obj) {
  try {
    const data = {
      id: obj.problemId,
      data: obj.jsonData,
    };
    await SolvedACCache.update(data);
  } catch (error) {
    console.error('Error updating SolvedAC stats:', error);
  }
};

// fetchSolvedACById 함수 수정
async function fetchSolvedACById(problemId) {
  try {
    return await browser.runtime.sendMessage({
      sender: "baekjoon", 
      task: "SolvedApiCall", 
      problemId: problemId
    });
  } catch (error) {
    console.error('Error fetching SolvedAC data:', error);
    return null;
  }
}

// parsing.js의 parseProblemDescription 함수 수정
window.parseProblemDescription = function(doc = document) {
  try {
    // 문제 설명 요소 찾기 (여러 가능한 ID 시도)
    const descriptionElement = doc.querySelector('#problem_description, #problem-body, .problem-text');
    if (!descriptionElement) {
      console.warn('Problem description element not found');
      return {
        problem_description: 'Problem description not available',
        problem_input: 'Input description not available',
        problem_output: 'Output description not available'
      };
    }

    // 이미지 URL 절대 경로로 변환
    convertImageTagAbsoluteURL(descriptionElement);

    // 문제 ID 찾기
    const problemId = doc.querySelector('title')?.textContent?.split(':')[0]?.replace(/[^0-9]/g, '') ||
                     window.location.pathname.split('/').pop();

    // 문제 설명 파싱
    const problem_description = unescapeHtml(descriptionElement.innerHTML.trim());
    
    // 입력/출력 설명 파싱
    const problem_input = doc.querySelector('#problem_input, .problem-input')?.innerHTML?.trim?.()?.unescapeHtml?.() || 'Input description not available';
    const problem_output = doc.querySelector('#problem_output, .problem-output')?.innerHTML?.trim?.()?.unescapeHtml?.() || 'Output description not available';

    if (problemId) {
      log(`문제번호 ${problemId}의 내용을 저장합니다.`);
      updateProblemsFromStats({ problemId, problem_description, problem_input, problem_output});
      return { problemId, problem_description, problem_input, problem_output};
    }
    return {};
  } catch (error) {
    console.error('Error parsing problem description:', error);
    return {
      problem_description: 'Error parsing problem description',
      problem_input: 'Error parsing input',
      problem_output: 'Error parsing output'
    };
  }
};

window.findProblemInfoAndSubmissionCode = async function(problemId, submissionId) {
  try {
    if (!problemId || !submissionId) {
      throw new Error('Problem ID or Submission ID is missing');
    }

    console.log('Fetching data for problem:', problemId, 'submission:', submissionId);

    // 병렬로 데이터 가져오기
    const [description, code, solvedJson] = await Promise.all([
      getProblemDescriptionById(problemId).catch(err => {
        console.error('Error getting problem description:', err);
        return null;
      }),
      getSubmitCodeById(submissionId).catch(err => {
        console.error('Error getting submit code:', err);
        return null;
      }),
      getSolvedACById(problemId).catch(err => {
        console.error('Error getting SolvedAC data:', err);
        return null;
      })
    ]);

    console.log('Fetched data:', { description, solvedJson });

    // 기본 데이터 구조
    const result = {
      problemId,
      submissionId,
      title: `Problem ${problemId}`,
      level: 'Unrated',
      code: code || '',
      problem_description: description?.problem_description || 'No description available',
      problem_input: description?.problem_input || 'No input description available',
      problem_output: description?.problem_output || 'No output description available',
      problem_tags: []
    };

    // SolvedAC 데이터가 있으면 추가
    if (solvedJson && solvedJson.titleKo) {
      result.title = solvedJson.titleKo;
      result.level = bj_level[solvedJson.level] || 'Unrated';
      result.problem_tags = solvedJson.tags
        ? solvedJson.tags
            .flatMap(tag => tag.displayNames || [])
            .filter(tag => tag.language === 'ko')
            .map(tag => tag.name)
        : [];
    }

    return result;
  } catch (error) {
    console.error('Error in findProblemInfoAndSubmissionCode:', error);
    uploadState.uploading = false;
    markUploadFailedCSS();
    
    // 기본값 반환
    return {
      problemId,
      submissionId,
      title: `Problem ${problemId}`,
      level: 'Unrated',
      code: '',
      problem_description: 'Error loading problem description',
      problem_input: 'Error loading input description',
      problem_output: 'Error loading output description',
      problem_tags: []
    };
  }
};

// findProblemInfoAndSubmissionCode 함수 개선
async function findProblemInfoAndSubmissionCode(problemId, submissionId) {
  log('in find with promise');
  if (!isNull(problemId) && !isNull(submissionId)) {
    try {
      const [description, code, solvedJson] = await Promise.all([
        getProblemDescriptionById(problemId),
        getSubmitCodeById(submissionId),
        getSolvedACById(problemId)
      ]);

      if (!solvedJson || !solvedJson.tags) {
        throw new Error('Invalid SolvedAC data');
      }

      const problem_tags = solvedJson.tags
        .flatMap((tag) => tag.displayNames)
        .filter((tag) => tag.language === 'ko')
        .map((tag) => tag.name);

      const title = solvedJson.titleKo;
      const level = bj_level[solvedJson.level];

      const { problem_description, problem_input, problem_output } = description;
      return { 
        problemId, 
        submissionId, 
        title, 
        level, 
        code, 
        problem_description, 
        problem_input, 
        problem_output, 
        problem_tags 
      };
    } catch (err) {
      console.error('Error in findProblemInfoAndSubmissionCode:', err);
      uploadState.uploading = false;
      markUploadFailedCSS();
      throw err;
    }
  }
  return null;
}

// DOM 요소 접근 함수들 개선
function findUsername() {
  try {
    const el = document.querySelector('a.username');
    return el?.innerText?.trim() || null;
  } catch (error) {
    console.error('Error finding username:', error);
    return null;
  }
}

function findUsernameOnUserInfoPage() {
  try {
    const el = document.querySelector('div.page-header > h1');
    return el?.textContent?.trim() || null;
  } catch (error) {
    console.error('Error finding username on user info page:', error);
    return null;
  }
}

function isExistResultTable() {
  try {
    return !!document.getElementById('status-table');
  } catch (error) {
    console.error('Error checking result table:', error);
    return false;
  }
}