// 브라우저 호환성을 위한 polyfill
if (typeof browser === 'undefined') {
  var browser = chrome;
}

const option = () => {
  return $('#type').val();
};

const repositoryName = () => {
  return $('#name').val().trim();
};


/* Status codes for creating of repo */
const statusCode = async (res, status, name) => {
  switch (status) {
    case 304:
      $('#success').hide();
      $('#error').text(`Error creating ${name} - Unable to modify repository. Try again later!`);
      $('#error').show();
      break;

    case 400:
      $('#success').hide();
      $('#error').text(`Error creating ${name} - Bad POST request, make sure you're not overriding any existing scripts`);
      $('#error').show();
      break;

    case 401:
      $('#success').hide();
      $('#error').text(`Error creating ${name} - Unauthorized access to repo. Try again later!`);
      $('#error').show();
      break;

    case 403:
      $('#success').hide();
      $('#error').text(`Error creating ${name} - Forbidden access to repository. Try again later!`);
      $('#error').show();
      break;

    case 422:
      $('#success').hide();
      $('#error').text(`Error creating ${name} - Unprocessable Entity. Repository may have already been created. Try Linking instead (select 2nd option).`);
      $('#error').show();
      break;

    default:
      try {
        /* Change mode type to commit */
        await browser.storage.local.set({ mode_type: 'commit' });
        $('#error').hide();
        $('#success').html(`Successfully created <a target="blank" href="${res.html_url}">${name}</a>. Start <a href="https://www.acmicpc.net/">BOJ</a>!`);
        $('#success').show();
        $('#unlink').show();
        /* Show new layout */
        document.getElementById('hook_mode').style.display = 'none';
        document.getElementById('commit_mode').style.display = 'inherit';
        /* Set Repo Hook */
        await browser.storage.local.set({ BaekjoonHub_hook: res.full_name });
        console.log('Successfully set new repo hook');
      } catch (error) {
        console.error('Error in default status code:', error);
      }
      break;
  }
};

