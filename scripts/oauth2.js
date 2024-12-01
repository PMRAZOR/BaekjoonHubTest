const oAuth2 = {
  init() {
    this.KEY = 'BaekjoonHub_token';
    this.ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
    this.AUTHORIZATION_URL = 'https://github.com/login/oauth/authorize';
    this.CLIENT_ID = '975f8d5cf6686dd1faed';
    this.CLIENT_SECRET = '934b2bfc3bb3ad239bc67bdfa81a378b1616dd1e';
    // 고정된 리다이렉트 URL 사용
    this.REDIRECT_URL = 'https://github.com/';  // GitHub OAuth App에 등록된 URL과 일치해야 함
    this.SCOPES = ['repo'];
  },

  async begin() {
    try {
      this.init();

      const url = new URL(this.AUTHORIZATION_URL);
      url.searchParams.append('client_id', this.CLIENT_ID);
      url.searchParams.append('redirect_uri', this.REDIRECT_URL);
      url.searchParams.append('scope', this.SCOPES.join(' '));

      console.log('Starting auth flow with URL:', url.toString());

      // 탭 기반 인증 사용
      await browser.storage.local.set({ pipe_baekjoonhub: true });
      await browser.tabs.create({ 
        url: url.toString(), 
        active: true 
      });
      window.close();
    } catch (error) {
      console.error('Begin error:', error);
    }
  },

  async traditionalAuth(url) {
    await browser.storage.local.set({ pipe_baekjoonhub: true });
    const tab = await browser.tabs.create({ url, active: true });
    window.close();
  },

  async handleAuthCallback(redirectUrl, state) {
    try {
      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (code && returnedState === state) {
        const tokenResponse = await fetch(this.ACCESS_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            code: code,
            redirect_uri: this.REDIRECT_URL
          })
        });

        const data = await tokenResponse.json();
        if (data.access_token) {
          await browser.storage.local.set({ [this.KEY]: data.access_token });
          await this.getUserInfo(data.access_token);
        } else {
          throw new Error('No access token received');
        }
      }
    } catch (error) {
      console.error('Handle auth callback error:', error);
    }
  },

  async getUserInfo(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`
        }
      });
      
      const userData = await response.json();
      await browser.storage.local.set({ 'BaekjoonHub_username': userData.login });
      window.location.reload();
    } catch (error) {
      console.error('Get user info error:', error);
    }
  }
};