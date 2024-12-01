/* 
    IMPLEMENTATION OF AUTHENTICATION ROUTE AFTER REDIRECT FROM GITHUB.
*/
if (typeof browser === 'undefined') {
  var browser = chrome;
}

const localAuth = {
  /**
   * Initialize
   */
  init() {
    this.KEY = 'BaekjoonHub_token';
    this.ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
    this.AUTHORIZATION_URL = 'https://github.com/login/oauth/authorize';
    this.CLIENT_ID = '975f8d5cf6686dd1faed';
    this.CLIENT_SECRET = '934b2bfc3bb3ad239bc67bdfa81a378b1616dd1e';
    this.REDIRECT_URL = 'https://github.com/';
    this.SCOPES = ['repo'];
  },

  /**
   * Parses Access Code
   * @param {string} url The url containing the access code.
   */
  async parseAccessCode(url) {
    try {
      if (url.match(/\?error=(.+)/)) {
        const currentTab = await browser.tabs.getCurrent();
        if (currentTab) {
          await browser.tabs.remove(currentTab.id);
        }
        return;
      }

      const accessCode = url.match(/\?code=([\w\/\-]+)/);
      if (accessCode) {
        await this.requestToken(accessCode[1]);
      }
    } catch (error) {
      console.error('Parse access code error:', error);
    }
  },

  /**
   * Request Token
   * @param {string} code The access code returned by provider.
   */
  async requestToken(code) {
    try {
      const response = await fetch(this.ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          code: code
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          await this.finish(data.access_token);
        } else {
          throw new Error('No access token received');
        }
      } else {
        await browser.runtime.sendMessage({
          closeWebPage: true,
          isSuccess: false
        });
      }
    } catch (error) {
      console.error('Request token error:', error);
      await browser.runtime.sendMessage({
        closeWebPage: true,
        isSuccess: false
      });
    }
  },

  /**
   * Finish
   * @param {string} token The OAuth2 token given to the application from the provider.
   */
  async finish(token) {
    try {
      const AUTHENTICATION_URL = 'https://api.github.com/user';
      
      const response = await fetch(AUTHENTICATION_URL, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        await browser.runtime.sendMessage({
          closeWebPage: true,
          isSuccess: true,
          token: token,
          username: userData.login,
          KEY: this.KEY
        });

        // 스토리지에 토큰과 사용자명 저장
        await browser.storage.local.set({
          [this.KEY]: token,
          'BaekjoonHub_username': userData.login
        });
      } else {
        throw new Error('Failed to get user data');
      }
    } catch (error) {
      console.error('Finish error:', error);
      await browser.runtime.sendMessage({
        closeWebPage: true,
        isSuccess: false
      });
    }
  }
};

// 초기화 및 인증 프로세스 시작
async function initializeAuth() {
  try {
    localAuth.init();
    const link = window.location.href;

    if (window.location.host === 'github.com') {
      const data = await browser.storage.local.get('pipe_baekjoonhub');
      if (data && data.pipe_baekjoonhub) {
        await localAuth.parseAccessCode(link);
      }
    }
  } catch (error) {
    console.error('Authorization initialization error:', error);
  }
}

// DOM이 로드된 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
  initializeAuth();
}