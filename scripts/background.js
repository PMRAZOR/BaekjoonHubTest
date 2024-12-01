if (typeof browser === 'undefined') {
  var browser = chrome;
}

/**
 * solvedac 문제 데이터를 파싱해오는 함수.
 * @param {int} problemId
 */
async function SolvedApiCall(problemId) {
  try {
    const response = await fetch(
      `https://solved.ac/api/v3/problem/show?problemId=${problemId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`SolvedAC API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('SolvedApiCall error:', error);
    return null;
  }
}

async function handleMessage(request, sender, sendResponse) {
  try {
    if (request && request.sender === "baekjoon" && request.task === "SolvedApiCall") {
      const result = await SolvedApiCall(request.problemId);
      sendResponse(result);
      return true;
    }
    if (request && request.closeWebPage === true) {
      if (request.isSuccess === true) {
        await browser.storage.local.set({
          BaekjoonHub_username: request.username,
          BaekjoonHub_token: request.token,
          pipe_BaekjoonHub: false
        });
        
        console.log('Closed pipe.');

        // welcome 페이지 열기
        const urlOnboarding = browser.runtime.getURL('welcome.html');
        await browser.tabs.create({ url: urlOnboarding, active: true });
      } else {
        console.error('Authentication failed');
      }
    } else if (request && request.sender === "baekjoon" && request.task === "SolvedApiCall") {
      try {
        const result = await SolvedApiCall(request.problemId);
        sendResponse(result);
        return true; // 비동기 응답을 위해 필요
      } catch (error) {
        console.error('SolvedApiCall error:', error);
        sendResponse({ error: error.message });
        return true;
      }
    }
  } catch (error) {
    console.error('Handle message error:', error);
    sendResponse({ error: error.message });
  }
  return true; // 비동기 응답을 위해 필요
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true;
});

