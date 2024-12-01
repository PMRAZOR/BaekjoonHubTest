// 브라우저 호환성
if (typeof browser === 'undefined') {
  var browser = chrome;
}

/**
 * DOM 요소 찾기 헬퍼 함수
 * @param {string} selector - CSS 선택자
 * @returns {Element|null}
 */
function findElement(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error('Error finding element:', error);
    return null;
  }
}
window.isNull = function(obj) {
  return obj === null || obj === undefined;
};

window.isEmpty = function(obj) {
  return isNull(obj) || obj.length === 0;
};

window.preProcessEmptyObj = function(obj) {
  return obj || {};
};
// util.js에 추가
window.langVersionRemove = function(lang, ignores = null) {
  try {
    if (ignores === null || !ignores.has(lang)) {
      let parts = lang.split(' ');
      if (/^\d/.test(parts[parts.length - 1])) {
        parts.pop();
      }
      lang = parts.join(' ');
    }
    return lang;
  } catch (error) {
    console.error('Error in langVersionRemove:', error);
    return lang; // 오류 발생시 원본 반환
  }
};

// 관련 유틸리티 함수들도 추가
window.convertSingleCharToDoubleChar = function(str) {
  try {
    return str.replace(/[/\\:*?"<>|]/g, '_');
  } catch (error) {
    console.error('Error in convertSingleCharToDoubleChar:', error);
    return str;
  }
};

window.getDirNameByOrgOption = async function(defaultPath, language) {
  try {
    const data = await browser.storage.local.get('BaekjoonHub_OrgOption');
    const option = data.BaekjoonHub_OrgOption || 'platform';
    
    if (option === 'language') {
      return `백준/${language}/${defaultPath.split('/').pop()}`;
    }
    return defaultPath;
  } catch (error) {
    console.error('Error in getDirNameByOrgOption:', error);
    return defaultPath;
  }
};

window.parseNumberFromString = function(str) {
  try {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : NaN;
  } catch (error) {
    console.error('Error in parseNumberFromString:', error);
    return NaN;
  }
};

window.unescapeHtml = function(str) {
  try {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'");
  } catch (error) {
    console.error('Error in unescapeHtml:', error);
    return str;
  }
};

window.maxValuesGroupBykey = function(array, key, compareFn) {
  try {
    const groups = {};
    array.forEach(item => {
      const groupKey = item[key];
      if (!groups[groupKey] || compareFn(groups[groupKey], item) > 0) {
        groups[groupKey] = item;
      }
    });
    return Object.values(groups);
  } catch (error) {
    console.error('Error in maxValuesGroupBykey:', error);
    return [];
  }
};
/**
 * 로딩 버튼 추가
 */
window.startUpload = function() {
  try {
    console.log('Starting upload process...');
    let elem = document.getElementById('BaekjoonHub_progress_anchor_element');
    
    if (!elem) {
      elem = document.createElement('span');
      elem.id = 'BaekjoonHub_progress_anchor_element';
      elem.className = 'runcode-wrapper__8rXm';
      elem.style.cssText = 'margin-left: 10px; padding-top: 0px; display: inline-block;';
    }

    elem.innerHTML = `<div id="BaekjoonHub_progress_elem" class="BaekjoonHub_progress"></div>`;

    // 여러 가능한 위치 시도
    const possibleTargets = [
      document.querySelector('#status-table tbody tr td:nth-child(4)'),
      document.querySelector('div.table-responsive > table > tbody > tr > td:nth-child(5)'),
      document.querySelector('.result-text')  // 새로운 선택자 추가
    ];

    const target = possibleTargets.find(t => t);
    
    if (!target) {
      console.error('Upload target element not found');
      return;
    }

    // 기존 progress 요소가 있다면 제거
    const existingProgress = document.getElementById('BaekjoonHub_progress_anchor_element');
    if (existingProgress) {
      existingProgress.remove();
    }

    target.appendChild(elem);
    console.log('Upload indicator added to DOM');
    startUploadCountDown();
  } catch (error) {
    console.error('Error in startUpload:', error);
  }
};

/**
 * 업로드 완료 아이콘 표시 및 링크 생성
 */
window.markUploadedCSS = function(branches, directory) {
  try {
    uploadState.uploading = false;
    const elem = document.getElementById('BaekjoonHub_progress_elem');
    if (!elem) {
      console.error('Progress element not found');
      return;
    }

    elem.className = 'markuploaded';
    
    const uploadedUrl = "https://github.com/" +
      Object.keys(branches)[0] + "/tree/" + 
      branches[Object.keys(branches)[0]] + "/" + directory;

    // 상태 텍스트 추가
    const statusText = document.createElement('span');
    statusText.className = 'upload-status-text';
    statusText.textContent = '업로드 완료!';
    elem.parentElement.appendChild(statusText);

    // 클릭 이벤트 추가
    elem.addEventListener('click', function() {
      window.open(uploadedUrl, '_blank');
    });
    
    elem.style.cursor = 'pointer';
    
    // 툴팁 추가
    elem.title = '깃허브에서 보기';

    console.log('Upload completed, URL:', uploadedUrl);
  } catch (error) {
    console.error('Error in markUploadedCSS:', error);
  }
};

/**
 * 업로드 실패 아이콘 표시
 */
window.markUploadFailedCSS = function() {
  try {
    uploadState.uploading = false;
    const elem = document.getElementById('BaekjoonHub_progress_elem');
    if (!elem) {
      console.error('Progress element not found');
      return;
    }

    elem.className = 'markuploadfailed';
    
    // 상태 텍스트 추가
    const statusText = document.createElement('span');
    statusText.className = 'upload-status-text';
    statusText.textContent = '업로드 실패';
    statusText.style.color = '#e74c3c';
    elem.parentElement.appendChild(statusText);

    console.log('Upload failed');
  } catch (error) {
    console.error('Error in markUploadFailedCSS:', error);
  }
};

/**
 * 업로드 카운트다운 시작
 */
function startUploadCountDown() {
  try {
    uploadState.uploading = true;
    uploadState.countdown = setTimeout(() => {
      if (uploadState.uploading) {
        markUploadFailedCSS();
      }
    }, 10000);
  } catch (error) {
    console.error('Error in upload countdown:', error);
  }
}

// 제출 관련 유틸리티 함수들
const compareSubmission = (a, b) => {
  try {
    return hasNotSubtask(a.result, b.result)
      ? a.runtime === b.runtime
        ? a.memory === b.memory
          ? a.codeLength === b.codeLength
            ? -(a.submissionId - b.submissionId)
            : a.codeLength - b.codeLength
          : a.memory - b.memory
        : a.runtime - b.runtime
      : compareResult(a.result, b.result);
  } catch (error) {
    console.error('Error comparing submissions:', error);
    return 0;
  }
};

function hasNotSubtask(a, b) {
  try {
    const numA = parseNumberFromString(a);
    const numB = parseNumberFromString(b);
    return isNaN(numA) && isNaN(numB);
  } catch (error) {
    console.error('Error checking subtask:', error);
    return true;
  }
}

function compareResult(a, b) {
  try {
    const numA = parseNumberFromString(a);
    const numB = parseNumberFromString(b);

    if (typeof numA === 'number' && typeof numB === 'number') return -(numA - numB);
    if (isNaN(numB)) return -1;
    if (isNaN(numA)) return 1;
    return 0;
  } catch (error) {
    console.error('Error comparing results:', error);
    return 0;
  }
}

function selectBestSubmissionList(submissions) {
  try {
    if (!submissions?.length) return [];
    return maxValuesGroupBykey(submissions, 'problemId', (a, b) => -compareSubmission(a, b));
  } catch (error) {
    console.error('Error selecting best submissions:', error);
    return [];
  }
}

// 변환 유틸리티 함수들
function convertResultTableHeader(header) {
  const headerMap = {
    '문제번호': 'problemId',
    '문제': 'problemId',
    '난이도': 'level',
    '결과': 'result',
    '문제내용': 'problemDescription',
    '언어': 'language',
    '제출 번호': 'submissionId',
    '아이디': 'username',
    '제출시간': 'submissionTime',
    '제출한 시간': 'submissionTime',
    '시간': 'runtime',
    '메모리': 'memory',
    '코드 길이': 'codeLength'
  };
  return headerMap[header] || 'unknown';
}

function convertImageTagAbsoluteURL(doc) {
  try {
    if (!doc) return;
    const images = doc.getElementsByTagName('img');
    Array.from(images).forEach(img => {
      if (img.currentSrc) {
        img.setAttribute('src', img.currentSrc);
      }
    });
  } catch (error) {
    console.error('Error converting image URLs:', error);
  }
}

function getDateString(date) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date).replace(/\./g, '년 ').replace(/\./g, '월 ').replace(/\./g, '일 ');
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toISOString();
  }
}