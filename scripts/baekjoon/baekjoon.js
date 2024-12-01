// 브라우저 호환성
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// Set to true to enable console log
const debug = false;

// 전역 변수 선언
let loader;

// 유틸리티 함수들 먼저 선언
async function getStorageData(key) {
  try {
    const data = await browser.storage.local.get(key);
    return data[key];
  } catch (error) {
    console.error(`Error getting ${key} from storage:`, error);
    return null;
  }
}

async function setStorageData(key, value) {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch (error) {
    console.error(`Error setting ${key} in storage:`, error);
  }
}

// stopLoader 함수를 먼저 선언
function stopLoader() {
  if (loader) {
    clearInterval(loader);
    loader = null;
  }
}

function toastThenStopLoader(toastMessage, errorMessage) {
  Toast.raiseToast(toastMessage);
  stopLoader();
  throw new Error(errorMessage);
}

// startLoader 함수
function startLoader() {
  // 이미 실행 중인 로더가 있다면 중지
  if (loader) {
    stopLoader();
  }

  loader = setInterval(async () => {
    try {
      const enable = await checkEnable();
      if (!enable) {
        stopLoader();
        return;
      }

      if (window.isExistResultTable()) {
        const table = window.findFromResultTable();
        if (isEmpty(table)) return;
        
        const data = table[0];
        if (data?.username && data?.resultCategory) {
          const { username, resultCategory } = data;
          if (username === findUsername() &&
            (resultCategory.includes(RESULT_CATEGORY.RESULT_ACCEPTED) ||
             resultCategory.includes(RESULT_CATEGORY.RESULT_ENG_ACCEPTED))) {
            stopLoader();
            console.log('풀이가 맞았습니다. 업로드를 시작합니다.');
            
            const bojData = await findData();
            if (bojData) {
              await beginUpload(bojData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in loader:', error);
      stopLoader();
    }
  }, 2000);
}

// 나머지 함수들
async function checkEnable() {
  try {
    const data = await getStorageData('bjhEnable');
    return data !== false;
  } catch (error) {
    console.error('Error checking enable status:', error);
    return false;
  }
}

async function beginUpload(bojData) {
  try {
    bojData = preProcessEmptyObj(bojData);
    log('bojData', bojData);
    
    if (isNotEmpty(bojData)) {
      const stats = await getStats();
      const hook = await getHook();

      if (!hook) {
        toastThenStopLoader('GitHub 저장소가 연결되지 않았습니다.', 'No GitHub hook found');
        return;
      }

      const currentVersion = stats.version;
      if (isNull(currentVersion) || 
          currentVersion !== getVersion() || 
          isNull(await getStatsSHAfromPath(hook))) {
        await versionUpdate();
      }

      const cachedSHA = await getStatsSHAfromPath(`${hook}/${bojData.directory}/${bojData.fileName}`);
      const calcSHA = calculateBlobSHA(bojData.code);
      log('cachedSHA', cachedSHA, 'calcSHA', calcSHA);

      if (cachedSHA === calcSHA) {
        markUploadedCSS(stats.branches, bojData.directory);
        console.log('현재 제출번호를 업로드한 기록이 있습니다.');
        return;
      }

      await uploadOneSolveProblemOnGit(bojData, markUploadedCSS);
    }
  } catch (error) {
    console.error('Error in beginUpload:', error);
    Toast.raiseToast('업로드 중 오류가 발생했습니다.');
    stopLoader();
  }
}

// 초기화 함수
async function initialize() {
  try {
    const currentUrl = window.location.href;
    log(currentUrl);

    const username = findUsername();
    if (!isNull(username)) {
      if (['status', `user_id=${username}`, 'problem_id', 'from_mine=1']
          .every((key) => currentUrl.includes(key))) {
        startLoader();
      } else if (currentUrl.match(/\.net\/problem\/\d+/) !== null) {
        await parseProblemDescription();
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}