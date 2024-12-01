// 브라우저 호환성을 위한 polyfill
if (typeof browser === 'undefined') {
  var browser = chrome;
}

let action = false;

// DOM이 로드된 후 실행되도록 보장
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const authenticateButton = document.getElementById('authenticate');
    if (authenticateButton) {
      authenticateButton.addEventListener('click', async () => {
        console.log('Authentication button clicked');
        if (typeof oAuth2 !== 'undefined') {
          await oAuth2.begin();
        } else {
          console.error('oAuth2 object not found');
        }
      });
    }

    // welcome URL 설정
    const extensionId = browser.runtime.id;
    const welcomeUrl = `${browser.runtime.getURL('welcome.html')}`;
    $('#welcome_URL').attr('href', welcomeUrl);
    $('#hook_URL').attr('href', welcomeUrl);

    // 토큰 확인
    const data = await browser.storage.local.get('BaekjoonHub_token');
    const token = data.BaekjoonHub_token;

    if (!token) {
      action = true;
      $('#auth_mode').show();
    } else {
      try {
        // GitHub API로 사용자 검증
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${token}`
          }
        });

        if (response.status === 200) {
          // 모드 타입 확인
          const modeData = await browser.storage.local.get('mode_type');
          if (modeData && modeData.mode_type === 'commit') {
            $('#commit_mode').show();
            
            // 저장소 정보 가져오기
            const hookData = await browser.storage.local.get(['stats', 'BaekjoonHub_hook']);
            if (hookData.BaekjoonHub_hook) {
              $('#repo_url').html(
                `Your Repo: <a target="blank" style="color: cadetblue !important;" 
                href="https://github.com/${hookData.BaekjoonHub_hook}">${hookData.BaekjoonHub_hook}</a>`
              );
            }
          } else {
            $('#hook_mode').show();
          }
        } else if (response.status === 401) {
          // 잘못된 OAuth 토큰
          await browser.storage.local.set({ BaekjoonHub_token: null });
          console.log('Bad OAuth token, redirecting to auth process');
          action = true;
          $('#auth_mode').show();
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        $('#auth_mode').show();
      }
    }

    // Enable/Disable 기능 초기화
    const enableData = await browser.storage.local.get('bjhEnable');
    if (enableData.bjhEnable === undefined) {
      $('#onffbox').prop('checked', true);
      await browser.storage.local.set({ 'bjhEnable': true });
    } else {
      $('#onffbox').prop('checked', enableData.bjhEnable);
      await browser.storage.local.set({ 'bjhEnable': enableData.bjhEnable });
    }

    // Enable/Disable 토글 이벤트
    $('#onffbox').on('click', async () => {
      try {
        await browser.storage.local.set({ 
          'bjhEnable': $('#onffbox').is(':checked') 
        });
      } catch (error) {
        console.error('Error toggling enable state:', error);
      }
    });

  } catch (error) {
    console.error('Error in popup initialization:', error);
  }
});

// 디버깅을 위한 콘솔 로그
console.log('Popup script loaded');
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
  return false;
};