// 브라우저 호환성
if (typeof browser === 'undefined') {
  var browser = chrome;
}

/**
 * GitHub 토큰 가져오기
 * @returns {Promise<string>}
 */
async function getToken() {
  try {
    const data = await browser.storage.local.get('BaekjoonHub_token');
    return data.BaekjoonHub_token || null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * GitHub hook 가져오기
 * @returns {Promise<string>}
 */
async function getHook() {
  try {
    const data = await browser.storage.local.get('BaekjoonHub_hook');
    return data.BaekjoonHub_hook || null;
  } catch (error) {
    console.error('Error getting hook:', error);
    return null;
  }
}

/** 
 * 푼 문제들에 대한 단일 업로드
 * @param {Object} bojData - 업로드할 데이터
 * @param {Function} cb - 콜백 함수
 * @returns {Promise<void>}
 */
async function uploadOneSolveProblemOnGit(bojData, cb) {
  try {
    const token = await getToken();
    const hook = await getHook();

    if (!token || !hook) {
      throw new Error('Token or hook is missing');
    }

    await upload(token, hook, bojData.code, bojData.readme, 
                bojData.directory, bojData.fileName, bojData.message, cb);
  } catch (error) {
    console.error('Error in uploadOneSolveProblemOnGit:', error);
    Toast.raiseToast('업로드 중 오류가 발생했습니다.');
  }
}

/** 
 * Github API를 사용하여 업로드
 * @param {string} token - GitHub API 토큰
 * @param {string} hook - GitHub API hook
 * @param {string} sourceText - 업로드할 소스코드
 * @param {string} readmeText - 업로드할 readme
 * @param {string} directory - 업로드할 파일의 경로
 * @param {string} filename - 업로드할 파일명
 * @param {string} commitMessage - 커밋 메시지
 * @param {Function} cb - 콜백 함수
 */
async function upload(token, hook, sourceText, readmeText, directory, filename, commitMessage, cb) {
  try {
    const git = new GitHub(hook, token);
    const stats = await getStats();
    
    // 기본 브랜치 확인
    let default_branch = stats.branches?.[hook];
    if (!default_branch) {
      default_branch = await git.getDefaultBranchOnRepo();
      if (!stats.branches) stats.branches = {};
      stats.branches[hook] = default_branch;
    }

    // Git 작업 수행
    const { refSHA, ref } = await git.getReference(default_branch);
    
    // 소스코드와 README 파일 생성
    const [source, readme] = await Promise.all([
      git.createBlob(sourceText, `${directory}/${filename}`),
      git.createBlob(readmeText, `${directory}/README.md`)
    ]);

    // 트리와 커밋 생성
    const treeSHA = await git.createTree(refSHA, [source, readme]);
    const commitSHA = await git.createCommit(commitMessage, treeSHA, refSHA);
    await git.updateHead(ref, commitSHA);

    // stats 업데이트
    if (!stats.submission) stats.submission = {};
    updateObjectDatafromPath(stats.submission, `${hook}/${source.path}`, source.sha);
    updateObjectDatafromPath(stats.submission, `${hook}/${readme.path}`, readme.sha);
    
    await browser.storage.local.set({ stats });

    // 콜백 실행
    if (typeof cb === 'function') {
      cb(stats.branches, directory);
    }
  } catch (error) {
    console.error('Error in upload:', error);
    Toast.raiseToast('GitHub 업로드 중 오류가 발생했습니다.');
    throw error;
  }
}

/**
 * 객체 경로 업데이트
 * @param {Object} obj - 업데이트할 객체
 * @param {string} path - 경로
 * @param {string} value - 새 값
 */
function updateObjectDatafromPath(obj, path, value) {
  try {
    const parts = path.split('/');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  } catch (error) {
    console.error('Error updating object path:', error);
  }
}