const createRepo = async (token, name) => {
  try {
    const AUTHENTICATION_URL = 'https://api.github.com/user/repos';
    const data = {
      name,
      private: true,
      auto_init: true,
      description: 'This is an auto push repository for Baekjoon Online Judge created with [BaekjoonHub](https://github.com/BaekjoonHub/BaekjoonHub).',
    };

    const stats = {};
    stats.version = browser.runtime.getManifest().version;
    stats.submission = {};
    await browser.storage.local.set({ stats });

    const response = await fetch(AUTHENTICATION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();
    await statusCode(responseData, response.status, name);
  } catch (error) {
    console.error('Error in createRepo:', error);
    $('#success').hide();
    $('#error').text(`Error creating repository: ${error.message}`);
    $('#error').show();
  }
};

/* Status codes for linking of repo */
const linkStatusCode = (status, name) => {
  let bool = false;
  switch (status) {
    case 301:
      $('#success').hide();
      $('#error').html(`Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to BaekjoonHub. <br> This repository has been moved permenantly. Try creating a new one.`);
      $('#error').show();
      break;

    case 403:
      $('#success').hide();
      $('#error').html(`Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to BaekjoonHub. <br> Forbidden action. Please make sure you have the right access to this repository.`);
      $('#error').show();
      break;

    case 404:
      $('#success').hide();
      $('#error').html(`Error linking <a target="blank" href="${`https://github.com/${name}`}">${name}</a> to BaekjoonHub. <br> Resource not found. Make sure you enter the right repository name.`);
      $('#error').show();
      break;

    default:
      bool = true;
      break;
  }
  $('#unlink').show();
  return bool;
};

const linkRepo = async (token, name) => {
  try {
    const AUTHENTICATION_URL = `https://api.github.com/repos/${name}`;

    const response = await fetch(AUTHENTICATION_URL, {
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const responseData = await response.json();
    const bool = linkStatusCode(response.status, name);

    if (response.status === 200) {
      if (!bool) {
        // unable to gain access to repo in commit mode. Must switch to hook mode.
        await browser.storage.local.set({ mode_type: 'hook' });
        await browser.storage.local.set({ BaekjoonHub_hook: null });
        
        document.getElementById('hook_mode').style.display = 'inherit';
        document.getElementById('commit_mode').style.display = 'none';
      } else {
        await browser.storage.local.set({ 
          mode_type: 'commit',
          repo: responseData.html_url 
        });

        $('#error').hide();
        $('#success').html(`Successfully linked <a target="blank" href="${responseData.html_url}">${name}</a> to BaekjoonHub. Start <a href="https://www.acmicpc.net/">BOJ</a> now!`);
        $('#success').show();
        $('#unlink').show();

        const stats = {
          version: browser.runtime.getManifest().version,
          submission: {}
        };
        await browser.storage.local.set({ stats });
        await browser.storage.local.set({ BaekjoonHub_hook: responseData.full_name });

        document.getElementById('hook_mode').style.display = 'none';
        document.getElementById('commit_mode').style.display = 'inherit';
      }
    }
  } catch (error) {
    console.error('Error in linkRepo:', error);
    $('#success').hide();
    $('#error').text(`Error linking repository: ${error.message}`);
    $('#error').show();
  }
};

const unlinkRepo = async () => {
  try {
    await browser.storage.local.set({ mode_type: 'hook' });
    await browser.storage.local.set({ BaekjoonHub_hook: null });
    await browser.storage.local.set({ BaekjoonHub_disOption: "platform" });

    document.getElementById('hook_mode').style.display = 'inherit';
    document.getElementById('commit_mode').style.display = 'none';
  } catch (error) {
    console.error('Error in unlinkRepo:', error);
  }
};

/* Check for value of select tag, Get Started disabled by default */
$('#type').on('change', function() {
  const valueSelected = this.value;
  if (valueSelected) {
    $('#hook_button').attr('disabled', false);
  } else {
    $('#hook_button').attr('disabled', true);
  }
});

$('#hook_button').on('click', async () => {
  try {
    if (!option()) {
      $('#error').text('No option selected - Pick an option from dropdown menu below that best suits you!');
      $('#error').show();
      return;
    }
    
    if (!repositoryName()) {
      $('#error').text('No repository name added - Enter the name of your repository!');
      $('#name').focus();
      $('#error').show();
      return;
    }

    $('#error').hide();
    $('#success').text('Attempting to create Hook... Please wait.');
    $('#success').show();

    const data = await browser.storage.local.get('BaekjoonHub_token');
    const token = data.BaekjoonHub_token;

    if (!token) {
      $('#error').text('Authorization error - Grant BaekjoonHub access to your GitHub account to continue (launch extension to proceed)');
      $('#error').show();
      $('#success').hide();
      return;
    }

    if (option() === 'new') {
      await createRepo(token, repositoryName());
    } else {
      const userData = await browser.storage.local.get('BaekjoonHub_username');
      if (!userData.BaekjoonHub_username) {
        $('#error').text('Improper Authorization error - Grant BaekjoonHub access to your GitHub account to continue (launch extension to proceed)');
        $('#error').show();
        $('#success').hide();
        return;
      }
      await linkRepo(token, `${userData.BaekjoonHub_username}/${repositoryName()}`);
    }

    const org_option = $('#org_option').val();
    await browser.storage.local.set({ BaekjoonHub_OrgOption: org_option });

  } catch (error) {
    console.error('Error in hook button click:', error);
    $('#success').hide();
    $('#error').text(`Error: ${error.message}`);
    $('#error').show();
  }
});

$('#unlink a').on('click', async () => {
  await unlinkRepo();
  $('#unlink').hide();
  $('#success').text('Successfully unlinked your current git repo. Please create/link a new hook.');
});

/* Detect mode type */
async function initializePage() {
  try {
    const data = await browser.storage.local.get(['BaekjoonHub_token', 'mode_type', 'stats', 'BaekjoonHub_hook', 'bjhEnable']);
    
    // auth_mode 체크
    if (!data.BaekjoonHub_token) {
      if (document.getElementById('auth_mode')) {
        document.getElementById('auth_mode').style.display = 'block';
      }
      if (document.getElementById('hook_mode')) {
        document.getElementById('hook_mode').style.display = 'none';
      }
      if (document.getElementById('commit_mode')) {
        document.getElementById('commit_mode').style.display = 'none';
      }
      return;
    }

    // mode_type 체크
    if (data.mode_type === 'commit') {
      if (document.getElementById('auth_mode')) {
        document.getElementById('auth_mode').style.display = 'none';
      }
      if (document.getElementById('hook_mode')) {
        document.getElementById('hook_mode').style.display = 'none';
      }
      if (document.getElementById('commit_mode')) {
        document.getElementById('commit_mode').style.display = 'block';
      }

      // 저장소 정보 표시
      if (data.BaekjoonHub_hook && document.getElementById('repo_url')) {
        document.getElementById('repo_url').innerHTML = 
          `Your Repo: <a target="blank" style="color: cadetblue !important;" 
           href="https://github.com/${data.BaekjoonHub_hook}">${data.BaekjoonHub_hook}</a>`;
      }
    } else {
      if (document.getElementById('auth_mode')) {
        document.getElementById('auth_mode').style.display = 'none';
      }
      if (document.getElementById('hook_mode')) {
        document.getElementById('hook_mode').style.display = 'block';
      }
      if (document.getElementById('commit_mode')) {
        document.getElementById('commit_mode').style.display = 'none';
      }
    }

    // Enable/Disable 상태 초기화
    if ($('#onffbox').length) {
      if (data.bjhEnable === undefined) {
        $('#onffbox').prop('checked', true);
        await browser.storage.local.set({ 'bjhEnable': true });
      } else {
        $('#onffbox').prop('checked', data.bjhEnable);
      }
    }

  } catch (error) {
    console.error('Page initialization error:', error);
    // 에러 발생시 기본 상태 설정
    if (document.getElementById('auth_mode')) {
      document.getElementById('auth_mode').style.display = 'block';
    }
    if (document.getElementById('hook_mode')) {
      document.getElementById('hook_mode').style.display = 'none';
    }
    if (document.getElementById('commit_mode')) {
      document.getElementById('commit_mode').style.display = 'none';
    }
  }
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}